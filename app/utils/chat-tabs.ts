export interface ChatTab {
  id: string;
  chatId: string | null;
  draft: string;
}

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export function createWelcomeTab(): ChatTab {
  return { id: "welcome", chatId: null, draft: "" };
}

export function isChatTabId(value: unknown): value is string {
  return typeof value === "string" && (value === "welcome" || value === "new" || uuid.test(value));
}

export function restoreChatTabs(value: unknown): ChatTab[] {
  if (!Array.isArray(value)) return [createWelcomeTab()];
  const tabs: ChatTab[] = [];
  const seen = new Set<string>();
  for (const tab of value) {
    if (
      !tab ||
      !isChatTabId(tab.id) ||
      seen.has(tab.id) ||
      typeof tab.draft !== "string" ||
      (tab.chatId !== null && (tab.chatId !== tab.id || !uuid.test(tab.chatId)))
    ) {
      continue;
    }
    seen.add(tab.id);
    tabs.push({ id: tab.id, chatId: tab.chatId, draft: tab.draft });
  }
  return tabs;
}

export function getChatTabLocation(tab: ChatTab) {
  if (tab.id === "welcome") return "/";
  if (tab.chatId) return `/chat/${tab.chatId}`;
  return tab.id === "new" ? "/chat" : `/chat?tab=${tab.id}`;
}

export function reorderChatTabs(tabs: ChatTab[], ids: string[]): ChatTab[] {
  const byId = new Map(tabs.map((tab) => [tab.id, tab]));
  return [...new Set([...ids, ...byId.keys()])].flatMap((id) => {
    const tab = byId.get(id);
    return tab ? [tab] : [];
  });
}

export function removeChatTab(tabs: ChatTab[], id: string, activeId: string) {
  const index = tabs.findIndex((tab) => tab.id === id);
  if (index === -1) return { tabs, activeId };
  const remaining = tabs.filter((tab) => tab.id !== id);
  return {
    tabs: remaining,
    activeId: activeId === id ? ((remaining[index] ?? remaining[index - 1])?.id ?? null) : activeId,
  };
}

export function promoteChatTab(tabs: ChatTab[], draftId: string, chatId: string): ChatTab[] {
  if (!tabs.some((tab) => tab.id === draftId)) return tabs;
  const chat: ChatTab = { id: chatId, chatId, draft: "" };
  const remaining = tabs.filter((tab) => tab.id !== chatId);
  return remaining.map((tab) => (tab.id === draftId ? chat : tab));
}
