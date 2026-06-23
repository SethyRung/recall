import { embed, embedMany } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { db } from "@nuxthub/db";
import { chunks } from "@nuxthub/db/schema";

function getEmbeddingModel() {
  const { embedBaseUrl: baseURL, embedApiKey: apiKey, embedModel } = useRuntimeConfig();
  return createOpenAI({
    baseURL,
    apiKey,
  }).embedding(embedModel);
}

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

function splitBySections(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^#{1,6}\s/.test(line) && current.length > 0) {
      sections.push(current.join("\n").trim());
      current = [];
    }
    current.push(line);
  }

  const tail = current.join("\n").trim();
  if (tail) sections.push(tail);

  return sections.filter((s) => s.length > 0);
}

function chunkSection(section: string): string[] {
  if (section.length <= CHUNK_SIZE) return [section];

  const chunks: string[] = [];
  let start = 0;

  while (start < section.length) {
    const end = Math.min(start + CHUNK_SIZE, section.length);
    let slice = section.slice(start, end);

    if (end < section.length) {
      const lastBreak = slice.search(/[.!?\n]\s*[^\s]/g);
      if (lastBreak > CHUNK_SIZE * 0.5) {
        slice = slice.slice(0, lastBreak + 1);
      }
    }

    const trimmed = slice.trim();
    if (trimmed) chunks.push(trimmed);

    if (end >= section.length) break;
    start += slice.length - CHUNK_OVERLAP;
  }

  return chunks;
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
  await writeEmbedding(userQueryEmbedded);

  const similarity = sql<number>`1 - (${cosineDistance(chunks.embedding, userQueryEmbedded)})`;

  const similarGuides = await db
    .select({ name: chunks.content, similarity })
    .from(chunks)
    .where(gt(similarity, 0.5))
    .orderBy((t) => desc(t.similarity))
    .limit(4);

  return similarGuides;
}
