import { errorResponse, handleOptions, HttpError, json, originAllowed, parseJson, requireMethod } from "../_shared/http.ts";
import { stripeClient, validatedReturnUrl } from "../_shared/stripe.ts";
import { adminClient, auditEdgeAction, consumeRateLimit, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    requireMethod(request, ["POST"]);
    if (!originAllowed(request)) throw new HttpError(403, "origin_not_allowed", "許可されていない送信元です。");
    const user = await requireUser(request);
    await consumeRateLimit(user.id, "stripe-portal", 12, 3600);
    const body = await parseJson<{ returnUrl?: unknown }>(request, 4_000);
    const returnUrl = validatedReturnUrl(body.returnUrl, "#/account");
    const { data, error } = await adminClient()
      .from("subscriptions")
      .select("provider_customer_id")
      .eq("user_id", user.id)
      .not("provider_customer_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data?.provider_customer_id) throw new HttpError(404, "billing_customer_missing", "支払い情報がありません。");
    const session = await stripeClient().billingPortal.sessions.create({
      customer: data.provider_customer_id,
      return_url: returnUrl,
    });
    await auditEdgeAction({ actorId: user.id, action: "billing_portal_created", objectType: "stripe_customer", objectId: data.provider_customer_id });
    return json(request, { url: session.url });
  } catch (error) {
    return errorResponse(request, error);
  }
});
