import { defineClientAuth } from "@nuxtjs/better-auth/config";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type serverAuthConfig from "../server/auth.config";

export default defineClientAuth({
  plugins: [inferAdditionalFields<ReturnType<typeof serverAuthConfig>>()],
});
