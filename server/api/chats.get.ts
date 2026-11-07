import { NeonDbError } from "@neondatabase/serverless";
import { db, schema } from "@nuxthub/db";
import { desc, DrizzleQueryError, eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const visitorId = getVisitorId(event);
  let connectionError: Error | undefined;

  for (const delay of [0, 250]) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      const chats = await db
        .select({
          id: schema.chats.id,
          title: schema.chats.title,
          createdAt: schema.chats.createdAt,
        })
        .from(schema.chats)
        .where(eq(schema.chats.visitorId, visitorId))
        .orderBy(desc(schema.chats.createdAt));

      return createResponse(
        { code: ApiResponseCode.Success, message: "Chats retrieved successfully" },
        chats,
      );
    } catch (error) {
      const cause = error instanceof DrizzleQueryError ? error.cause : error;
      if (!(cause instanceof NeonDbError) || !cause.sourceError) throw error;
      connectionError = cause.sourceError;
    }
  }

  throw createError({
    statusCode: 503,
    statusMessage: "Chat history temporarily unavailable",
    cause: connectionError,
  });
});
