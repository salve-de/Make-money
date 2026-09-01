import { actionButton, emailFrame, escapeHtml, normalizeEmail, sendEmail } from "../_shared/email.ts";
import { clientIp, errorResponse, handleOptions, HttpError, json, originAllowed, parseJson, requireMethod, siteUrl } from "../_shared/http.ts";
import { randomToken, sha256 } from "../_shared/security.ts";
import { adminClient, auditEdgeAction, consumeRateLimit, optionalUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    requireMethod(request, ["POST"]);
    if (!originAllowed(request)) throw new HttpError(403, "origin_not_allowed", "許可されていない送信元です。");
    const body = await parseJson<{ email?: unknown; frequency?: unknown }>(request, 8_000);
    const email = normalizeEmail(String(body.email ?? ""));
    const frequency = ["instant", "daily", "weekly"].includes(String(body.frequency)) ? String(body.frequency) : "weekly";
    const user = await optionalUser(request);
    const emailHash = await sha256(email);
    await consumeRateLimit(`${clientIp(request)}:${emailHash}`, "newsletter-subscribe", 4, 86_400);
    const admin = adminClient();

    const { data: existing, error: existingError } = await admin
      .from("newsletter_subscriptions")
      .select("id,status")
      .eq("email", email)
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.status === "active") {
      const { error } = await admin.from("newsletter_subscriptions").update({ frequency, user_id: user?.id ?? undefined }).eq("id", existing.id);
      if (error) throw error;
      return json(request, { accepted: true, status: "active" });
    }

    const confirmationToken = randomToken(32);
    const unsubscribeToken = randomToken(32);
    const record = {
      user_id: user?.id ?? null,
      email,
      frequency,
      status: "pending",
      confirmation_token_hash: await sha256(confirmationToken),
      unsubscribe_token_hash: await sha256(unsubscribeToken),
      confirmation_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    let subscriptionId = existing?.id ?? null;
    if (subscriptionId) {
      const { error } = await admin.from("newsletter_subscriptions").update(record).eq("id", subscriptionId);
      if (error) throw error;
    } else {
      const { data, error } = await admin.from("newsletter_subscriptions").insert(record).select("id").single();
      if (error) throw error;
      subscriptionId = data.id;
    }

    const functionsBase = `${Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "")}/functions/v1`;
    const confirmationUrl = `${functionsBase}/newsletter-confirm?token=${encodeURIComponent(confirmationToken)}`;
    const unsubscribeUrl = `${functionsBase}/newsletter-unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
    const html = emailFrame({
      title: "金脈ダイジェストの登録を確認",
      preheader: "確認後に配信を開始します。",
      body: `<p style="color:#c7ceda;line-height:1.7">GOLDMINE RADARの${escapeHtml(frequency === "instant" ? "重要変化" : frequency === "daily" ? "毎日" : "毎週")}ダイジェストを受け取るには、以下のボタンで確認してください。</p>${actionButton("メールアドレスを確認", confirmationUrl)}<p style="color:#98a2b5;font-size:12px;word-break:break-all">${escapeHtml(confirmationUrl)}</p>`,
      footer: `<a href="${escapeHtml(unsubscribeUrl)}" style="color:#98a2b5">登録を取り消す</a> · <a href="${escapeHtml(siteUrl())}" style="color:#98a2b5">GOLDMINE RADAR</a>`,
    });
    await sendEmail({
      to: email,
      subject: "[GOLDMINE RADAR] 配信登録を確認してください",
      html,
      text: `GOLDMINE RADARの配信登録を確認してください。\n${confirmationUrl}\n\n登録取消: ${unsubscribeUrl}`,
      tags: [{ name: "type", value: "newsletter-confirmation" }],
    });
    await auditEdgeAction({ actorId: user?.id, action: "newsletter_confirmation_sent", objectType: "newsletter_subscription", objectId: subscriptionId, properties: { frequency } });
    return json(request, { accepted: true, status: "pending" }, 202);
  } catch (error) {
    return errorResponse(request, error);
  }
});
