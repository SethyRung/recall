import type { H3Event } from "h3";
import { db } from "@nuxthub/db";
import { appSettings } from "@nuxthub/db/schema";
import { eq } from "drizzle-orm";
import {
  appSettingsSchema,
  DEFAULT_SETTINGS,
  settingsSecretFields,
  type AppSettings,
  type AdminSettingsResponse,
} from "../../shared/utils/settings";
import { getSettingsEncryptionKey } from "./settings-key";
import { mergeSettingsSecrets, protectSettings, revealSettings } from "./settings-secrets";
import { buildSettingsSaveQuery, withSettingsWriteLock } from "./settings-write";

export async function getSettingsRecord() {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  return {
    settings: appSettingsSchema.parse(row?.value ?? DEFAULT_SETTINGS),
    secrets: row?.secrets ?? {},
    version: row?.version ?? 0,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

export async function getAdminSettingsResponse(_event?: H3Event): Promise<AdminSettingsResponse> {
  const record = await getSettingsRecord();
  for (const field of settingsSecretFields(record.settings)) {
    Object.assign(field.object, { [field.key]: "" });
  }
  return {
    settings: record.settings,
    version: record.version,
    secretState: Object.fromEntries(Object.keys(record.secrets).map((path) => [path, true])),
    encryptionReady: !!(await getSettingsEncryptionKey()),
    updatedAt: record.updatedAt,
  };
}

export async function getDecryptedSettings(_event?: H3Event): Promise<AppSettings> {
  const record = await getSettingsRecord();
  const key = await getSettingsEncryptionKey();
  const settings = revealSettings(record.settings, record.secrets, key ?? "");
  if (!settings) {
    throw createError({ statusCode: 503, statusMessage: "Settings credentials unavailable" });
  }
  return settings;
}

export function settingsUnavailableResponse(): never {
  throw createError({ statusCode: 503, statusMessage: "Settings unavailable" });
}

export async function saveAppSettings(
  event: H3Event,
  input: AppSettings,
  version: number,
  clearSecrets: string[],
  userId: string,
) {
  const key = await getSettingsEncryptionKey();
  if (!key) {
    throw createError({
      statusCode: 503,
      statusMessage: "Configure NUXT_APP_SECRET before saving settings",
    });
  }
  const record = await getSettingsRecord();
  if (record.version !== version) {
    throw createError({
      statusCode: 409,
      statusMessage: "Settings changed elsewhere. Reload before saving.",
    });
  }
  const current = revealSettings(record.settings, record.secrets, key);
  if (!current) {
    throw createError({ statusCode: 503, statusMessage: "Unable to decrypt saved credentials" });
  }
  const settings = mergeSettingsSecrets(input, current, clearSecrets);
  if (!settings) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid settings or credential selection",
    });
  }
  const protectedValue = protectSettings(settings, key);
  if (!protectedValue) {
    throw createError({ statusCode: 400, statusMessage: "Invalid settings" });
  }
  const [rows] = await withSettingsWriteLock([
    buildSettingsSaveQuery(protectedValue, version, userId),
  ]);
  if (!rows?.[0]?.saved) {
    throw createError({
      statusCode: 409,
      statusMessage: rows?.[0]?.revisionMatches
        ? "Export and reset the knowledge base before changing the embedding model or endpoint."
        : "Settings changed elsewhere. Reload before saving.",
    });
  }
  return getAdminSettingsResponse(event);
}
