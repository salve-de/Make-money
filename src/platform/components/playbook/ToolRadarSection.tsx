'use client';

import React from 'react';
import { TOOL_CATEGORIES, ToolCategoryKey, CategoryTrendRadar } from '@/lib/intelligence/macro-aggregator';

type ToolGuide = { title?: string; description: string; suitableFor: string; check: string; officialUrl: string };

// The legacy radar's estimates, market-share figures and company associations
// have no supporting sources; this view uses independent product descriptions.
const TOOL_GUIDES: Record<string, ToolGuide> = {
  'Cloudflare (Workers / Pages / CDN)': {
    title: 'Cloudflare',
    description: 'Webアプリの実行、静的サイトの配信、コンテンツのキャッシュを扱う基盤。',
    suitableFor: '配信と軽量なサーバー処理を同じ基盤で扱いたい場合。',
    check: '実行時間・利用量・必要な実行環境の制約。',
    officialUrl: 'https://developers.cloudflare.com/workers/platform/pricing/',
  },
  'Vercel (Next.js Platform)': {
    title: 'Vercel',
    description: 'Webアプリのビルド、デプロイ、プレビューを扱うホスティング基盤。',
    suitableFor: 'Next.jsの公開と変更ごとのプレビューをまとめたい場合。',
    check: '転送量・関数実行・チーム利用時の料金。',
    officialUrl: 'https://vercel.com/docs/pricing',
  },
  'AWS / Hetzner (専有ベアメタル・クラウド)': {
    title: 'Hetzner Cloud',
    description: '仮想サーバーなどの計算資源を構成するクラウド基盤。',
    suitableFor: '実行環境や配置を細かく管理したい場合。',
    check: '運用担当、バックアップ、監視、障害対応の負担。',
    officialUrl: 'https://docs.hetzner.com/',
  },
  'Replicate / RunPod (サーバーレスGPU)': {
    title: 'Replicate',
    description: '公開モデルや独自モデルをAPIから実行するサービス。',
    suitableFor: '自前のGPUを管理せずにモデルを試したい場合。',
    check: 'モデルごとの実行環境、待ち時間、利用量に応じた料金。',
    officialUrl: 'https://replicate.com/docs',
  },
  'Anthropic Claude API (Sonnet / Haiku)': {
    title: 'Claude API',
    description: 'Claudeモデルをアプリから呼び出すためのAPI。',
    suitableFor: '文章処理や対話機能をアプリに組み込む場合。',
    check: 'モデルの対応機能、データの扱い、利用量に応じた料金。',
    officialUrl: 'https://docs.anthropic.com/',
  },
  'OpenAI API (GPT-4o / mini)': {
    title: 'OpenAI API',
    description: 'OpenAIのモデルをアプリから呼び出すためのAPI。',
    suitableFor: '文章・画像などを扱う機能を組み込む場合。',
    check: '使用するモデルの対応機能と利用量に応じた料金。',
    officialUrl: 'https://platform.openai.com/docs/',
  },
  'PostgreSQL / Supabase': {
    title: 'Supabase',
    description: 'PostgreSQLを中心に認証やAPIなどを提供するバックエンド基盤。',
    suitableFor: '関係データを保存し、認証やAPIも合わせて検討する場合。',
    check: '権限設計、バックアップ、データ移行の方法。',
    officialUrl: 'https://supabase.com/docs',
  },
  'ClickHouse (列指向超高速DB)': {
    title: 'ClickHouse',
    description: '大量のイベントや集計データの分析に使う列指向データベース。',
    suitableFor: '分析クエリを頻繁に実行する場合。',
    check: '更新方法と既存の業務データベースとの役割分担。',
    officialUrl: 'https://clickhouse.com/docs',
  },
  'Redis / Upstash (サーバーレスキャッシュ)': {
    title: 'Upstash Redis',
    description: 'Redisを使った一時データの保存やキャッシュを提供するサービス。',
    suitableFor: '短時間の状態保存やアクセス頻度の高い値を扱う場合。',
    check: '永続化、整合性、リクエスト数に応じた料金。',
    officialUrl: 'https://upstash.com/docs/redis/overall/getstarted',
  },
  'Stripe (Checkout / Billing)': {
    title: 'Stripe',
    description: 'オンライン決済と継続課金を組み込むためのサービス。',
    suitableFor: 'Web上で支払いやサブスクリプションを受け付ける場合。',
    check: '対象国、決済手段、手数料、税務処理の担当範囲。',
    officialUrl: 'https://docs.stripe.com/payments/checkout',
  },
  'Lemon Squeezy (Stripe傘下 MoR決済)': {
    title: 'Lemon Squeezy',
    description: 'デジタル商品の販売や継続課金を扱う販売基盤。',
    suitableFor: 'デジタル商品をオンラインで販売する場合。',
    check: '販売可能な商品、審査、税務上の役割、手数料。',
    officialUrl: 'https://docs.lemonsqueezy.com/',
  },
  'Customer.io / HubSpot': {
    title: 'Customer.io',
    description: '顧客の属性やアプリ内の行動に合わせて、メール・プッシュ通知などを自動配信するサービス。',
    suitableFor: '登録後の案内や、利用が途切れた顧客への連絡を自動化したい場合。',
    check: '配信条件に使うイベント・顧客データの連携と、必要な配信チャネル。',
    officialUrl: 'https://docs.customer.io/',
  },
  'Resend / React Email': {
    title: 'Resend',
    description: 'アプリからのメール送信を扱うサービス。',
    suitableFor: '通知メールをコードで管理したい場合。',
    check: '送信ドメイン設定、配信上限、配信停止の扱い。',
    officialUrl: 'https://resend.com/docs',
  },
  'ConvertKit (Kit)': {
    title: 'Kit',
    description: '登録者へのメール配信やニュースレター運営を扱うサービス。',
    suitableFor: '読者リストを育てながら定期的に配信する場合。',
    check: '登録者数に応じた料金と配信・販売機能の範囲。',
    officialUrl: 'https://help.kit.com/',
  },
  'Next.js + Tailwind CSS': {
    title: 'Next.js',
    description: 'ReactでWebアプリを作るフレームワーク。',
    suitableFor: '独自の画面や機能をコードで作る場合。',
    check: '開発・保守できる体制と必要なホスティング。',
    officialUrl: 'https://nextjs.org/docs',
  },
  'Carrd (超低コスト1枚LP要塞)': {
    title: 'Carrd',
    description: '単一ページのWebサイトを作成するサービス。',
    suitableFor: '商品紹介や問い合わせ用の小さなページを早く公開したい場合。',
    check: 'フォーム、独自ドメイン、外部サービス連携の要件。',
    officialUrl: 'https://carrd.co/docs',
  },
};

const ADDITIONAL_GUIDES: Record<string, ToolGuide> = {
  'AWS / Hetzner (専有ベアメタル・クラウド)': {
    title: 'Amazon Web Services',
    description: 'サーバーやストレージなどのクラウドサービスを提供する基盤。',
    suitableFor: 'インフラを要件に合わせて組み合わせたい場合。',
    check: '構成、権限、運用、利用量に応じた料金。',
    officialUrl: 'https://docs.aws.amazon.com/',
  },
  'Replicate / RunPod (サーバーレスGPU)': {
    title: 'Runpod',
    description: 'GPU・CPUを使う処理の実行環境を提供するサービス。',
    suitableFor: 'モデルをGPU上で動かす環境を用意したい場合。',
    check: 'エンドポイント、待機時間、実行時間と課金条件。',
    officialUrl: 'https://docs.runpod.io/',
  },
  'PostgreSQL / Supabase': {
    title: 'PostgreSQL',
    description: '関係データを保存・検索するオープンソースのデータベース。',
    suitableFor: 'データベース自体を自分で構成・管理したい場合。',
    check: 'ホスティング、バックアップ、更新と運用担当。',
    officialUrl: 'https://www.postgresql.org/docs/',
  },
  'Redis / Upstash (サーバーレスキャッシュ)': {
    title: 'Redis',
    description: 'キャッシュや短時間の状態保存に使うデータストア。',
    suitableFor: '保存・実行環境を自分で選びたい場合。',
    check: '永続化設定、メモリ使用量、運用方法。',
    officialUrl: 'https://redis.io/docs/latest/',
  },
  'Customer.io / HubSpot': {
    title: 'HubSpot',
    description: '顧客情報や営業・マーケティング活動を管理するサービス。',
    suitableFor: '営業履歴と顧客対応を一か所で扱いたい場合。',
    check: '必要な機能とプラン、データ移行の方法。',
    officialUrl: 'https://knowledge.hubspot.com/',
  },
  'Resend / React Email': {
    title: 'React Email',
    description: 'Reactコンポーネントでメール本文を作成するツール。',
    suitableFor: 'メールの見た目をコードで管理したい場合。',
    check: '送信には別の配信サービスが必要。',
    officialUrl: 'https://react.email/docs',
  },
  'Next.js + Tailwind CSS': {
    title: 'Tailwind CSS',
    description: 'スタイル指定をクラスで組み立てるCSSツール。',
    suitableFor: '画面のスタイルをコンポーネント内で管理したい場合。',
    check: '既存CSSとの統合とデザイン規則の共有。',
    officialUrl: 'https://tailwindcss.com/docs',
  },
};

interface ToolRadarSectionProps {
  selectedToolCategory: ToolCategoryKey;
  setSelectedToolCategory: (cat: ToolCategoryKey) => void;
  activeCategoryRadar: CategoryTrendRadar;
  activeCategoryMeta: (typeof TOOL_CATEGORIES)[number];
  onSelectEntity?: (entityId: string) => void;
}

const TOOL_GRID = 'lg:grid-cols-[180px_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_120px]';

export const ToolRadarSection: React.FC<ToolRadarSectionProps> = ({
  selectedToolCategory,
  setSelectedToolCategory,
  activeCategoryRadar,
  activeCategoryMeta,
  onSelectEntity,
}) => {
  const guides = activeCategoryRadar.tools.flatMap((tool) => {
    const first = TOOL_GUIDES[tool.name];
    const additional = ADDITIONAL_GUIDES[tool.name];
    return first ? [{ ...first, title: first.title ?? tool.name }, ...(additional ? [additional] : [])] : [];
  });
  const unguided = activeCategoryRadar.tools.filter((tool) => !TOOL_GUIDES[tool.name]);
  return (
    <div className="w-full">
      <section aria-label="ツールの用途を選択" className="flex items-center gap-3 border-b border-term-line px-3 py-2">
        <label htmlFor="tool-category" className="shrink-0 text-xs text-term-label">用途</label>
        <select
          id="tool-category"
          value={selectedToolCategory}
          onChange={(event) => setSelectedToolCategory(event.target.value as ToolCategoryKey)}
          className="h-11 min-w-0 w-full max-w-sm rounded-sm border border-term-line bg-term-bg px-2 text-sm text-term-fg-strong outline-none focus:border-term-accent lg:h-8"
        >
          {TOOL_CATEGORIES.map((cat) => <option key={cat.key} value={cat.key}>{cat.label}</option>)}
        </select>
        <span className="term-num ml-auto hidden text-xs text-term-label sm:inline">{guides.length + unguided.length}件</span>
      </section>

      <section aria-label={`${activeCategoryMeta.label}のツール`}>
        <div className={`hidden h-[26px] items-center gap-3 border-b border-term-line bg-term-head px-3 text-xs text-term-label lg:grid ${TOOL_GRID}`}>
          <span>名前</span><span>何をするか</span><span>向く用途</span><span>導入前に確認</span><span>公式資料</span>
        </div>
        {guides.map((guide, index) => (
          <article key={guide.officialUrl} className={`grid gap-x-3 gap-y-1 border-b border-term-line-soft px-3 py-2.5 text-sm leading-5 lg:items-start lg:py-1.5 ${TOOL_GRID} ${index % 2 ? 'bg-term-row-alt' : ''}`}>
            <h3 className="font-semibold text-term-fg-strong">{guide.title}</h3>
            <p className="text-term-sub">{guide.description}</p>
            <p className="text-term-fg"><span className="mr-2 text-xs text-term-label lg:hidden">向く用途</span>{guide.suitableFor}</p>
            <p className="text-term-muted"><span className="mr-2 text-xs text-term-label lg:hidden">導入前に確認</span>{guide.check}</p>
            <a href={guide.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center whitespace-nowrap text-term-select-fg underline underline-offset-2 hover:text-term-fg-strong lg:min-h-6">公式資料を開く ↗</a>
          </article>
        ))}
      </section>
      {unguided.map((tool) => (
        <article key={tool.name} className="border-b border-term-line-soft px-3 py-2.5 text-sm leading-6 text-term-fg">
          <h3 className="font-semibold text-term-fg-strong">{tool.name}</h3>
          {tool.whyMigrating && <p className="text-term-sub">{tool.whyMigrating}</p>}
          {tool.estimatedCost && <p><span className="text-xs text-term-label">費用目安 </span>{tool.estimatedCost}</p>}
          {tool.proofQuote && <details><summary className="min-h-11 cursor-pointer text-term-select-fg lg:min-h-6">収集記録</summary><p className="mt-2">{tool.proofQuote}</p>{tool.detectionMethod && <p className="text-xs text-term-label">{tool.detectionMethod}</p>}</details>}
          {tool.usedByEntities.length > 0 && <div className="flex flex-wrap gap-2">{tool.usedByEntities.map((entity) => onSelectEntity ? <button key={entity.id} type="button" onClick={() => onSelectEntity(entity.id)} className="min-h-11 rounded-sm border border-term-line px-2 text-term-select-fg hover:bg-term-head lg:min-h-8">{entity.name}</button> : <span key={entity.id}>{entity.name}</span>)}</div>}
        </article>
      ))}
    </div>
  );
};
