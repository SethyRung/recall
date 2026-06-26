import { isSuccessResponse, type ApiResponse } from "#shared/types";

interface BlobResult {
  pathname: string;
  url?: string;
  contentType?: string;
  size: number;
}

function createObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

function fileToInput(file: File): HTMLInputElement {
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  const input = document.createElement("input");
  input.type = "file";
  input.files = dataTransfer.files;

  return input;
}

export function useFileUploadWithStatus(chatId: string) {
  const files = ref<FileWithStatus[]>([]);
  const toast = useToast();

  const { csrf, headerName } = useCsrf();

  const upload = useUpload(`/api/upload/${chatId}`, {
    method: "PUT",
    headers: { [headerName]: csrf },
  });

  async function uploadFiles(newFiles: File[]) {
    const filesWithStatus: FileWithStatus[] = newFiles.map((file) => ({
      file,
      id: crypto.randomUUID(),
      previewUrl: createObjectUrl(file),
      status: "uploading" as const,
    }));

    files.value = [...files.value, ...filesWithStatus];

    const uploadPromises = filesWithStatus.map(async (fileWithStatus) => {
      const index = files.value.findIndex((f) => f.id === fileWithStatus.id);
      if (index === -1) return;

      try {
        const input = fileToInput(fileWithStatus.file);
        const raw = await upload(input);
        const envelope = raw as unknown as ApiResponse<BlobResult> | ApiResponse<BlobResult>[];

        const env = Array.isArray(envelope) ? envelope[0] : envelope;
        if (!env || !isSuccessResponse(env)) {
          throw new Error(env?.status.message || "Upload failed");
        }

        files.value[index] = {
          ...files.value[index]!,
          status: "uploaded",
          uploadedUrl: env.data.url,
          uploadedPathname: env.data.pathname,
        };
      } catch (error) {
        const errorMessage =
          (error as { data?: { message?: string } }).data?.message ||
          (error as Error).message ||
          "Upload failed";
        toast.add({
          title: "Upload failed",
          description: errorMessage,
          icon: "i-lucide-alert-circle",
          color: "error",
        });
        files.value[index] = {
          ...files.value[index]!,
          status: "error",
          error: errorMessage,
        };
      }
    });

    await Promise.allSettled(uploadPromises);
  }

  const { dropzoneRef, isDragging, open } = useFileUpload({
    accept: FILE_UPLOAD_CONFIG.acceptPattern,
    multiple: true,
    onUpdate: uploadFiles,
  });

  const uploading = computed(() => files.value.some((f) => f.status === "uploading"));

  const uploadedFiles = computed(() =>
    files.value
      .filter((f) => f.status === "uploaded" && f.uploadedUrl)
      .map((f) => ({
        type: "file" as const,
        mediaType: f.file.type,
        url: f.uploadedUrl!,
      })),
  );

  function removeFile(id: string) {
    const file = files.value.find((f) => f.id === id);
    if (!file) return;

    URL.revokeObjectURL(file.previewUrl);
    files.value = files.value.filter((f) => f.id !== id);

    if (file.status === "uploaded" && file.uploadedPathname) {
      $fetch(`/api/upload/${file.uploadedPathname}` as string, {
        method: "DELETE",
        headers: { [headerName]: csrf },
      }).catch((error) => {
        console.error("Failed to delete file from blob:", error);
      });
    }
  }

  function clearFiles() {
    if (files.value.length === 0) return;
    files.value.forEach((fileWithStatus) => URL.revokeObjectURL(fileWithStatus.previewUrl));
    files.value = [];
  }

  onUnmounted(() => {
    clearFiles();
  });

  return {
    dropzoneRef,
    dragging: isDragging,
    open,
    files,
    uploading,
    uploadedFiles,
    addFiles: uploadFiles,
    removeFile,
    clearFiles,
  };
}
