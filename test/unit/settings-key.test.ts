import { describe, expect, it, vi } from "vitest";

const derive = vi.hoisted(() => vi.fn());
vi.mock("nuxt/server", () => ({ deriveSecret: derive }));
import { getSettingsEncryptionKey } from "../../server/utils/settings-key";

describe("Nuxt settings key", () => {
  it("derives 32 encryption bytes for a dedicated Recall purpose", async () => {
    derive.mockResolvedValue(Buffer.alloc(32, 9).toString("hex"));
    const key = await getSettingsEncryptionKey();
    expect(derive).toHaveBeenCalledWith("recall:settings:v1");
    expect(Buffer.from(key!, "base64")).toEqual(Buffer.alloc(32, 9));
  });
  it("refuses to save when Nuxt cannot resolve the application secret", async () => {
    derive.mockRejectedValue(new Error("NUXT_APP_SECRET is missing"));
    await expect(getSettingsEncryptionKey()).resolves.toBeUndefined();
  });
});
