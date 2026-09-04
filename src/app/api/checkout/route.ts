import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

const FOUNDING_PASS_PRICE_JPY = 1980;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    if (body?.product !== 'founding-pass') {
      return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: 'KIN-ROKOKU 創刊版',
              description: '事業機会リサーチ台帳・創刊版アクセス',
            },
            unit_amount: FOUNDING_PASS_PRICE_JPY,
          },
          quantity: 1,
        },
      ],
      customer_creation: 'always',
      metadata: { product: 'founding-pass' },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/`,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Checkout URL was not created' }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout session creation failed', error);
    return NextResponse.json({ error: '決済画面を開始できませんでした' }, { status: 500 });
  }
}
