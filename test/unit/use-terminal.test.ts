import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, effectScope, ref, watch, type Ref } from "vue";
import { useTerminal } from "../../app/composables/useTerminal";

let scope: ReturnType<typeof effectScope>;
let preference: Ref<string>;

beforeEach(() => {
  scope = effectScope();
  preference = ref("ayu-dark");
  const state = new Map<string, Ref<unknown>>();
  vi.stubGlobal("computed", computed);
  vi.stubGlobal("watch", watch);
  vi.stubGlobal("useChatTabs", () => ({ newTab: vi.fn() }));
  vi.stubGlobal("useCookie", () => preference);
  vi.stubGlobal("useState", (key: string, init: () => unknown) => {
    if (!state.has(key)) state.set(key, ref(init()));
    return state.get(key);
  });
});

afterEach(() => {
  scope.stop();
  vi.unstubAllGlobals();
});

function setup() {
  return scope.run(() => ({ picker: useTerminal(), layout: useTerminal() }))!;
}

describe("theme preview", () => {
  it("previews across consumers without saving or closing the picker", () => {
    const { picker, layout } = setup();
    picker.themeOpen.value = true;

    picker.previewTheme("github-light");

    expect(layout.theme.value.id).toBe("github-light");
    expect(layout.theme.value.mode).toBe("light");
    expect(picker.savedTheme.value.id).toBe("ayu-dark");
    expect(preference.value).toBe("ayu-dark");
    expect(picker.themeOpen.value).toBe(true);
  });

  it("restores the saved theme on dismissal and reopening", () => {
    const { picker, layout } = setup();
    picker.themeOpen.value = true;
    picker.previewTheme("github-light");

    picker.themeOpen.value = false;

    expect(layout.theme.value.id).toBe("ayu-dark");
    expect(preference.value).toBe("ayu-dark");
    picker.themeOpen.value = true;
    expect(layout.theme.value.id).toBe("ayu-dark");
  });

  it("keeps the applied theme after confirmation and reopening", () => {
    const { picker, layout } = setup();
    picker.themeOpen.value = true;
    picker.previewTheme("github-light");

    picker.setTheme("github-light");

    expect(preference.value).toBe("github-light");
    expect(picker.themeOpen.value).toBe(false);
    expect(layout.theme.value.id).toBe("github-light");
    picker.themeOpen.value = true;
    expect(layout.theme.value.id).toBe("github-light");
  });

  it("clears the preview when no valid item is highlighted", () => {
    const { picker, layout } = setup();
    picker.themeOpen.value = true;
    picker.previewTheme("github-light");

    picker.previewTheme(undefined);

    expect(layout.theme.value.id).toBe("ayu-dark");
    expect(preference.value).toBe("ayu-dark");
  });
});
