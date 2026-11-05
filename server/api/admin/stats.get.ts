import { count, eq, isNull, max, sql } from "drizzle-orm";
import { db } from "@nuxthub/db";
import { chunks, documents } from "@nuxthub/db/schema";

export default defineEventHandler(async (event): Promise<AdminStats | Response> => {
  await requireUserSession(event, { user: { role: "admin" } });

  const [docStats] = await db.select({ count: count() }).from(documents);
  const [chunkStats] = await db.select({ count: count() }).from(chunks);
  const [lastIngest] = await db.select({ last: max(documents.updatedAt) }).from(documents);
  const [size] = await db
    .select({
      totalChars: sql<number>`coalesce(sum(char_length(${documents.content})), 0)`.mapWith(Number),
    })
    .from(documents);

  const documentCount = docStats?.count ?? 0;
  const chunkCount = chunkStats?.count ?? 0;

  const [empty] = await db
    .select({ count: count() })
    .from(documents)
    .leftJoin(chunks, eq(chunks.documentId, documents.id))
    .where(isNull(chunks.id));

  const settings = await getDecryptedSettings(event);
  if (!settings) return settingsUnavailableResponse();
  const { embed } = settings;
  const models = getChatModels(settings);
  const rag = getRagDefaults(settings);

  const storedModels = await db
    .select({
      model: sql<string | null>`${documents.metadata}->>'embedModel'`,
    })
    .from(documents)
    .groupBy(sql`${documents.metadata}->>'embedModel'`);

  const corpusModels = storedModels
    .map((r) => r.model)
    .filter((m): m is string => typeof m === "string" && m.length > 0);

  const currentEmbedModel = embed.model || null;
  const identity = getEmbeddingIdentity(settings);
  const [incompatible] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(sql`
    not (coalesce(${documents.metadata}->>'embedIdentity' = ${identity}, false)
      or (${documents.metadata}->>'embedIdentity' is null
        and coalesce(${documents.metadata}->>'embedModel', '') = ${settings.embed.model}))
  `)
    .limit(1);
  const modelMismatch = Boolean(incompatible);

  return {
    documents: documentCount,
    chunks: chunkCount,
    emptyDocuments: empty?.count ?? 0,
    totalChars: size?.totalChars ?? 0,
    avgChunksPerDoc: documentCount === 0 ? 0 : Math.round((chunkCount / documentCount) * 10) / 10,
    lastIngest: lastIngest?.last ? lastIngest.last.toISOString() : null,
    pipeline: {
      llm: {
        model: models.map((model) => `${model.provider}: ${model.model}`).join(" → ") || null,
        configured: models.length > 0,
      },
      embed: {
        model: currentEmbedModel,
        configured: Boolean(embed.model && (embed.apiKey || embed.authToken)),
        topK: rag.topK,
        similarityThreshold: rag.similarityThreshold,
        chunkSize: rag.chunkSize,
        chunkOverlap: rag.chunkOverlap,
        dimensions: rag.dimensions,
        hybrid: rag.hybrid,
        rerank: rag.rerank,
        corpusModels,
        modelMismatch,
      },
    },
  };
});
