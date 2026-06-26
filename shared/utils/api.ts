import { ApiResponseCode, isSuccessResponse, type ApiResponse } from "#shared/types";

export function unwrap<T>(res: ApiResponse<T>): T {
  if (!isSuccessResponse(res)) {
    throw createError({
      statusCode: getStatusCode(res.status.code),
      statusMessage: res.status.message || "Request failed",
    });
  }
  return res.data;
}

export function getUnwrappedData<T>(res: ApiResponse<T> | null | undefined): T | null {
  return res && isSuccessResponse(res) ? res.data : null;
}

function getStatusCode(code: ApiResponseCode): number {
  switch (code) {
    case ApiResponseCode.NotFound:
      return 404;
    case ApiResponseCode.Forbidden:
      return 403;
    case ApiResponseCode.Unauthorized:
      return 401;
    case ApiResponseCode.ValidationError:
    case ApiResponseCode.InvalidRequest:
      return 400;
    default:
      return 500;
  }
}
