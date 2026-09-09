'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  ShieldAlert, 
  TrendingUp, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  Database,
  Lock,
  Compass,
  Scale,
  Clock,
  Network,
  Wrench
} from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/context/AuthContext';

interface WeaponItem {
  code: string;
  name: string;
  distortion: string;
  example: string;
  margin: string;
  href: string;
}

const WEAPON_DOMAINS = [
  { id: 'info', name: '情報・認知の歪み', count: 5, icon: Compass, description: '不透明性・認知的怠惰・保身心理を突いた超過利潤' },
  { id: 'reg', name: '制度・規制の歪み', count: 5, icon: Scale, description: '法的義務化や参入規制・公的ルールを味方につけた独占' },
  { id: 'time', name: '時間・資本の歪み', count: 5, icon: Clock, description: '緊急性の崖・前受金フロート・時間差移植による無競争' },
  { id: 'ecosystem', name: 'エコシステムの歪み', count: 5, icon: Network, description: '巨大PF寄生・単機能切り出し・大手の足元ニッチ寡占' },
  { id: 'operation', name: '非対称オペレーション', count: 5, icon: Wrench, description: '労働の地理的裁定・限界費用ゼロ自動化・実業近代化' },
] as const;

type DomainId = typeof WEAPON_DOMAINS[number]['id'];

const WEAPONS_BY_DOMAIN: Record<DomainId, WeaponItem[]> = {
  info: [
    {
      code: '#01-A',
      name: 'CYA（保身・免責）プレミアム',
      distortion: '担当者の「ミスで解雇されたくない」恐怖を買い取り、機能価値の数十倍で定価販売',
      example: 'KEYENCE / 保険料込み独占価格',
      margin: '54.0%',
      href: '/?topic=direct_monopoly&entity=ent_keyence',
    },
    {
      code: '#01-B',
      name: '認知的怠惰の肩代わり（Thin Wrapper）',
      distortion: 'オープンソースやAPIを薄く包み、一般人の「設定するのが面倒」を消去して月額課金化',
      example: 'Photo AI',
      margin: '84.0%',
      href: '/?topic=solo_empire&entity=ent_photoai',
    },
    {
      code: '#01-C',
      name: 'ブラックボックスの脱神話化・仲介',
      distortion: '一生に数回しか買わず相場が不透明な市場で、定額パッケージ窓口を押さえ送客手数料中抜き',
      example: 'Liinks (格安BioリンクSaaS)',
      margin: '76.0%',
      href: '/?filter=SOLO&entity=ent_liinks',
    },
    {
      code: '#01-D',
      name: 'クッキーレス解析によるGA4代替',
      distortion: 'Google AnalyticsのGA4改悪・クッキーバナーの苦痛を逆手に取り、超軽量タグで月商数百万円を抜く',
      example: 'Simple Analytics',
      margin: '79.2%',
      href: '/?topic=privacy_saas&entity=ent_simpleanalytics',
    },
    {
      code: '#01-E',
      name: '地位ゲーム（Status Games）の独占',
      distortion: '意図的に供給を絞り、厳しい審査で「他者への序列誇示・選民思想」を高額サブスク化',
      example: 'Easlo (Notion OS)',
      margin: '98.6%',
      href: '/?filter=ZERO_CAPITAL&entity=ent_easlo',
    },
  ],
  reg: [
    {
      code: '#02-A',
      name: '法的義務化の関所（Mandatory Compliance）',
      distortion: '電帳法・インボイス等「導入しないと違法」の施行期日に合わせ、営業努力ゼロで顧客を刈り取る',
      example: 'KEYENCE / 製造基準独占',
      margin: '54.0%',
      href: '/?filter=MONOPOLY&entity=ent_keyence',
    },
    {
      code: '#02-B',
      name: 'プライバシー法規制の城壁（GDPR完全準拠）',
      distortion: 'EUのGDPR罰則恐怖を突いて、米国の巨大追跡広告モデルを排除したクッキーレス解析を提供',
      example: 'Plausible Analytics',
      margin: '72.8%',
      href: '/?topic=privacy_saas&entity=ent_plausible',
    },
    {
      code: '#02-C',
      name: 'ポッドキャスト配信の無制限アンバンドリング',
      distortion: '「番組ごとに追加課金する」旧世代ホスティングを破壊し、複数番組定額で年商2億円を抜く',
      example: 'Transistor.fm',
      margin: '82.8%',
      href: '/?filter=SOLO&entity=ent_transistor',
    },
    {
      code: '#02-D',
      name: '審査落ち・信用弱者の囲い込み',
      distortion: '銀行が門前払いした層に対し、リスクを価格に転嫁して貸倒率を上回る超過マージンを確定',
      example: 'Stripe Payments',
      margin: '30.0%',
      href: '/?entity=ent_stripe',
    },
    {
      code: '#02-E',
      name: 'グレーゾーン先行逃げ切り',
      distortion: '法解釈が定まる前の隙間に突撃し、規制が動く前にユーザーを囲い込み既成事実化する',
      example: 'HeadshotPro',
      margin: '46.2%',
      href: '/?topic=solo_empire&entity=ent_headshotpro',
    },
  ],
  time: [
    {
      code: '#03-A',
      name: 'ネガティブ・ワーキング・キャピタル',
      distortion: '顧客からは年払いで即前回収し外注は60日後払い。無借金・調達ゼロで顧客の現金で自己増殖',
      example: 'Easlo (完全先払いOS)',
      margin: '98.6%',
      href: '/?filter=ZERO_CAPITAL&entity=ent_easlo',
    },
    {
      code: '#03-B',
      name: '緊急性・ダウンタイムの崖',
      distortion: '工場停止や水漏れなど「今すぐ直さないと破滅する」状況を即解決し、値引きを拒絶して定価販売',
      example: 'KEYENCE (当日即発送)',
      margin: '54.0%',
      href: '/?topic=direct_monopoly&entity=ent_keyence',
    },
    {
      code: '#03-C',
      name: 'タイムマシン経営（時間差移植）',
      distortion: '米国で急成長したモデルを日本市場に最適化移植し、市場検証リスクゼロで先行者利益を独占',
      example: 'HeadshotPro / 写真館代替',
      margin: '46.2%',
      href: '/?topic=solo_empire&entity=ent_headshotpro',
    },
    {
      code: '#03-D',
      name: '地理的・内外価格差アービトラージ',
      distortion: '国内では安価なコモディティを、円安や文化ギャップをテコに海外富裕層へ超高単価販売',
      example: 'TLDR Newsletter (ドル建て広告)',
      margin: '67.2%',
      href: '/?topic=media_cashflow&entity=ent_tldr',
    },
    {
      code: '#03-E',
      name: 'マイクロ流動性の提供（叩き買い・再生）',
      distortion: '「今すぐ処分したい」後継者不在の町工場や余剰在庫を二束三文で即日買取し顧客リストを換金',
      example: 'クラフトウォッシュ (地域再生)',
      margin: '48.3%',
      href: '/?filter=SOLO&entity=ent_local_wash',
    },
  ],
  ecosystem: [
    {
      code: '#04-A',
      name: 'コバンザメ・プラットフォーム寄生',
      distortion: 'ShopifyやLINE等の巨大ストア内で公式が作らない隙間ツールを展開し、CACほぼゼロで億を抜く',
      example: 'Notion OS / Easlo',
      margin: '98.6%',
      href: '/?filter=ZERO_CAPITAL&entity=ent_easlo',
    },
    {
      code: '#04-B',
      name: '大手の死角（効率的規模・小池独占）',
      distortion: '市場規模が小さすぎて（年商5〜10億）上場企業が参入できないニッチ領域を1社で寡占',
      example: '地域限定・施工DX',
      margin: '48.3%',
      href: '/?filter=SOLO&entity=ent_local_wash',
    },
    {
      code: '#04-C',
      name: '巨人のアンバンドリング（単機能極限特化）',
      distortion: 'ExcelやJiraなど肥大化した巨大ツールから、特定職種が使う1機能だけを切り出して超高速化',
      example: 'Photo AI (スタジオ機能切り出し)',
      margin: '84.0%',
      href: '/?topic=solo_empire&entity=ent_photoai',
    },
    {
      code: '#04-D',
      name: '関所・チョークポイント（通行税モデル）',
      distortion: 'プレイヤー同士を血みどろで競争させ、自身はその決済・受発注の出入り口で手数料を自動徴収',
      example: 'Stripe (決済テイクレート)',
      margin: '30.0%',
      href: '/?filter=MONOPOLY&entity=ent_stripe',
    },
    {
      code: '#04-E',
      name: 'カウンターポジショニング（巨人の自爆トラップ）',
      distortion: '大手が真似すると既存の代理店網や本業売上を自ら破壊することになるため、手を出せない構造を突く',
      example: 'KEYENCE (完全直販特化)',
      margin: '54.0%',
      href: '/?topic=direct_monopoly&entity=ent_keyence',
    },
  ],
  operation: [
    {
      code: '#05-A',
      name: '労働の地理的裁定（グローバルBPO）',
      distortion: '国内定価で集金し、裏側の運用・監視・開発は月給数万円の海外英語ネイティブ部隊に委託し粗利総取り',
      example: 'TLDR (世界分散エディター)',
      margin: '67.2%',
      href: '/?topic=media_cashflow&entity=ent_tldr',
    },
    {
      code: '#05-B',
      name: '全社員給与・売上公開による透明性PR',
      distortion: '全財務をWeb上で公開し、世界的メディアから無数の被リンクを獲得して広告費0円で年商30億円',
      example: 'Buffer (SNS予約要塞)',
      margin: '20.0%',
      href: '/?entity=ent_buffer',
    },
    {
      code: '#05-C',
      name: 'Next.jsボイラープレートの買い切り販売',
      distortion: '認証とStripe決済の退屈な配管コードをまとめ、買い切り販売で完全1人で年商1億円超',
      example: 'ShipFast (Marc Lou)',
      margin: '95.3%',
      href: '/?filter=SOLO&entity=ent_shipfast',
    },
    {
      code: '#05-D',
      name: 'プログラムによる数万URL量産（pSEO）',
      distortion: 'データベースから動的に比較・事例ページを何万URLも自動生成し、Google検索トラフィックを独占',
      example: 'HeadshotPro (地域×職種pSEO)',
      margin: '46.2%',
      href: '/?topic=solo_empire&entity=ent_headshotpro',
    },
    {
      code: '#05-E',
      name: '業務フローの神経同化（スイッチング障壁）',
      distortion: '現場ルーティンと一体化させ、「社員の再教育コストの方が高い」として値上げを容認させる',
      example: 'KEYENCE (製造現場データ独占)',
      margin: '54.0%',
      href: '/?topic=direct_monopoly&entity=ent_keyence',
    },
  ],
};

export default function WelcomePage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeDomain, setActiveDomain] = useState<DomainId>('info');
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#060709] text-zinc-100 font-sans selection:bg-zinc-800 selection:text-zinc-100">
      {/* 1. 最上部コントロールバー */}
      <header className="sticky top-0 z-40 h-12 bg-[#07080B]/90 backdrop-blur-md border-b border-white/[0.06] px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-white hover:text-zinc-300 transition-colors">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            KIN-ROKOKU
          </Link>
          <span className="text-[10px] font-mono text-zinc-600 hidden sm:inline">
            CAPITAL ARBITRAGE TERMINAL v2.5
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <span className="text-xs font-mono text-zinc-400 truncate max-w-[120px] sm:max-w-none">
              {user.email}
            </span>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-xs font-mono text-zinc-400 hover:text-white px-2.5 py-1 rounded transition-colors cursor-pointer"
            >
              ログインしてみる
            </button>
          )}

          <Link
            href="/?entity=ent_photoai"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-zinc-200 text-black font-medium text-xs transition-colors cursor-pointer shadow-sm"
          >
            <span>端末を起動する</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* 2. HERO セクション */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 px-4 md:px-8 max-w-5xl mx-auto text-center">
        {/* H1 見出し */}
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-medium tracking-tight text-white mb-4 leading-tight">
          儲けている人間は、特別な天才ではない。
        </h1>

        {/* サブ見出し */}
        <p className="text-sm sm:text-base md:text-lg text-zinc-200 max-w-2xl mx-auto mb-3 font-medium">
          事業の収益性を決定づけているのは、個人の才能ではなく「市場の構造（着眼点の差）」である。
        </p>

        {/* 武器展開の導入 */}
        <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto mb-8 font-sans">
          ゼロから新しいものを創る必要はない。先行事業者が巨額の利益を上げている「5つの着眼点」を照合する。
        </p>

        {/* 検索バー（端末直結） */}
        <div className="max-w-xl mx-auto mb-6">
          <Link
            href="/?entity=ent_photoai&q=Photo+AI"
            className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-lg bg-zinc-900/90 border border-white/[0.12] hover:border-white/[0.25] text-left transition-all shadow-xl group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 pl-2 text-xs sm:text-sm text-zinc-400">
              <span className="text-zinc-500 font-mono">🔍</span>
              <span className="text-zinc-300 truncate">
                例: <span className="text-white font-medium">Photo AI</span>、<span className="text-white font-medium">粗利80%</span>、<span className="text-white font-medium">1人</span> ...
              </span>
            </div>
            <div className="flex items-center gap-1 px-3.5 py-1.5 rounded bg-white text-black font-semibold text-xs group-hover:bg-zinc-200 transition-colors shrink-0">
              <span>検索する</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>

        {/* CTA ボタングループ */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Link
            href="/?entity=ent_photoai"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors cursor-pointer shadow-md"
          >
            <span>端末を起動する (無料)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {!user && (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 hover:text-white font-medium text-xs transition-colors border border-white/[0.08] cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>ログインしてみる</span>
            </button>
          )}
        </div>

        {/* 端末プレビュー・高精細フレーム */}
        <div className="relative rounded-lg border border-white/[0.08] bg-[#07080B] p-2 shadow-2xl overflow-hidden text-left">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] text-[10px] font-mono text-zinc-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-700" />
              <div className="w-2 h-2 rounded-full bg-zinc-700" />
              <div className="w-2 h-2 rounded-full bg-zinc-700" />
              <span className="ml-2 text-zinc-400 font-medium">実機プレビュー（損益・手口台帳）</span>
            </div>
            <span className="text-zinc-600">3-PANE FINANCIAL LEDGER</span>
          </div>

          {/* プレビューの中身（高密度ティッカー ＋ サンプル行） */}
          <div className="p-4 bg-[#060709] font-mono text-xs overflow-x-auto">
            <div className="grid grid-cols-6 gap-4 pb-2 border-b border-white/[0.06] text-[10px] text-zinc-500 uppercase tracking-wider">
              <span>企業 / 事業名</span>
              <span className="text-right">推定売上</span>
              <span className="text-right">営業利益率</span>
              <span>組織規模</span>
              <span className="col-span-2">突いた隙間（アービトラージの手口）</span>
            </div>

            <div className="divide-y divide-white/[0.04]">
              <div className="grid grid-cols-6 gap-4 py-2.5 items-center">
                <span className="font-semibold text-white">Photo AI</span>
                <span className="text-right text-zinc-300">¥1,800万/月</span>
                <span className="text-right text-emerald-400 font-medium">84.0%</span>
                <span className="text-zinc-500">1人 (SOLO)</span>
                <span className="col-span-2 text-zinc-400 truncate text-[11px]">写真館に行くのが恥ずかしい人間の見栄とコンプレックスの即時換金</span>
              </div>

              <div className="grid grid-cols-6 gap-4 py-2.5 items-center">
                <span className="font-semibold text-white">KEYENCE</span>
                <span className="text-right text-zinc-300">¥800億/月</span>
                <span className="text-right text-emerald-400 font-medium">54.0%</span>
                <span className="text-zinc-500">直販組織</span>
                <span className="col-span-2 text-zinc-400 truncate text-[11px]">ライン停止の巨額損失を握ることで相見積もりを無力化し定価販売</span>
              </div>

              <div className="grid grid-cols-6 gap-4 py-2.5 items-center">
                <span className="font-semibold text-white">Clay×AI Outbound</span>
                <span className="text-right text-zinc-300">¥800万/月</span>
                <span className="text-right text-emerald-400 font-medium">65.0%</span>
                <span className="text-zinc-500">2人 (API自動)</span>
                <span className="col-span-2 text-zinc-400 truncate text-[11px]">営業採用できないVC調達企業のCAC麻痺を成果報酬型で掠め取る</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. コア・インサイト：5大ドメイン・勝者の武器マトリクス */}
      <section className="border-t border-white/[0.06] bg-[#07080B] py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
            THE ANATOMY OF CAPITAL ARBITRAGE
          </div>
          <h2 className="text-xl md:text-3xl font-medium text-white mb-3 leading-snug">
            勝者の武器：超過利潤を確定させる「5つの着眼点」
          </h2>
          <p className="text-xs md:text-sm text-zinc-400 leading-relaxed mb-8 max-w-3xl">
            市場で莫大な手残りを叩き出している事業者は、偶然成功したのではない。
            市場の不均衡や人間の習性を突いた構造的な「歪み」を特定し、不可逆な利益確定ポイントに配置しているに過ぎない。
          </p>

          {/* 5大ドメイン切り替えタブバー */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 border-b border-white/[0.06] no-scrollbar">
            {WEAPON_DOMAINS.map((domain) => {
              const Icon = domain.icon;
              const isActive = activeDomain === domain.id;
              return (
                <button
                  key={domain.id}
                  onClick={() => setActiveDomain(domain.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-mono transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{domain.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? 'bg-zinc-200 text-black' : 'bg-white/[0.06] text-zinc-500'
                    }`}
                  >
                    {domain.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* アクティブドメインの説明 */}
          <div className="text-xs text-zinc-400 font-mono mb-4 flex items-center justify-between px-1">
            <span>
              ● {WEAPON_DOMAINS.find((d) => d.id === activeDomain)?.description}
            </span>
            <span className="text-zinc-600 text-[11px] hidden sm:inline">
              クリックで該当手口の企業群を端末で照合
            </span>
          </div>

          {/* 高密度インテリジェンス台帳（武器リスト） */}
          <div className="rounded-lg border border-white/[0.08] bg-[#060709] divide-y divide-white/[0.04] overflow-hidden">
            {WEAPONS_BY_DOMAIN[activeDomain].map((weapon) => (
              <Link
                key={weapon.code}
                href={weapon.href}
                className="group flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                {/* 左側：コード ＆ 手口名称 ＆ 歪みの本質 */}
                <div className="space-y-1.5 md:max-w-2xl">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold shrink-0 whitespace-nowrap">
                      {weapon.code}
                    </span>
                    <h3 className="text-xs sm:text-sm font-medium text-white group-hover:text-zinc-200 transition-colors">
                      {weapon.name}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    {weapon.distortion}
                  </p>
                </div>

                {/* 右側：代表実例 ＆ 営業利益率 ＆ アクション */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.04]">
                  <div className="text-left md:text-right">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">代表実例</div>
                    <span className="text-xs font-mono text-zinc-300">
                      {weapon.example}
                    </span>
                  </div>

                  <div className="text-right min-w-[70px]">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">営業利益率</div>
                    <span className="text-xs font-mono text-emerald-400 font-semibold tabular-nums">
                      {weapon.margin}
                    </span>
                  </div>

                  <div className="w-6 h-6 rounded bg-white/[0.04] flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:bg-white/[0.1] transition-all shrink-0">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between text-xs text-zinc-500 font-mono px-1">
            <span>※ 全25手口の完全データセット・財務レントゲンは端末に収録</span>
            <Link
              href="/?filter=HIGH_MARGIN&entity=ent_photoai"
              className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
            >
              <span>端末で高利益率銘柄をスクリーニングする</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. 読者への想起：冷徹な照合インフラ */}
      <section className="py-16 md:py-24 px-4 md:px-8 max-w-4xl mx-auto">
        <div className="p-6 md:p-10 rounded-lg bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-[11px] font-mono text-zinc-300">
            <span>● 資本主義の客観的照合台帳</span>
          </div>

          <h2 className="text-xl md:text-3xl font-medium text-white tracking-tight leading-snug">
            当てずっぽうの事業検証を終了させる。<br />
            先行者が検証済みの「収益骨格」を照合せよ。
          </h2>

          <p className="text-xs md:text-sm text-zinc-300 leading-relaxed max-w-2xl mx-auto">
            新しいビジネスを思いつく必要はありません。<br className="hidden sm:inline" />
            市場で実証され、現実に超過利潤を生み出している損益計算書・原価構造・獲得チャネルを照合し、同じ構造を自らの市場へ移植するだけです。
          </p>

          <div className="pt-2">
            <Link
              href="/?entity=ent_photoai"
              className="inline-flex items-center gap-2 px-6 py-3 rounded bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors cursor-pointer shadow-md"
            >
              <span>端末を開いて検証済みデータを照合する (無料)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. フッターセクション */}
      <footer className="border-t border-white/[0.06] py-10 px-4 md:px-8 text-center text-zinc-600 font-mono text-[11px]">
        <div className="flex flex-wrap items-center justify-center gap-4 mb-3">
          <Link href="/?entity=ent_photoai" className="hover:text-zinc-400 transition-colors">
            TERMINAL
          </Link>
          <span>•</span>
          <button onClick={() => setIsAuthModalOpen(true)} className="hover:text-zinc-400 transition-colors cursor-pointer">
            LOG IN
          </button>
        </div>
        <p>© 2026 KIN-ROKOKU. ALL CAPITAL ARBITRAGE RIGHTS RESERVED.</p>
      </footer>

      {/* 認証モーダル */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode="signin"
      />
    </div>
  );
}
