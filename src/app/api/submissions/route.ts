import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { parseSubmission, readInput } from '@/lib/api/input';
import { executeD1 } from '@/lib/storage/d1';

export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  const input = await readInput(req, parseSubmission);
  if (!input) return NextResponse.json({ error: '事業名、URL、月商、月利などの入力内容を確認してください' }, { status: 400 });
  const auth = req.headers.get('authorization');
  const user = auth?.startsWith('Bearer ') ? await verifyFirebaseIdToken(auth.slice(7)) : null;
  if (auth && !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  try {
    const id = crypto.randomUUID();
    const saved = await executeD1('INSERT INTO submissions(id,user_id,business_name,url,monthly_revenue,monthly_profit,tools_used,acquisition_channel,proof_screenshot_url) VALUES(?,?,?,?,?,?,?,?,?)', [id, user?.uid ?? null, input.businessName, input.url, input.monthlyRevenue, input.monthlyProfit, input.toolsUsed, input.acquisitionChannel, input.proofScreenshotUrl]);
    if (saved.changes !== 1) throw new Error('Submission not persisted');
    return NextResponse.json({ success: true, message: '掲載申請を受理しました。照合審査後に掲載されます。', submissionId: id });
  } catch {
    return NextResponse.json({ error: '現在、申請を保存できません' }, { status: 503 });
  }
}
