import { count, max } from "drizzle-orm";
import { chunks, documents } from "@nuxthub/db/schema";

export default defineEventHandler(async () => {
  try {
    const [docStats] = await db.select({ count: count() }).from(documents);
    const [chunkStats] = await db.select({ count: count() }).from(chunks);
    const [lastIngest] = await db.select({ last: max(documents.updatedAt) }).from(documents);

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
