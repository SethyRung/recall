import { EventEmitter } from "node:events";
import type { H3Event } from "h3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../shared/utils/settings";

const search = vi.hoisted(() => vi.fn());
vi.mock("../../server/utils/embed", () => ({ searchChunks: search }));
import { createChatStream } from "../../server/utils/chat-stream";

function settings() {
  return {
    ...structuredClone(DEFAULT_SETTINGS),
    models: [
      {
        id: crypto.randomUUID(),
        enabled: true,
        provider: "openai" as const,
        model: "test-chat",
        baseUrl: "https://provider.test/v1",
        apiKey: "private-provider-key",
        authToken: "",
      },
    ],
  };
}

function event() {
  const response = Object.assign(new EventEmitter(), { writableFinished: false });
  return { node: { res: response } } as unknown as H3Event;
}

function completion(delta: object, finishReason: string) {
  const chunk = (value: object, reason: string | null) =>
    `data: ${JSON.stringify({
      id: "completion",
      object: "chat.completion.chunk",
      created: 1,
      model: "test-chat",
      choices: [{ index: 0, delta: value, finish_reason: reason }],
    })}\n\n`;
  return new Response(`${chunk(delta, null)}${chunk({}, finishReason)}data: [DONE]\n\n`, {
    headers: { "content-type": "text/event-stream" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  search.mockReset();
});

describe("shared Recall generation", () => {
  it("retrieves once, forwards only accepted hits and streams the answer with source titles", async () => {
    const config = settings();
    search.mockResolvedValue({
      hits: [
        { content: "Sethy builds Nuxt apps.", documentTitle: "About", passed: true },
        { content: "Unrelated content", documentTitle: "Rejected", passed: false },
      ],
    });
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        completion(
          {
            tool_calls: [
              {
                index: 0,
                id: "retrieve-1",
                type: "function",
                function: { name: "get_information", arguments: '{"question":"Sethy projects"}' },
              },
            ],
          },
          "tool_calls",
        ),
      )
      .mockResolvedValueOnce(completion({ content: "Sethy builds Nuxt apps." }, "stop"));
    vi.stubGlobal("fetch", request);
    const stream = await createChatStream(
      event(),
      [
        {
          id: "u1",
          role: "user",
          parts: [{ type: "text", text: "What does Sethy build?" }],
        },
      ],
      config,
    );
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);

    expect(request).toHaveBeenCalledTimes(2);
    expect(search).toHaveBeenCalledExactlyOnceWith(
      "Sethy projects",
      config,
      expect.any(AbortSignal),
    );
    expect(chunks).toContainEqual(
      expect.objectContaining({ type: "text-delta", delta: "Sethy builds Nuxt apps." }),
    );
    expect(chunks.some((chunk) => chunk.type.startsWith("reasoning"))).toBe(false);
    const toolResult = chunks.find((chunk) => chunk.type === "tool-output-available");
    expect(toolResult).toMatchObject({ output: [{ documentTitle: "About", passed: true }] });
    const followup = JSON.parse(request.mock.calls[1]![1]!.body as string);
    expect(JSON.stringify(followup.messages)).not.toContain("Unrelated content");
    expect(followup.max_tokens).toBe(config.chat.maxOutputTokens);
  });

  it("rejects generation without configured models", async () => {
    await expect(createChatStream(event(), [], DEFAULT_SETTINGS)).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(search).not.toHaveBeenCalled();
  });
});
