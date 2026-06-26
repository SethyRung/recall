import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function getModel(modelId?: string) {
  const { llmBaseUrl: baseURL, llmApiKey: apiKey, llmModel } = useRuntimeConfig();

  const provider = createOpenAICompatible({
    name: "custom-provider",
    baseURL,
    apiKey,
  });

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
