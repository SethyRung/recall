export type ChatModelConfig = {
  id: string;
  provider: "anthropic" | "openai";
  model: string;
  baseUrl?: string;
  apiKey?: string;
  authToken?: string;
};
