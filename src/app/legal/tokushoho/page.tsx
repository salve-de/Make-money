import type { Metadata } from 'next';
import { LegalPage, LegalTable } from '@/components/legal/LegalPage';
import { DISCLOSED_ON_REQUEST, NOT_CONFIGURED, readOperatorInfo } from '@/lib/legal/operator';
import { FOUNDING_PASS } from '@/lib/payments/founding-pass';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '特定商取引法に基づく表記' };

export default async function TokushohoPage() {
  const operator = await readOperatorInfo();
  return (
    <LegalPage title="特定商取引法に基づく表記" updatedAt="2026-09-29">
      <LegalTable rows={[
        ['販売事業者', operator.name ?? NOT_CONFIGURED],
        ['運営統括責任者', operator.representative ?? operator.name ?? NOT_CONFIGURED],
        ['所在地', operator.address ?? DISCLOSED_ON_REQUEST],
        ['電話番号', operator.phone ?? DISCLOSED_ON_REQUEST],
        ['メールアドレス', operator.email ?? NOT_CONFIGURED],
        ['販売価格', <>PRO 創刊版 <span className="term-num">¥{FOUNDING_PASS.priceJpy.toLocaleString('ja-JP')}</span>（税込・買い切り）。月額・年額のプランは、購入画面に表示する金額（税込）です。</>],
        ['商品代金以外の必要料金', 'インターネットの接続料金・通信料金はお客様のご負担です。'],
        ['支払方法', 'クレジットカード（決済は Stripe が行います）'],
        ['支払時期', '創刊版は購入時にお支払いいただきます。月額・年額のプランは申込時に初回分を、以後は更新日ごとに自動でお支払いいただきます。'],
        ['提供時期', '決済が完了した時点から、ログインしたアカウントでご利用いただけます。'],
        ['返品・キャンセル', 'デジタルコンテンツの性質上、購入後の返金はお受けしていません。月額・年額のプランはいつでも解約でき、解約すると次回の更新日以降は請求されません（期間途中の日割り返金はありません）。'],
        ['動作環境', '最新版の Chrome・Safari・Edge・Firefox'],
      ]} />
      <p className="text-xs text-term-label">お問い合わせはメールでお願いします。所在地・電話番号の開示をご希望の場合も、メールでご請求ください。</p>
    </LegalPage>
  );
}
