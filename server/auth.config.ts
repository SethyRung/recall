import { defineServerAuth } from "@nuxtjs/better-auth/config";
import { admin } from "better-auth/plugins";
import { getDecryptedSettings } from "./utils/settings";
import { sendPasswordResetEmail } from "./utils/password-reset-email";

export default defineServerAuth(() => ({
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const settings = await getDecryptedSettings();
      await sendPasswordResetEmail({
        to: user.email,
        url,
        apiKey: settings.email.apiKey,
        from: settings.email.from,
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
