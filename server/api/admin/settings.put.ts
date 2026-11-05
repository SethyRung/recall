import { settingsUpdateSchema } from "../../../shared/utils/settings";

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event, { user: { role: "admin" } });
  assertJsonRequest(event);
  const raw = await readBody(event);
  const parsed = settingsUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const paths = parsed.error.issues.map((issue) => issue.path.join(".") || "settings");
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid settings at: ${paths.join(", ")}`,
    });
  }
  setHeader(event, "cache-control", "no-store");
  return saveAppSettings(
    event,
    parsed.data.settings,
    parsed.data.version,
    parsed.data.clearSecrets,
    user.id,
  );
});
