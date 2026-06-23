export type IngestError = { source: string; message: string };

export type IngestResult = {
  processed: number;
  totalChunks: number;
  errors: IngestError[];
};
