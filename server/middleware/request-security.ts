export default defineEventHandler((event) => {
  setHeader(event, "cache-control", "no-store");

  if (/^\/api\/chats(?:\/|$)/.test(event.path.split("?", 1)[0]!)) {
    assertChatApiAccess(event);
    if (event.context.recallApiAuthenticated)
      event.context.recallClientAddress = getChatApiClientAddress(event);
    return;
  }

  if (!/^\/api\/(?:admin|upload)(?:\/|$)/.test(event.path)) return;

  if (!["GET", "HEAD", "OPTIONS"].includes(event.method)) assertSameOrigin(event);
});
