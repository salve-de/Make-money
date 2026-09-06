import type Stripe from "npm:stripe@17.7.0";
import { errorResponse, HttpError, json, requireMethod } from "../_shared/http.ts";
import { mapSubscriptionStatus, planFromPrice, stripeClient, unixToIso, webhookEvent } from "../_shared/stripe.ts";
import { adminClient } from "../_shared/supabase.ts";

async function userIdForCustomer(customerId: string): Promise<string | null> {
  const admin = adminClient();
  const { data } = await admin.from("subscriptions").select("user_id").eq("provider_customer_id", customerId).limit(1).maybeSingle();
  if (data?.user_id) return data.user_id;
  const customer = await stripeClient().customers.retrieve(customerId);
  if (customer.deleted) return null;
  return customer.metadata?.supabase_user_id ?? null;
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const userId = subscription.metadata?.supabase_user_id || await userIdForCustomer(customerId);
  if (!userId) throw new HttpError(422, "subscription_user_missing", "購読をユーザーへ紐付けられませんでした。");
  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price?.id ?? null;
  const planCode = subscription.metadata?.plan_code || planFromPrice(priceId);
  if (!planCode) throw new HttpError(422, "subscription_plan_missing", "購読プランを判定できませんでした。");
  const { error } = await adminClient().from("subscriptions").upsert({
    user_id: userId,
    provider: "stripe",
    provider_customer_id: customerId,
    provider_subscription_id: subscription.id,
    plan_code: planCode,
    status: mapSubscriptionStatus(subscription.status),
    current_period_end: unixToIso(subscription.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, { onConflict: "provider_subscription_id" });
  if (error) throw error;
}

async function checkoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.client_reference_id || session.metadata?.supabase_user_id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!userId || !customerId) return;
  if (typeof session.subscription === "string") {
    const subscription = await stripeClient().subscriptions.retrieve(session.subscription);
    await syncSubscription(subscription);
  } else {
    const planCode = session.metadata?.plan_code;
    if (!planCode) return;
    const { error } = await adminClient().from("subscriptions").upsert({
      user_id: userId,
      provider: "stripe",
      provider_customer_id: customerId,
      provider_subscription_id: session.subscription && typeof session.subscription !== "string" ? session.subscription.id : null,
      plan_code: planCode,
      status: "incomplete",
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider_customer_id" });
    if (error) throw error;
  }
}

async function notifyPaymentFailure(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const userId = await userIdForCustomer(customerId);
  if (!userId) return;
  const { error } = await adminClient().from("notifications").insert({
    user_id: userId,
    type: "billing",
    title: "支払い方法を確認してください",
    body: "購読料金の決済に失敗しました。支払い管理から更新してください。",
    route: "#/account",
    object_type: "invoice",
    object_id: invoice.id,
  });
  if (error) throw error;
}

async function processEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await checkoutCompleted(event.data.object as Stripe.Checkout.Session);
      return;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object as Stripe.Subscription);
      return;
    case "invoice.payment_failed":
      await notifyPaymentFailure(event.data.object as Stripe.Invoice);
      return;
    default:
      return;
  }
}

Deno.serve(async (request) => {
  try {
    requireMethod(request, ["POST"]);
    const signature = request.headers.get("stripe-signature");
    if (!signature) throw new HttpError(400, "signature_missing", "Stripe署名がありません。");
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 1_000_000) throw new HttpError(413, "payload_too_large", "Webhookが大きすぎます。");
    const event = await webhookEvent(rawBody, signature);
    const admin = adminClient();

    const { data: existing, error: lookupError } = await admin
      .from("billing_events")
      .select("processed_at,error_message")
      .eq("provider_event_id", event.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.processed_at) return json(request, { received: true, duplicate: true });

    const { error: insertError } = await admin.from("billing_events").upsert({
      provider_event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
      error_message: null,
    }, { onConflict: "provider_event_id" });
    if (insertError) throw insertError;

    try {
      await processEvent(event);
      const { error: finishError } = await admin.from("billing_events").update({ processed_at: new Date().toISOString(), error_message: null }).eq("provider_event_id", event.id);
      if (finishError) throw finishError;
    } catch (error) {
      await admin.from("billing_events").update({ error_message: error instanceof Error ? error.message.slice(0, 1000) : "unknown" }).eq("provider_event_id", event.id);
      throw error;
    }
    return json(request, { received: true });
  } catch (error) {
    return errorResponse(request, error);
  }
});
