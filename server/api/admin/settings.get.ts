export default defineEventHandler(async (event) => {
  await requireUserSession(event, { user: { role: "admin" } });
  setHeader(event, "cache-control", "no-store");
  return getAdminSettingsResponse(event);
});
