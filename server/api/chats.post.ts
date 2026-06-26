import { db, schema } from "@nuxthub/db";
import { z } from "zod";
import type { UIMessage } from "ai";

export default defineEventHandler(async (event) => {
  const visitorId = getVisitorId(event);

  const { id, message } = await readValidatedBody(
    event,
    z.object({
      id: z.string().min(1),
      message: z.custom<UIMessage>(),
    }).parse,
  );

  const [chat] = await db.insert(schema.chats).values({ id, visitorId, title: null }).returning();

  if (!chat) {
    return createResponse({
      code: ApiResponseCode.InternalError,
      message: "Failed to create chat",
    });
  }

  await db.insert(schema.messages).values({
    id: message.id,
    chatId: chat.id,
    role: "user",
    parts: message.parts,
  });

  return createResponse(
    { code: ApiResponseCode.Success, message: "Chat created successfully" },
    chat,
  );
});
