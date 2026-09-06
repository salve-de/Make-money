import { errorResponse, HttpError, redirect, requireMethod, siteUrl } from "../_shared/http.ts";
import { sha256 } from "../_shared/security.ts";
import { adminClient, auditEdgeAction } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  try {
    requireMethod(request, ["GET"]);
    const token = new URL(request.url).searchParams.get("token") ?? "";
    if (token.length < 32 || token.length > 256) throw new HttpError(400, "invalid_token", "確認リンクを確認してください。");
    const tokenHash = await sha256(token);
    const admin = adminClient();
    const { data, error } = await admin
      .from("newsletter_subscriptions")
      .select("id,user_id,status,confirmation_sent_at")
      .eq("confirmation_token_hash", tokenHash)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(404, "token_not_found", "確認リンクが無効です。");
    if (data.status === "active") return redirect(request, `${siteUrl()}#/account?newsletter=confirmed`);
    if (data.status !== "pending") throw new HttpError(410, "subscription_inactive", "この登録は利用できません。");
    if (data.confirmation_sent_at && Date.now() - new Date(data.confirmation_sent_at).getTime() > 7 * 86_400_000) {
      throw new HttpError(410, "token_expired", "確認リンクの有効期限が切れています。再登録してください。");
    }
    const { error: updateError } = await admin.from("newsletter_subscriptions").update({
      status: "active",
      confirmed_at: new Date().toISOString(),
      confirmation_token_hash: null,
      updated_at: new Date().toISOString(),
    }).eq("id", data.id).eq("status", "pending");
    if (updateError) throw updateError;
    await auditEdgeAction({ actorId: data.user_id, action: "newsletter_confirmed", objectType: "newsletter_subscription", objectId: data.id });
    return redirect(request, `${siteUrl()}#/account?newsletter=confirmed`);
  } catch (error) {
    if (error instanceof HttpError) {
      const url = new URL(siteUrl());
      url.hash = `/account?newsletter=error&code=${encodeURIComponent(error.code)}`;
      return redirect(request, url.toString());
    }
    return errorResponse(request, error);
  }
});
