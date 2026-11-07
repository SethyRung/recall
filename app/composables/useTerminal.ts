const commands = [
  { name: "help", description: "Open this guide" },
  { name: "new", description: "Start a new session" },
  { name: "theme", description: "Choose a color scheme" },
] as const;

const themes = [
  { id: "amber", label: "terminal", mode: "dark", primary: "sand" },
  { id: "light", label: "light", mode: "light", primary: "sand" },
  { id: "solarized-light", label: "solarized light", mode: "light", primary: "cyan" },
  { id: "colorblind-light", label: "colorblind-friendly light", mode: "light", primary: "blue" },
  { id: "dark", label: "dark", mode: "dark", primary: "sand" },
  { id: "solarized-dark", label: "solarized dark", mode: "dark", primary: "cyan" },
  { id: "colorblind-dark", label: "colorblind-friendly dark", mode: "dark", primary: "blue" },
  { id: "tokyo-night", label: "tokyo night", mode: "dark", primary: "indigo" },
  { id: "forest", label: "forest", mode: "dark", primary: "sage" },
  { id: "ice", label: "ice", mode: "dark", primary: "frost" },
] as const;

export function useTerminal() {
  const { newTab } = useChatTabs();
  const preference = useCookie<string>("recall-terminal-theme", {
    default: () => "amber",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const theme = computed(
    () => themes.find((candidate) => candidate.id === preference.value) ?? themes[0],
  );
  const helpOpen = useState("terminal-help", () => false);
  const themeOpen = useState("terminal-theme-picker", () => false);

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

  return { commands, themes, theme, helpOpen, themeOpen, setTheme, runCommand };
}
