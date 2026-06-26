import { generateText, type UIMessage } from "ai";

const TITLE_SYSTEM = `You are a title generator for a chat:
- Generate a short title based on the first user's message
- The title should be less than 30 characters long
- The title should be a summary of the user's message
- Do not use quotes (' or ") or colons (:) or any other punctuation
- Do not use markdown, just plain text`;

export async function generateChatTitle(firstMessage: UIMessage): Promise<string | null> {
  try {
    const { text } = await generateText({
      model: getModel(),
      system: TITLE_SYSTEM,
      prompt: JSON.stringify(firstMessage),
    });
    const cleaned = text.trim().slice(0, 80);
    return cleaned || null;
  } catch {
    return null;
  }
}
