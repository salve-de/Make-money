export const FOUNDING_PASS = {
  id: 'founding-pass',
  priceJpy: 1980,
  name: '金鉱録 PRO 創刊版（永久アクセス権）',
} as const;

/** Only a completed payment for this product can establish an entitlement. */
export function isPaidFoundingPass(session: {
  mode: string | null;
  status: string | null;
  payment_status: string;
  currency: string | null;
  amount_total: number | null;
  metadata: Record<string, string> | null;
}) {
  return session.mode === 'payment' && session.status === 'complete'
    && session.payment_status === 'paid' && session.currency === 'jpy'
    && session.amount_total === FOUNDING_PASS.priceJpy
    && session.metadata?.product === FOUNDING_PASS.id;
}
