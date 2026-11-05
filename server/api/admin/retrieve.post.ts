import { z } from "zod";

const bodySchema = z.object({
  query: z.string().trim().min(1).max(2000),
});

export default defineEventHandler(async (event): Promise<AdminRetrieveResult | Response> => {
  await requireUserSession(event, { user: { role: "admin" } });

  const { query } = await readValidatedBody(event, bodySchema.parse);
  const settings = await getDecryptedSettings(event);
  if (!settings) return settingsUnavailableResponse();
  try {
    const result = await searchChunks(query, settings);
    return { query, ...result };
  } catch (e) {
    throw createError({
      statusCode: 502,
      statusMessage: sanitizeProviderError(e, "Embedding provider unreachable"),
    });
  }
});
