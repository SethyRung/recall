import {
  createWelcomeTab,
  getChatTabLocation,
  isChatTabId,
  promoteChatTab,
  removeChatTab,
  reorderChatTabs,
  restoreChatTabs,
  type ChatTab,
} from "~/utils/chat-tabs";
import type { MaybeRefOrGetter } from "vue";

export function useChatTabs() {
  const route = useRoute();
  const router = useRouter();
  const tabs = useState<ChatTab[]>("chat-tabs", () => [createWelcomeTab()]);
  const activeId = computed(() => {
    if (route.path === "/") return "welcome";
    if (typeof route.params.id === "string") return route.params.id;
    return isChatTabId(route.query.tab) && !["welcome", "new"].includes(route.query.tab)
      ? route.query.tab
      : "new";
  });

  function ensureCurrentTab() {
    if (tabs.value.some((tab) => tab.id === activeId.value)) return;
    if (!isChatTabId(activeId.value)) return;
    tabs.value.push({
      id: activeId.value,
      chatId: typeof route.params.id === "string" ? route.params.id : null,
      draft: "",
    });
  }

  function useDraft(id: MaybeRefOrGetter<string> = activeId) {
    return computed({
      get: () => tabs.value.find((tab) => tab.id === toValue(id))?.draft ?? "",
      set: (value: string) => {
        const tab = tabs.value.find((tab) => tab.id === toValue(id));
        if (tab) tab.draft = value;
      },
    });
  }

  async function newTab(draft = "") {
    const tab: ChatTab = { id: crypto.randomUUID(), chatId: null, draft };
    tabs.value.push(tab);
    await navigateTo(getChatTabLocation(tab));
  }

  function reorderTabs(ids: string[]) {
    tabs.value = reorderChatTabs(tabs.value, ids);
  }

  function moveTab(id: string, direction: -1 | 1) {
    const index = tabs.value.findIndex((tab) => tab.id === id);
    if (index < 0) return false;
    const target = Math.max(0, Math.min(tabs.value.length - 1, index + direction));
    if (target === index) return false;
    const order = tabs.value.map((tab) => tab.id);
    order.splice(index, 1);
    order.splice(target, 0, id);
    reorderTabs(order);
    return true;
  }

  async function closeTab(id: string) {
    if (!tabs.value.some((tab) => tab.id === id)) return false;
    const next = removeChatTab(tabs.value, id, activeId.value);
    tabs.value = next.tabs;
    if (next.activeId === null) {
      await newTab();
    } else if (next.activeId !== activeId.value) {
      const tab = tabs.value.find((tab) => tab.id === next.activeId)!;
      await navigateTo(getChatTabLocation(tab));
    }
    return true;
  }

  async function promoteTab(draftId: string, chatId: string) {
    const open = tabs.value.some((tab) => tab.id === draftId);
    if (!open) return;
    const currentRoute = router.currentRoute.value;
    const selected =
      activeId.value === draftId &&
      currentRoute.path === route.path &&
      currentRoute.query.tab === route.query.tab;
    tabs.value = promoteChatTab(tabs.value, draftId, chatId);
    if (selected) await navigateTo(`/chat/${chatId}`);
  }

  function restore(value: unknown) {
    tabs.value = restoreChatTabs(value);
    ensureCurrentTab();
    if (typeof route.query.q === "string") {
      const tab = tabs.value.find((tab) => tab.id === activeId.value);
      if (tab && !tab.chatId) tab.draft = route.query.q;
    }
  }

  return {
    tabs,
    activeId,
    ensureCurrentTab,
    useDraft,
    newTab,
    closeTab,
    promoteTab,
    restore,
    reorderTabs,
    moveTab,
  };
}
