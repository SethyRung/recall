import { blob } from "hub:blob";
import { z } from "zod";

export default defineEventHandler(async (event) => {
  const visitorId = getVisitorId(event);

  const { chatId } = await getValidatedRouterParams(
    event,
    z.object({ chatId: z.string().min(1) }).parse,
  );

  const obj = await blob.handleUpload(event, {
    formKey: "files",
    multiple: false,
    ensure: {
      maxSize: FILE_UPLOAD_CONFIG.maxSize,
      types: [...FILE_UPLOAD_CONFIG.types],
    },
    put: {
      addRandomSuffix: true,
      prefix: `${visitorId}/${chatId}`,
    },
  });

  return createResponse(
    { code: ApiResponseCode.Success, message: "File uploaded successfully" },
    obj,
  );
});
