import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { verifyFirebaseIdToken } from "@/lib/firebase/server";

export const dynamic = "force-dynamic";

const FOUNDING_PASS_PRICE_JPY = 1980;

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

    const body = await request.json().catch(() => ({}));

    if (body?.product !== "founding-pass") {
      return NextResponse.json({ error: "Unknown product" }, { status: 400 });
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured in this environment" },
        { status: 503 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: userId || undefined,
      customer_email: userEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: "金鉱録 KIN-KOROKU PRO 会員（永久アクセス権）",
              description: "非公開生データ・契約書ひな形・一次情報完全解放パス",
            },
            unit_amount: FOUNDING_PASS_PRICE_JPY,
          },
          quantity: 1,
        },
      ],
      customer_creation: "always",
      metadata: {
        product: "founding-pass",
        userId: userId || "",
      },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Checkout URL was not created" }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed", error);
    return NextResponse.json({ error: "決済画面を開始できませんでした" }, { status: 500 });
  }
}
