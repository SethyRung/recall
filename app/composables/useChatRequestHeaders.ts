export function useChatRequestHeaders() {
  if (import.meta.server) {
    const siteUrl = useRuntimeConfig().public.siteUrl;
    return { origin: siteUrl ? new URL(siteUrl).origin : useRequestURL().origin };
  }
}
