import { z } from "zod";
import type { UIMessage } from "ai";
import type { AppSettings } from "../../shared/utils/settings";
import { RagError } from "./errors";

export const userMessageSchema = z
  .object({
    id: z.string().min(1).max(100),
    role: z.literal("user"),
    parts: z
      .array(z.object({ type: z.literal("text"), text: z.string().max(32000) }).strict())
      .min(1)
      .max(20),
  })
  .strict()
  .refine((message) => message.parts.some((part) => part.text.trim()), "Enter a message");

export function buildModelContext(history: UIMessage[], caps: AppSettings["chat"]): UIMessage[] {
  const safe = history
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      ...message,
      parts: message.parts.filter((part) => part.type === "text"),
    }))
    .filter((message) => message.parts.length > 0);
  const size = (message: UIMessage) =>
    message.parts.reduce((sum, part) => sum + (part.type === "text" ? part.text.length : 0), 0);
  const last = safe.at(-1);
  if (!last || size(last) > caps.maxCharsPerMessage) throw new RagError("Message too long");
  const context: UIMessage[] = [];
  let total = 0;
  for (const message of safe.toReversed()) {
    const chars = size(message);
    if (
      context.length >= caps.maxMessages ||
      total + chars > caps.maxTotalChars ||
      chars > caps.maxCharsPerMessage
    )
      break;
    context.unshift(message);
    total += chars;
  }
  while (context[0]?.role === "assistant") context.shift();
  return context;
}
