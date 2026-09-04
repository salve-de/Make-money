import Link from 'next/link';

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-[#0E1013] px-6 py-20 text-zinc-100">
      <div className="mx-auto max-w-lg rounded-xl border border-white/10 bg-[#13151A] p-8 text-center">
        <div className="mb-3 text-sm font-semibold text-emerald-400">PAYMENT COMPLETE</div>
        <h1 className="mb-3 text-2xl font-bold">創刊版の決済を受け付けました</h1>
        <p className="mb-6 text-sm leading-relaxed text-zinc-400">
          決済結果を確認しました。会員権限の保存は、WebhookとアカウントDBの接続後に有効化されます。
        </p>
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded bg-zinc-100 px-4 text-sm font-semibold text-zinc-900"
        >
          台帳へ戻る
        </Link>
      </div>
    </main>
  );
}
