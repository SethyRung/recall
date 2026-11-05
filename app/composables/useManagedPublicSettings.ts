import { DEFAULT_SETTINGS, type PublicSettings } from "#shared/utils/settings";

export function useManagedPublicSettings() {
  const defaults = (): PublicSettings => ({ chat: { ...DEFAULT_SETTINGS.chat } });
  const { data, refresh } = useFetch("/api/settings", {
    key: "managed-public-settings",
    default: defaults,
  });
  return { settings: computed(() => data.value ?? defaults()), refresh };
}
