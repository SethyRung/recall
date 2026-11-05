// Bun's Vite SSR loader drops the named z export: https://github.com/oven-sh/bun/issues/39866.
import * as z from "zod";

export const apiUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (!value) return true;
    if (!/^https?:\/\/[^/\\\s]/i.test(value)) return false;
    try {
      const url = new URL(value);
      return (
        ["https:", "http:"].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
      );
    } catch {
      return false;
    }
  }, "Use an absolute HTTP(S) API prefix without credentials, query parameters, or fragments");

const secret = z.string().trim().max(4096);
const range = (min: number, max: number) =>
  `Enter a whole number from ${min.toLocaleString("en-US")} to ${max.toLocaleString("en-US")}`;
const int = (min: number, max: number) => {
  const message = range(min, max);
  return z.number(message).int(message).min(min, message).max(max, message);
};
const unitInterval = "Enter a number from 0 to 1";

export const managedModelSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/, "Use letters, numbers, hyphens, or underscores"),
    enabled: z.boolean(),
    provider: z.enum(["anthropic", "openai"]),
    model: z
      .string()
      .trim()
      .min(1, "Enter a model ID")
      .max(200, "Model ID must be 200 characters or fewer"),
    baseUrl: apiUrlSchema,
    credentialType: z.enum(["apiKey", "authToken"]).optional(),
    apiKey: secret,
    authToken: secret,
  })
  .strict();

export const appSettingsSchema = z
  .object({
    models: z
      .array(managedModelSchema)
      .max(16)
      .refine(
        (models) => new Set(models.map((model) => model.id)).size === models.length,
        "Model IDs must be unique",
      ),
    routing: z.object({ cooldownMs: int(1, 86400000), timeoutMs: int(1, 300000) }).strict(),
    embed: z
      .object({
        baseUrl: apiUrlSchema,
        apiKey: secret,
        authToken: secret.default(""),
        credentialType: z.enum(["apiKey", "authToken"]).optional(),
        model: z.string().trim().max(200),
      })
      .strict(),
    retrieval: z
      .object({
        topK: int(1, 50),
        similarityThreshold: z.number(unitInterval).min(0, unitInterval).max(1, unitInterval),
        hybrid: z.boolean(),
        rerank: z.boolean(),
      })
      .strict(),
    chunking: z
      .object({
        chunkSize: int(50, 20000),
        chunkOverlap: int(0, 19999),
        minChunkLength: int(1, 20000),
        maxChunks: int(1, 2048),
      })
      .strict()
      .refine((value) => value.chunkOverlap < value.chunkSize, {
        message: "Overlap must be smaller than chunk size",
        path: ["chunkOverlap"],
      })
      .refine((value) => value.minChunkLength <= value.chunkSize, {
        message: "Minimum length must not exceed chunk size",
        path: ["minChunkLength"],
      }),
    chat: z
      .object({
        maxMessages: int(2, 100),
        maxCharsPerMessage: int(1, 32000),
        maxTotalChars: int(1, 200000),
        maxOutputTokens: int(1, 32768),
      })
      .strict()
      .refine((value) => value.maxCharsPerMessage <= value.maxTotalChars, {
        message: "Per-message limit must not exceed total limit",
        path: ["maxCharsPerMessage"],
      }),
    email: z
      .object({
        apiKey: secret,
        from: z
          .string()
          .trim()
          .max(320)
          .refine(
            (value) =>
              !value || /^(?:[^<>\r\n]+ <[^<>\s@]+@[^<>\s@]+>|[^<>\s@]+@[^<>\s@]+)$/.test(value),
            "Enter an email address or Name <email@example.com>",
          ),
      })
      .strict(),
  })
  .strict();

export type AppSettings = z.infer<typeof appSettingsSchema>;
export type ManagedModel = AppSettings["models"][number];
export type ModelCredentialType = NonNullable<ManagedModel["credentialType"]>;

export function getModelCredentialType(
  model: ManagedModel,
  secretState: Record<string, boolean> = {},
): ModelCredentialType {
  return (
    model.credentialType ??
    (model.authToken || secretState[`models.${model.id}.authToken`] ? "authToken" : "apiKey")
  );
}

export function getEmbedCredentialType(
  embed: AppSettings["embed"],
  secretState: Record<string, boolean> = {},
): ModelCredentialType {
  return (
    embed.credentialType ??
    (embed.authToken || secretState["embed.authToken"] ? "authToken" : "apiKey")
  );
}

export const DEFAULT_SETTINGS: AppSettings = {
  models: [],
  routing: { cooldownMs: 60000, timeoutMs: 60000 },
  embed: { baseUrl: "", apiKey: "", authToken: "", credentialType: "apiKey", model: "" },
  retrieval: { topK: 5, similarityThreshold: 0.3, hybrid: true, rerank: false },
  chunking: { chunkSize: 500, chunkOverlap: 50, minChunkLength: 50, maxChunks: 256 },
  chat: { maxMessages: 20, maxCharsPerMessage: 8000, maxTotalChars: 40000, maxOutputTokens: 4096 },
  email: { apiKey: "", from: "" },
};

export function settingsSecretFields(settings: AppSettings) {
  const fields = [
    ...settings.models.flatMap((model) => [
      { path: `models.${model.id}.apiKey`, object: model, key: "apiKey" as const },
      { path: `models.${model.id}.authToken`, object: model, key: "authToken" as const },
    ]),
    { path: "embed.apiKey", object: settings.embed, key: "apiKey" as const },
    { path: "embed.authToken", object: settings.embed, key: "authToken" as const },
    { path: "email.apiKey", object: settings.email, key: "apiKey" as const },
  ];
  return fields;
}

export type AdminSettingsResponse = {
  settings: AppSettings;
  version: number;
  secretState: Record<string, boolean>;
  encryptionReady: boolean;
  updatedAt: string | null;
};

export type PublicSettings = {
  chat: AppSettings["chat"];
};

export const settingsUpdateSchema = z
  .object({
    version: int(0, 2147483646),
    settings: appSettingsSchema,
    clearSecrets: z.array(z.string().max(150)).max(35).default([]),
  })
  .strict();
