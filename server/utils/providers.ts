import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

import type { ChatModelConfig } from "./llm-config";
import {
  getEmbedCredentialType,
  getModelCredentialType,
  type AppSettings,
} from "../../shared/utils/settings";

export function getChatModels(settings: AppSettings) {
  return settings.models
    .filter((model) => model.enabled)
    .map((model) => ({
      ...model,
      [getModelCredentialType(model) === "apiKey" ? "authToken" : "apiKey"]: "",
    }));
}

export function createChatModel(config: ChatModelConfig) {
  if (config.provider === "openai") {
    return createOpenAI({
      baseURL: config.baseUrl || undefined,
      apiKey: config.authToken || config.apiKey,
    }).chat(config.model);
  }

  const auth = config.authToken ? { authToken: config.authToken } : { apiKey: config.apiKey };
  return createAnthropic({ baseURL: config.baseUrl || undefined, ...auth })(config.model);
}

export function getEmbeddingModel(settings: AppSettings) {
  const { embed } = settings;
  const credential = embed[getEmbedCredentialType(embed)];
  if (!embed.model || !credential) throw new Error("Configure embeddings in Admin settings");
  return createOpenAI({
    baseURL: embed.baseUrl || undefined,
    apiKey: credential,
  }).embedding(embed.model);
}
