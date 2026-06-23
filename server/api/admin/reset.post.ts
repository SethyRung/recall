import { db } from "@nuxthub/db";
import { documents, chunks } from "@nuxthub/db/schema";

export default defineEventHandler(async () => {
  await db.delete(documents);
  await db.delete(chunks);
  return { ok: true };
});
