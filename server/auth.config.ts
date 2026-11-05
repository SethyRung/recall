import { defineServerAuth } from "@nuxtjs/better-auth/config";
import { admin } from "better-auth/plugins";
import { sendPasswordResetEmail } from "./utils/password-reset-email";

export default defineServerAuth(({ runtimeConfig }) => ({
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        url,
        apiKey: runtimeConfig.resendApiKey,
        from: runtimeConfig.resendFromEmail,
      });
    },
    customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
      ...coreFields,
      role: "user",
      banned: false,
      banReason: null,
      banExpires: null,
      ...additionalFields,
      id,
    }),
  },
  plugins: [admin()],
  session: {
    cookieCache: {
      enabled: true,
    },
  },
  advanced: {
    cookiePrefix: "recall",
  },
}));
