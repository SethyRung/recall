import { streamText, convertToModelMessages, tool, type UIMessage, stepCountIs } from "ai";
import { SYSTEM_PROMPT } from "#server/constants";
import { z } from "zod";

export default defineEventHandler(async (event) => {
  const { messages } = await readBody<{ messages: UIMessage[] }>(event);

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    stopWhen: stepCountIs(5),
    messages: await convertToModelMessages(messages),
    tools: {
      "Get Information": tool({
        description: `get information from your knowledge base to answer questions.`,
        inputSchema: z.object({
          question: z.string().describe("the users question"),
        }),
        execute: async ({ question }) => findRelevantContent(question),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
});
