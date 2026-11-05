import YAML from "yaml";
import { RagError } from "./errors";

export function parseFrontmatter(rawContent: string): {
  title?: string;
  tags?: string[];
  body: string;
} {
  const match = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { body: rawContent };
  try {
    const data: unknown = YAML.parse(match[1]!, { maxAliasCount: 20 });
    const content = rawContent.slice(match[0].length);
    if (!data || typeof data !== "object" || Array.isArray(data)) return { body: content };
    const fields = data as Record<string, unknown>;
    return {
      body: content,
      title: typeof fields.title === "string" ? fields.title.trim() : undefined,
      tags: Array.isArray(fields.tags)
        ? fields.tags
            .filter((tag): tag is string => typeof tag === "string")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : undefined,
    };
  } catch {
    throw new RagError("Invalid Markdown frontmatter");
  }
}
