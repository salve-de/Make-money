import { errorResponse, handleOptions, HttpError, json, originAllowed, parseJson, requireMethod } from "../_shared/http.ts";
import { requirePlan, stripeClient, validatedReturnUrl } from "../_shared/stripe.ts";
import { adminClient, auditEdgeAction, consumeRateLimit, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    requireMethod(request, ["POST"]);
    if (!originAllowed(request)) throw new HttpError(403, "origin_not_allowed", "許可されていない送信元です。");
    const user = await requireUser(request);
    await consumeRateLimit(user.id, "stripe-checkout", 8, 3600);
    const body = await parseJson<{ planCode?: unknown; returnUrl?: unknown }>(request, 8_000);
    const { planCode, priceId } = requirePlan(body.planCode);
    const successUrl = validatedReturnUrl(body.returnUrl, "#/account?checkout=complete");
    const cancelUrl = validatedReturnUrl(body.returnUrl, "#/pricing?checkout=canceled");
    const admin = adminClient();

    const { data: activeSubscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .select("provider_customer_id,provider_subscription_id,status,plan_code")
      .eq("user_id", user.id)
      .in("status", ["trialing", "active", "past_due", "paused", "incomplete"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (activeSubscription?.status === "active" && activeSubscription.plan_code === planCode) {
      throw new HttpError(409, "already_subscribed", "すでにこのプランを利用しています。");
    }

    const stripe = stripeClient();
    let customerId = activeSubscription?.provider_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id, product: "goldmine-radar" },
      }, { idempotencyKey: `customer:${user.id}` });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl.includes("?") ? `${successUrl}&session_id={CHECKOUT_SESSION_ID}` : `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_update: { address: "auto", name: "auto" },
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan_code: planCode, product: "goldmine-radar" },
      },
      metadata: { supabase_user_id: user.id, plan_code: planCode, product: "goldmine-radar" },
    }, { idempotencyKey: `checkout:${user.id}:${planCode}:${Math.floor(Date.now() / 300_000)}` });

    await auditEdgeAction({ actorId: user.id, action: "stripe_checkout_created", objectType: "checkout_session", objectId: session.id, properties: { planCode } });
    if (!session.url) throw new HttpError(502, "checkout_url_missing", "決済画面を作成できませんでした。");
    return json(request, { url: session.url, sessionId: session.id });
  } catch (error) {
    return errorResponse(request, error);
  }
});
