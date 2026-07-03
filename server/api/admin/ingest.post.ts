import { createResource } from "#server/utils/resource";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_EXT = /\.(md|markdown|mdown|mkd)$/i;

type IngestError = { source: string; message: string };

export default defineEventHandler(async (event) => {
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

  let processed = 0;
  let totalChunks = 0;
  const errors: IngestError[] = [];

  for (const part of files) {
    const filename = part.filename ?? "untitled.md";

    try {
      if (!ACCEPTED_EXT.test(filename)) {
        errors.push({ source: filename, message: "Only .md/.markdown files are accepted" });
        continue;
      }

      if (part.data.length > MAX_FILE_SIZE) {
        errors.push({
          source: filename,
          message: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        });
        continue;
      }

      const result = await createResource({
        content: part.data.toString("utf-8"),
        title: filename.replace(/\.[^.]+$/, ""),
        metadata: { mimeType: "text/markdown", size: part.data.length },
      });

      if (!result.ok) {
        errors.push({ source: filename, message: result.message ?? "Ingest failed" });
        continue;
      }

      processed += 1;
      totalChunks += result.chunks;
    } catch (e) {
      errors.push({
        source: filename,
        message: e instanceof Error ? e.message : "Unexpected error",
      });
    }
  }

  return createResponse({ code: ApiResponseCode.Success }, { processed, totalChunks, errors });
});
