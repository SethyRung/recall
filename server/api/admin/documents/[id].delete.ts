import { sql } from "drizzle-orm";
import { z } from "zod";
import { documents } from "@nuxthub/db/schema";

const paramsSchema = z.object({ id: z.uuid() });

export default defineEventHandler(async (event) => {
  await requireUserSession(event, { user: { role: "admin" } });
  assertSameOrigin(event);

  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);

  const [deleted] = await withSettingsWriteLock([
    sql`delete from ${documents} where ${documents.id} = ${id} returning id`,
  ]);

  if (!deleted?.length) {
    throw createError({ statusCode: 404, statusMessage: "Document not found" });
  }

  return { ok: true, id };
});
