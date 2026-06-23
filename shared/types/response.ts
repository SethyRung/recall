export enum ApiResponseCode {
  Success = "SUCCESS",
  Error = "ERROR",
  NotFound = "NOT_FOUND",
  ValidationError = "VALIDATION_ERROR",
  Unauthorized = "UNAUTHORIZED",
  Forbidden = "FORBIDDEN",
  InvalidRequest = "INVALID_REQUEST",
  InternalError = "INTERNAL_ERROR",
}

export interface ApiResponseStatus {
  code: ApiResponseCode;
  message: string;
  requestId: string;
  requestTime: number;
}

export type ApiResponseSuccess<T> = {
  status: ApiResponseStatus & { code: ApiResponseCode.Success };
  data: T;
  meta?: { total: number; limit: number; offset: number };
};

export type ApiResponseError = {
  status: ApiResponseStatus & { code: Exclude<ApiResponseCode, ApiResponseCode.Success> };
  data: null;
};

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

export function isSuccessResponse<T>(res?: ApiResponse<T>): res is ApiResponseSuccess<T> {
  return !!res && res.status.code === ApiResponseCode.Success;
}
