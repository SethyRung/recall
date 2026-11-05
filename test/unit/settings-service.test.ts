import { beforeEach, describe, expect, it, vi } from "vitest";
import { createError } from "h3";
import { DEFAULT_SETTINGS } from "../../shared/utils/settings";
import { protectSettings } from "../../server/utils/settings-secrets";

const state = vi.hoisted(() => ({
  rows: [] as unknown[],
  key: Buffer.alloc(32, 7).toString("base64"),
  reads: 0,
}));
const write = vi.hoisted(() => vi.fn());
vi.mock("@nuxthub/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            state.reads++;
            return structuredClone(state.rows);
          },
        }),
      }),
    }),
  },
}));
vi.mock("@nuxthub/db/schema", async () => import("../../server/db/schema"));
vi.mock("../../server/utils/settings-key", () => ({
  getSettingsEncryptionKey: async () => state.key || undefined,
}));
vi.mock("../../server/utils/settings-write", () => ({
  withSettingsWriteLock: write,
  buildSettingsSaveQuery: vi.fn(),
}));
vi.stubGlobal("createError", createError);
import {
  getAdminSettingsResponse,
  getDecryptedSettings,
  saveAppSettings,
} from "../../server/utils/settings";

beforeEach(() => {
  state.rows = [];
  state.reads = 0;
  state.key = Buffer.alloc(32, 7).toString("base64");
  write.mockReset();
});

describe("managed settings service", () => {
  it("never returns stored credentials in admin responses", async () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.embed.apiKey = "private-test-key";
    const protectedValue = protectSettings(settings, state.key)!;
    state.rows = [
      {
        value: protectedValue.settings,
        secrets: protectedValue.secrets,
        version: 1,
        updatedAt: new Date(),
      },
    ];
    const admin = await getAdminSettingsResponse();
    expect(JSON.stringify(admin)).not.toContain("private-test-key");
    expect(admin.secretState["embed.apiKey"]).toBe(true);
    expect((await getDecryptedSettings()).embed.apiKey).toBe("private-test-key");
  });
  it("reads the latest revision on every operation instead of caching plaintext", async () => {
    expect((await getDecryptedSettings()).email.from).toBe("");
    const updated = structuredClone(DEFAULT_SETTINGS);
    updated.email.from = "Recall <mail@example.test>";
    state.rows = [{ value: updated, secrets: {}, version: 1, updatedAt: new Date() }];
    expect((await getDecryptedSettings()).email.from).toBe(updated.email.from);
    expect(state.reads).toBe(2);
  });
  it("fails closed when the root key no longer decrypts the saved secrets", async () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.embed.apiKey = "private-test-key";
    const protectedValue = protectSettings(settings, state.key)!;
    state.rows = [
      {
        value: protectedValue.settings,
        secrets: protectedValue.secrets,
        version: 1,
        updatedAt: new Date(),
      },
    ];
    state.key = Buffer.alloc(32, 8).toString("base64");
    await expect(getDecryptedSettings()).rejects.toMatchObject({ statusCode: 503 });
  });
  it("rejects writes without a root key or with a stale revision", async () => {
    state.key = "";
    await expect(
      saveAppSettings({} as never, DEFAULT_SETTINGS, 0, [], "admin"),
    ).rejects.toMatchObject({ statusCode: 503 });
    state.key = Buffer.alloc(32, 7).toString("base64");
    await expect(
      saveAppSettings({} as never, DEFAULT_SETTINGS, 1, [], "admin"),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(write).not.toHaveBeenCalled();
  });
  it("rejects revision conflicts detected under the database lock", async () => {
    write.mockResolvedValue([[{ saved: false, revisionMatches: false }]]);
    await expect(
      saveAppSettings({} as never, DEFAULT_SETTINGS, 0, [], "admin"),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
