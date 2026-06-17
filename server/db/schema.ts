import { pgTable, uuid, text, timestamp, integer, index, vector } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull().unique(),
  title: text("title"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    embeddingIdx: index("chunks_embedding_idx").using(
      "ivfflat",
      t.embedding.op("vector_cosine_ops"),
    ),
  }),
);
