CREATE TABLE "app_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"secrets" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
WITH normalized AS (
  SELECT id, coalesce(nullif(btrim(title), ''), 'Untitled') AS title,
    count(*) OVER (PARTITION BY coalesce(nullif(btrim(title), ''), 'Untitled')) AS duplicates
  FROM documents
)
UPDATE documents SET title = CASE
  WHEN normalized.duplicates > 1 OR documents.title IS NULL OR btrim(documents.title) = ''
    THEN normalized.title || ' [' || documents.id || ']'
  ELSE normalized.title END
FROM normalized WHERE normalized.id = documents.id;
--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "title" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "chunk_index" integer;
--> statement-breakpoint
WITH ordered AS (
  SELECT chunks.id, row_number() OVER (
    PARTITION BY document_id ORDER BY strpos(documents.content, chunks.content), chunks.id
  ) - 1 AS position
  FROM chunks JOIN documents ON documents.id = chunks.document_id
)
UPDATE chunks SET chunk_index = ordered.position FROM ordered WHERE chunks.id = ordered.id;
--> statement-breakpoint
ALTER TABLE "chunks" ALTER COLUMN "chunk_index" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX "chunks_embedding_hnsw_idx" ON "chunks" USING hnsw (("embedding"::halfvec(2048)) halfvec_cosine_ops);
--> statement-breakpoint
CREATE INDEX "chunks_content_fts_idx" ON "chunks" USING gin (to_tsvector('simple', "content"));
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_title_unique" UNIQUE("title");
