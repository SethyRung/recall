import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenAI } from "@ai-sdk/openai";

export function getModel() {
  const { llmBaseUrl: baseURL, llmApiKey: apiKey, llmModel } = useRuntimeConfig();

  return createOpenAICompatible({
    name: "custom-provider",
    baseURL,
    apiKey,
  })(llmModel);
}

export function getEmbeddingModel() {
  const { embedBaseUrl: baseURL, embedApiKey: apiKey, embedModel } = useRuntimeConfig();
  return createOpenAI({
    baseURL,
    apiKey,
  }).embedding(embedModel);
}
