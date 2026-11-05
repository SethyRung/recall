export function startMockProviders(port = 3111) {
  const requests: { path: string; body: Record<string, any> }[] = [];
  let badEmbedding = false;
  const server = Bun.serve({
    port,
    hostname: "127.0.0.1",
    async fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === "/control") {
        const control = (await request.json()) as { badEmbedding?: boolean; clear?: boolean };
        badEmbedding = control.badEmbedding ?? false;
        if (control.clear) requests.length = 0;
        return Response.json({ ok: true });
      }
      if (path === "/requests") return Response.json(requests);
      const body = (await request.json()) as Record<string, any>;
      requests.push({ path, body });
      if (path.endsWith("/embeddings")) {
        const inputs = Array.isArray(body.input) ? body.input : [body.input];
        return Response.json({
          object: "list",
          model: "test-embed",
          usage: { prompt_tokens: 1, total_tokens: 1 },
          data: inputs.map((input, index) => ({
            object: "embedding",
            index,
            embedding: Array.from({ length: badEmbedding ? 8 : 2048 }, (_, i) =>
              i === (String(input).trim() === "XyloCorp" ? 1 : 0) ? 1 : 0,
            ),
          })),
        });
      }
      if (path.startsWith("/primary/")) {
        return Response.json(
          { error: { message: "private-provider-payload", type: "server_error" } },
          { status: 503 },
        );
      }
      const hasToolResult = body.messages?.some(
        (message: { role: string }) => message.role === "tool",
      );
      const question = [...(body.messages ?? [])]
        .reverse()
        .find((message) => message.role === "user")?.content;
      const delta = hasToolResult
        ? { content: "Sethy builds Nuxt applications at XyloCorp." }
        : {
            tool_calls: [
              {
                index: 0,
                id: "call_retrieve",
                type: "function",
                function: {
                  name: "get_information",
                  arguments: JSON.stringify({
                    question: typeof question === "string" ? question : "Sethy Nuxt",
                  }),
                },
              },
            ],
          };
      const chunk = (value: object, finishReason: string | null) =>
        `data: ${JSON.stringify({
          id: "test-completion",
          object: "chat.completion.chunk",
          created: 1,
          model: "test-chat",
          choices: [{ index: 0, delta: value, finish_reason: finishReason }],
        })}\n\n`;
      return new Response(
        chunk({ role: "assistant", ...delta }, null) +
          chunk({}, hasToolResult ? "stop" : "tool_calls") +
          "data: [DONE]\n\n",
        {
          headers: { "content-type": "text/event-stream" },
        },
      );
    },
  });
  return { server, requests };
}

if (import.meta.main) {
  const { server } = startMockProviders();
  console.log(`Mock providers: http://127.0.0.1:${server.port}`);
}
