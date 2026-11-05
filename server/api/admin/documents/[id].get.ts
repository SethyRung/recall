import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@nuxthub/db";
import { chunks, documents } from "@nuxthub/db/schema";

const paramsSchema = z.object({ id: z.uuid() });

export default defineEventHandler(async (event): Promise<AdminDocumentDetail> => {
  await requireUserSession(event, { user: { role: "admin" } });

  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);

  const [doc] = await db
    .select({
      id: documents.id,
      title: documents.title,
      content: documents.content,
      metadata: documents.metadata,
      contentLength: sql<number>`char_length(${documents.content})`.mapWith(Number),
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  if (!doc) {
    throw createError({ statusCode: 404, statusMessage: "Document not found" });
  }

  const docChunks = await db
    .select({
      id: chunks.id,
      index: chunks.chunkIndex,
      content: chunks.content,
    })
    .from(chunks)
    .where(eq(chunks.documentId, id))
    .orderBy(asc(chunks.chunkIndex));

  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    metadata: doc.metadata as DocumentMetadata | null,
    contentLength: doc.contentLength,
    chunkCount: docChunks.length,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    chunks: docChunks,
  };
});
