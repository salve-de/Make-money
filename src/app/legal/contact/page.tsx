import type { Metadata } from 'next';
import { LegalPage, LegalTable } from '@/components/legal/LegalPage';
import { OPERATOR_ENV_NAMES, readOperatorInfo } from '@/lib/legal/operator';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'お問い合わせ・削除依頼' };

function mailto(email: string, subject: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

export default async function ContactPage() {
  const { email } = await readOperatorInfo();
  const purposes: ReadonlyArray<readonly [string, string, string]> = [
    ['一般のお問い合わせ', '【お問い合わせ】', '内容、使っている端末とブラウザ、困っている画面のアドレス（URL）を書いてください。'],
    ['掲載情報の削除・訂正の依頼（事業者・ご本人）', '【削除依頼】', '対象のページのアドレス（URL）、削除または訂正してほしい部分、理由、ご自身がその事業・人物の本人（または代理人）である旨、返信先を書いてください。'],
    ['権利者からのご連絡（著作権・商標・画像など）', '【権利者連絡】', '権利者の名前、権利の内容（作品・商標など）、侵害されているとお考えの部分（ページのアドレス（URL））、その根拠、返信先を書いてください。'],
    ['個人情報の開示・訂正・削除・利用停止、退会', '【個人情報の開示等】', 'ご請求の内容と、登録したメールアドレスを書いてください。手順は、プライバシーポリシーに書いています。'],
  ];
  return (
    <LegalPage title="お問い合わせ・削除依頼" updatedAt="2026-10-06">
      <p>お問い合わせは、メールだけで受け付けます（フォームは置いていません）。必要のない個人情報は書かないでください。</p>

      <h2>連絡先</h2>
      {email ? (
        <LegalTable rows={[['メールアドレス', <a key="mail" href={mailto(email, '【お問い合わせ】')} className="underline">{email}</a>]]} />
      ) : (
        <p>
          運営者向けの注意: 連絡先のメールアドレスが未設定です。環境変数 <code className="term-num">{OPERATOR_ENV_NAMES.email}</code> を設定してから公開してください。設定すると、ここにメールアドレスが表示されます。
        </p>
      )}

      <h2>用途ごとの書き方</h2>
      <p>件名の先頭に、下の表の【　】の言葉を付けてください。確認が早くなります。</p>
      <LegalTable
        rows={purposes.map(([label, subject, guide]) => [
          label,
          <>
            <span className="term-num">件名: {subject}</span>
            <br />
            {guide}
            {email ? (
              <>
                <br />
                <a href={mailto(email, subject)} className="underline">この件名でメールを作る</a>
              </>
            ) : null}
          </>,
        ])}
      />

      <h2>対応について</h2>
      <ul>
        <li>削除依頼・権利者からのご連絡は、内容を確認し、必要と判断した場合は表示の停止・削除・訂正を行います。確認の間、該当部分を一時的に非表示にすることがあります。</li>
        <li>確認の際に、追加の情報（本人確認、権利の根拠など）をお願いすることがあります。</li>
        <li>お問い合わせの内容によっては、お返事までに日数がかかる、または返信できないことがあります。</li>
        <li>電話での受付は行っていません。</li>
        <li>事業の売買の掲載について、取引の仲介や当事者間のトラブルの解決はできません。</li>
      </ul>
    </LegalPage>
  );
}
