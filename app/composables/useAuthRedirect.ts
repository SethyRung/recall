export function useAuthRedirect() {
  const route = useRoute();

  const redirect = computed<string>(() => {
    const raw = route.query.redirect;
    if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return "";
    if (
      [...raw].some(
        (char) => char === "\\" || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
      )
    )
      return "";
    return raw;
  });

  return { redirect };
}
