import { db } from "@nuxthub/db";
import { chats, messages } from "@nuxthub/db/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { userMessageSchema } from "../utils/chat-input";

export default defineEventHandler(async (event) => {
  assertJsonRequest(event);
  const visitorId = getVisitorId(event);

  const { id, message } = await readValidatedBody(
    event,
    z.object({
      id: z.uuid(),
      message: userMessageSchema,
    }).parse,
  );

  const settings = await getDecryptedSettings(event);
  if (
    message.parts.reduce((sum, part) => sum + (part.type === "text" ? part.text.length : 0), 0) >
    settings.chat.maxCharsPerMessage
  ) {
    throw createError({ statusCode: 400, statusMessage: "Message too long" });
  }
  const result = await db.execute(sql`
    with new_chat as (
      insert into ${chats} (id, visitor_id) values (${id}, ${visitorId}) returning *
    ), initial_message as (
      insert into ${messages} (id, chat_id, role, parts)
      select ${message.id}, new_chat.id, 'user', ${JSON.stringify(message.parts)}::jsonb from new_chat
      returning id
    )
    select new_chat.* from new_chat where exists(select 1 from initial_message)
  `);
  const rows = Array.isArray(result) ? result : (result as { rows: unknown[] }).rows;
  const raw = rows[0] as
    | { id: string; title: string | null; visitor_id: string; created_at: Date }
    | undefined;
  const chat = raw
    ? { id: raw.id, title: raw.title, visitorId: raw.visitor_id, createdAt: raw.created_at }
    : undefined;

  if (!chat) {
    return createResponse({
      code: ApiResponseCode.InternalError,
      message: "Failed to create chat",
    });
  }

  return createResponse(
    { code: ApiResponseCode.Success, message: "Chat created successfully" },
    chat,
  );
});
