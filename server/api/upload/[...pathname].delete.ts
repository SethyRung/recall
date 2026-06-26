import { blob } from "hub:blob";
import { z } from "zod";

export default defineEventHandler(async (event) => {
  const visitorId = getVisitorId(event);

  const { pathname } = await getValidatedRouterParams(
    event,
    z.object({ pathname: z.string().min(1) }).parse,
  );

  if (!pathname.startsWith(`${visitorId}/`)) {
    return createResponse({
      code: ApiResponseCode.Forbidden,
      message: "You are not authorized to delete this file",
    });
  }

  await blob.del(pathname);

  return createResponse(
    {
      code: ApiResponseCode.Success,
      message: "File deleted successfully",
    },
    null,
  );
});
