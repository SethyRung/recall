import { describe, expect, it } from "vitest";
import {
  apiUrlSchema,
  appSettingsSchema,
  DEFAULT_SETTINGS,
  getModelCredentialType,
  settingsUpdateSchema,
} from "../../shared/utils/settings";
import {
  decryptSettingSecret as decryptSecret,
  encryptSettingSecret as encryptSecret,
  settingsEncryptionKey as decodeKey,
  mergeSettingsSecrets as mergeSecrets,
  protectSettings as protect,
  revealSettings as reveal,
} from "../../server/utils/settings-secrets";
import { getEmbeddingIdentity } from "../../server/utils/embedding-identity";

function expectSuccess<T>(result: T | undefined): T {
  if (result === undefined) throw new Error("Expected a successful result");
  return result;
}

const decryptSettingSecret = (...args: Parameters<typeof decryptSecret>) =>
  expectSuccess(decryptSecret(...args));
const encryptSettingSecret = (...args: Parameters<typeof encryptSecret>) =>
  expectSuccess(encryptSecret(...args));
const settingsEncryptionKey = (...args: Parameters<typeof decodeKey>) =>
  expectSuccess(decodeKey(...args));
const mergeSettingsSecrets = (...args: Parameters<typeof mergeSecrets>) =>
  expectSuccess(mergeSecrets(...args));
const protectSettings = (...args: Parameters<typeof protect>) => expectSuccess(protect(...args));
const revealSettings = (...args: Parameters<typeof reveal>) => expectSuccess(reveal(...args));

const key = Buffer.alloc(32, 7).toString("base64");
function configured() {
  const settings = structuredClone(DEFAULT_SETTINGS);
  settings.models = [
    {
      id: "primary",
      enabled: true,
      provider: "openai",
      model: "test",
      baseUrl: "",
      apiKey: "private-model-key",
      authToken: "",
    },
  ];
  settings.embed.apiKey = "private-embed-key";
  settings.email.apiKey = "private-email-key";
  return settings;
}

describe("managed settings validation", () => {
  it("validates defaults without modifying them", () => {
    expect(appSettingsSchema.parse(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });
  it.each([
    { ...DEFAULT_SETTINGS, extra: true },
    { ...DEFAULT_SETTINGS, routing: { cooldownMs: 0, timeoutMs: 60000 } },
    { ...DEFAULT_SETTINGS, chunking: { ...DEFAULT_SETTINGS.chunking, chunkOverlap: 500 } },
    { ...DEFAULT_SETTINGS, chat: { ...DEFAULT_SETTINGS.chat, maxTotalChars: 10 } },
    {
      ...DEFAULT_SETTINGS,
      embed: { ...DEFAULT_SETTINGS.embed, baseUrl: "https://key:password@example.com" },
    },
    {
      ...DEFAULT_SETTINGS,
      email: { ...DEFAULT_SETTINGS.email, from: "bad\r\nheader" },
    },
  ])("rejects invalid settings", (settings) => {
    expect(appSettingsSchema.safeParse(settings).success).toBe(false);
  });
  it("rejects duplicate model IDs and overlong lists", () => {
    const settings = configured();
    settings.models.push({ ...settings.models[0]! });
    expect(appSettingsSchema.safeParse(settings).success).toBe(false);
    settings.models = Array.from({ length: 17 }, (_, index) => ({
      ...settings.models[0]!,
      id: String(index),
    }));
    expect(appSettingsSchema.safeParse(settings).success).toBe(false);
  });
  it("requires a nonnegative integer update revision", () => {
    expect(
      settingsUpdateSchema.safeParse({ version: -1, settings: DEFAULT_SETTINGS }).success,
    ).toBe(false);
  });
});

describe("optional API prefix validation", () => {
  it.each([
    "",
    "   ",
    "https://openrouter.ai/api/v1",
    "  https://ollama.com/v1/  ",
    "http://localhost:11434/v1",
    "http://[::1]:11434/v1",
  ])("accepts blank or valid HTTP(S) prefix %j", (value) => {
    expect(apiUrlSchema.parse(value)).toBe(value.trim());
  });

  it.each([
    "not-a-url",
    "openrouter.ai/api/v1",
    "/api/v1",
    "//example.com/v1",
    "https:example.com/v1",
    "https:/example.com/v1",
    "http:///example.com/v1",
    "ftp://example.com/v1",
    "javascript:alert(1)",
    "https://user:password@example.com/v1",
    "https://user@example.com/v1",
    "https://example.com/v1?apiKey=secret",
    "https://example.com/v1#fragment",
    "https://example.com:65536/v1",
    `https://example.com/${"x".repeat(500)}`,
  ])("rejects invalid or unsafe prefix %j", (value) => {
    expect(apiUrlSchema.safeParse(value).success).toBe(false);
  });

  it("keeps new model prefixes blank instead of applying the placeholder", () => {
    expect(appSettingsSchema.parse(configured()).models[0]?.baseUrl).toBe("");
  });

  it("reports the model field path in form and API validation", () => {
    const settings = configured();
    settings.models[0]!.baseUrl = "https:example.com/v1";
    const form = appSettingsSchema.safeParse(settings);
    const api = settingsUpdateSchema.safeParse({ version: 0, settings });
    expect(form.success).toBe(false);
    expect(api.success).toBe(false);
    if (!form.success) expect(form.error.issues[0]?.path).toEqual(["models", 0, "baseUrl"]);
    if (!api.success)
      expect(api.error.issues[0]?.path).toEqual(["settings", "models", 0, "baseUrl"]);
  });

  it("explains an empty numeric setting with its allowed range", () => {
    const settings = configured();
    settings.routing.cooldownMs = undefined as unknown as number;
    settings.routing.timeoutMs = 0;
    const result = appSettingsSchema.safeParse(settings);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual([
        "Enter a whole number from 1 to 86,400,000",
        "Enter a whole number from 1 to 300,000",
      ]);
    }
  });
});

describe("credential encryption and updates", () => {
  it("uses randomized authenticated encryption", () => {
    const decodedKey = settingsEncryptionKey(key);
    const first = encryptSettingSecret("secret", "embed.apiKey", decodedKey);
    const second = encryptSettingSecret("secret", "embed.apiKey", decodedKey);
    expect(first).not.toBe(second);
    expect(first).not.toContain("secret");
    expect(decryptSettingSecret(first, "embed.apiKey", decodedKey)).toBe("secret");
  });
  it("rejects credentials encrypted for another application", () => {
    const portfolioCredential = "v1:AwMDAwMDAwMDAwMD:wEq/djARZhT7uptLk5/4Rg==:SZvEYjlRczEfIzE5nw==";
    expect(
      decryptSecret(portfolioCredential, "embed.apiKey", settingsEncryptionKey(key)),
    ).toBeUndefined();
  });
  it("rejects malformed keys", () => {
    for (const value of ["", "secret", Buffer.alloc(16).toString("base64"), key.slice(0, -1)]) {
      expect(decodeKey(value)).toBeUndefined();
    }
    expect(encryptSecret("secret", "embed.apiKey", Buffer.alloc(16))).toBeUndefined();
  });
  it("rejects moved credentials, tampering and wrong keys without exposing values", () => {
    const decodedKey = settingsEncryptionKey(key);
    const encrypted = encryptSettingSecret("private-secret", "embed.apiKey", decodedKey);
    for (const decrypt of [
      decryptSecret(encrypted, "email.apiKey", decodedKey),
      decryptSecret(encrypted.replace("v1:", "v2:"), "embed.apiKey", decodedKey),
      decryptSecret("malformed", "embed.apiKey", decodedKey),
      decryptSecret(encrypted, "embed.apiKey", Buffer.alloc(32, 8)),
    ])
      expect(decrypt).toBeUndefined();
  });
  it("separates every secret from stored configuration and round-trips", () => {
    const settings = configured();
    const protectedValue = protectSettings(settings, key);
    expect(JSON.stringify(protectedValue)).not.toContain("private-");
    expect(Object.keys(protectedValue.secrets)).toHaveLength(3);
    expect(revealSettings(protectedValue.settings, protectedValue.secrets, key)).toEqual(settings);
    expect(settings.models[0]?.apiKey).toBe("private-model-key");
  });
  it("requires a valid key for saving and only decrypts when credentials exist", () => {
    const empty = structuredClone(DEFAULT_SETTINGS);
    expect(protect(empty, "")).toBeUndefined();
    expect(revealSettings(empty, {}, "")).toEqual(empty);
    const protectedValue = protectSettings(configured(), key);
    expect(reveal(protectedValue.settings, protectedValue.secrets, "")).toBeUndefined();
  });
  it("keeps blank credentials, rotates supplied credentials, and clears explicitly", () => {
    const original = configured();
    const masked = protectSettings(original, key).settings;
    masked.email.apiKey = "rotated";
    const result = mergeSettingsSecrets(masked, original, ["embed.apiKey"]);
    expect(result.models[0]?.apiKey).toBe("private-model-key");
    expect(result.embed.apiKey).toBe("");
    expect(result.email.apiKey).toBe("rotated");
  });
  it("preserves secrets by stable model ID through reordering", () => {
    const original = configured();
    original.models.push({ ...original.models[0]!, id: "backup", apiKey: "backup-key" });
    const masked = protectSettings(original, key).settings;
    masked.models.reverse();
    const result = mergeSettingsSecrets(masked, original, []);
    expect(result.models.map((model) => model.apiKey)).toEqual(["backup-key", "private-model-key"]);
  });
  it("removes deleted model credentials from storage", () => {
    const settings = configured();
    const masked = protectSettings(settings, key).settings;
    masked.models = [];
    const result = protectSettings(mergeSettingsSecrets(masked, settings, []), key);
    expect(result.secrets).not.toHaveProperty("models.primary.apiKey");
  });
  it("requires credentials for enabled models but permits disabled drafts", () => {
    const original = configured();
    const masked = protectSettings(original, key).settings;
    expect(mergeSecrets(masked, original, ["models.primary.apiKey"])).toBeUndefined();
    masked.models[0]!.enabled = false;
    expect(
      mergeSettingsSecrets(masked, original, ["models.primary.apiKey"]).models[0]?.apiKey,
    ).toBe("");
  });
  it("rejects unknown removal paths and simultaneous rotate/remove", () => {
    const settings = configured();
    expect(mergeSecrets(settings, settings, ["unknown"])).toBeUndefined();
    expect(mergeSecrets(settings, settings, ["email.apiKey"])).toBeUndefined();
  });
});

describe("model credential selection", () => {
  it("infers legacy bearer selection from masked secret flags", () => {
    const model = protectSettings(configured(), key).settings.models[0]!;
    expect(getModelCredentialType(model)).toBe("apiKey");
    expect(getModelCredentialType(model, { "models.primary.authToken": true })).toBe("authToken");
    model.credentialType = "apiKey";
    expect(getModelCredentialType(model, { "models.primary.authToken": true })).toBe("apiKey");
  });

  it("rejects unsupported credential types", () => {
    const settings = configured();
    expect(
      appSettingsSchema.safeParse({
        ...settings,
        models: [{ ...settings.models[0], credentialType: "password" }],
      }).success,
    ).toBe(false);
  });

  it.each(["apiKey", "authToken"] as const)(
    "keeps the selected %s and removes the inactive encrypted credential on Save",
    (credentialType) => {
      const current = configured();
      current.models[0]!.authToken = "private-token";
      const input = protectSettings(current, key).settings;
      input.models[0]!.credentialType = credentialType;
      const merged = mergeSettingsSecrets(input, current, []);
      const inactive = credentialType === "apiKey" ? "authToken" : "apiKey";
      expect(merged.models[0]?.[credentialType]).toBe(current.models[0]?.[credentialType]);
      expect(merged.models[0]?.[inactive]).toBe("");
      const stored = protectSettings(merged, key);
      expect(stored.settings.models[0]?.credentialType).toBe(credentialType);
      expect(stored.secrets).toHaveProperty(`models.primary.${credentialType}`);
      expect(stored.secrets).not.toHaveProperty(`models.primary.${inactive}`);
      expect(JSON.stringify(stored)).not.toContain("private-");
      expect(current.models[0]?.[inactive]).not.toBe("");
    },
  );

  it("preserves legacy bearer precedence when saving old settings", () => {
    const current = configured();
    current.models[0]!.authToken = "legacy-token";
    const input = protectSettings(current, key).settings;
    const merged = mergeSettingsSecrets(input, current, []);
    expect(merged.models[0]).toMatchObject({
      credentialType: "authToken",
      authToken: "legacy-token",
      apiKey: "",
    });
  });

  it("rejects a missing selected credential rather than using the inactive one", () => {
    const current = configured();
    const input = protectSettings(current, key).settings;
    input.models[0]!.credentialType = "authToken";
    expect(mergeSecrets(input, current, [])).toBeUndefined();
    expect(current.models[0]?.apiKey).toBe("private-model-key");
  });

  it("persists disabled model selection without retaining the inactive credential", () => {
    const current = configured();
    const input = protectSettings(current, key).settings;
    input.models[0]!.enabled = false;
    input.models[0]!.credentialType = "authToken";
    expect(mergeSettingsSecrets(input, current, []).models[0]).toMatchObject({
      credentialType: "authToken",
      apiKey: "",
      authToken: "",
    });
  });
});

describe("embedding identity", () => {
  it("accepts saved embedding settings without a bearer token", () => {
    expect(
      appSettingsSchema.parse({
        ...DEFAULT_SETTINGS,
        embed: { baseUrl: "", apiKey: "", model: "legacy" },
      }).embed.authToken,
    ).toBe("");
  });
  it("tracks model and endpoint changes but not key rotation", () => {
    const settings = configured();
    const original = getEmbeddingIdentity(settings);
    settings.embed.apiKey = "rotated";
    expect(getEmbeddingIdentity(settings)).toBe(original);
    settings.embed.baseUrl = "https://api.openai.com/v1/";
    expect(getEmbeddingIdentity(settings)).toBe(original);
    settings.embed.model = "different";
    expect(getEmbeddingIdentity(settings)).not.toBe(original);
  });
});
