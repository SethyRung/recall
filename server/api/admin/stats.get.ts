import { count, max } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export default defineEventHandler(async () => {
  try {
    const [docStats] = await db.select({ count: count() }).from(schema.documents);
    const [chunkStats] = await db.select({ count: count() }).from(schema.chunks);
    const [lastIngest] = await db
      .select({ last: max(schema.documents.updatedAt) })
      .from(schema.documents);

    return createResponse(
      { code: ApiResponseCode.Success },
      {
        documents: docStats?.count ?? 0,
        chunks: chunkStats?.count ?? 0,
        lastIngest: lastIngest?.last ? lastIngest.last.toISOString() : null,
      },
    );
  } catch {
    return createResponse(
      { code: ApiResponseCode.InternalError, message: "Failed to load stats" },
      null,
    );
  }
});
