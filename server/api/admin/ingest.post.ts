import { z } from "zod";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXT = /\.(md|markdown|mdown|mkd)$/i;

const MAX_FILES = 20;

const pasteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string(),
  dryRun: z.boolean().optional(),
});

function assertSourceSize(content: string, source: string) {
  if (Buffer.byteLength(content, "utf-8") > MAX_SOURCE_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: `${source} exceeds ${MAX_SOURCE_BYTES / 1024 / 1024}MB limit`,
    });
  }
}

function assertNotEmpty(content: string) {
  if (!content.trim()) {
    throw createError({ statusCode: 400, statusMessage: "Empty markdown" });
  }
}

export default defineEventHandler(async (event): Promise<AdminIngestResult | Response> => {
  await requireUserSession(event, { user: { role: "admin" } });
  assertSameOrigin(event);
  const settings = await getDecryptedSettings(event);
  if (!settings) return settingsUnavailableResponse();

  const contentType = getHeader(event, "content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await readValidatedBody(event, pasteSchema.parse);
    assertNotEmpty(body.content);
    assertSourceSize(body.content, "Paste");

    if (body.dryRun) {
      const { body: contentBody } = parseFrontmatter(body.content);
      const trimmed = contentBody.trim();
      assertNotEmpty(trimmed);
      const values = chunkMarkdown(trimmed, settings);
      const previewChunks = values.map((val, i) => ({
        index: i,
        content: val,
        length: val.length,
      }));
      return {
        processed: 0,
        replaced: 0,
        skipped: 0,
        totalChunks: previewChunks.length,
        dryRun: true,
        previewChunks,
        errors: [],
      };
    }

    return ingestOne(
      {
        title: body.title,
        content: body.content,
        metadata: {
          mimeType: "text/markdown",
          size: Buffer.byteLength(body.content, "utf-8"),
          source: "paste",
        },
      },
      settings,
    );
  }

  let parts: Awaited<ReturnType<typeof readMultipartFormData>>;
  try {
    parts = await readMultipartFormData(event);
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Failed to parse multipart body" });
  }

  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No file uploaded" });
  }

  const files = parts.filter((p) => p.name === "files");
  if (files.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No file uploaded" });
  }

  if (files.length > MAX_FILES) {
    throw createError({ statusCode: 400, statusMessage: "Upload at most 20 files at once" });
  }

  let processed = 0;
  let replaced = 0;
  let skipped = 0;
  let totalChunks = 0;
  const errors: AdminIngestError[] = [];

  for (const part of files) {
    const filename = part.filename ?? "untitled.md";

    try {
      if (!ACCEPTED_EXT.test(filename)) {
        errors.push({ source: filename, message: "Only .md/.markdown files are accepted" });
        continue;
      }

      if (part.data.length > MAX_SOURCE_BYTES) {
        errors.push({
          source: filename,
          message: `File exceeds ${MAX_SOURCE_BYTES / 1024 / 1024}MB limit`,
        });
        continue;
      }

      const content = part.data.toString("utf-8");
      assertNotEmpty(content);

      const result = await createResource(
        {
          content,
          title: filename.replace(/\.[^.]+$/, ""),
          metadata: { mimeType: "text/markdown", size: part.data.length, source: "upload" },
        },
        settings,
      );

      if (!result.ok) {
        errors.push({ source: filename, message: result.message || "Ingest failed" });
        continue;
      }

      if (result.skipped) {
        skipped += 1;
        continue;
      }

      processed += 1;
      totalChunks += result.chunks;
      if (result.replaced) replaced += 1;
    } catch (e) {
      const status = typeof e === "object" && e && "statusCode" in e ? Number(e.statusCode) : 0;
      if (status === 400) {
        errors.push({
          source: filename,
          message: e instanceof Error ? e.message : "Invalid markdown",
        });
        continue;
      }
      errors.push({
        source: filename,
        message: e instanceof Error ? e.message : "Unexpected error",
      });
    }
  }

  return { processed, replaced, skipped, totalChunks, errors };
});

async function ingestOne(
  input: {
    title: string;
    content: string;
    metadata: Record<string, unknown>;
  },
  settings: import("#shared/utils/settings").AppSettings,
): Promise<AdminIngestResult> {
  const result = await createResource(input, settings);

  if (!result.ok) {
    return {
      processed: 0,
      replaced: 0,
      skipped: 0,
      totalChunks: 0,
      errors: [{ source: input.title, message: result.message || "Ingest failed" }],
    };
  }

  if (result.skipped) {
    return { processed: 0, replaced: 0, skipped: 1, totalChunks: 0, errors: [] };
  }

  return {
    processed: 1,
    replaced: result.replaced ? 1 : 0,
    skipped: 0,
    totalChunks: result.chunks,
    errors: [],
  };
}
