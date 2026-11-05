import { describe, expect, it } from "vitest";
import type { LanguageModelUsage, TextStreamPart } from "ai";
import type { ChatModelConfig } from "../../server/utils/llm-config";
import {
  createModelRouter,
  getModelErrorMessage,
  isRecoverableModelError,
} from "../../server/utils/model-router";

type Part = TextStreamPart<{}>;
const models: ChatModelConfig[] = [
  { id: "primary", provider: "anthropic", model: "first", apiKey: "key" },
  { id: "backup", provider: "openai", model: "second", apiKey: "key" },
];
const text: Part = { type: "text-delta", id: "answer", text: "Hello" };
const finish: Part = {
  type: "finish",
  finishReason: "stop",
  rawFinishReason: "stop",
  totalUsage: {} as LanguageModelUsage,
};
const success: Part[] = [{ type: "start" }, { type: "text-start", id: "answer" }, text, finish];

async function* parts(values: Part[]) {
  yield* values;
}

async function collect(stream: ReadableStream<Part>) {
  const reader = stream.getReader();
  const values: Part[] = [];
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) return values;
      values.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
}

function options(start: (model: ChatModelConfig, signal: AbortSignal) => AsyncIterable<Part>) {
  return { models, start, cooldownMs: 60000, timeoutMs: 60000 };
}

describe("model failure classification", () => {
  it.each([402, 403, 408, 429, 500, 502, 503, 529])("recovers from HTTP %s", (statusCode) => {
    expect(isRecoverableModelError({ statusCode })).toBe(true);
  });

  it.each([400, 401, 404, 413, 422])(
    "does not hide HTTP %s configuration/request errors",
    (statusCode) => {
      expect(isRecoverableModelError({ statusCode })).toBe(false);
    },
  );

  it("handles wrapped SDK failures and transport errors", () => {
    expect(isRecoverableModelError({ lastError: { statusCode: 429 } })).toBe(true);
    expect(isRecoverableModelError(new TypeError("fetch failed"))).toBe(true);
    expect(isRecoverableModelError({ cause: { code: "ECONNRESET" } })).toBe(true);
    expect(isRecoverableModelError(new DOMException("timeout", "TimeoutError"))).toBe(true);
    expect(isRecoverableModelError({ type: "overloaded_error" })).toBe(true);
    expect(isRecoverableModelError({ code: "insufficient_quota" })).toBe(true);
    expect(isRecoverableModelError(new DOMException("cancelled", "AbortError"))).toBe(false);
    expect(isRecoverableModelError(new Error("schema validation failed"))).toBe(false);
  });

  it("never forwards raw provider messages or credentials to the browser", () => {
    const error = { statusCode: 500, message: "secret-token and private endpoint" };
    expect(getModelErrorMessage(error)).toBe("Chat service unavailable. Please try again shortly.");
    expect(getModelErrorMessage({ statusCode: 401 })).toBe("AI provider authentication failed");
    expect(getModelErrorMessage({ statusCode: 403 })).toBe("AI provider refused the request");
    expect(getModelErrorMessage({ statusCode: 402 })).toBe("AI provider quota exhausted");
  });
});

describe("priority model router", () => {
  it("uses the first healthy model without touching backups", async () => {
    const called: string[] = [];
    const result = await collect(
      createModelRouter().stream(
        options((model) => {
          called.push(model.id);
          return parts(success);
        }),
      ),
    );
    expect(called).toEqual(["primary"]);
    expect(result).toEqual(success);
  });

  it("discards failed tool/reasoning chunks and falls back before any answer text", async () => {
    const called: string[] = [];
    const result = await collect(
      createModelRouter().stream(
        options((model) => {
          called.push(model.id);
          return parts(
            model.id === "primary"
              ? [
                  { type: "start" },
                  { type: "reasoning-delta", id: "hidden", text: "private" },
                  { type: "tool-input-start", id: "failed-tool", toolName: "get_information" },
                  { type: "error", error: { statusCode: 429 } },
                ]
              : success,
          );
        }),
      ),
    );
    expect(called).toEqual(["primary", "backup"]);
    expect(result).toEqual(success);
  });

  it("skips cooling models across requests and restores priority after expiry", async () => {
    let clock = 0;
    const called: string[] = [];
    let failed = false;
    const router = createModelRouter(() => clock);
    const settings = options((model) => {
      called.push(model.id);
      if (model.id === "primary" && !failed) {
        failed = true;
        return parts([{ type: "error", error: { statusCode: 429 } }]);
      }
      return parts(success);
    });
    await collect(router.stream(settings));
    await collect(router.stream(settings));
    expect(called).toEqual(["primary", "backup", "backup"]);
    clock = 60000;
    await collect(router.stream(settings));
    expect(called.at(-1)).toBe("primary");
  });

  it.each(["120", "Thu, 01 Jan 1970 00:02:00 GMT"])(
    "honors Retry-After: %s",
    async (retryAfter) => {
      let clock = 0;
      const called: string[] = [];
      const router = createModelRouter(() => clock);
      const settings = options((model) => {
        called.push(model.id);
        return parts(
          model.id === "primary"
            ? [
                {
                  type: "error",
                  error: { statusCode: 429, responseHeaders: { "Retry-After": retryAfter } },
                },
              ]
            : success,
        );
      });
      await collect(router.stream(settings));
      clock = 60001;
      await collect(router.stream(settings));
      expect(called).toEqual(["primary", "backup", "backup"]);
      clock = 120001;
      await collect(router.stream(settings));
      expect(called.slice(-2)).toEqual(["primary", "backup"]);
    },
  );

  it("does not mix providers after answer text begins, but cools the failed model", async () => {
    const called: string[] = [];
    const router = createModelRouter();
    const settings = options((model) => {
      called.push(model.id);
      return parts(
        model.id === "primary" ? [text, { type: "error", error: { statusCode: 503 } }] : success,
      );
    });
    expect(await collect(router.stream(settings))).toEqual([
      text,
      { type: "error", error: { statusCode: 503 } },
    ]);
    expect(called).toEqual(["primary"]);
    await collect(router.stream(settings));
    expect(called).toEqual(["primary", "backup"]);
  });

  it("falls back when the preferred provider refuses the account", async () => {
    const called: string[] = [];
    const result = await collect(
      createModelRouter().stream(
        options((model) => {
          called.push(model.id);
          return parts(
            model.id === "primary" ? [{ type: "error", error: { statusCode: 403 } }] : success,
          );
        }),
      ),
    );
    expect(called).toEqual(["primary", "backup"]);
    expect(result).toEqual(success);
  });

  it("does not fall back on authentication errors", async () => {
    const called: string[] = [];
    const result = await collect(
      createModelRouter().stream(
        options((model) => {
          called.push(model.id);
          return parts([{ type: "error", error: { statusCode: 401 } }]);
        }),
      ),
    );
    expect(called).toEqual(["primary"]);
    expect(result).toEqual([{ type: "error", error: { statusCode: 401 } }]);
  });

  it("tries each candidate once, then fails without retrying cooling candidates", async () => {
    const called: string[] = [];
    const router = createModelRouter();
    const settings = options((model) => {
      called.push(model.id);
      return parts([{ type: "error", error: { statusCode: 429 } }]);
    });
    expect(await collect(router.stream(settings))).toEqual([
      { type: "error", error: { statusCode: 429 } },
    ]);
    const result = await collect(router.stream(settings));
    expect(called).toEqual(["primary", "backup"]);
    expect(result[0]?.type).toBe("error");
  });

  it("falls back when the stream closes without a finish event", async () => {
    const called: string[] = [];
    const result = await collect(
      createModelRouter().stream(
        options((model) => {
          called.push(model.id);
          return parts(model.id === "primary" ? [{ type: "start" }] : success);
        }),
      ),
    );
    expect(called).toEqual(["primary", "backup"]);
    expect(result).toEqual(success);
  });

  it("falls back on an attempt timeout", async () => {
    const called: string[] = [];
    const settings = options((model, signal) => {
      called.push(model.id);
      if (model.id === "backup") return parts(success);
      return (async function* () {
        await new Promise<void>((resolve) =>
          signal.addEventListener("abort", () => resolve(), { once: true }),
        );
        yield { type: "abort" as const };
      })();
    });
    const result = await collect(createModelRouter().stream({ ...settings, timeoutMs: 5 }));
    expect(called).toEqual(["primary", "backup"]);
    expect(result).toEqual(success);
  });

  it("does not fall back or cool models on user cancellation", async () => {
    const router = createModelRouter();
    const abort = new AbortController();
    const called: string[] = [];
    const result = await collect(
      router.stream({
        ...options((model) => {
          called.push(model.id);
          abort.abort();
          return parts([{ type: "abort" }]);
        }),
        abortSignal: abort.signal,
      }),
    );
    expect(result).toEqual([]);
    expect(called).toEqual(["primary"]);
    await collect(
      router.stream(
        options((model) => {
          called.push(model.id);
          return parts(success);
        }),
      ),
    );
    expect(called).toEqual(["primary", "primary"]);
  });

  it("cancels a pending pre-answer read without starting a backup", async () => {
    const called: string[] = [];
    const reader = createModelRouter()
      .stream(
        options((model, signal) => {
          called.push(model.id);
          return (async function* () {
            await new Promise<void>((resolve) =>
              signal.addEventListener("abort", () => resolve(), { once: true }),
            );
            yield { type: "abort" as const };
          })();
        }),
      )
      .getReader();
    const pending = reader.read();
    await Promise.resolve();
    await reader.cancel();
    expect(await pending).toEqual({ done: true, value: undefined });
    expect(called).toEqual(["primary"]);
  });

  it("aborts the active provider when the response stream is cancelled", async () => {
    let activeSignal: AbortSignal | undefined;
    const reader = createModelRouter()
      .stream(
        options((_model, signal) => {
          activeSignal = signal;
          return parts(success);
        }),
      )
      .getReader();
    await reader.read();
    await reader.cancel();
    expect(activeSignal?.aborted).toBe(true);
  });
});
