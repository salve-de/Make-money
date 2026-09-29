import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { getRuntimeEnvValue } from "@/lib/runtime/cloudflare";
import { assertPaymentStoreAvailable } from "@/lib/payments/entitlement";
import { inspectBilling, type BillingInspection } from "@/lib/payments/billing";
import { FOUNDING_PASS } from "@/lib/payments/founding-pass";
import { getSubscriptionOffer, isFoundingPassOnSale, isPlanId, isSubscriptionPlanId } from "@/lib/payments/plans";
import { verifyFirebaseIdToken } from "@/lib/firebase/server";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/api/input";

export const dynamic = "force-dynamic";
const MAX_CHECKOUT_REQUEST_BYTES = 32 * 1024;
const PRODUCT_DESCRIPTION = "事業構造12項目の詳細分析へのアクセス（財務と出典は無料）";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    let userEmail: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];
      const verified = await verifyFirebaseIdToken(token);
      if (verified) {
        userId = verified.uid;
        userEmail = verified.email || null;
      }
    }

    if (!userId) return NextResponse.json({ error: "購入前にログインしてください" }, { status: 401 });
    try { await assertPaymentStoreAvailable(); }
    catch { return NextResponse.json({ error: "会員情報を保存できないため購入を開始できません" }, { status: 503 }); }

    let body: unknown;
    try { body = await readJsonBody(request, MAX_CHECKOUT_REQUEST_BYTES); }
    catch (error) {
      if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Checkout request is too large" }, { status: 413 });
      return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
    }

    // 価格・金額・ユーザーIDは本文から受け取らない。プランのidだけを受け取り、金額はサーバー側の設定で決める。
    const product = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>).product : undefined;
    if (!isPlanId(product)) {
      return NextResponse.json({ error: "Unknown product" }, { status: 400 });
    }
    const subscriptionOffer = isSubscriptionPlanId(product) ? await getSubscriptionOffer(product) : null;
    const onSale = isSubscriptionPlanId(product) ? subscriptionOffer !== null : await isFoundingPassOnSale();
    if (!onSale) return NextResponse.json({ error: "このプランは現在販売していません" }, { status: 400 });

    const stripe = await getStripeClient();
    if (!stripe || !await getRuntimeEnvValue("STRIPE_WEBHOOK_SECRET")) {
      return NextResponse.json(
        { error: "Stripe is not configured in this environment" },
        { status: 503 }
      );
    }

    const appUrl = await getRuntimeEnvValue("NEXT_PUBLIC_APP_URL") || new URL(request.url).origin;

    if (subscriptionOffer) {
      // すでに更新される月額・年額があるなら、二重に課金しないよう新しい契約は作らない。
      // 解約予約済みなら、そのまま次の契約を始められる。
      let current: BillingInspection;
      try { current = await inspectBilling(userId); }
      catch { return NextResponse.json({ error: "購入状況を確認できないため購入を開始できません" }, { status: 503 }); }
      if (current.activeSubscription && !current.cancelAtPeriodEnd) {
        return NextResponse.json({ error: "すでに月額・年額プランに加入しています。変更や解約は契約の管理画面から行ってください" }, { status: 409 });
      }
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        client_reference_id: userId,
        customer_email: userEmail || undefined,
        line_items: [
          {
            price_data: {
              currency: "jpy",
              product_data: {
                name: subscriptionOffer.name,
                description: PRODUCT_DESCRIPTION,
              },
              unit_amount: subscriptionOffer.priceJpy,
              recurring: { interval: subscriptionOffer.interval },
            },
            quantity: 1,
          },
        ],
        metadata: { product: subscriptionOffer.id, userId },
        subscription_data: { metadata: { product: subscriptionOffer.id, userId } },
        success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/`,
      });
      if (!session.url) {
        return NextResponse.json({ error: "Checkout URL was not created" }, { status: 502 });
      }
      return NextResponse.json({ url: session.url });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: userId || undefined,
      customer_email: userEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: FOUNDING_PASS.name,
              description: PRODUCT_DESCRIPTION,
            },
            unit_amount: FOUNDING_PASS.priceJpy,
          },
          quantity: 1,
        },
      ],
      customer_creation: "always",
      metadata: {
        product: FOUNDING_PASS.id,
        userId: userId || "",
      },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Checkout URL was not created" }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch {
    console.error("Stripe checkout session creation failed");
    return NextResponse.json({ error: "決済画面を開始できませんでした" }, { status: 500 });
  }
}
