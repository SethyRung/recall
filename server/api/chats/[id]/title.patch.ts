import { db } from "@nuxthub/db";
import { chats } from "@nuxthub/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export default defineEventHandler(async (event) => {
  const visitorId = getVisitorId(event);
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.string() }).parse);

  const { title } = await readValidatedBody(
    event,
    z.object({ title: z.string().trim().min(1).max(100) }).parse,
  );

  const [updated] = await db
    .update(chats)
    .set({ title })
    .where(and(eq(chats.id, id), eq(chats.visitorId, visitorId)))
    .returning();

  if (!updated) {
    return createResponse({ code: ApiResponseCode.NotFound, message: "Chat not found" });
  }

  return createResponse(
    { code: ApiResponseCode.Success, message: "Chat title updated successfully" },
    updated,
  );
});
