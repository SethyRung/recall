import { LazyModalConfirm, LazyModalRename } from "#components";
import { isSuccessResponse, type ApiResponse } from "#shared/types";

type ChatSummary = { id: string; title: string | null; createdAt: Date };

interface ChatDetail {
  id: string;
  createdAt: Date;
  title: string | null;
  visitorId: string;
  messages: unknown[];
}

export function useChatActions() {
  const route = useRoute();
  const toast = useToast();
  const overlay = useOverlay();
  const { csrf, headerName } = useCsrf();

  const renameModal = overlay.create(LazyModalRename);
  const deleteModal = overlay.create(LazyModalConfirm, {
    props: {
      title: "Delete chat",
      description: "Are you sure you want to delete this chat? This cannot be undone.",
      color: "error",
    },
  });

  async function renameChat(id: string, currentTitle?: string | null): Promise<string | null> {
    const instance = renameModal.open({ title: currentTitle ?? "" });
    const result = await instance.result;

    if (!result || result === currentTitle) return null;

    try {
      unwrap(
        await $fetch<ApiResponse<ChatDetail>>(`/api/chats/${id}/title`, {
          method: "PATCH",
          headers: { [headerName]: csrf },
          body: { title: result },
        }),
      );

      const chatsCache = useNuxtData<ApiResponse<ChatSummary[]>>("chats");
      const chatsEnv = chatsCache.data.value;
      if (isSuccessResponse(chatsEnv)) {
        chatsCache.data.value = {
          ...chatsEnv,
          data: chatsEnv.data.map((c) => (c.id === id ? { ...c, title: result } : c)),
        };
      }

      const chatCache = useNuxtData<ApiResponse<ChatDetail>>(`chat-${id}`);
      const chatEnv = chatCache.data.value;
      if (isSuccessResponse(chatEnv)) {
        chatCache.data.value = {
          ...chatEnv,
          data: { ...chatEnv.data, title: result },
        };
      }

      return result;
    } catch {
      toast.add({
        description: "Failed to rename chat",
        icon: "i-lucide-alert-circle",
        color: "error",
      });
      return null;
    }
  }

  async function deleteChat(id: string): Promise<boolean> {
    const instance = deleteModal.open();
    const result = await instance.result;

    if (!result) return false;

    try {
      unwrap(
        await $fetch<ApiResponse<null>>(`/api/chats/${id}`, {
          method: "DELETE",
          headers: { [headerName]: csrf },
        }),
      );

      toast.add({
        title: "Chat deleted",
        description: "Your chat has been deleted",
        icon: "i-lucide-trash",
      });

      const chatsCache = useNuxtData<ApiResponse<ChatSummary[]>>("chats");
      const chatsEnv = chatsCache.data.value;
      if (isSuccessResponse(chatsEnv)) {
        chatsCache.data.value = {
          ...chatsEnv,
          data: chatsEnv.data.filter((c) => c.id !== id),
        };
      }

      if (route.params.id === id) {
        navigateTo("/chat");
      }

      return true;
    } catch {
      toast.add({
        description: "Failed to delete chat",
        icon: "i-lucide-alert-circle",
        color: "error",
      });
      return false;
    }
  }

  return { renameChat, deleteChat };
}
