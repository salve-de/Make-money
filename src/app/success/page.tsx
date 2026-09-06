import Link from 'next/link';

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-20 text-slate-900 font-sans flex items-center justify-center">
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-lg space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
          PAYMENT COMPLETE
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">創刊版の決済を受け付けました</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          決済結果を確認しました。会員権限の保存は、WebhookとアカウントDBの接続後に有効化されます。
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 px-6 text-sm font-bold text-white shadow-sm transition-colors"
          >
            台帳へ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
