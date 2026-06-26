import { db } from "@nuxthub/db";
import { chats, messages } from "@nuxthub/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

export default defineEventHandler(async (event) => {
  const visitorId = getVisitorId(event);
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.string() }).parse);

  const { messageId, type } = await readValidatedBody(
    event,
    z.object({
      messageId: z.string(),
      type: z.enum(["edit", "regenerate"]),
    }).parse,
  );

  const chat = await db.query.chats.findFirst({
    where: () => and(eq(chats.id, id), eq(chats.visitorId, visitorId)),
  });

  if (!chat) {
    return createResponse({ code: ApiResponseCode.NotFound, message: "Chat not found" });
  }

  const allMessages = await db
    .select({ id: messages.id, role: messages.role })
    .from(messages)
    .where(eq(messages.chatId, id))
    .orderBy(asc(messages.createdAt), asc(messages.id));

  const targetIndex = allMessages.findIndex((m) => m.id === messageId);
  if (targetIndex === -1) {
    return createResponse({ code: ApiResponseCode.NotFound, message: "Message not found" });
  }

  const targetRole = allMessages[targetIndex]!.role;
  if (type === "edit" && targetRole !== "user") {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Can only edit user messages",
    });
  }
  if (type === "regenerate" && targetRole !== "assistant") {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Can only regenerate assistant messages",
    });
  }

  const startIndex = type === "edit" ? targetIndex + 1 : targetIndex;
  const idsToDelete = allMessages.slice(startIndex).map((m) => m.id);

  if (idsToDelete.length > 0) {
    await db.delete(messages).where(inArray(messages.id, idsToDelete));
  }

  return createResponse(
    { code: ApiResponseCode.Success, message: "Messages deleted successfully" },
    null,
  );
});
