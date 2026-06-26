import { db } from "@nuxthub/db";
import { chats, votes } from "@nuxthub/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export default defineEventHandler(async (event) => {
  const visitorId = getVisitorId(event);
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.string() }).parse);

  const chat = await db.query.chats.findFirst({
    where: () => and(eq(chats.id, id), eq(chats.visitorId, visitorId)),
  });

  if (!chat) {
    return createResponse({ code: ApiResponseCode.NotFound, message: "Chat not found" });
  }

  const data = await db.select().from(votes).where(eq(votes.chatId, id));

  return createResponse(
    { code: ApiResponseCode.Success, message: "Votes retrieved successfully" },
    data,
  );
});
