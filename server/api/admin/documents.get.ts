import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@nuxthub/db";
import { chunks, documents } from "@nuxthub/db/schema";

export default defineEventHandler(async (event): Promise<AdminDocument[]> => {
  await requireUserSession(event, { user: { role: "admin" } });

  const chunkCounts = db
    .select({
      documentId: chunks.documentId,
      chunkCount: count().as("chunk_count"),
    })
    .from(chunks)
    .groupBy(chunks.documentId)
    .as("chunk_counts");

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      contentLength: sql<number>`char_length(${documents.content})`.mapWith(Number),
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      chunkCount: sql<number>`coalesce(${chunkCounts.chunkCount}, 0)`.mapWith(Number),
    })
    .from(documents)
    .leftJoin(chunkCounts, eq(chunkCounts.documentId, documents.id))
    .orderBy(desc(documents.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    contentLength: row.contentLength,
    chunkCount: row.chunkCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
});
