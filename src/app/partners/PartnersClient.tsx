import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';

export function PartnersClient() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <GlobalHeader />
      <main className="flex-1 px-4 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <header className="max-w-2xl">
            <p className="text-sm font-medium text-accent">紹介プログラム</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">パートナー向け案内</h1>
          </header>

          <section aria-labelledby="partner-status" className="mt-4 rounded-md border border-warning/30 bg-surface px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex min-h-7 items-center rounded border border-warning/30 bg-warning/10 px-2.5 text-xs font-medium text-warning">
                未対応
              </span>
              <h2 id="partner-status" className="text-sm font-semibold text-white">紹介プログラムは利用できません</h2>
            </div>
            <p className="mt-2 text-sm leading-5 text-zinc-300">
              登録の計測、報酬条件の提示、支払いには対応していません。
            </p>
          </section>

          <div className="mt-5 border-t border-white/[0.1] pt-3">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent-strong transition-colors hover:text-white">
              事例一覧に戻る <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
