import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalTable } from '@/components/legal/LegalPage';
import { DISCLOSED_ON_REQUEST, NOT_CONFIGURED, readOperatorInfo } from '@/lib/legal/operator';
import { FOUNDING_PASS } from '@/lib/payments/founding-pass';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '特定商取引法に基づく表記' };

export default async function TokushohoPage() {
  const operator = await readOperatorInfo();
  return (
    <LegalPage title="特定商取引法に基づく表記" updatedAt="2026-10-06">
      <LegalTable rows={[
        ['販売事業者', operator.name ?? NOT_CONFIGURED],
        ['運営統括責任者', operator.representative ?? operator.name ?? NOT_CONFIGURED],
        ['所在地', operator.address ?? DISCLOSED_ON_REQUEST],
        ['電話番号', operator.phone ?? DISCLOSED_ON_REQUEST],
        ['メールアドレス', operator.email ?? NOT_CONFIGURED],
        ['販売価格', <>PRO 創刊版 <span className="term-num">¥{FOUNDING_PASS.priceJpy.toLocaleString('ja-JP')}</span>（税込・買い切り）。月額・年額のプランは、購入画面に表示する金額（税込）です。</>],
        ['商品代金以外の必要料金', 'インターネットの接続料金・通信料金はお客様のご負担です。このほかに必要な料金はありません。'],
        ['支払方法', 'クレジットカード（決済は Stripe が行います）'],
        ['支払時期', '創刊版は購入時にお支払いいただきます。月額・年額のプランは申込時に初回分を、以後は更新日ごとに自動でお支払いいただきます。'],
        ['提供時期', '決済が完了した時点から、ログインしたアカウントでご利用いただけます。'],
        ['申込みの有効期限', '購入画面を開いたあと、決済画面に表示される有効な時間内にお申込みください。有効期限を過ぎた場合は、購入画面からやり直してください。'],
        ['契約期間・自動更新（月額・年額）', '解約するまで、1か月または1年ごとに自動で更新され、更新日ごとに同じ金額を請求します。更新の前に、金額を変える場合はお知らせします。'],
        ['解約の方法・期限', '月額・年額のプランは、ログイン後の「契約の管理」からいつでも解約できます。次回の更新日より前に手続きをしてください。解約後も、支払い済みの期間の終わりまでご利用いただけます。'],
        ['返品・キャンセル', 'デジタルコンテンツの性質上、購入後の返金はお受けしていません。月額・年額のプランは、解約すると次回の更新日以降は請求されません（期間途中の日割り返金はありません）。ただし、提供内容が表示と著しく異なる場合など、法令で認められる場合や当方の責めに帰すべき事由がある場合は、お問い合わせください。返金などで対応します。'],
        ['クーリング・オフ', '通信販売には、クーリング・オフの制度は適用されません。上の返品・キャンセルの条件をご確認ください。'],
        ['数量の制限・特別の条件', '数量の制限はありません。購入には、本サービスへのログインが必要です。18歳未満の方は、親権者などの同意を得てお申込みください。'],
        ['動作環境', '最新版の Chrome・Safari・Edge・Firefox'],
      ]} />
      <p className="text-xs text-term-label">お問い合わせはメールでお願いします（<Link href="/legal/contact" className="underline">お問い合わせ・削除依頼のページ</Link>）。所在地・電話番号の開示をご希望の場合も、メールでご請求ください。</p>
    </LegalPage>
  );
}
