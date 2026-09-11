import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { getRuntimeEnvValue } from "@/lib/runtime/cloudflare";
import { assertPaymentStoreAvailable } from "@/lib/payments/entitlement";
import { FOUNDING_PASS } from "@/lib/payments/founding-pass";
import { verifyFirebaseIdToken } from "@/lib/firebase/server";

export const dynamic = "force-dynamic";

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

    const body = await request.json().catch(() => ({}));

    if (body?.product !== FOUNDING_PASS.id) {
      return NextResponse.json({ error: "Unknown product" }, { status: 400 });
    }

    const stripe = await getStripeClient();
    if (!stripe || !await getRuntimeEnvValue("STRIPE_WEBHOOK_SECRET")) {
      return NextResponse.json(
        { error: "Stripe is not configured in this environment" },
        { status: 503 }
      );
    }

    const appUrl = await getRuntimeEnvValue("NEXT_PUBLIC_APP_URL") || new URL(request.url).origin;
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
              description: "事業構造12項目の詳細分析へのアクセス（財務と出典は無料）",
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
