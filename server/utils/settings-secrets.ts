import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  appSettingsSchema,
  getEmbedCredentialType,
  getModelCredentialType,
  settingsSecretFields,
  type AppSettings,
} from "#shared/utils/settings";

const SETTINGS_SECRET_NAMESPACE = "recall-settings";
const SETTINGS_SECRET_VERSION = "v1";
const SETTINGS_SECRET_CIPHER = "aes-256-gcm";
const SETTINGS_SECRET_AAD_PREFIX = `${SETTINGS_SECRET_NAMESPACE}:${SETTINGS_SECRET_VERSION}:`;

export function settingsEncryptionKey(encoded: string): Buffer | undefined {
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64") !== encoded) {
    return;
  }
  return key;
}

export function encryptSettingSecret(value: string, path: string, key: Buffer): string | undefined {
  try {
    const nonce = randomBytes(12);
    const cipher = createCipheriv(SETTINGS_SECRET_CIPHER, key, nonce);
    cipher.setAAD(Buffer.from(`${SETTINGS_SECRET_AAD_PREFIX}${path}`));
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [
      SETTINGS_SECRET_VERSION,
      nonce.toString("base64"),
      cipher.getAuthTag().toString("base64"),
      encrypted.toString("base64"),
    ].join(":");
  } catch {
    return;
  }
}

export function decryptSettingSecret(value: string, path: string, key: Buffer): string | undefined {
  try {
    const [version, iv, tag, ciphertext, extra] = value.split(":");
    if (version !== SETTINGS_SECRET_VERSION || !iv || !tag || !ciphertext || extra !== undefined)
      return;
    const decipher = createDecipheriv(SETTINGS_SECRET_CIPHER, key, Buffer.from(iv, "base64"));
    decipher.setAAD(Buffer.from(`${SETTINGS_SECRET_AAD_PREFIX}${path}`));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return;
  }
}

export function protectSettings(input: AppSettings, encodedKey: string) {
  const key = settingsEncryptionKey(encodedKey);
  if (!key) return;
  const parsed = appSettingsSchema.safeParse(input);
  if (!parsed.success) return;
  const settings = parsed.data;
  const secrets: Record<string, string> = {};
  for (const field of settingsSecretFields(settings)) {
    const value = field.object[field.key as keyof typeof field.object];
    if (typeof value === "string" && value) {
      const encrypted = encryptSettingSecret(value, field.path, key);
      if (encrypted === undefined) return;
      secrets[field.path] = encrypted;
    }
    Object.assign(field.object, { [field.key]: "" });
  }
  return { settings, secrets };
}

export function revealSettings(
  input: AppSettings,
  secrets: Record<string, string>,
  encodedKey: string,
) {
  const parsed = appSettingsSchema.safeParse(input);
  if (!parsed.success) return;
  const settings = parsed.data;
  let key: Buffer | undefined;
  for (const field of settingsSecretFields(settings)) {
    const encrypted = secrets[field.path];
    if (encrypted) {
      if (!key) {
        const decoded = settingsEncryptionKey(encodedKey);
        if (!decoded) return;
        key = decoded;
      }
      const decrypted = decryptSettingSecret(encrypted, field.path, key);
      if (decrypted === undefined) return;
      Object.assign(field.object, {
        [field.key]: decrypted,
      });
    }
  }
  return settings;
}

export function mergeSettingsSecrets(
  input: AppSettings,
  current: AppSettings,
  clearSecrets: string[],
) {
  const parsed = appSettingsSchema.safeParse(input);
  if (!parsed.success) return;
  const settings = parsed.data;
  const existing = new Map(
    settingsSecretFields(current).map((field) => [
      field.path,
      field.object[field.key as keyof typeof field.object],
    ]),
  );
  const validPaths = new Set(settingsSecretFields(settings).map((field) => field.path));
  if (clearSecrets.some((path) => !validPaths.has(path))) return;
  for (const field of settingsSecretFields(settings)) {
    const value = field.object[field.key as keyof typeof field.object];
    if (clearSecrets.includes(field.path)) {
      if (value) return;
      Object.assign(field.object, { [field.key]: "" });
    } else if (!value) {
      Object.assign(field.object, { [field.key]: existing.get(field.path) ?? "" });
    }
  }
  for (const model of settings.models) {
    model.credentialType = getModelCredentialType(model);
    model[model.credentialType === "apiKey" ? "authToken" : "apiKey"] = "";
    if (model.enabled && !model[model.credentialType]) return;
  }
  const embedType = getEmbedCredentialType(settings.embed);
  settings.embed.credentialType = embedType;
  settings.embed[embedType === "apiKey" ? "authToken" : "apiKey"] = "";
  return settings;
}
