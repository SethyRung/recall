import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

export function getModel(modelId?: string) {
  const { llmBaseUrl: baseURL, llmApiKey: apiKey, llmModel } = useRuntimeConfig();

  const provider = createAnthropic({ baseURL, apiKey });
  const id = modelId || llmModel;

  return provider(id);
}

export function getEmbeddingModel() {
  const { embedBaseUrl: baseURL, embedApiKey: apiKey, embedModel } = useRuntimeConfig();
  return createOpenAI({
    baseURL,
    apiKey,
  }).embedding(embedModel);
}
