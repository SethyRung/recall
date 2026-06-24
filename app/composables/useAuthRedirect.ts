export function useAuthRedirect() {
  const route = useRoute();

  const redirect = computed<string>(() => {
    const raw = route.query.redirect;
    return typeof raw === "string" ? raw : "";
  });

  return { redirect };
}
