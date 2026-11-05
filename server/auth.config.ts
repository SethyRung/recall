import { defineServerAuth } from "@nuxtjs/better-auth/config";

export default defineServerAuth({
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "user",
        input: false,
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
    },
  },
  advanced: {
    cookiePrefix: "recall",
  },
});
