'use client';

import React from 'react';
import Link from 'next/link';
import type { MacroIntelligenceData } from '@/lib/intelligence/macro-aggregator';

type AcquisitionGuide = { title: string; useFor: string; method: string; measure: string };

const ACQUISITION: Record<string, AcquisitionGuide> = {
  'tactic-forced-install': {
    title: '既存の作業に組み込む',
    useFor: '日常的に繰り返す手順がある業務ツール。',
    method: '一つの作業を短くできる形で提供し、既存の操作から自然に使えるようにする。',
    measure: '初回利用後も、同じ作業で繰り返し使われるか。',
  },
  'tactic-viral-entertainment': {
    title: '使い方が伝わる実演',
    useFor: '操作前に成果を想像しにくい製品。',
    method: '実物の使用場面を短く示し、視聴後に試せる場所を用意する。',
    measure: '視聴から試用、試用から継続利用への移行。',
  },
  'tactic-trojan-database': {
    title: '役に立つ情報から発見される',
    useFor: '比較や検索をしてから購入する領域。',
    method: '出典と更新日が分かる資料を公開し、必要な人が使える形に整える。',
    measure: '検索からの流入だけでなく、資料の再訪と問い合わせ。',
  },
  'tactic-cold-direct': {
    title: '対象を絞った直接提案',
    useFor: '買い手と課題を具体的に特定できる事業。',
    method: '相手の公開情報に沿って、解決できる一つの作業を簡潔に提案する。',
    measure: '返信率だけでなく、実際の面談・利用・支払い。',
  },
};

interface GenesisSectionProps {
  genesisTactics: MacroIntelligenceData['genesisTactics'];
}

export const GenesisSection: React.FC<GenesisSectionProps> = ({ genesisTactics }) => (
  <div className="w-full">
    <div className="term-panel-title"><span className="term-panel-name">初期の顧客獲得</span><span className="term-num">{genesisTactics.length}件</span></div>
    <div className="grid sm:grid-cols-2">
    {genesisTactics.map((tactic, index) => {
      const guide = ACQUISITION[tactic.id];
      return (
        <article key={tactic.id} className={`border-b border-term-line ${index % 2 === 0 ? 'sm:border-r' : ''}`}>
          <h2 className="border-b border-term-line-soft bg-term-head px-3 py-2 text-sm font-semibold text-term-fg-strong">{guide?.title || tactic.tacticName}</h2>
          <div className="px-3 py-2">
            <p className="text-sm leading-6 text-term-fg">{tactic.summary}</p>
            <Link href={`/?entity=${encodeURIComponent(tactic.proofEntity.id)}&mode=LEDGER`} className="mt-1 inline-flex min-h-11 items-center text-xs text-term-select-fg underline underline-offset-2 hover:text-term-fg-strong lg:min-h-6">参考事例: {tactic.proofEntity.name}</Link>
          </div>
          {tactic.executionSteps.length > 0 && <details className="border-t border-term-line-soft px-3">
            <summary className="min-h-11 cursor-pointer py-2.5 text-sm text-term-select-fg lg:min-h-6">具体的な手順</summary>
            <ol className="list-decimal space-y-2 pb-3 pl-5 text-sm leading-6 text-term-sub">
              {tactic.executionSteps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </details>}
          {guide && <dl className="border-t border-term-line-soft text-sm leading-6">
            {[
              ['向く場面', guide.useFor],
              ['進め方', guide.method],
              ['見る指標', guide.measure],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-0.5 border-b border-term-line-soft px-3 py-2 last:border-b-0 sm:grid-cols-[80px_minmax(0,1fr)] sm:gap-3"><dt className="text-xs text-term-label">{label}</dt><dd className="text-term-fg">{value}</dd></div>
            ))}
          </dl>}
        </article>
      );
    })}
    </div>
  </div>
);

type StackGuide = { title: string; useFor: string; roles: Array<[string, string]>; check: string };

const STACKS: Record<string, StackGuide> = {
  'recipe-solo-100m': {
    title: '小さく始めるWebサービス',
    useFor: '一人または少人数で、機能と運用を絞って公開する場合。',
    roles: [['公開', 'Webアプリとホスティング'], ['保存', '顧客データの保管'], ['決済', '購入・請求の処理'], ['運用', '障害の通知とバックアップ']],
    check: '保守する人数、障害時の復旧方法、利用量に応じた費用。',
  },
  'recipe-b2b-niche-moat': {
    title: '業務向けWebサービス',
    useFor: '複数の担当者が同じ顧客情報や業務履歴を扱う場合。',
    roles: [['認証', '組織・担当者ごとの権限'], ['保存', '業務データと変更履歴'], ['連携', '既存システムとの入出力'], ['運用', '監査・バックアップ・問い合わせ対応']],
    check: '権限の分離、データの持ち出し、契約終了後の扱い。',
  },
  'recipe-ai-automation-arbitrage': {
    title: 'AIを使う業務支援サービス',
    useFor: '人が確認する業務の一部をモデルで補助する場合。',
    roles: [['入力', '対象データの受領と権限確認'], ['処理', 'モデルの実行と失敗時の再試行'], ['確認', '結果を人が修正できる画面'], ['運用', '原価・品質・利用履歴の記録']],
    check: '誤りが起きた時の責任分担と、入力データの取扱い。',
  },
};

interface GoldenStackSectionProps {
  goldenStackRecipes: MacroIntelligenceData['goldenStackRecipes'];
}

export const GoldenStackSection: React.FC<GoldenStackSectionProps> = ({ goldenStackRecipes }) => (
  <div className="w-full">
    <div className="term-panel-title"><span className="term-panel-name">技術構成の参考</span><span className="term-num">{goldenStackRecipes.length}件</span></div>
    <div className="grid md:grid-cols-2 xl:grid-cols-3">
    {goldenStackRecipes.map((recipe) => {
      const guide = STACKS[recipe.id];
      return (
        <article key={recipe.id} className="border-b border-term-line md:border-r">
          <div className="border-b border-term-line-soft bg-term-head px-3 py-2">
            <h2 className="text-sm font-semibold text-term-fg-strong">{guide?.title || recipe.name}</h2>
            <p className="mt-0.5 text-sm leading-5 text-term-sub">{guide?.useFor || recipe.description}</p>
          </div>
          <dl className="text-sm leading-6">
            {recipe.tools.map((tool) => (
              <div key={`${tool.category}-${tool.toolName}`} className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b border-term-line-soft px-3 py-1.5">
                <dt className="text-xs leading-6 text-term-label">{tool.category}</dt>
                <dd><span className="font-medium text-term-fg-strong">{tool.toolName}</span>{tool.role && <span className="block text-xs leading-5 text-term-sub">{tool.role}</span>}</dd>
              </div>
            ))}
          </dl>
          <details className="border-t border-term-line-soft px-3">
            <summary className="min-h-11 cursor-pointer py-2.5 text-sm text-term-select-fg lg:min-h-6">構成案の前提・費用</summary>
            <dl className="space-y-2 pb-3 text-sm leading-6 text-term-sub">
              <div><dt className="text-xs text-term-label">構成の考え方</dt><dd>{recipe.description}</dd></div>
              <div><dt className="text-xs text-term-label">想定する規模</dt><dd>{recipe.targetScale}</dd></div>
              <div><dt className="text-xs text-term-label">固定費の想定</dt><dd>{recipe.monthlyFixedCost}</dd></div>
              <div><dt className="text-xs text-term-label">利益率の目標</dt><dd>{recipe.marginTarget}</dd></div>
            </dl>
          </details>
          {guide && <p className="border-t border-term-line-soft px-3 py-2 text-sm leading-5 text-term-muted">{guide.check}</p>}
        </article>
      );
    })}
    </div>
  </div>
);
