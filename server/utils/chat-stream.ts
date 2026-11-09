import { createError, type H3Event } from "h3";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  toUIMessageStream,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { SYSTEM_PROMPT } from "../constants";
import type { AppSettings } from "../../shared/utils/settings";
import { createModelRouter, getModelErrorMessage } from "./model-router";
import { createChatModel, getChatModels } from "./providers";
import { searchChunks } from "./embed";
import { sanitizeProviderError } from "./errors";

const router = createModelRouter();

export async function createChatStream(
  event: H3Event,
  messages: UIMessage[],
  settings: AppSettings,
) {
  const models = getChatModels(settings);
  if (!models.length)
    throw createError({ statusCode: 503, statusMessage: "Chat models are not configured" });

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
  const modelMessages = await convertToModelMessages(messages);
  const stream = router.stream({
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
  return toUIMessageStream({
    stream,
    tools,
    sendSources: true,
    sendReasoning: false,
    onError: getModelErrorMessage,
  });
}
