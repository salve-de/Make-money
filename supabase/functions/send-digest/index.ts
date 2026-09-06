import { actionButton, emailFrame, escapeHtml, sendEmail } from "../_shared/email.ts";
import { errorResponse, HttpError, json, requireMethod, siteUrl } from "../_shared/http.ts";
import { hmacToken, timingSafeEqualText } from "../_shared/security.ts";
import { adminClient, auditEdgeAction } from "../_shared/supabase.ts";

interface DigestOpportunity {
  id: string;
  slug: string;
  title: string;
  hook: string;
  organic_score: number;
  momentum_score: number;
  evidence_score: number;
  starting_cost_display: string | null;
}

interface DigestSignal {
  id: string;
  slug: string;
  headline: string;
  amount_display: string;
  signal_type: string;
  evidence_grade: string;
}

function cronAuthorized(request: Request): boolean {
  const expected = Deno.env.get("CRON_SECRET")?.trim() ?? "";
  const supplied = request.headers.get("x-cron-secret")?.trim() ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  return Boolean(expected && supplied && timingSafeEqualText(expected, supplied));
}

function opportunityHtml(item: DigestOpportunity, base: string): string {
  const href = `${base}#/opportunities/${encodeURIComponent(item.slug)}`;
  return `<tr><td style="padding:14px 0;border-bottom:1px solid #242d3d"><a href="${escapeHtml(href)}" style="color:#f4f6fb;text-decoration:none"><div style="color:#f5c451;font-weight:800;font-size:12px">総合 ${Math.round(item.organic_score)} · 勢い ${Math.round(item.momentum_score)}</div><div style="font-size:17px;font-weight:800;margin:4px 0">${escapeHtml(item.title)}</div><div style="color:#98a2b5;line-height:1.6">${escapeHtml(item.hook ?? "")}</div>${item.starting_cost_display ? `<div style="margin-top:7px;color:#c7ceda;font-size:12px">初期費用 ${escapeHtml(item.starting_cost_display)}</div>` : ""}</a></td></tr>`;
}

function signalHtml(item: DigestSignal, base: string): string {
  const href = `${base}#/signals/${encodeURIComponent(item.slug)}`;
  return `<tr><td style="padding:12px 0;border-bottom:1px solid #242d3d"><a href="${escapeHtml(href)}" style="color:#f4f6fb;text-decoration:none"><span style="display:inline-block;color:#f5c451;font-weight:800;margin-right:8px">${escapeHtml(item.amount_display)}</span><span style="font-size:13px">${escapeHtml(item.headline)}</span><div style="color:#98a2b5;font-size:11px;margin-top:4px">${escapeHtml(item.signal_type)} · 根拠 ${escapeHtml(item.evidence_grade)}</div></a></td></tr>`;
}

Deno.serve(async (request) => {
  try {
    requireMethod(request, ["POST"]);
    if (!cronAuthorized(request)) throw new HttpError(401, "cron_unauthorized", "Cron認証に失敗しました。");
    const admin = adminClient();
    const tokenSecret = Deno.env.get("NEWSLETTER_TOKEN_SECRET")?.trim();
    if (!tokenSecret) throw new HttpError(503, "token_secret_missing", "NEWSLETTER_TOKEN_SECRETが設定されていません。");
    const url = new URL(request.url);
    const frequency = ["daily", "weekly"].includes(url.searchParams.get("frequency") ?? "") ? url.searchParams.get("frequency")! : "weekly";
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 100)));
    const cutoff = new Date(Date.now() - (frequency === "daily" ? 20 : 6 * 24) * 3_600_000).toISOString();

    const [{ data: subscriptions, error: subscriptionsError }, { data: opportunities, error: opportunitiesError }, { data: signals, error: signalsError }] = await Promise.all([
      admin.from("newsletter_subscriptions").select("id,email,frequency,last_sent_at").eq("status", "active").eq("frequency", frequency).or(`last_sent_at.is.null,last_sent_at.lt.${cutoff}`).order("last_sent_at", { ascending: true, nullsFirst: true }).limit(limit),
      admin.from("organic_ranked_opportunities").select("id,slug,title,hook,organic_score,momentum_score,evidence_score,starting_cost_display").order("organic_score", { ascending: false }).limit(5),
      admin.from("money_signals").select("id,slug,headline,amount_display,signal_type,evidence_grade").eq("status", "published").order("published_at", { ascending: false }).limit(5),
    ]);
    if (subscriptionsError) throw subscriptionsError;
    if (opportunitiesError) throw opportunitiesError;
    if (signalsError) throw signalsError;

    const base = siteUrl().replace(/\/$/, "");
    const digestKey = `${frequency}:${new Date().toISOString().slice(0, frequency === "daily" ? 10 : 7)}`;
    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions ?? []) {
      const unsubscribeToken = await hmacToken(subscription.id, tokenSecret);
      const unsubscribeUrl = `${Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "")}/functions/v1/newsletter-unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
      const body = `<p style="color:#c7ceda;line-height:1.7">${frequency === "daily" ? "今日" : "今週"}、金と需要が動いた場所を、証拠と参入可能性で整理しました。</p><h2 style="font-size:18px;margin:24px 0 4px">有力な事業機会</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${(opportunities as DigestOpportunity[] ?? []).map((item) => opportunityHtml(item, base)).join("")}</table><h2 style="font-size:18px;margin:28px 0 4px">新しいMoney Signal</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${(signals as DigestSignal[] ?? []).map((item) => signalHtml(item, base)).join("")}</table>${actionButton("GOLDMINE RADARで続きを見る", `${base}#/`)}<p style="font-size:11px;color:#98a2b5">数字の種類と根拠ランクを確認し、利益を保証する情報として扱わないでください。</p>`;
      const html = emailFrame({
        title: frequency === "daily" ? "今日の金脈" : "今週の金脈",
        preheader: "金の動きと、まだ残る事業の入口。",
        body,
        footer: `<a href="${escapeHtml(unsubscribeUrl)}" style="color:#98a2b5">配信停止</a> · <a href="${escapeHtml(`${base}#/account`)}" style="color:#98a2b5">配信設定</a>`,
      });
      try {
        const { data: prior } = await admin.from("newsletter_deliveries").select("id,status").eq("subscription_id", subscription.id).eq("digest_key", digestKey).maybeSingle();
        if (prior?.status === "sent") continue;
        const { data: delivery, error: deliveryError } = await admin.from("newsletter_deliveries").upsert({ subscription_id: subscription.id, digest_key: digestKey, status: "sending", attempted_at: new Date().toISOString(), error_message: null }, { onConflict: "subscription_id,digest_key" }).select("id").single();
        if (deliveryError) throw deliveryError;
        const response = await sendEmail({
          to: subscription.email,
          subject: frequency === "daily" ? "[GOLDMINE RADAR] 今日の金脈" : "[GOLDMINE RADAR] 今週の金脈",
          html,
          text: `${frequency === "daily" ? "今日" : "今週"}の金脈を確認する: ${base}/\n配信停止: ${unsubscribeUrl}`,
          tags: [{ name: "type", value: `digest-${frequency}` }],
        });
        await Promise.all([
          admin.from("newsletter_deliveries").update({ status: "sent", provider_message_id: response.id, sent_at: new Date().toISOString() }).eq("id", delivery.id),
          admin.from("newsletter_subscriptions").update({ last_sent_at: new Date().toISOString() }).eq("id", subscription.id),
        ]);
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error("digest delivery failed", subscription.id, error);
        await admin.from("newsletter_deliveries").upsert({
          subscription_id: subscription.id,
          digest_key: digestKey,
          status: "failed",
          attempted_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message.slice(0, 1000) : "unknown",
        }, { onConflict: "subscription_id,digest_key" });
      }
    }
    await auditEdgeAction({ action: "newsletter_digest_completed", objectType: "digest", objectId: digestKey, properties: { frequency, sent, failed, considered: subscriptions?.length ?? 0 } });
    return json(request, { ok: true, frequency, considered: subscriptions?.length ?? 0, sent, failed, digestKey });
  } catch (error) {
    return errorResponse(request, error);
  }
});
