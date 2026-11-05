import { createHash } from "node:crypto";
import type { AppSettings } from "../../shared/utils/settings";

export function getEmbeddingConfiguration(settings: AppSettings) {
  return {
    model: settings.embed.model,
    baseUrl: settings.embed.baseUrl.replace(/\/$/, "") || "https://api.openai.com/v1",
  };
}

export function getEmbeddingIdentity(settings: AppSettings) {
  return createHash("sha256")
    .update(JSON.stringify(getEmbeddingConfiguration(settings)))
    .digest("hex");
}
