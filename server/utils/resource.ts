import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@nuxthub/db";
import { documents } from "@nuxthub/db/schema";
import { z } from "zod";
import { parseFrontmatter } from "./frontmatter";
import { generateEmbeddings } from "./embed";
import { getEmbeddingIdentity } from "./embedding-identity";
import { sanitizeProviderError, RagError } from "./errors";
import { buildResourceWriteQuery, withSettingsWriteLock } from "./settings-write";
import type { AppSettings } from "../../shared/utils/settings";

const insertDocumentsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type NewDocumentsParams = z.infer<typeof insertDocumentsSchema>;

export type ResourceResult =
  | { ok: true; chunks: number; id: string; replaced: boolean; skipped: boolean }
  | { ok: false; message: string; chunks: 0; replaced: false; skipped: false };

function hashContent(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function metadataHash(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const hash = (metadata as { contentHash?: unknown }).contentHash;
  return typeof hash === "string" ? hash : null;
}

function withContentHash(metadata: unknown, contentHash: string): Record<string, unknown> {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  return { ...base, contentHash };
}

export async function createResource(
  input: NewDocumentsParams,
  settings: AppSettings,
): Promise<ResourceResult> {
  try {
    const { title: fmTitle, tags, body } = parseFrontmatter(input.content);
    const title = fmTitle || input.title;
    const content = body.trim();

    if (!content) {
      return { ok: false, message: "Empty content", chunks: 0, replaced: false, skipped: false };
    }

    const parsed = insertDocumentsSchema.parse({ ...input, title, content });
    const contentHash = hashContent(content);
    const [existing] = await db
      .select({ id: documents.id, metadata: documents.metadata })
      .from(documents)
      .where(eq(documents.title, title))
      .limit(1);

    const provenance = existing?.metadata as {
      embedIdentity?: string;
      chunkingIdentity?: string;
      tags?: string[];
    } | null;
    const embedIdentity = getEmbeddingIdentity(settings);
    const chunkingIdentity = hashContent(JSON.stringify(settings.chunking));
    if (
      existing &&
      metadataHash(existing.metadata) === contentHash &&
      provenance?.embedIdentity === embedIdentity &&
      provenance?.chunkingIdentity === chunkingIdentity &&
      JSON.stringify(provenance?.tags ?? []) === JSON.stringify(tags ?? [])
    ) {
      return { ok: true, chunks: 0, id: existing.id, replaced: false, skipped: true };
    }

    const embeddings = await generateEmbeddings(content, settings);
    if (embeddings.length === 0) {
      return {
        ok: false,
        message: "No chunks produced",
        chunks: 0,
        replaced: false,
        skipped: false,
      };
    }

    const embedModel = settings.embed.model || "unknown";
    let metadata = withContentHash(parsed.metadata, contentHash);
    metadata = { ...metadata, embedModel, embedIdentity, chunkingIdentity };
    if (tags && tags.length > 0) {
      metadata = { ...metadata, tags };
    }

    const [rows] = await withSettingsWriteLock([
      buildResourceWriteQuery({ settings, title, content, embeddings, metadata }),
    ]);
    const resource = rows?.[0];
    if (!resource || typeof resource.id !== "string")
      throw new RagError("Embedding settings changed during ingestion. Retry the upload.");
    return {
      ok: true,
      chunks: Number(resource.chunks),
      id: resource.id,
      replaced: resource.replaced === true,
      skipped: false,
    };
  } catch (e) {
    return {
      ok: false,
      message: sanitizeProviderError(e, "Embedding generation failed"),
      chunks: 0,
      replaced: false,
      skipped: false,
    };
  }
}
