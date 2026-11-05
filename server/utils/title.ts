import type { UIMessage } from "ai";

export function getChatTitle(message: UIMessage): string | null {
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 80) || null;
}
