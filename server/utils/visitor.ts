import type { H3Event } from "h3";
import { getCookie, setCookie } from "h3";

const VISITOR_COOKIE = "recall.visitor_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function getVisitorId(event: H3Event): string {
  const existing = getCookie(event, VISITOR_COOKIE);
  if (existing) return existing;

  const id = crypto.randomUUID();

  setCookie(event, VISITOR_COOKIE, id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: !import.meta.dev,
    maxAge: ONE_YEAR_SECONDS,
  });

  return id;
}
