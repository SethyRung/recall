import { db } from "@nuxthub/db";
import { chats, messages } from "@nuxthub/db/schema";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  tool,
  type UIMessage,
} from "ai";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { SYSTEM_PROMPT } from "#server/constants";
import { buildModelContext, userMessageSchema } from "../../utils/chat-input";
import { createModelRouter, getModelErrorMessage } from "../../utils/model-router";

const router = createModelRouter();

export default defineEventHandler(async (event) => {
  assertJsonRequest(event);
  const visitorId = getVisitorId(event);
  const { id } = await getValidatedRouterParams(
    event,
    z.object({ id: z.string().min(1).max(100) }).parse,
  );
  const body = await readValidatedBody(
    event,
    z
      .object({
        id: z.string().optional(),
        trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
        messageId: z.string().optional(),
        messages: z
          .array(
            z
              .object({
                id: z.string().min(1).max(100),
                role: z.enum(["user", "assistant"]),
                parts: z.array(z.object({ type: z.string() }).passthrough()).max(100),
              })
              .passthrough(),
          )
          .min(1)
          .max(100),
      })
      .strict().parse,
  );

  const chat = await db.query.chats.findFirst({
    where: () => and(eq(chats.id, id), eq(chats.visitorId, visitorId)),
  });
  if (!chat) throw createError({ statusCode: 404, statusMessage: "Chat not found" });
  assertChatRateLimit(event);
  const settings = await getDecryptedSettings(event);
  const models = getChatModels(settings);
  if (!models.length)
    throw createError({
      statusCode: 503,
      statusMessage: "Configure chat models in Admin settings",
    });

  const recent = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, id))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(settings.chat.maxMessages);
  const history = recent.reverse().map((message) => ({
    id: message.id,
    role: message.role,
    parts: message.parts ?? [],
  })) as UIMessage[];
  const last = body.messages.at(-1)!;
  if (last.role === "user") {
    const parsed = userMessageSchema.safeParse({ id: last.id, role: last.role, parts: last.parts });
    if (!parsed.success)
      throw createError({ statusCode: 400, statusMessage: "Invalid user message" });
    const index = history.findIndex((message) => message.id === parsed.data.id);
    if (index < 0) {
      const [existing] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.id, parsed.data.id))
        .limit(1);
      if (existing)
        throw createError({ statusCode: 409, statusMessage: "Message ID already exists" });
    }
    if (index >= 0 && (history[index]?.role !== "user" || index !== history.length - 1)) {
      throw createError({
        statusCode: 409,
        statusMessage: "Reload the conversation before sending",
      });
    }
    if (index >= 0) history[index] = parsed.data;
    else history.push(parsed.data);
  }
  let context: UIMessage[];
  try {
    context = buildModelContext(history, settings.chat);
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Message exceeds the configured limits" });
  }
  if (context.at(-1)?.role !== "user")
    throw createError({ statusCode: 400, statusMessage: "No user message to answer" });
  if (last.role === "user") {
    const [written] = await db
      .insert(messages)
      .values({
        id: last.id,
        chatId: id,
        role: "user",
        parts: history.at(-1)!.parts,
      })
      .onConflictDoUpdate({
        target: messages.id,
        set: { parts: history.at(-1)!.parts },
        setWhere: and(eq(messages.chatId, id), eq(messages.role, "user")),
      })
      .returning({ id: messages.id });
    if (!written)
      throw createError({ statusCode: 409, statusMessage: "Message ID already exists" });
  }
  if (!chat.title) {
    const title = getChatTitle(history[0]!);
    if (title) await db.update(chats).set({ title }).where(eq(chats.id, id));
  }

  const controller = new AbortController();
  event.node.res.once("close", () => {
    if (!event.node.res.writableFinished) controller.abort();
  });
  const tools = {
    get_information: tool({
      description:
        "Retrieve information about Sethy. Call once per turn, resolving pronouns and follow-ups from history, then answer from the returned sources.",
      inputSchema: z.object({ question: z.string().trim().min(1).max(2000) }),
      execute: async ({ question }, { abortSignal }) => {
        try {
          const { hits } = await searchChunks(question, settings, abortSignal);
          return hits.filter((hit) => hit.passed);
        } catch (error) {
          throw new Error(sanitizeProviderError(error, "Retrieval unavailable"));
        }
      },
    }),
  };
  const modelMessages = await convertToModelMessages(context);
  const stream = createUIMessageStream({
    onError: getModelErrorMessage,
    execute: ({ writer }) => {
      const routed = router.stream({
        models,
        ...settings.routing,
        abortSignal: controller.signal,
        start: (config, signal) =>
          streamText({
            model: createChatModel(config),
            system: SYSTEM_PROMPT,
            messages: modelMessages,
            tools,
            maxOutputTokens: settings.chat.maxOutputTokens,
            maxRetries: 0,
            streamRetries: 0,
            stopWhen: stepCountIs(2),
            abortSignal: signal,
            onError: () => {},
          }).stream,
      });
      writer.merge(
        toUIMessageStream({
          stream: routed,
          tools,
          sendSources: true,
          sendReasoning: false,
          onError: getModelErrorMessage,
        }),
      );
    },
    onFinish: async ({ messages: streamed }) => {
      const answers = streamed.filter(
        (message) =>
          message.role === "assistant" &&
          message.parts.some((part) => part.type === "text" && part.text.trim()),
      );
      if (answers.length)
        await db
          .insert(messages)
          .values(
            answers.map((message) => ({
              id: message.id,
              chatId: id,
              role: "assistant" as const,
              parts: message.parts,
            })),
          )
          .onConflictDoNothing();
    },
  });
  setHeader(event, "cache-control", "no-store");
  return createUIMessageStreamResponse({ stream });
});
