import { createResource } from "#server/utils/resource";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_EXT = /\.(md|markdown|mdown|mkd)$/i;

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event);

  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No file uploaded" });
  }

  const files = parts.filter((p) => p.name === "files");

  if (files.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No file uploaded" });
  }

  const part = files[0]!;
  const filename = part.filename ?? "untitled.md";

  if (!ACCEPTED_EXT.test(filename)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Only .md/.markdown files are accepted",
    });
  }

  if (part.data.length > MAX_FILE_SIZE) {
    throw createError({
      statusCode: 413,
      statusMessage: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    });
  }

  try {
    const result = await createResource({
      content: part.data.toString("utf-8"),
      title: filename.replace(/\.[^.]+$/, ""),
      metadata: { mimeType: "text/markdown", size: part.data.length },
    });

    if (!result.ok) {
      return createResponse(
        { code: ApiResponseCode.Success },
        {
          processed: 0,
          totalChunks: 0,
          errors: [{ source: filename, message: result.message ?? "" }],
        },
      );
    }

    return createResponse(
      { code: ApiResponseCode.Success },
      { processed: 1, totalChunks: result.chunks, errors: [] },
    );
  } catch {
    return createResponse(
      { code: ApiResponseCode.InternalError, message: "Failed to ingest file" },
      null,
    );
  }
});
