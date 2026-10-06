import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BuildMaterial } from '@/platform/components/build/BuildMaterial';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';

export const metadata: Metadata = { title: '作る | Make Money' };

const BTN = 'inline-flex min-h-11 items-center border px-4 text-sm lg:min-h-8 lg:px-3';

/** 「事例 → 事業検討 → 作る → 出品 → 販売」のつながりを1枚で示す、作るの入口。 */
const STEPS: { no: string; title: string; body: string; label: string; href: string; primary?: boolean }[] = [
  {
    no: '1',
    title: '作る案を決める',
    body: '保存した事例から事業の案を作ります。案を開くと、その案をもとに試作の画面づくりへ進めます。',
    label: '事業検討で案を作る',
    href: '/?mode=SYNTHESIS',
    primary: true,
  },
  {
    no: '2',
    title: '事例から探す',
    body: '作る案の材料にする事例を、分野や規模から探して保存します。',
    label: '事例を探す',
    href: '/discover',
  },
  {
    no: '3',
    title: '出品する',
    body: '作ったサービスを市場に載せ、紹介ページを公開します。申込み・決済は各サービスのサイトで行います。',
    label: '出品する',
    href: '/marketplace/new',
  },
  {
    no: '4',
    title: '市場で売る・広める',
    body: '市場に載っているサービスを見て、購入や紹介の動きを確かめます。',
    label: '市場を見る',
    href: '/marketplace',
  },
];

export default function BuildIndexPage() {
  return (
    <div className="flex term-page flex-col bg-term-bg text-term-fg">
      <GlobalHeader currentSection="BUILDER" />
      <main className="w-full flex-1">
        <div className="term-panel-title">
          <h1 className="term-panel-name">作る</h1>
          <span className="max-sm:hidden">事例から案を決め、作って出品するまでの道すじ</span>
        </div>
        <Suspense fallback={null}>
          <BuildMaterial />
        </Suspense>
        <ol aria-label="作って出品するまでの4つの段階">
          {STEPS.map((step) => (
            <li key={step.no} className="flex flex-col gap-2 border-b border-term-line px-3 py-3 sm:flex-row sm:items-center sm:gap-4">
              <span aria-hidden="true" className="term-num w-5 shrink-0 text-term-accent">{step.no}</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-term-fg-strong">{step.title}</h2>
                <p className="mt-0.5 text-sm text-term-sub">{step.body}</p>
              </div>
              <Link
                href={step.href}
                prefetch={false}
                className={`${BTN} shrink-0 justify-center ${step.primary ? 'border-term-accent text-term-accent' : 'border-term-line text-term-fg'} hover:bg-term-head`}
              >
                {step.label}
              </Link>
            </li>
          ))}
        </ol>
        <p className="px-3 py-3 text-xs text-term-label">表示している内容は、案をもとにした試作と掲載の入口です。売上や集客の結果を保証するものではありません。</p>
      </main>
    </div>
  );
}
