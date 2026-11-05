import type { H3Event } from "h3";

export function assertSameOrigin(event: H3Event) {
  const origin = getHeader(event, "origin");
  const siteUrl = useRuntimeConfig(event).public.siteUrl;
  const expected = siteUrl ? new URL(siteUrl).origin : getRequestURL(event).origin;
  if (getHeader(event, "sec-fetch-site") === "cross-site" || (origin && origin !== expected)) {
    throw createError({ statusCode: 403, statusMessage: "Cross-origin changes are not allowed" });
  }
}

export function assertJsonRequest(event: H3Event) {
  assertSameOrigin(event);
  if (getHeader(event, "content-type")?.split(";", 1)[0]?.trim() !== "application/json") {
    throw createError({ statusCode: 415, statusMessage: "JSON required" });
  }
}
