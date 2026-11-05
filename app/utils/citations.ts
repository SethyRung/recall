import type { UIMessage } from "ai";

export function getMessageCitations(message: UIMessage): string[] {
  if (message.role !== "assistant" || !message.parts) return [];

  const titles = new Set<string>();

  for (const part of message.parts) {
    const raw = part as Record<string, unknown>;

    const toolInvocation = raw.toolInvocation as { result?: unknown } | undefined;
    const toolOutput = raw.output ?? toolInvocation?.result ?? raw.result;

    if (Array.isArray(toolOutput)) {
      for (const item of toolOutput) {
        if (item && typeof item === "object" && "documentTitle" in item) {
          const docTitle = (item as { documentTitle?: unknown }).documentTitle;
          if (typeof docTitle === "string") {
            const title = docTitle.trim();
            if (title) titles.add(title);
          }
        }
      }
    }

    if (part.type === "source-document" && "title" in raw && typeof raw.title === "string") {
      const title = raw.title.trim();
      if (title) titles.add(title);
    }
  }

  return Array.from(titles);
}
