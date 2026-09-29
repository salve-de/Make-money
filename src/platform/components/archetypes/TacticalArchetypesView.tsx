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
  const linkBtn = 'inline-flex min-h-11 items-center rounded-sm border border-term-line px-3 text-sm text-term-select-fg hover:bg-term-head lg:min-h-8';
  const extra = activeEntry ? <details className="border-b border-term-line px-3">
    <summary className="min-h-11 cursor-pointer py-3 text-sm text-term-select-fg lg:min-h-6">背景・初動の資料</summary>
    <div className="space-y-3 pb-3 text-sm leading-6 text-term-fg">
      <p>{activeEntry.record.signalData}</p><p>{activeEntry.record.incumbentTrap}</p><p>{activeEntry.record.trendingPlaybook}</p><p>{activeEntry.record.guerrillaTractionLog}</p>
      {activeEntry.record.techStack.length > 0 && <p>構成例: {activeEntry.record.techStack.join(' / ')}</p>}
      {related.length > 0 && <div className="flex flex-wrap gap-2">{related.map((entity) => <button key={entity.id} type="button" onClick={() => onOpenEntityInLedger(entity.id)} className={linkBtn}>{entity.name}</button>)}</div>}
      {related[0] && onOpenSynthesisWithEntity && <button type="button" onClick={() => onOpenSynthesisWithEntity(related[0].id)} className="inline-flex min-h-11 items-center rounded-sm border border-term-accent px-3 text-sm text-term-accent hover:bg-term-head lg:min-h-8">関連事例から企画する</button>}
    </div>
  </details> : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-term-bg text-term-fg">
      <header className="shrink-0 border-b border-term-line bg-term-panel">
        <h1 className="sr-only">事業パターン</h1>
        <div className="term-panel-title">
          <span className="term-panel-name max-lg:hidden">事業パターン</span>
          <span className="term-num">{guides.length}件</span>
        </div>
        <div className="relative border-b border-term-line-soft p-2 sm:max-w-md">
          <Search aria-hidden="true" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-term-label" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="事業パターンを検索" placeholder="テーマを検索" className="h-11 w-full rounded-sm border border-term-line bg-term-bg pl-8 pr-3 text-sm text-term-fg-strong placeholder:text-term-dim focus:border-term-accent focus:outline-none lg:h-8" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside aria-label="事業パターン一覧" className="min-h-0 w-full overflow-y-auto border-r border-term-line bg-term-bg lg:w-[36%] lg:max-w-[480px]">
          {guides.map(({ id, guide }, index) => {
            const selected = activeEntry?.id === id;
            return (
              <button key={id} type="button" aria-pressed={selected} onClick={() => { setSelectedId(id); setMobileDetailOpen(true); }} className={`block min-h-11 w-full border-b border-term-line-soft px-3 py-2 text-left ${selected ? 'bg-term-select' : index % 2 ? 'bg-term-row-alt hover:bg-term-head' : 'hover:bg-term-head'}`}>
                <span className="text-xs text-term-label">{guide.category}</span>
                <strong className="block text-sm font-semibold text-term-fg-strong">{guide.title}</strong>
                <span className={`block text-sm leading-5 ${selected ? 'text-term-select-fg' : 'text-term-sub'}`}>{guide.summary}</span>
              </button>
            );
          })}
          {guides.length === 0 && <p className="p-3 text-sm text-term-label">該当するテーマはありません。検索語を短くするか、消して全件を表示してください。</p>}
        </aside>

        <section aria-label="選択した事業パターンの詳細" className="hidden min-w-0 flex-1 overflow-y-auto lg:block">
          {active && <PatternDetail extra={extra} guide={active} />}
        </section>
      </div>

      {mobileDetailOpen && active && (
        <div role="dialog" aria-modal="true" aria-label={`${active.title}の詳細`} className="fixed inset-0 z-50 flex flex-col bg-term-bg lg:hidden">
          <div className="min-h-0 flex-1 overflow-y-auto pb-8"><PatternDetail extra={extra} guide={active} onBack={() => setMobileDetailOpen(false)} /></div>
        </div>
      )}
    </div>
  );
};

const KV: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="border-b border-term-line-soft px-3 py-2 text-sm leading-6 sm:border-r">
    <dt className="text-xs text-term-label">{label}</dt>
    <dd className="text-term-fg">{value}</dd>
  </div>
);

const PatternDetail: React.FC<{ guide: PatternGuide; extra?: React.ReactNode; onBack?: () => void }> = ({ guide, onBack, extra }) => (
  <div className="w-full">
    <div className="term-panel-title">
      <span className="term-panel-name">{guide.category}</span>事業案
      {onBack && <button type="button" onClick={onBack} className="ml-auto inline-flex min-h-11 items-center gap-1 px-2 text-sm text-term-sub hover:text-term-fg-strong"><ArrowLeft aria-hidden="true" className="h-4 w-4" />一覧へ</button>}
    </div>
    <header className="border-b border-term-line px-3 py-3">
      <h2 className="text-lg font-semibold text-term-fg-strong">{guide.title}</h2>
      <p className="mt-1 text-sm text-term-sub">{guide.summary}</p>
    </header>
    <dl className="grid border-b border-term-line sm:grid-cols-2">
      <KV label="想定する顧客" value={guide.customer} />
      <KV label="提供するもの" value={guide.deliverable} />
      <KV label="収益の取り方" value={guide.revenueModel} />
      <KV label="最初に確かめること" value={guide.firstStep} />
    </dl>
    <section aria-label="確認事項" className="border-b border-term-line">
      <h3 className="border-b border-term-line-soft bg-term-head px-3 py-1 text-xs text-term-label">確認しておくこと</h3>
      <ul className="text-sm leading-6 text-term-fg">
        {guide.checks.map((check) => <li key={check} className="border-b border-term-line-soft px-3 py-1.5 last:border-b-0">{check}</li>)}
      </ul>
    </section>
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
