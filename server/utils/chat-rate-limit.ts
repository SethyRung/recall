import type { H3Event } from "h3";

const requests = new Map<string, { count: number; reset: number }>();

export function assertChatRateLimit(event: H3Event) {
  const now = Date.now();
  for (const [key, value] of requests) if (value.reset <= now) requests.delete(key);
  const address =
    getRequestIP(event, { xForwardedFor: useRuntimeConfig(event).trustProxyHeaders }) ?? "unknown";
  const entry = requests.get(address) ?? { count: 0, reset: now + 60_000 };
  if (entry.count >= 10 || (!requests.has(address) && requests.size >= 10000)) {
    setHeader(event, "retry-after", Math.max(1, Math.ceil((entry.reset - now) / 1000)));
    throw createError({ statusCode: 429, statusMessage: "Too many requests. Try again shortly." });
  }
  entry.count++;
  requests.set(address, entry);
}
