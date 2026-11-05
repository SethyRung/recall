import { sql } from "drizzle-orm";
import { documents } from "@nuxthub/db/schema";

export default defineEventHandler(async (event) => {
  await requireUserSession(event, { user: { role: "admin" } });
  assertSameOrigin(event);

  await withSettingsWriteLock([sql`delete from ${documents}`]);

  return { ok: true };
});
