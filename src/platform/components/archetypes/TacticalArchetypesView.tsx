'use client';

import React, { useMemo, useState } from 'react';
import type { FinancialEntity } from '../../types/terminal';
import { MARKET_ANOMALIES } from '../../data/marketAnomaliesData';
import { ArrowLeft, Search } from 'lucide-react';

interface TacticalArchetypesViewProps {
  allEntities: FinancialEntity[];
  onOpenEntityInLedger: (entityId: string) => void;
  onOpenSynthesisWithEntity?: (entityId: string) => void;
  initialAnomalyId?: string | null;
}

type PatternGuide = {
  title: string;
  category: string;
  summary: string;
  opportunity: string;
  customer: string;
  deliverable: string;
  revenueModel: string;
  firstStep: string;
  checks: string[];
};

// The underlying records include unsourced prices, legal outcomes and company
// associations. Keep them in storage, but do not present them as observed facts.
const PATTERN_GUIDES: Record<string, PatternGuide> = {
  anom_portrait_collapse: {
    title: 'プロフィール写真の更新支援',
    category: '制作・更新',
    summary: '撮影、編集、納品までの手間を減らすサービス案。',
    opportunity: '写真を更新したい人が、撮影予約や編集を負担に感じる場面を探す。',
    customer: '顔写真をWebサイトや営業資料で使う個人事業者・小規模事業者。',
    deliverable: '用途別の写真データ、修正対応、利用範囲の記録。',
    revenueModel: '撮影・編集ごとの制作費、または定期更新の契約。',
    firstStep: '利用者に現在の写真の用途と更新時の負担を聞く。',
    checks: ['本人の同意と画像の利用範囲', '撮影と画像編集で求められる品質の違い', '納品後の修正・削除への対応'],
  },
  anom_trucking_compliance: {
    title: '荷待ち時間の記録支援',
    category: '業務記録',
    summary: '現場での記録と管理者への共有を簡単にするサービス案。',
    opportunity: '運転者が記録しやすく、管理者が後から確認しやすい方法を考える。',
    customer: '運行の記録を集める必要がある運送事業者。',
    deliverable: '現場入力画面、時刻付きの記録、管理者向けの確認・出力画面。',
    revenueModel: '事業所または利用人数に応じた継続利用料。',
    firstStep: '現行の記録方法を観察し、入力と転記にかかる手間を測る。',
    checks: ['対象業務に適用される現行のルール', '現場での入力負担と通信環境', '記録の保存・訂正・提出の要件'],
  },
  anom_machining_drawing: {
    title: '紙図面のデータ化支援',
    category: '製造・承継',
    summary: '紙の図面や加工メモを検索・共有できる形に整えるサービス案。',
    opportunity: '図面の所在や版が分からず、再利用に時間がかかる工程を探す。',
    customer: '紙図面を保管する加工会社や発注元の技術部門。',
    deliverable: '検索可能な図面データと、原本に戻れる索引。',
    revenueModel: '図面ごとの変換費用と保管・更新の継続利用料。',
    firstStep: '実際の図面を少数預かり、検索と照合の手順を確かめる。',
    checks: ['寸法・公差を人が確認する工程', '機密図面の取扱い', '納品形式と元図面との照合'],
  },
  anom_sier_legacy_unbundle: {
    title: '既存システムとSaaSの連携',
    category: '業務連携',
    summary: '二重入力や手作業のデータ転記を減らすサービス案。',
    opportunity: '既存システムと新しいツールの間で、同じ情報を繰り返し入力している業務を探す。',
    customer: '複数の業務システムを併用する事業者の運用担当。',
    deliverable: 'データ連携、失敗時の再送、差分を確認できる運用画面。',
    revenueModel: '初期設定費用と監視・保守の継続利用料。',
    firstStep: '転記元・転記先・頻度・失敗時の対応を一つの業務で確認する。',
    checks: ['連携元・連携先のAPIと権限', '障害時の再送と重複防止', '保守担当と運用費用'],
  },
  anom_reddit_ugc_hijack: {
    title: '口コミと一次情報の整理',
    category: '情報整理',
    summary: '利用者の質問や評価を集め、事業者が改善点を見つけるサービス案。',
    opportunity: '公開された声を、製品改善や回答に使える単位で整理する。',
    customer: '多くの質問やレビューに対応する製品担当・顧客対応担当。',
    deliverable: '話題別の整理、原文への参照、対応状況の記録。',
    revenueModel: '利用する事業者への継続利用料。',
    firstStep: '許可された情報源から、手作業で見逃している質問を探す。',
    checks: ['投稿元の利用規約と引用条件', '重複・自動投稿の判別', '本人や事業者への不当な評価を避ける方法'],
  },
  anom_invoice_audit_terror: {
    title: '請求書の登録番号確認',
    category: '経理',
    summary: '請求書の入力時に必要な項目を確認しやすくするサービス案。',
    opportunity: '経理担当者が毎回手作業で照合している項目を特定する。',
    customer: '請求書の受領・登録件数が多い経理部門。',
    deliverable: '照合結果と例外一覧、担当者による修正履歴。',
    revenueModel: '処理件数または事業所単位の継続利用料。',
    firstStep: '現行の受領から入力までを観察し、確認漏れが起きる箇所を調べる。',
    checks: ['現在の公的な制度と照合方法', '誤判定時の訂正手順', '取引先情報の保存とアクセス権'],
  },
  anom_dental_selfpay_simulator: {
    title: '自費診療の説明資料',
    category: '医療の説明',
    summary: '患者が治療の選択肢や費用を理解するための資料を整える案。',
    opportunity: '説明に時間がかかる点や、患者が比較しづらい点を確認する。',
    customer: '治療内容の説明資料を整備したい医療機関。',
    deliverable: '医療者が確認・更新できる説明資料と費用・リスクの表示。',
    revenueModel: '資料制作費用と更新・管理の継続利用料。',
    firstStep: '医療者と患者の説明場面を確認し、理解しづらい項目を特定する。',
    checks: ['医療広告・個人情報に関する現行のルール', '治療の判断を医療者が行うこと', '費用・リスク・代替案の示し方'],
  },
  anom_appstore_aso_gap: {
    title: '小規模アプリの見つけやすさ',
    category: 'アプリ配信',
    summary: 'ストア内で、必要な人がアプリの機能を理解しやすくする案。',
    opportunity: '説明文、画面例、レビューで伝わっていない機能を探す。',
    customer: 'アプリの紹介ページを改善したい開発者・運営者。',
    deliverable: '説明文と画面例の改善案、変更前後の閲覧・利用指標の記録。',
    revenueModel: 'ページ改善の制作費用、または継続的な運用支援料。',
    firstStep: '現在の説明と実際の機能を比較し、初見で分からない点を記録する。',
    checks: ['ストアの現行ガイドライン', '検索流入とインストール後の利用', '誇張のない機能説明'],
  },
};

export const TacticalArchetypesView: React.FC<TacticalArchetypesViewProps> = ({ initialAnomalyId, allEntities, onOpenEntityInLedger, onOpenSynthesisWithEntity }) => {
  const [selectedId, setSelectedId] = useState(initialAnomalyId && MARKET_ANOMALIES.some((record) => record.id === initialAnomalyId) ? initialAnomalyId : MARKET_ANOMALIES[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(Boolean(initialAnomalyId));
  const [previousInitialId, setPreviousInitialId] = useState(initialAnomalyId);
  if (previousInitialId !== initialAnomalyId) {
    setPreviousInitialId(initialAnomalyId);
    if (initialAnomalyId && MARKET_ANOMALIES.some((record) => record.id === initialAnomalyId)) {
      setSelectedId(initialAnomalyId);
      setMobileDetailOpen(true);
    }
  }

  const guides = useMemo(() => MARKET_ANOMALIES
    .map((record) => ({ id: record.id, record, guide: patternGuide(record) }))
    .filter(({ guide }) => `${guide.title} ${guide.category} ${guide.summary}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())), [query]);
  const activeEntry = guides.find(({ id }) => id === selectedId) ?? guides[0];
  const active = activeEntry?.guide;
  const related = activeEntry ? allEntities.filter((entity) => activeEntry.record.proofEntityIds.includes(entity.id)) : [];
  const extra = activeEntry ? <details className="rounded-md border border-white/[0.16] bg-[#101721] px-4 pb-3">
    <summary className="cursor-pointer py-3 text-sm font-medium text-sky-200">背景・初動の資料</summary>
    <div className="space-y-3 text-sm leading-6 text-zinc-200">
      <p>{activeEntry.record.signalData}</p><p>{activeEntry.record.incumbentTrap}</p><p>{activeEntry.record.trendingPlaybook}</p><p>{activeEntry.record.guerrillaTractionLog}</p>
      {activeEntry.record.techStack.length > 0 && <p>構成例: {activeEntry.record.techStack.join(' / ')}</p>}
      {related.length > 0 && <div className="flex flex-wrap gap-2">{related.map((entity) => <button key={entity.id} type="button" onClick={() => onOpenEntityInLedger(entity.id)} className="rounded border border-white/[0.16] px-3 py-2 text-sky-200">{entity.name}</button>)}</div>}
      {related[0] && onOpenSynthesisWithEntity && <button type="button" onClick={() => onOpenSynthesisWithEntity(related[0].id)} className="rounded border border-white/[0.16] px-3 py-2 text-sky-200">関連事例から企画する</button>}
    </div>
  </details> : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 border-b border-white/[0.14] bg-surface px-3 py-2 sm:px-5">
        <div className="flex items-center gap-3">
          <h1 className="shrink-0 text-base font-semibold text-white sm:text-lg">事業パターン</h1>
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search aria-hidden="true" className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="事業パターンを検索" placeholder="テーマを検索" className="h-10 w-full rounded-md border border-white/[0.16] bg-background pl-8 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-sky-300 focus:outline-none" />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-zinc-400">{guides.length}件</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside aria-label="事業パターン一覧" className="min-h-0 w-full overflow-y-auto border-r border-white/[0.14] bg-surface pb-24 lg:w-[36%] lg:max-w-[480px] lg:pb-0">
          <div className="space-y-2 p-2">
            {guides.map(({ id, guide }) => (
              <button key={id} type="button" aria-pressed={activeEntry?.id === id} onClick={() => { setSelectedId(id); setMobileDetailOpen(true); }} className={`w-full rounded-md border border-l-2 px-3 py-2.5 text-left transition-colors ${activeEntry?.id === id ? 'border-sky-300/40 border-l-sky-300 bg-sky-300/[0.08]' : 'border-white/[0.12] bg-background/40 hover:bg-white/[0.04]'}`}>
                <span className="text-xs text-sky-200">{guide.category}</span>
                <strong className="mt-1 block text-sm font-semibold text-white">{guide.title}</strong>
                <span className="mt-1 block text-sm leading-5 text-zinc-300">{guide.summary}</span>
              </button>
            ))}
          </div>
          {guides.length === 0 && <p className="p-4 text-sm text-zinc-400">該当するテーマはありません。</p>}
        </aside>

        <section aria-label="選択した事業パターンの詳細" className="hidden min-w-0 flex-1 overflow-y-auto lg:block">
          {active && <PatternDetail extra={extra} guide={active} />}
        </section>
      </div>

      {mobileDetailOpen && active && (
        <div role="dialog" aria-modal="true" aria-label={`${active.title}の詳細`} className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden">
          <div className="min-h-0 flex-1 overflow-y-auto pb-8"><PatternDetail extra={extra} guide={active} onBack={() => setMobileDetailOpen(false)} /></div>
        </div>
      )}
    </div>
  );
};

const PatternDetail: React.FC<{ guide: PatternGuide; extra?: React.ReactNode; onBack?: () => void }> = ({ guide, onBack, extra }) => (
  <div className="mx-auto max-w-5xl space-y-3 p-4 sm:p-6">
    <header className="border-b border-white/[0.16] pb-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-sky-200">{guide.category} · 事業案</p>
        {onBack && <button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-1 rounded px-2 text-sm text-zinc-300 hover:bg-white/[0.06]"><ArrowLeft aria-hidden="true" className="h-4 w-4" />一覧へ</button>}
      </div>
      <h2 className="mt-1 text-xl font-semibold text-white">{guide.title}</h2>
      <p className="mt-1 text-sm text-zinc-300">{guide.summary}</p>
    </header>
    <div className="grid gap-3 xl:grid-cols-2">
      <section className="rounded-md border border-white/[0.16] bg-[#101721]">
        <h3 className="border-b border-white/[0.12] bg-[#1a2530] px-4 py-2.5 text-sm font-semibold text-white">事業の形</h3>
        <dl className="divide-y divide-white/[0.1] px-4 text-sm leading-6">
          <div className="py-2"><dt className="text-xs text-sky-200">想定する顧客</dt><dd className="text-zinc-200">{guide.customer}</dd></div>
          <div className="py-2"><dt className="text-xs text-sky-200">提供するもの</dt><dd className="text-zinc-200">{guide.deliverable}</dd></div>
          <div className="py-2"><dt className="text-xs text-sky-200">収益の取り方</dt><dd className="text-zinc-200">{guide.revenueModel}</dd></div>
        </dl>
      </section>
      <section className="rounded-md border border-white/[0.16] bg-[#101721]">
        <h3 className="border-b border-white/[0.12] bg-[#1a2530] px-4 py-2.5 text-sm font-semibold text-white">最初に確かめること</h3>
        <p className="border-b border-white/[0.1] px-4 py-2.5 text-sm leading-6 text-zinc-200">{guide.firstStep}</p>
        <ul className="divide-y divide-white/[0.1] px-4 text-sm leading-6 text-zinc-200">
          {guide.checks.map((check) => <li key={check} className="py-2">{check}</li>)}
        </ul>
      </section>
    </div>
    {extra}
  </div>
);

function patternGuide(record: (typeof MARKET_ANOMALIES)[number]): PatternGuide {
  return PATTERN_GUIDES[record.id] ?? {
    title: record.title, category: record.categoryLabel, summary: record.subtitle,
    opportunity: record.signalData || '', customer: record.targetPainWallet,
    deliverable: record.trendingPlaybook, revenueModel: record.incumbentTrap,
    firstStep: record.guerrillaTractionLog, checks: record.techStack,
  };
}
