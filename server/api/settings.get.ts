export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  const { settings } = await getSettingsRecord();
  return { chat: settings.chat };
});
