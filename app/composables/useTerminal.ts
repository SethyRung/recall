const commands = [
  { name: "help", description: "Open this guide" },
  { name: "new", description: "Start a new session" },
  { name: "theme", description: "Choose a color scheme" },
] as const;

const themes = [
  { id: "ayu-light", label: "Ayu Light", mode: "light" },
  { id: "ayu-dark", label: "Ayu Dark", mode: "dark" },
  { id: "catppuccin-light", label: "Catppuccin Latte (Light)", mode: "light" },
  { id: "catppuccin-dark", label: "Catppuccin Mocha (Dark)", mode: "dark" },
  { id: "github-light", label: "GitHub Light", mode: "light" },
  { id: "github-dark", label: "GitHub Dark", mode: "dark" },
  { id: "everforest-light", label: "Everforest Light", mode: "light" },
  { id: "everforest-dark", label: "Everforest Dark", mode: "dark" },
  { id: "gruvbox-light", label: "Gruvbox Light", mode: "light" },
  { id: "gruvbox-dark", label: "Gruvbox Dark", mode: "dark" },
] as const;

export function useTerminal() {
  const { newTab } = useChatTabs();
  const preference = useCookie<string>("recall-terminal-theme", {
    default: () => "ayu-dark",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const savedTheme = computed(
    () =>
      themes.find((candidate) => candidate.id === preference.value) ??
      themes[preference.value === "light" || preference.value?.endsWith("-light") ? 0 : 1],
  );
  const helpOpen = useState("terminal-help", () => false);
  const themeOpen = useState("terminal-theme-picker", () => false);
  const preview = useState<(typeof themes)[number]["id"] | null>(
    "terminal-theme-preview",
    () => null,
  );
  const theme = computed(
    () =>
      (themeOpen.value && themes.find((candidate) => candidate.id === preview.value)) ||
      savedTheme.value,
  );

  watch(themeOpen, () => (preview.value = null), { flush: "sync" });

  function previewTheme(id?: unknown) {
    preview.value = themes.find((candidate) => candidate.id === id)?.id ?? null;
  }

  function setTheme(id: (typeof themes)[number]["id"]) {
    preference.value = id;
    themeOpen.value = false;
  }

  function runCommand(input: string) {
    switch (input.trim().toLowerCase()) {
      case "/help":
        helpOpen.value = true;
        return true;
      case "/theme":
        themeOpen.value = true;
        return true;
      case "/new":
        newTab();
        return true;
      default:
        return false;
    }
  }

  return {
    commands,
    themes,
    theme,
    savedTheme,
    helpOpen,
    themeOpen,
    previewTheme,
    setTheme,
    runCommand,
  };
}
