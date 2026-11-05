export type RetrievalRow = {
  id: string;
  content: string;
  similarity: number;
  documentId: string;
  documentTitle: string | null;
};

export function rankRetrievalHits(
  query: string,
  vectors: RetrievalRow[],
  lexical: RetrievalRow[],
  options: { threshold: number; k: number; hybrid: boolean; rerank: boolean },
) {
  const candidates = new Map<string, RetrievalRow & { score: number; lexical: boolean }>();
  vectors.forEach((hit, index) =>
    candidates.set(hit.id, {
      ...hit,
      score: options.hybrid ? 1 / (60 + index + 1) : Number(hit.similarity),
      lexical: false,
    }),
  );
  if (options.hybrid) {
    lexical.forEach((hit, index) => {
      const existing = candidates.get(hit.id);
      candidates.set(hit.id, {
        ...hit,
        score: (existing?.score ?? 0) + 1 / (60 + index + 1),
        lexical: true,
      });
    });
  }
  const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? [])];
  return [...candidates.values()]
    .map((hit) => {
      const relevance = terms.length
        ? terms.filter((term) => hit.content.toLowerCase().includes(term)).length / terms.length
        : 0;
      return {
        ...hit,
        score: options.rerank ? Number(hit.similarity) * 0.7 + relevance * 0.3 : hit.score,
      };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, options.k)
    .map(({ score: _score, lexical: lexicalMatch, ...hit }) => ({
      ...hit,
      similarity: Number(hit.similarity),
      passed: Number(hit.similarity) > options.threshold || lexicalMatch,
      lexicalMatch,
    }));
}
