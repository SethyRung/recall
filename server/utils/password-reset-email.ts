import { renderEmail } from "./email-renderer";

interface PasswordResetEmail {
  to: string;
  url: string;
  apiKey: string;
  from: string;
}

export async function sendPasswordResetEmail({ to, url, apiKey, from }: PasswordResetEmail) {
  if (!apiKey || !from) {
    throw new Error("Password reset email is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your Recall password",
      html: await createPasswordResetEmailHtml(url),
      text: [
        "Reset your Recall password using the link below:",
        "",
        url,
        "",
        "This link expires in 1 hour and can only be used once.",
        "If you didn't request a password reset, you can ignore this email.",
      ].join("\n"),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Password reset email delivery failed (${response.status})`);
  }
}

export async function createPasswordResetEmailHtml(url: string) {
  const template = await useStorage("assets:server").getItem<string>("emails/password-reset.md");
  if (!template) throw new Error("Password reset email template is missing");
  return renderEmail(template, { resetUrl: url });
}
