import { createHash } from "node:crypto";
import type { TextStreamPart, ToolSet } from "ai";
import type { ChatModelConfig } from "./llm-config";

function providerFailure(error: unknown): Record<string, unknown> | null {
  let current = error;
  for (let depth = 0; depth < 8; depth++) {
    if (!current || typeof current !== "object") return null;
    const value = current as Record<string, unknown>;
    if (typeof value.statusCode === "number") return value;
    const nested = value.lastError ?? value.cause;
    if (!nested) return value;
    current = nested;
  }
  return null;
}

export function isRecoverableModelError(error: unknown): boolean {
  const failure = providerFailure(error);
  if (!failure) return false;
  const status = failure.statusCode;
  if (typeof status === "number") {
    return [402, 403, 408, 429].includes(status) || (status >= 500 && status <= 599);
  }
  const code = failure.code ?? failure.type;
  if (
    typeof code === "string" &&
    /^(rate_limit_exceeded|rate_limit_error|insufficient_quota|overloaded_error|server_error|api_error|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ECONNABORTED|EPIPE|ENOTFOUND|EAI_AGAIN|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|UND_ERR_BODY_TIMEOUT|UND_ERR_SOCKET)$/.test(
      code,
    )
  ) {
    return true;
  }
  return (
    failure.name === "TimeoutError" ||
    failure.name === "NetworkError" ||
    (failure.name === "TypeError" && failure.message === "fetch failed")
  );
}

export function getModelErrorMessage(error: unknown): string {
  const failure = providerFailure(error);
  const status = failure?.statusCode;
  if (status === 401) return "AI provider authentication failed";
  if (status === 403) return "AI provider refused the request";
  if (status === 402) return "AI provider quota exhausted";
  if (status === 429) return "AI provider rate limit exceeded. Please try again shortly.";
  if (status === 408 || failure?.name === "TimeoutError") return "AI provider request timed out";
  if (error instanceof Error && error.message === "Chat models are not configured") {
    return error.message;
  }
  return "Chat service unavailable. Please try again shortly.";
}

function cooldownDuration(error: unknown, defaultMs: number, now: number): number {
  const headers = providerFailure(error)?.responseHeaders;
  if (!headers || typeof headers !== "object") return defaultMs;
  const retryAfter = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === "retry-after",
  )?.[1];
  if (typeof retryAfter !== "string" || !retryAfter.trim()) return defaultMs;
  const seconds = Number(retryAfter);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - now;
  return Number.isFinite(delay) ? Math.max(defaultMs, delay) : defaultMs;
}

export function createModelRouter(now: () => number = Date.now) {
  const cooldowns = new Map<string, number>();

  function stream<TOOLS extends ToolSet>(options: {
    models: ChatModelConfig[];
    cooldownMs: number;
    timeoutMs: number;
    abortSignal?: AbortSignal;
    start: (model: ChatModelConfig, signal: AbortSignal) => AsyncIterable<TextStreamPart<TOOLS>>;
  }): ReadableStream<TextStreamPart<TOOLS>> {
    const cancelled = new AbortController();
    const requestSignal = options.abortSignal
      ? AbortSignal.any([options.abortSignal, cancelled.signal])
      : cancelled.signal;

    async function* route(): AsyncGenerator<TextStreamPart<TOOLS>> {
      let lastError: unknown = new Error(
        "All chat models are cooling down. Please try again shortly.",
      );
      if (options.models.length === 0) lastError = new Error("Chat models are not configured");

      for (const [key, until] of cooldowns) if (until <= now()) cooldowns.delete(key);
      for (const model of options.models) {
        if (requestSignal.aborted) return;
        const key = createHash("sha256").update(JSON.stringify(model)).digest("hex");
        if ((cooldowns.get(key) ?? 0) > now()) continue;
        const attempt = new AbortController();
        const signal = AbortSignal.any([requestSignal, attempt.signal]);
        const timer = setTimeout(
          () => attempt.abort(new DOMException("Model request timed out", "TimeoutError")),
          options.timeoutMs,
        );
        let committed = false;
        let finished = false;
        const pending: TextStreamPart<TOOLS>[] = [];

        try {
          for await (const part of options.start(model, signal)) {
            signal.throwIfAborted();
            if (part.type === "error") throw part.error;
            if (part.type === "abort") {
              throw new DOMException(part.reason ?? "Model request aborted", "AbortError");
            }
            if (part.type === "finish") finished = true;
            if (committed) {
              yield part;
              continue;
            }
            // Failed attempts must not leave tool IDs or partial answers in the UI stream.
            pending.push(part);
            if (part.type === "text-delta" && part.text.length > 0) {
              committed = true;
              yield* pending;
              pending.length = 0;
            }
          }
          signal.throwIfAborted();
          if (!finished) throw new DOMException("Model stream ended unexpectedly", "NetworkError");
          yield* pending;
          return;
        } catch (error) {
          if (requestSignal.aborted) return;
          const failure = signal.aborted ? signal.reason : error;
          const recoverable = isRecoverableModelError(failure);
          if (recoverable) {
            const at = now();
            cooldowns.set(
              key,
              Math.max(
                cooldowns.get(key) ?? 0,
                at + cooldownDuration(failure, options.cooldownMs, at),
              ),
            );
          }
          if (committed || !recoverable) {
            yield { type: "error", error: failure };
            return;
          }
          lastError = failure;
        } finally {
          clearTimeout(timer);
          attempt.abort();
        }
      }
      if (!requestSignal.aborted) yield { type: "error", error: lastError };
    }

    const iterator = route();
    return new ReadableStream({
      async pull(controller) {
        const next = await iterator.next();
        if (cancelled.signal.aborted) return;
        if (next.done) controller.close();
        else controller.enqueue(next.value);
      },
      async cancel() {
        cancelled.abort();
        await iterator.return(undefined);
      },
    });
  }

  return { stream };
}
