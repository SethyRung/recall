import { embed, embedMany } from "ai";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@nuxthub/db";
import { chunks, documents } from "@nuxthub/db/schema";
import type { AppSettings } from "../../shared/utils/settings";

import { chunkMarkdown } from "./chunking";
import { RagError } from "./errors";
import { rankRetrievalHits } from "./retrieval";

export async function generateEmbeddings(value: string, settings: AppSettings) {
  const model = getEmbeddingModel(settings);
  const values = chunkMarkdown(value, settings);
  const { maxChunks } = getRagDefaults(settings);

  if (values.length === 0) return [];
  if (values.length > maxChunks) {
    throw new RagError(`Too many chunks (${values.length}; max ${maxChunks})`);
  }

  const { embeddings } = await embedMany({
    model,
    values,
    maxRetries: 0,
    maxParallelCalls: 2,
    abortSignal: AbortSignal.timeout(60_000),
  });

  if (
    embeddings.length !== values.length ||
    embeddings.some(
      (embedding) =>
        embedding.length !== 2048 || embedding.some((value) => !Number.isFinite(value)),
    )
  ) {
    throw new RagError("Embedding model must return 2048 finite dimensions");
  }
  return embeddings.map((e, i) => ({
    embedding: e,
    content: values[i] || "",
    chunkIndex: i,
  }));
}

export async function generateEmbedding(
  input: string,
  settings: AppSettings,
  signal?: AbortSignal,
) {
  const model = getEmbeddingModel(settings);
  const value = input.replaceAll("\\n", " ");

  const { embedding } = await embed({
    model,
    value,
    maxRetries: 0,
    abortSignal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(60_000)])
      : AbortSignal.timeout(60_000),
  });

  if (embedding.length !== 2048 || embedding.some((value) => !Number.isFinite(value))) {
    throw new RagError("Embedding model must return 2048 finite dimensions");
  }
  return embedding;
}

function getRetrievalParams(settings: AppSettings) {
  const { similarityThreshold, topK } = getRagDefaults(settings);
  return {
    threshold: similarityThreshold,
    k: topK,
  };
}

export async function searchChunks(userQuery: string, settings: AppSettings, signal?: AbortSignal) {
  const identity = getEmbeddingIdentity(settings);
  const compatibleEmbedding = sql`(coalesce(${documents.metadata}->>'embedIdentity' = ${identity}, false) or (${documents.metadata}->>'embedIdentity' is null and coalesce(${documents.metadata}->>'embedModel', '') = ${settings.embed.model}))`;
  const [incompatible] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(sql`not (${compatibleEmbedding})`)
    .limit(1);
  if (incompatible)
    throw new RagError(
      "Knowledge base embedding configuration is incompatible. Re-ingest documents.",
    );
  const userQueryEmbedded = await generateEmbedding(userQuery, settings, signal);
  const distance = sql`(${chunks.embedding}::halfvec(2048)) <=> ${JSON.stringify(userQueryEmbedded)}::halfvec(2048)`;
  const similarity = sql<number>`1 - (${distance})`.mapWith(Number);
  const { threshold, k } = getRetrievalParams(settings);
  const { hybrid, rerank } = getRagDefaults(settings);

  const candidateLimit = Math.max(k * 3, 20);
  if (!hybrid) {
    const rows = await db
      .select({
        id: chunks.id,
        content: chunks.content,
        similarity,
        documentId: chunks.documentId,
        documentTitle: documents.title,
      })
      .from(chunks)
      .innerJoin(documents, eq(documents.id, chunks.documentId))
      .where(compatibleEmbedding)
      .orderBy(asc(distance))
      .limit(rerank ? candidateLimit : k);

    const hits = rankRetrievalHits(userQuery, rows, [], { threshold, k, hybrid: false, rerank });

    return {
      threshold,
      topK: k,
      hits,
    };
  }

  const vectorRows = await db
    .select({
      id: chunks.id,
      content: chunks.content,
      similarity,
      documentId: chunks.documentId,
      documentTitle: documents.title,
    })
    .from(chunks)
    .innerJoin(documents, eq(documents.id, chunks.documentId))
    .where(compatibleEmbedding)
    .orderBy(asc(distance))
    .limit(candidateLimit);

  const ftsQuery = sql`plainto_tsquery('simple', ${userQuery})`;
  const ftsRank =
    sql<number>`ts_rank_cd(to_tsvector('simple', ${chunks.content}), ${ftsQuery})`.mapWith(Number);

  let lexicalRows: {
    id: string;
    content: string;
    similarity: number;
    documentId: string;
    documentTitle: string;
  }[] = [];

  try {
    lexicalRows = await db
      .select({
        id: chunks.id,
        content: chunks.content,
        similarity,
        documentId: chunks.documentId,
        documentTitle: documents.title,
      })
      .from(chunks)
      .innerJoin(documents, eq(documents.id, chunks.documentId))
      .where(and(compatibleEmbedding, sql`to_tsvector('simple', ${chunks.content}) @@ ${ftsQuery}`))
      .orderBy(desc(ftsRank))
      .limit(candidateLimit);
  } catch {
    lexicalRows = [];
  }

  return {
    threshold,
    topK: k,
    hits: rankRetrievalHits(userQuery, vectorRows, lexicalRows, { threshold, k, hybrid, rerank }),
  };
}
