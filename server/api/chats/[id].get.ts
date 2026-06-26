import { db } from "@nuxthub/db";
import { chats, messages } from "@nuxthub/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

export default defineEventHandler(async (event) => {
  const visitorId = getVisitorId(event);
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.string() }).parse);

  const chat = await db.query.chats.findFirst({
    where: () => and(eq(chats.id, id), eq(chats.visitorId, visitorId)),
    with: {
      messages: {
        orderBy: () => asc(messages.createdAt),
      },
    },
  });

  if (!chat) {
    return createResponse({ code: ApiResponseCode.NotFound, message: "Chat not found" });
  }

  return createResponse(
    { code: ApiResponseCode.Success, message: "Chat retrieved successfully" },
    chat,
  );
});
