import type { AppSettings } from "../../shared/utils/settings";

export function getRagDefaults(settings: AppSettings) {
  return {
    ...settings.retrieval,
    ...settings.chunking,
    ...settings.chat,
    dimensions: 2048 as const,
  };
}

export type RagDefaults = ReturnType<typeof getRagDefaults>;
