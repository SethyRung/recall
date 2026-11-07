import { renderHtml } from "@comark/html";
import type { NodeHandler } from "@comark/html/render";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function emailLink(value: unknown) {
  if (typeof value !== "string" || !["http:", "https:"].includes(new URL(value).protocol)) {
    throw new Error("Email links must use HTTP or HTTPS");
  }
  return escapeHtml(value);
}

function table(content: string, attributes = 'width="100%"') {
  return `<table role="presentation" cellpadding="0" cellspacing="0" ${attributes}>${content}</table>`;
}

function row(content: string, attributes = "") {
  return `<tr><td ${attributes}>${content}</td></tr>`;
}

const components: Record<string, NodeHandler> = {
  email: async (node, state) => {
    const content = table(
      row(
        table(await state.flow(node, state), 'width="100%" style="max-width:560px;"'),
        'class="outer" align="center" style="padding:56px 24px;"',
      ),
      'width="100%" bgcolor="#f5f5f2"',
    );
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(node[1].title)}</title>
  <style>
    @media only screen and (max-width:600px) {
      .outer { padding:24px 12px !important; }
      .content { padding:32px 24px !important; }
      .title { font-size:32px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f2;color:#20221f;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(node[1].preview)}</div>
  ${content}
</body>
</html>`;
  },
  "email-header": ([, attrs]) =>
    row(
      table(
        `<tr><td style="font-family:'Courier New',Courier,monospace;font-size:23px;font-weight:bold;letter-spacing:-1px;color:#20221f;">${escapeHtml(attrs.brand)}<span style="color:#338930;">.</span></td><td align="right" style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:1.5px;color:#73766f;">${escapeHtml(attrs.label)}</td></tr>`,
      ),
      'style="padding:0 0 24px;"',
    ),
  "email-card": async (node, state) =>
    row(
      table(await state.flow(node, state)),
      'bgcolor="#ffffff" style="border:1px solid #dedfd8;border-top:3px solid #20221f;"',
    ),
  "email-content": async (node, state) =>
    row(await state.flow(node, state), 'class="content" style="padding:40px;"'),
  h1: async (node, state) =>
    `<h1 class="title" style="margin:0 0 20px;font-size:38px;line-height:1.12;letter-spacing:-1.5px;font-weight:600;color:#20221f;">${await state.flow(node, state)}</h1>`,
  p: async (node, state) =>
    `<p style="margin:0 0 28px;font-size:15px;line-height:25px;color:#666a62;">${await state.flow(node, state)}</p>`,
  "email-button": async (node, state) =>
    table(
      row(
        `<a href="${emailLink(state.renderData.props.href)}" style="display:inline-block;padding:16px 28px;border:1px solid #20221f;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;font-weight:bold;color:#ffffff;text-decoration:none;">${await state.flow(node, state)}</a>`,
        'align="center" bgcolor="#20221f" style="background-color:#20221f;"',
      ),
      "",
    ),
  "email-caption": async (node, state) =>
    `<p style="margin:16px 0 32px;font-family:'Courier New',Courier,monospace;font-size:11px;line-height:18px;color:#73766f;">${await state.flow(node, state)}</p>`,
  "email-note": async (node, state) =>
    table(
      row(
        `<p style="margin:0 0 5px;font-size:13px;line-height:20px;font-weight:bold;color:#353831;">${escapeHtml(node[1].title)}</p><p style="margin:0;font-size:13px;line-height:21px;color:#666a62;">${await state.flow(node, state)}</p>`,
        'style="padding:18px 20px;border-left:2px solid #c8ecc6;"',
      ),
      'width="100%" bgcolor="#f6f7f3"',
    ),
  "email-fallback": async (node, state) => {
    const href = emailLink(state.renderData.props.href);
    return row(
      `<p style="margin:0 0 8px;font-size:11px;line-height:18px;color:#73766f;">${await state.flow(node, state)}</p><p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;line-height:19px;word-break:break-all;overflow-wrap:anywhere;"><a href="${href}" style="color:#496143;text-decoration:underline;">${href}</a></p>`,
      'style="padding:24px 40px;border-top:1px solid #eceee7;"',
    );
  },
  "email-footer": async (node, state) =>
    row(
      `<p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;line-height:18px;letter-spacing:0.5px;color:#898c84;">${await state.flow(node, state)}</p>`,
      'align="center" style="padding:24px 16px 0;"',
    ),
};

export function renderEmail(source: string, data: Record<string, unknown>) {
  return renderHtml(source, { components, data, autoClose: false });
}
