import { describe, expect, it } from "vitest";
import {
  createWelcomeTab,
  getChatTabLocation,
  promoteChatTab,
  removeChatTab,
  reorderChatTabs,
  restoreChatTabs,
  type ChatTab,
} from "../../app/utils/chat-tabs";

const firstId = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";
const chatId = "00000000-0000-4000-8000-000000000003";
const draft = (id: string, text = ""): ChatTab => ({ id, chatId: null, draft: text });

describe("chat tabs", () => {
  it("restores independent questions and conversation drafts after a refresh", () => {
    const tabs = [
      createWelcomeTab(),
      draft(firstId, "First question"),
      { id: chatId, chatId, draft: "Follow-up" },
    ];
    expect(restoreChatTabs(JSON.parse(JSON.stringify(tabs)))).toEqual(tabs);
  });

  it("recovers a welcome tab from malformed storage", () => {
    expect(restoreChatTabs(null)).toEqual([createWelcomeTab()]);
    expect(restoreChatTabs({ tabs: [] })).toEqual([createWelcomeTab()]);
  });

  it("rejects unsafe destinations, mismatched IDs, and duplicate restored tabs", () => {
    const restored = restoreChatTabs([
      draft("javascript:alert(1)"),
      { id: firstId, chatId, draft: "Wrong conversation" },
      draft(secondId, "Keep this question"),
      draft(secondId, "Duplicate"),
      { id: chatId, chatId, draft: null },
    ]);
    expect(restored).toEqual([draft(secondId, "Keep this question")]);
  });

  it("preserves welcome's position and unsent question after refresh", () => {
    const welcome = { ...createWelcomeTab(), draft: "A question" };
    expect(restoreChatTabs([draft(firstId), welcome])).toEqual([draft(firstId), welcome]);
  });

  it("does not restore welcome after it has been closed", () => {
    expect(restoreChatTabs([draft(firstId)])).toEqual([draft(firstId)]);
  });

  it("keeps an inactive tab's closure from changing the current conversation", () => {
    const tabs = [createWelcomeTab(), draft(firstId), draft(secondId, "Keep typing")];
    expect(removeChatTab(tabs, firstId, secondId)).toEqual({
      tabs: [createWelcomeTab(), draft(secondId, "Keep typing")],
      activeId: secondId,
    });
    expect(tabs).toHaveLength(3);
  });

  it("selects the next tab when closing a tab in the middle", () => {
    const tabs = [createWelcomeTab(), draft(firstId), draft(secondId)];
    expect(removeChatTab(tabs, firstId, firstId).activeId).toBe(secondId);
  });

  it("selects the previous tab when closing the last tab", () => {
    const tabs = [createWelcomeTab(), draft(firstId), draft(secondId)];
    expect(removeChatTab(tabs, secondId, secondId).activeId).toBe(firstId);
    expect(removeChatTab([createWelcomeTab(), draft(firstId)], firstId, firstId)).toEqual({
      tabs: [createWelcomeTab()],
      activeId: "welcome",
    });
  });

  it("closes welcome and selects the adjacent tab", () => {
    const tabs = [createWelcomeTab(), draft(firstId)];
    expect(removeChatTab(tabs, "welcome", "welcome")).toEqual({
      tabs: [draft(firstId)],
      activeId: firstId,
    });
  });

  it("can close the final tab, including welcome", () => {
    expect(removeChatTab([createWelcomeTab()], "welcome", "welcome")).toEqual({
      tabs: [],
      activeId: null,
    });
    expect(removeChatTab([draft(firstId)], firstId, firstId)).toEqual({ tabs: [], activeId: null });
  });

  it("turns a sent draft into a conversation in the same position", () => {
    const tabs = [createWelcomeTab(), draft(firstId, "Sent"), draft(secondId, "Unsent")];
    expect(promoteChatTab(tabs, firstId, chatId)).toEqual([
      createWelcomeTab(),
      { id: chatId, chatId, draft: "" },
      draft(secondId, "Unsent"),
    ]);
  });

  it("turns welcome into a conversation in the same position", () => {
    const tabs = [{ ...createWelcomeTab(), draft: "Sent" }, draft(firstId, "Unsent")];
    expect(promoteChatTab(tabs, "welcome", chatId)).toEqual([
      { id: chatId, chatId, draft: "" },
      draft(firstId, "Unsent"),
    ]);
  });

  it("does not reopen a tab closed while its first question was being saved", () => {
    const tabs = [createWelcomeTab(), draft(secondId, "Another question")];
    expect(promoteChatTab(tabs, firstId, chatId)).toBe(tabs);
  });

  it("deduplicates a conversation that was already opened elsewhere", () => {
    const tabs = [createWelcomeTab(), draft(firstId), { id: chatId, chatId, draft: "" }];
    expect(promoteChatTab(tabs, firstId, chatId).map((tab) => tab.id)).toEqual(["welcome", chatId]);
  });

  it("uses shareable conversation routes and distinct draft URLs", () => {
    expect(getChatTabLocation(createWelcomeTab())).toBe("/");
    expect(getChatTabLocation(draft("new"))).toBe("/chat");
    expect(getChatTabLocation(draft(firstId))).toBe(`/chat?tab=${firstId}`);
    expect(getChatTabLocation({ id: chatId, chatId, draft: "" })).toBe(`/chat/${chatId}`);
  });

  it("reorders drafts and conversations without changing their contents", () => {
    const first = draft(firstId, "First unsent question");
    const second = draft(secondId, "Second unsent question");
    const chat = { id: chatId, chatId, draft: "Follow-up" };
    const tabs = [createWelcomeTab(), first, second, chat];
    const reordered = reorderChatTabs(tabs, ["welcome", chatId, firstId, secondId]);
    expect(reordered).toEqual([createWelcomeTab(), chat, first, second]);
    expect(reordered[1]).toBe(chat);
    expect(tabs.map((tab) => tab.id)).toEqual(["welcome", firstId, secondId, chatId]);
  });

  it("allows welcome to be reordered like any other tab", () => {
    const tabs = [createWelcomeTab(), draft(firstId), draft(secondId)];
    expect(reorderChatTabs(tabs, [secondId, "welcome", firstId]).map((tab) => tab.id)).toEqual([
      secondId,
      "welcome",
      firstId,
    ]);
  });

  it("ignores duplicate or stale IDs and retains tabs opened during a drag", () => {
    const tabs = [createWelcomeTab(), draft(firstId), draft(secondId), draft(chatId, "New draft")];
    expect(reorderChatTabs(tabs, [secondId, secondId, "missing", firstId])).toEqual([
      draft(secondId),
      draft(firstId),
      createWelcomeTab(),
      draft(chatId, "New draft"),
    ]);
  });

  it("restores a reordered workspace in the same order after refresh", () => {
    const tabs = reorderChatTabs(
      [createWelcomeTab(), draft(firstId, "One"), draft(secondId, "Two")],
      [secondId, firstId],
    );
    expect(restoreChatTabs(JSON.parse(JSON.stringify(tabs)))).toEqual(tabs);
  });

  it("chooses the adjacent tab from the new order when closing the active tab", () => {
    const tabs = reorderChatTabs(
      [createWelcomeTab(), draft(firstId), draft(secondId), draft(chatId)],
      [chatId, firstId, secondId],
    );
    expect(removeChatTab(tabs, firstId, firstId).activeId).toBe(secondId);
    expect(removeChatTab(tabs, secondId, secondId).activeId).toBe("welcome");
  });
});
