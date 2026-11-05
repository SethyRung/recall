import { deriveSecret } from "nuxt/server";

export async function getSettingsEncryptionKey(): Promise<string | undefined> {
  if (import.meta.dev && process.env.NUXT_APP_SECRET_GENERATED === "1") return undefined;
  try {
    return Buffer.from(await deriveSecret("recall:settings:v1"), "hex").toString("base64");
  } catch {
    return undefined;
  }
}
