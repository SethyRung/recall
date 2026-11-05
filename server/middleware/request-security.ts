export default defineEventHandler((event) => {
  if (!/^\/api\/(?:admin|chats|upload)(?:\/|$)/.test(event.path)) return;
  setHeader(event, "cache-control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(event.method)) assertSameOrigin(event);
});
