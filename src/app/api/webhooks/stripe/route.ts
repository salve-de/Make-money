import Stripe from "stripe";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret || !stripe) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured" },
      { status: 400 }
    );
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id || session.metadata?.userId;
      const customerEmail = session.customer_details?.email;
      const customerId = typeof session.customer === "string" ? session.customer : null;

      if (db) {
        try {
          if (userId) {
            // UIDで更新、存在しなければ作成
            await db
              .insert(users)
              .values({
                id: userId,
                email: customerEmail || `${userId}@anon.example.com`,
                stripeCustomerId: customerId,
                isPro: true,
              })
              .onConflictDoUpdate({
                target: users.id,
                set: {
                  isPro: true,
                  stripeCustomerId: customerId,
                  updatedAt: new Date(),
                },
              });
            console.log(`[Stripe Webhook] Upgraded user ${userId} to PRO`);
          } else if (customerEmail) {
            // メールアドレスで更新
            await db
              .update(users)
              .set({
                isPro: true,
                stripeCustomerId: customerId,
                updatedAt: new Date(),
              })
              .where(eq(users.email, customerEmail));
            console.log(`[Stripe Webhook] Upgraded user with email ${customerEmail} to PRO`);
          }
        } catch (dbErr) {
          console.error("[Stripe Webhook] DB update failed:", dbErr);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

      if (db && customerId) {
        try {
          await db
            .update(users)
            .set({
              isPro: false,
              updatedAt: new Date(),
            })
            .where(eq(users.stripeCustomerId, customerId));
          console.log(`[Stripe Webhook] Revoked PRO for customer ${customerId}`);
        } catch (dbErr) {
          console.error("[Stripe Webhook] Subscription cancellation DB error:", dbErr);
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
