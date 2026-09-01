import { errorResponse, HttpError, redirect, requireMethod, siteUrl } from "../_shared/http.ts";
import { sha256 } from "../_shared/security.ts";
import { adminClient, auditEdgeAction } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  try {
    requireMethod(request, ["GET", "POST"]);
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    if (token.length < 32 || token.length > 256) throw new HttpError(400, "invalid_token", "解除リンクを確認してください。");
    const tokenHash = await sha256(token);
    const admin = adminClient();
    const { data, error } = await admin
      .from("newsletter_subscriptions")
      .select("id,user_id,status")
      .eq("unsubscribe_token_hash", tokenHash)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(404, "token_not_found", "解除リンクが無効です。");
    if (data.status !== "unsubscribed") {
      const { error: updateError } = await admin.from("newsletter_subscriptions").update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", data.id);
      if (updateError) throw updateError;
      await auditEdgeAction({ actorId: data.user_id, action: "newsletter_unsubscribed", objectType: "newsletter_subscription", objectId: data.id });
    }
    return redirect(request, `${siteUrl()}#/account?newsletter=unsubscribed`);
  } catch (error) {
    if (error instanceof HttpError) {
      const url = new URL(siteUrl());
      url.hash = `/account?newsletter=error&code=${encodeURIComponent(error.code)}`;
      return redirect(request, url.toString());
    }
    return errorResponse(request, error);
  }
});
