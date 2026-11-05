import type { TabsItem } from "@nuxt/ui";

function resolveAdminSection(value: unknown, items: TabsItem[]) {
  return String(items.find((item) => item.value === value)?.value ?? items[0]!.value);
}

function settingsSectionForField(name?: string) {
  switch (name?.split(".")[0]) {
    case "embed":
    case "retrieval":
    case "chunking":
      return "knowledge";
    case "chat":
      return "chat";
    case "email":
      return "integrations";
    default:
      return "models";
  }
}

export function useAdminSection(items: TabsItem[]) {
  const route = useRoute();
  const router = useRouter();

  async function selectSection(value: string) {
    const selected = resolveAdminSection(value, items);
    await router.push({
      query: { ...route.query, section: selected === items[0]!.value ? undefined : selected },
      hash: route.hash,
    });
  }

  const section = computed({
    get: () => resolveAdminSection(route.query.section, items),
    set: (value: string) => {
      void selectSection(value);
    },
  });

  async function selectField(name?: string) {
    await selectSection(settingsSectionForField(name));
  }

  return { section, selectSection, selectField };
}
