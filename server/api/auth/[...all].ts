import type { H3Event } from "h3";

export default defineEventHandler(async (event: H3Event) => {
  const auth = serverAuth(event);
  return auth.handler(toWebRequest(event));
});
