import { createError, getHeader, getRequestURL, setHeader, type H3Event } from "h3";
import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export function assertSameOrigin(event: H3Event) {
  if (event.context.recallApiAuthenticated) return;
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

export function assertChatApiAccess(event: H3Event) {
  setHeader(event, "cache-control", "no-store");
  const config = useRuntimeConfig(event);
  const currentOrigin = config.public.siteUrl
    ? new URL(config.public.siteUrl).origin
    : getRequestURL(event).origin;
  const referer = getHeader(event, "referer");
  const origin = getHeader(event, "origin") || (referer && URL.parse(referer)?.origin);
  const isExternal = !!origin && origin !== currentOrigin;

  if ((!origin && referer) || (!isExternal && getHeader(event, "sec-fetch-site") === "cross-site"))
    throw createError({ statusCode: 403, statusMessage: "Untrusted chat origin" });

  if (!isExternal) return;

  if (!config.chatApiTrustedOrigins.split(",").some((value) => value.trim() === origin))
    throw createError({ statusCode: 403, statusMessage: "Untrusted chat origin" });

  const key = config.chatApiKey;
  if (!key || key.length < 32)
    throw createError({ statusCode: 503, statusMessage: "Chat API is not configured" });

  const token = /^Bearer (\S+)$/i.exec(getHeader(event, "authorization") ?? "")?.[1];
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!token || !timingSafeEqual(digest(token), digest(key)))
    throw createError({ statusCode: 401, statusMessage: "Invalid chat API key" });
  event.context.recallApiAuthenticated = true;
}

export function getChatApiClientAddress(event: H3Event) {
  const address = getHeader(event, "x-recall-client-ip");
  return address && isIP(address) ? address : undefined;
}
