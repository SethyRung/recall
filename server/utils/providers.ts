import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function provider() {
  const { llmBaseUrl: baseURL, llmApiKey: apiKey, llmModel } = useRuntimeConfig();

  return createOpenAICompatible({
    name: "custom-provider",
    baseURL,
    apiKey,
  })(llmModel);
}
