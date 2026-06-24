export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await useSession(useFetch);
  const user = session.value?.user;

  if (!user || user.isAnonymous) {
    return navigateTo({
      path: "/auth",
      query: { redirect: to.fullPath },
    });
  }

  if (user.role !== "admin") {
    return showError({
      statusCode: 403,
      statusMessage: "Forbidden",
      message: "This area is reserved for admins.",
    });
  }
});
