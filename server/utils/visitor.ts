import type { H3Event } from "h3";
import { getCookie, setCookie } from "h3";

const VISITOR_COOKIE = "recall.visitor_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function getVisitorId(event: H3Event): string {
  const cookieNames = event.context.recallApiAuthenticated
    ? ["chat.visitor_id", VISITOR_COOKIE]
    : [VISITOR_COOKIE];
  const existing = cookieNames
    .map((name) => getCookie(event, name))
    .find(
      (value) =>
        value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
    );
  if (existing) return existing;

  const id = crypto.randomUUID();

  for (const name of cookieNames)
    setCookie(event, name, id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: !import.meta.dev,
      maxAge: ONE_YEAR_SECONDS,
    });

  return id;
}
