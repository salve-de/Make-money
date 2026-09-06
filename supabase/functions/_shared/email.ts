import { HttpError } from "./http.ts";
import { cleanHeaderText } from "./security.ts";

export function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "invalid_email", "メールアドレスを確認してください。");
  }
  return email;
}

export function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}): Promise<{ id: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  const from = Deno.env.get("EMAIL_FROM")?.trim();
  if (!apiKey || !from) throw new HttpError(503, "email_not_configured", "メール配信が設定されていません。");
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).map(normalizeEmail);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: cleanHeaderText(input.subject, 180),
      html: input.html,
      text: input.text,
      reply_to: input.replyTo ? normalizeEmail(input.replyTo) : undefined,
      tags: input.tags,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Resend error", response.status, body);
    throw new HttpError(502, "email_delivery_failed", "メールを送信できませんでした。");
  }
  return { id: String(body.id ?? "") };
}

export function emailFrame(input: { title: string; preheader?: string; body: string; footer?: string }): string {
  const title = escapeHtml(input.title);
  const preheader = escapeHtml(input.preheader ?? "");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head><body style="margin:0;background:#070910;color:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans JP',sans-serif"><div style="display:none;max-height:0;overflow:hidden">${preheader}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#070910"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#101521;border:1px solid #242d3d;border-radius:18px"><tr><td style="padding:28px"><div style="color:#f5c451;font-weight:800;letter-spacing:.12em;font-size:11px">GOLDMINE RADAR</div><h1 style="margin:10px 0 20px;font-size:26px;line-height:1.25">${title}</h1>${input.body}<div style="border-top:1px solid #242d3d;margin-top:26px;padding-top:18px;color:#98a2b5;font-size:12px">${input.footer ?? "実際に金が動いた証拠から、次の事業機会を発見する。"}</div></td></tr></table></td></tr></table></body></html>`;
}

export function actionButton(label: string, url: string): string {
  return `<p style="margin:22px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#f5c451;color:#17120a;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:11px">${escapeHtml(label)}</a></p>`;
}
