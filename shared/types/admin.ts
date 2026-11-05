export type DocumentMetadata = {
  mimeType?: string;
  size?: number;
  source?: "upload" | "paste";
  contentHash?: string;
  embedModel?: string;
  tags?: string[];
  [key: string]: unknown;
};

export type AdminPipeline = {
  llm: {
    model: string | null;
    configured: boolean;
  };
  embed: {
    model: string | null;
    configured: boolean;
    topK: number;
    similarityThreshold: number;
    chunkSize: number;
    chunkOverlap: number;
    dimensions: number;
    hybrid: boolean;
    rerank: boolean;
    corpusModels?: string[];
    modelMismatch?: boolean;
  };
};

export type AdminStats = {
  documents: number;
  chunks: number;
  emptyDocuments: number;
  totalChars: number;
  avgChunksPerDoc: number;
  lastIngest: string | null;
  pipeline: AdminPipeline;
};

export type AdminDocument = {
  id: string;
  title: string;
  contentLength: number;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminChunk = {
  id: string;
  index: number;
  content: string;
};

export type AdminDocumentDetail = AdminDocument & {
  content: string;
  metadata: DocumentMetadata | null;
  chunks: AdminChunk[];
};

export type AdminIngestError = {
  source: string;
  message: string;
};

export type AdminPreviewChunk = {
  index: number;
  content: string;
  length: number;
};

export type AdminIngestResult = {
  processed: number;
  replaced: number;
  skipped: number;
  totalChunks: number;
  errors: AdminIngestError[];
  dryRun?: boolean;
  previewChunks?: AdminPreviewChunk[];
};

export type AdminRetrieveHit = {
  id: string;
  content: string;
  similarity: number;
  passed: boolean;
  lexicalMatch: boolean;
  documentId: string;
  documentTitle: string | null;
};

export type AdminRetrieveResult = {
  query: string;
  topK: number;
  threshold: number;
  hits: AdminRetrieveHit[];
};
