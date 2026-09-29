import { NextResponse } from 'next/server';
import { listPlans } from '@/lib/payments/plans';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

/** 売っているプランの一覧（ログイン不要）。金額はサーバーの設定が正で、決まっていないプランは priceJpy が null・available が false。 */
export async function GET() {
  try { return NextResponse.json({ plans: await listPlans() }, { headers }); }
  catch { return NextResponse.json({ error: 'プランの情報を取得できません' }, { status: 503, headers }); }
}
