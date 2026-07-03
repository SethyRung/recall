import { embed, embedMany } from "ai";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { db } from "@nuxthub/db";
import { chunks } from "@nuxthub/db/schema";

function getChunkParams() {
  const { chunkSize, chunkOverlap } = useRuntimeConfig();
  const size = Number(chunkSize ?? 500);
  const overlap = Math.min(Number(chunkOverlap ?? 50), Math.max(0, size - 1));
  return { CHUNK_SIZE: size, CHUNK_OVERLAP: overlap };
}

function splitBySections(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) {
      if (current.length > 0) {
        sections.push(current.join("\n").trim());
      }
      current = [line];
    } else {
      current.push(line);
    }
  }

  const tail = current.join("\n").trim();
  if (tail) sections.push(tail);

  return sections.filter((s) => s.length > 0);
}

function chunkSection(section: string): string[] {
  const { CHUNK_SIZE, CHUNK_OVERLAP } = getChunkParams();
  if (section.length <= CHUNK_SIZE) return [section];

  const out: string[] = [];
  let start = 0;

  while (start < section.length) {
    let end = Math.min(start + CHUNK_SIZE, section.length);
    let slice = section.slice(start, end);

    if (end < section.length) {
      const breakAt = slice.slice(CHUNK_SIZE * 0.5).search(/[.!?\n]\s*[^\s]/);
      if (breakAt >= 0) {
        const realIndex = Math.floor(CHUNK_SIZE * 0.5) + breakAt + 2;
        slice = slice.slice(0, realIndex);
        end = start + slice.length;
      }
    }

    const trimmed = slice.trim();
    if (trimmed) out.push(trimmed);

    if (end >= section.length) break;
    start += Math.max(1, slice.length - CHUNK_OVERLAP);
  }

  return out;
}

export function chunkMarkdown(markdown: string): string[] {
  return splitBySections(markdown).flatMap(chunkSection);
}

export async function generateEmbeddings(value: string) {
  const model = getEmbeddingModel();
  const values = chunkMarkdown(value);

  if (values.length === 0) return [];

  const { embeddings } = await embedMany({
    model,
    values,
  });

  return embeddings.map((e, i) => ({
    embedding: e,
    content: values[i] || "",
  }));
}

export async function generateEmbedding(input: string) {
  const model = getEmbeddingModel();
  const value = input.replaceAll("\\n", " ");

  const { embedding } = await embed({
    model,
    value,
  });

  return embedding;
}

export async function findRelevantContent(userQuery: string) {
  const userQueryEmbedded = await generateEmbedding(userQuery);

  const similarity = sql<number>`1 - (${cosineDistance(chunks.embedding, userQueryEmbedded)})`;

  const { topK, similarityThreshold } = useRuntimeConfig();
  const threshold = Number(similarityThreshold ?? 0.15);
  const k = Number(topK ?? 5);

  const similarGuides = await db
    .select({ name: chunks.content, similarity })
    .from(chunks)
    .where(gt(similarity, threshold))
    .orderBy((t) => desc(t.similarity))
    .limit(k);

  return similarGuides;
}
