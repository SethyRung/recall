import { db } from "@nuxthub/db";
import { documents, chunks } from "@nuxthub/db/schema";

export default defineEventHandler(async () => {
  try {
    await db.delete(documents);
    await db.delete(chunks);
    return createResponse({ code: ApiResponseCode.Success }, { ok: true });
  } catch {
    return createResponse(
      { code: ApiResponseCode.InternalError, message: "Failed to reset database" },
      null,
    );
  }
});
