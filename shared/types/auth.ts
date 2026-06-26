import type { serverAuth } from "#server/utils/auth";

export type Auth = ReturnType<typeof serverAuth>;
export type AuthSession = Auth["$Infer"]["Session"];
