import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { useChatTabs } from "../../app/composables/useChatTabs";
import type { ChatTab } from "../../app/utils/chat-tabs";

const draftId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const chatId = "00000000-0000-4000-8000-000000000003";
const draft = (id: string, text: string): ChatTab => ({ id, chatId: null, draft: text });

async function setup(id: string, location: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ["/", "/chat", "/chat/:id", "/admin"].map((path) => ({ path, component: {} })),
  });
  await router.push(location);
  const pageRoute = router.currentRoute.value;
  const tabs = ref([draft(id, "Sent question"), draft(otherId, "Unsent question")]);
  const navigateTo = vi.fn((path: string) => router.push(path));
  vi.stubGlobal("useRoute", () => pageRoute);
  vi.stubGlobal("useRouter", () => router);
  vi.stubGlobal("useState", () => tabs);
  vi.stubGlobal("computed", computed);
  vi.stubGlobal("navigateTo", navigateTo);
  return { ...useChatTabs(), router, navigateTo };
}

afterEach(() => vi.unstubAllGlobals());

describe("chat tab promotion", () => {
  it.each([
    [draftId, `/chat?tab=${draftId}`],
    ["new", "/chat"],
    ["welcome", "/"],
  ])("opens the created conversation when %s remains selected", async (id, location) => {
    const { tabs, promoteTab, router, navigateTo } = await setup(id, location);

    await promoteTab(id, chatId);

    expect(navigateTo).toHaveBeenCalledWith(`/chat/${chatId}`);
    expect(router.currentRoute.value.path).toBe(`/chat/${chatId}`);
    expect(tabs.value).toEqual([
      { id: chatId, chatId, draft: "" },
      draft(otherId, "Unsent question"),
    ]);
  });

  it.each([
    [draftId, `/chat?tab=${draftId}`, `/chat?tab=${otherId}`],
    [draftId, `/chat?tab=${draftId}`, `/chat/${otherId}`],
    [draftId, `/chat?tab=${draftId}`, "/"],
    ["new", "/chat", "/admin"],
    ["welcome", "/", "/chat"],
  ])("preserves navigation away from %s to %s then %s", async (id, origin, destination) => {
    const { tabs, activeId, promoteTab, router, navigateTo } = await setup(id, origin);
    expect(activeId.value).toBe(id);
    await router.push(destination);

    await promoteTab(id, chatId);

    expect(navigateTo).not.toHaveBeenCalled();
    expect(router.currentRoute.value.fullPath).toBe(destination);
    expect(tabs.value).toEqual([
      { id: chatId, chatId, draft: "" },
      draft(otherId, "Unsent question"),
    ]);
  });

  it("does not reopen a draft closed before creation completes", async () => {
    const { tabs, promoteTab, router, navigateTo } = await setup(draftId, `/chat?tab=${draftId}`);
    await router.push(`/chat?tab=${otherId}`);
    tabs.value = tabs.value.filter((tab) => tab.id !== draftId);

    await promoteTab(draftId, chatId);

    expect(navigateTo).not.toHaveBeenCalled();
    expect(tabs.value).toEqual([draft(otherId, "Unsent question")]);
  });
});
