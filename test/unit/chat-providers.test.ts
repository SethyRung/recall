import { afterEach, describe, expect, it, vi } from "vitest";
import { stepCountIs, streamText, toUIMessageStream, tool, type UIMessageChunk } from "ai";
import { z } from "zod";
import { createChatModel, getChatModels } from "../../server/utils/providers";
import { DEFAULT_SETTINGS } from "../../shared/utils/settings";
import type { ChatModelConfig } from "../../server/utils/llm-config";
import { createModelRouter, getModelErrorMessage } from "../../server/utils/model-router";

const models: ChatModelConfig[] = [
  {
    id: "anthropic",
    provider: "anthropic",
    model: "test",
    baseUrl: "https://anthropic.test/v1",
    authToken: "anthropic-token",
    apiKey: "ignored-key",
  },
  {
    id: "openrouter",
    provider: "openai",
    model: "vendor/test",
    baseUrl: "https://openrouter.test/api/v1",
    apiKey: "openrouter-key",
  },
];

function openaiStream(delta: Record<string, unknown>, reason: string) {
  return new Response(
    [
      `data: ${JSON.stringify({ id: "completion", object: "chat.completion.chunk", created: 1, model: "vendor/test", choices: [{ index: 0, delta, finish_reason: null }] })}`,
      "",
      `data: ${JSON.stringify({ id: "completion", object: "chat.completion.chunk", created: 1, model: "vendor/test", choices: [{ index: 0, delta: {}, finish_reason: reason }] })}`,
      "",
      "data: [DONE]",
      "",
      "",
    ].join("\n"),
    { headers: { "content-type": "text/event-stream" } },
  );
}

function anthropicStream() {
  const events = [
    {
      type: "message_start",
      message: {
        id: "message",
        type: "message",
        role: "assistant",
        content: [],
        model: "test",
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 0 },
      },
    },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "Anthropic answer" },
    },
    { type: "content_block_stop", index: 0 },
    {
      type: "message_delta",
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: 1 },
    },
    { type: "message_stop" },
  ];
  return new Response(
    events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(""),
    { headers: { "content-type": "text/event-stream" } },
  );
}

function errorResponse(status: number) {
  return new Response(
    JSON.stringify({
      error: { type: "rate_limit_error", message: "provider secret", code: status },
    }),
    { status, headers: { "content-type": "application/json" } },
  );
}

async function readAnswer(router = createModelRouter(), modelList = models) {
  let retrievals = 0;
  const tools = {
    get_information: tool({
      inputSchema: z.object({ question: z.string() }),
      execute: async () => {
        retrievals++;
        return [{ documentTitle: "About", content: "Sethy is a developer." }];
      },
    }),
  };
  const stream = router.stream({
    models: modelList,
    cooldownMs: 60000,
    timeoutMs: 60000,
    start: (model, abortSignal) =>
      streamText({
        model: createChatModel(model),
        system: "Answer about Sethy",
        messages: [{ role: "user", content: "Who is Sethy?" }],
        tools,
        stopWhen: stepCountIs(2),
        maxRetries: 0,
        streamRetries: 0,
        maxOutputTokens: 100,
        abortSignal,
        onError: () => {},
      }).stream,
  });
  const reader = toUIMessageStream({
    stream,
    tools,
    sendReasoning: false,
    onError: getModelErrorMessage,
  }).getReader();
  const chunks: UIMessageChunk[] = [];
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    chunks.push(next.value);
  }
  return { chunks, retrievals };
}

afterEach(() => vi.unstubAllGlobals());

describe("real AI SDK provider adapters", () => {
  it.each([
    { provider: "anthropic", credentialType: "apiKey" },
    { provider: "anthropic", credentialType: "authToken" },
    { provider: "openai", credentialType: "apiKey" },
    { provider: "openai", credentialType: "authToken" },
  ] as const)(
    "uses selected $credentialType with $provider",
    async ({ provider, credentialType }) => {
      const settings = structuredClone(DEFAULT_SETTINGS);
      settings.models = [
        {
          id: "selected",
          enabled: true,
          provider,
          model: "test",
          baseUrl:
            provider === "anthropic"
              ? "https://anthropic.test/v1"
              : "https://openrouter.test/api/v1",
          credentialType,
          apiKey: "selected-key",
          authToken: "selected-token",
        },
      ];
      const fetch = vi.fn(async () =>
        provider === "anthropic"
          ? anthropicStream()
          : openaiStream({ content: "OpenAI answer" }, "stop"),
      );
      vi.stubGlobal("fetch", fetch);
      const { chunks } = await readAnswer(createModelRouter(), getChatModels(settings));
      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe(
        provider === "anthropic"
          ? "https://anthropic.test/v1/messages"
          : "https://openrouter.test/api/v1/chat/completions",
      );
      const headers = new Headers(init.headers);
      const keyHeader = provider === "anthropic" && credentialType === "apiKey";
      expect(headers.get("x-api-key")).toBe(keyHeader ? "selected-key" : null);
      expect(headers.get("authorization")).toBe(
        keyHeader
          ? null
          : `Bearer ${credentialType === "apiKey" ? "selected-key" : "selected-token"}`,
      );
      expect(settings.models[0]?.apiKey).toBe("selected-key");
      expect(settings.models[0]?.authToken).toBe("selected-token");
      expect(chunks.some((chunk) => chunk.type === "text-delta")).toBe(true);
    },
  );

  it("streams Anthropic with bearer auth and the messages endpoint", async () => {
    const fetch = vi.fn(async () => anthropicStream());
    vi.stubGlobal("fetch", fetch);
    const { chunks } = await readAnswer();
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://anthropic.test/v1/messages");
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer anthropic-token");
    expect(headers.get("x-api-key")).toBeNull();
    expect(chunks).toContainEqual(
      expect.objectContaining({ type: "text-delta", delta: "Anthropic answer" }),
    );
  });

  it("switches from an Anthropic 429 to OpenAI Chat Completions and preserves retrieval/citations", async () => {
    const requests: { url: string; init: RequestInit; body: Record<string, unknown> }[] = [];
    const fetch = vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      requests.push({ url, init, body });
      if (url.includes("anthropic.test")) return errorResponse(429);
      const messages = body.messages as { role: string }[];
      if (messages.some((message) => message.role === "tool")) {
        return openaiStream({ content: "Sethy is a developer." }, "stop");
      }
      return openaiStream(
        {
          tool_calls: [
            {
              index: 0,
              id: "retrieve",
              type: "function",
              function: { name: "get_information", arguments: '{"question":"Who is Sethy?"}' },
            },
          ],
        },
        "tool_calls",
      );
    });
    vi.stubGlobal("fetch", fetch);
    const router = createModelRouter();
    const { chunks, retrievals } = await readAnswer(router);
    expect(requests.map((request) => request.url)).toEqual([
      "https://anthropic.test/v1/messages",
      "https://openrouter.test/api/v1/chat/completions",
      "https://openrouter.test/api/v1/chat/completions",
    ]);
    expect(new Headers(requests[1]?.init.headers).get("authorization")).toBe(
      "Bearer openrouter-key",
    );
    expect(requests[1]?.body.model).toBe("vendor/test");
    expect(retrievals).toBe(1);
    expect(chunks).toContainEqual(
      expect.objectContaining({
        type: "tool-output-available",
        output: [{ documentTitle: "About", content: "Sethy is a developer." }],
      }),
    );
    expect(chunks).toContainEqual(
      expect.objectContaining({ type: "text-delta", delta: "Sethy is a developer." }),
    );
    expect(chunks.filter((chunk) => chunk.type === "start")).toHaveLength(1);
    expect(chunks.some((chunk) => chunk.type === "error")).toBe(false);
    requests.length = 0;
    await readAnswer(router);
    expect(requests.every((request) => request.url.includes("openrouter.test"))).toBe(true);
  });

  it("handles OpenAI in-stream rate-limit errors before text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("openrouter.test")) {
          return new Response(
            'data: {"error":{"message":"limited","type":"rate_limit_error","code":429}}\n\n',
            { headers: { "content-type": "text/event-stream" } },
          );
        }
        return anthropicStream();
      }),
    );
    const { chunks } = await readAnswer(createModelRouter(), [...models].reverse());
    expect(chunks).toContainEqual(
      expect.objectContaining({ type: "text-delta", delta: "Anthropic answer" }),
    );
    expect(chunks.some((chunk) => chunk.type === "error")).toBe(false);
  });

  it("does not hide invalid credentials by switching models", async () => {
    const fetch = vi.fn(async () => errorResponse(401));
    vi.stubGlobal("fetch", fetch);
    const { chunks } = await readAnswer();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(chunks).toContainEqual({
      type: "error",
      errorText: "AI provider authentication failed",
    });
    expect(JSON.stringify(chunks)).not.toContain("provider secret");
  });
});
