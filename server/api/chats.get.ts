import { db, schema } from "@nuxthub/db";
import { desc, eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const visitorId = getVisitorId(event);

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
});
