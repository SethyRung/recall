import { blob } from "hub:blob";
import { db } from "@nuxthub/db";
import { chats } from "@nuxthub/db/schema";
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

  const prefix = `${visitorId}/${id}`;
  try {
    const { blobs: items } = await blob.list({ prefix });
    if (items.length > 0) {
      await Promise.all(
        items.map((item) =>
          blob.del(item.pathname).catch((err) => {
            console.error("[delete-chat] Failed to delete blob:", item.pathname, err);
          }),
        ),
      );
    }
  } catch (err) {
    console.error("Failed to list/delete chat files:", err);
  }

  await db.delete(chats).where(and(eq(chats.id, id), eq(chats.visitorId, visitorId)));
  return createResponse(
    { code: ApiResponseCode.Success, message: "Chat deleted successfully" },
    null,
  );
});
