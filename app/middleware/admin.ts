export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await useSession(useFetch);

  if (!session.value?.user) {
    return navigateTo({
      path: "/admin/login",
      query: { redirect: to.fullPath },
    });
  }

  if (session.value.user.role !== "admin") {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
      fatal: true,
    });
  }
});
