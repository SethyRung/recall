import { db } from "@nuxthub/db";
import { chats, messages, votes } from "@nuxthub/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export default defineEventHandler(async (event) => {
  const visitorId = getVisitorId(event);
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.string() }).parse);

  const { messageId, isUpvoted } = await readValidatedBody(
    event,
    z.object({
      messageId: z.string(),
      isUpvoted: z.boolean().optional(),
    }).parse,
  );

  const chat = await db.query.chats.findFirst({
    where: () => and(eq(chats.id, id), eq(chats.visitorId, visitorId)),
  });

  if (!chat) {
    return createResponse({ code: ApiResponseCode.NotFound, message: "Chat not found" });
  }

  const message = await db.query.messages.findFirst({
    where: () => and(eq(messages.id, messageId), eq(messages.chatId, id)),
  });

  if (!message) {
    return createResponse({ code: ApiResponseCode.NotFound, message: "Message not found" });
  }

  if (message.role !== "assistant") {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Can only vote on assistant messages",
    });
  }

  if (isUpvoted === undefined) {
    await db.delete(votes).where(and(eq(votes.chatId, id), eq(votes.messageId, messageId)));
  } else {
    await db
      .insert(votes)
      .values({ chatId: id, messageId, isUpvoted })
      .onConflictDoUpdate({
        target: [votes.chatId, votes.messageId],
        set: { isUpvoted },
      });
  }

  return createResponse(
    { code: ApiResponseCode.Success, message: "Vote updated successfully" },
    { chatId: id, messageId, isUpvoted },
  );
});
