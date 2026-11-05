export function getFileIcon(mimeType: string, fileName?: string): string {
  if (mimeType.startsWith("image/")) return "i-lucide-image";
  if (mimeType === "application/pdf") return "i-lucide-file-text";
  if (mimeType === "text/csv" || fileName?.endsWith(".csv")) return "i-lucide-file-spreadsheet";
  return "i-lucide-file";
}

export function removeRandomSuffix(filename: string): string {
  return filename.replace(/^(.+)-[a-zA-Z0-9]+(\.[^.]+)$/, "$1$2");
}
