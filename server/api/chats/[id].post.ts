import { db } from "@nuxthub/db";
import { chats, messages } from "@nuxthub/db/schema";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { SYSTEM_PROMPT } from "#server/constants";

export default defineEventHandler(async (event) => {
  const visitorId = getVisitorId(event);

  const { id } = await getValidatedRouterParams(event, z.object({ id: z.string() }).parse);

  const { model: modelId, messages: incoming } = await readValidatedBody(
    event,
    z.object({
      model: z.string().optional(),
      messages: z.array(z.custom<UIMessage>()),
    }).parse,
  );

  const chat = await db.query.chats.findFirst({
    where: () => and(eq(chats.id, id), eq(chats.visitorId, visitorId)),
    with: {
      messages: {
        orderBy: () => asc(messages.createdAt),
      },
    },
  });

  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: "Chat not found" });
  }

  const isFirstExchange = incoming.length === 1 && incoming[0]?.role === "user";

  if (isFirstExchange && !chat.title) {
    const title = await generateChatTitle(incoming[0]!);
    if (title) {
      await db.update(chats).set({ title }).where(eq(chats.id, chat.id));
    }
  }

  const lastMessage = incoming[incoming.length - 1];
  if (lastMessage?.role === "user" && incoming.length > 1) {
    await db
      .insert(messages)
      .values({
        id: lastMessage.id,
        chatId: chat.id,
        role: "user",
        parts: lastMessage.parts,
      })
      .onConflictDoUpdate({
        target: messages.id,
        set: { parts: lastMessage.parts },
      });
  }

  const abortController = new AbortController();
  event.node.req.on("close", () => abortController.abort());

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const modelMessages = await convertToModelMessages(incoming);

      const result = streamText({
        model: getModel(modelId),
        system: SYSTEM_PROMPT,
        stopWhen: stepCountIs(5),
        messages: modelMessages,
        tools: {
          "Get Information": tool({
            description: "get information from your knowledge base to answer questions.",
            inputSchema: z.object({
              question: z.string().describe("the users question"),
            }),
            execute: async ({ question }) => findRelevantContent(question),
          }),
        },
      });

      writer.merge(
        result.toUIMessageStream({
          sendSources: true,
          sendReasoning: true,
          onError: (error) => {
            if (typeof error === "string") return error;
            if (error instanceof Error) return error.message;
            return "Unknown error";
          },
        }),
      );
    },
    onFinish: async ({ messages: streamed }) => {
      if (streamed.length === 0) return;

      await db
        .insert(messages)
        .values(
          streamed.map((message) => ({
            id: message.id,
            chatId: chat.id,
            role: message.role as "user" | "assistant",
            parts: message.parts,
          })),
        )
        .onConflictDoNothing();
    },
  });

  return createUIMessageStreamResponse({ stream });
});
