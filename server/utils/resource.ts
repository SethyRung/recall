import { db } from "@nuxthub/db";
import { chunks, documents } from "@nuxthub/db/schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

const insertDocumentsSchema = createSelectSchema(documents).extend({}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

type NewDocumentsParams = z.infer<typeof insertDocumentsSchema>;

export async function createResource(input: NewDocumentsParams) {
  try {
    const { content } = insertDocumentsSchema.parse(input);

    const [resource] = await db.insert(documents).values({ content }).returning();

    if (!resource) throw new Error("Failed to create resource.");

    const embeddings = await generateEmbeddings(content);

    await db.insert(chunks).values(
      embeddings.map((embedding) => ({
        documentId: resource.id,
        ...embedding,
      })),
    );

    return {
      ok: true,
      chunks: embeddings.length,
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "",
      chunks: 0,
    };
  }
}
