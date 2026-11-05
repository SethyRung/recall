import type { AppSettings } from "../../shared/utils/settings";
import { RagError } from "./errors";

export function chunkMarkdown(markdown: string, settings: AppSettings): string[] {
  const { chunkSize, chunkOverlap, minChunkLength, maxChunks } = settings.chunking;
  const sections = markdown.trim().split(/\n(?=#{1,6}\s)/);
  const parts: string[] = [];
  for (const section of sections) {
    let start = 0;
    while (start < section.length) {
      let end = Math.min(start + chunkSize, section.length);
      if (end < section.length) {
        const slice = section.slice(start, end);
        const boundaries = [...slice.matchAll(/[.!?]\s|\n|\s/g)];
        const boundary = boundaries.at(-1);
        if (boundary && boundary.index >= chunkSize / 2) end = start + boundary.index + 1;
      }
      const part = section.slice(start, end).trim();
      if (part) parts.push(part);
      if (end >= section.length) break;
      start = Math.max(start + 1, end - chunkOverlap);
      if (parts.length > maxChunks * 2) throw new RagError(`Too many chunks (max ${maxChunks})`);
    }
  }
  const merged: string[] = [];
  for (const part of parts) {
    const previous = merged.at(-1);
    if (
      previous &&
      (previous.length < minChunkLength || part.length < minChunkLength) &&
      previous.length + part.length + 2 <= chunkSize
    ) {
      merged[merged.length - 1] = `${previous}\n\n${part}`;
    } else {
      merged.push(part);
    }
  }
  if (merged.length > maxChunks)
    throw new RagError(`Too many chunks (${merged.length}; max ${maxChunks})`);
  return merged;
}
