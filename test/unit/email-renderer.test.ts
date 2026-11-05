import { describe, expect, test } from "bun:test";
import { renderEmail } from "../../server/utils/email-renderer";

const template = await Bun.file(
  new URL("../../server/assets/emails/password-reset.md", import.meta.url),
).text();

describe("password reset email rendering", () => {
  test("binds the same reset URL to the button and fallback without exposing Comark syntax", async () => {
    const html = await renderEmail(template, {
      resetUrl: "https://recall.example/reset-password?token=a%2Fb&next=home",
    });

    expect([...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).toEqual([
      "https://recall.example/reset-password?token=a%2Fb&amp;next=home",
      "https://recall.example/reset-password?token=a%2Fb&amp;next=home",
    ]);
    expect(html).toContain("Reset your <br> password.");
    expect(html).toContain("[R]ecall");
    expect(html).not.toContain("<email-");
    expect(html).not.toContain("data.resetUrl");
    expect(html).not.toContain("PASSWORD RECOVERY");
  });

  test("escapes URL values after binding instead of parsing them as template content", async () => {
    const html = await renderEmail(template, {
      resetUrl: 'https://recall.example/reset?token="><img src=x onerror=alert(1)>&extra=1',
    });

    expect(html).not.toContain("<img");
    expect(html).toContain("&quot;&gt;&lt;img");
    expect(html).toContain("&amp;extra=1");
    expect([...html.matchAll(/<a /g)]).toHaveLength(2);
  });

  test.each(["javascript:alert(1)", "data:text/html,test", "/reset-password"])(
    "rejects unsafe or incomplete URLs: %s",
    async (resetUrl) => {
      await expect(renderEmail(template, { resetUrl })).rejects.toThrow();
    },
  );

  test("keeps simultaneous email recipients' reset links separate", async () => {
    const urls = [
      "https://recall.example/reset?token=first",
      "https://recall.example/reset?token=second",
    ];
    const emails = await Promise.all(urls.map((resetUrl) => renderEmail(template, { resetUrl })));

    for (const [index, html] of emails.entries()) {
      expect(html).toContain(urls[index]!);
      expect(html).not.toContain(urls[1 - index]!);
    }
  });
});
