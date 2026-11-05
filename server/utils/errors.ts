import { getModelErrorMessage } from "./model-router";

export class RagError extends Error {}

export function sanitizeProviderError(
  error: unknown,
  fallback = "AI provider unavailable",
): string {
  if (error instanceof RagError) return error.message;
  const message = getModelErrorMessage(error);
  return message === "Chat service unavailable. Please try again shortly." ? fallback : message;
}
