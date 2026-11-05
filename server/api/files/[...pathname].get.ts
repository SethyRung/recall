import { blob } from "@nuxthub/blob";
import { z } from "zod";

export default defineEventHandler(async (event) => {
  const visitorId = getVisitorId(event);
  const { pathname } = await getValidatedRouterParams(
    event,
    z.object({ pathname: z.string().min(1) }).parse,
  );
  if (!pathname.startsWith(`${visitorId}/`)) {
    throw createError({ statusCode: 404, statusMessage: "File not found" });
  }
  setHeader(event, "cache-control", "private, no-store");
  setHeader(event, "x-content-type-options", "nosniff");
  return blob.serve(event, pathname);
});
