'use client';

import React from 'react';
import { CompanyRecord } from '../../../types/terminal';

export interface DossierData {
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  leadParagraph: string;
  whyNow: {
    heading: string;
    description: string;
  }[];
  moneyFlow: {
    victimOrBuyer: string;
    bait: string;
    profitTrap: string;
    takeHomeRate: string;
  };
  stepByStepPlaybook: {
    phase: string;
    action: string;
    detail: string;
  }[];
  recommendedTools: {
    name: string;
    role: string;
    cost: string;
  }[];
  relatedCompanyIds: string[];
}

export const DOSSIER_COLLECTIONS: Record<string, DossierData> = {
  'collection-passive': {
    id: 'collection-passive',
    badge: 'DOSSIER 01 / 不労集金',
    badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    title: '【寝てる間に着金】完全自動・不労集金モデルの解剖',
    subtitle: '人を雇わず、在庫を持たず、一度作ればStripeが24時間鳴り止まない不労所得の骨組み',
    leadParagraph: '労働時間を切り売りする限り、富裕層にはなれません。この特集では、限界費用ゼロのデジタル資産（ソフトウェア、テンプレート、ランキング枠）を構築し、寝ている間に決済通知だけを受け取っているプレイヤーの「集金構造」を徹底解剖します。',
    whyNow: [
      {
        heading: '限界費用ゼロの極致（売上＝ほぼ全額利益）',
        description: '物理的な在庫を抱えず、1人に売るのも1万人に売るのも追加コストはサーバー代の数十円程度。純利益率80〜95%が日常化します。',
      },
      {
        heading: 'グローバル決済ゲートウェイの民主化',
        description: 'StripeやGumroadの普及により、個人が1行のコードで世界中から24時間自動引き落とし（サブスク・都度決済）を実行できるようになりました。',
      },
      {
        heading: '見栄と承認欲求のマネタイズ（リーダーボードの罠）',
        description: 'ツールだけでなく「他人に勝ちたい」「順位を上げたい」という人間の虚栄心を煽ることで、原価ゼロの掲載枠を入札オークション化して大金を抜く手法が台頭しています。',
      },
    ],
    moneyFlow: {
      victimOrBuyer: '時間を節約したいフリーランス、見栄を張りたい起業家、情報弱者の副業志望者',
      bait: '無料のNotionテンプレート、無料で使える便利ツール、誰でも見られるランキング一覧',
      profitTrap: '「上位に掲載するなら1日10ドル」「全機能解放は月額29ドル」の自動継続課金',
      takeHomeRate: '純手取り率 88%〜95%（原価はStripe手数料3.6%と月数千円のホスティングのみ）',
    },
    stepByStepPlaybook: [
      {
        phase: 'STEP 1: 武器の調達（所要: 1〜3日）',
        action: '売れている既存ツールの「特定ニッチ版」をAIで複製する',
        detail: '誰も使わない汎用ツールではなく「不動産業者専用の見積もり計算機」「デザイナー専用の請求書テンプレ」など、対象を1業種に絞ってv0やCursorで即日構築。',
      },
      {
        phase: 'STEP 2: 撒き餌と初期集客（所要: 1週間）',
        action: 'X、ProductHunt、Redditで「完全無料配布」して認知を爆発させる',
        detail: '最初は1円も取らずに無料配布し、メールアドレスやSNSフォローを獲得。見込み客リストが100人を超えた瞬間に有料アップデートをアナウンス。',
      },
      {
        phase: 'STEP 3: 集金の自動化（所要: 継続）',
        action: 'Stripeを接続し、寝ている間の通知を待つだけの状態にする',
        detail: 'サポートはFAQとAIチャットボットに丸投げし、問い合わせ対応の手間を完全にゼロ化。あとは週1回のコンテンツ追加やSNS予約投稿のみで口座残高を増やす。',
      },
    ],
    recommendedTools: [
      { name: 'Stripe / Lemon Squeezy', role: 'グローバル自動決済・継続課金', cost: '売上の3.6%〜5%' },
      { name: 'Vercel + Supabase', role: '限界費用ゼロのサーバーインフラ', cost: '月額0円〜20ドル' },
      { name: 'Beehiiv / MailerLite', role: '顧客リストへの自動ステップ配信', cost: '月額0円〜50ドル' },
    ],
    relatedCompanyIds: ['outbid-lol', 'solo-easlo', 'solo-boilerplate'],
  },
  'collection-ai': {
    id: 'collection-ai',
    badge: 'DOSSIER 02 / AI労働力搾取',
    badgeColor: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
    title: '【AI労働力搾取】コードを書かず、AIを24時間働かせて億を抜く',
    subtitle: '人間を1人も雇わず、推論APIを叩くだけで粗利80%を叩き出すソロプレナーの型',
    leadParagraph: '社員を雇う時代は終わりました。給与、社会保険、人間関係のトラブル。これら全ての経営リスクを排除し、24時間文句を言わずに稼働するAIモデルを「デジタル奴隷」として酷使し、巨額の利益を抜く最新アーキテクチャを暴露します。',
    whyNow: [
      {
        heading: '推論コストの暴落と利ざや（Arbitrage）の発生',
        description: 'API提供企業が価格競争した結果、1画像あたり0.5円、テキスト1回0.1円で処理可能に。これをユーザーには「1回100円〜数千円」で販売する圧倒的価格差が存在します。',
      },
      {
        heading: '「AIで作った」ことを隠すパッケージングの勝利',
        description: '「AIツール」と宣伝すると敬遠されますが、「プロのカメラマンが撮ったようなプロフィール写真」「プロの営業マンが書いたようなコールドメール」として結果だけを売れば高単価で売れます。',
      },
      {
        heading: 'アフィリエイトによる他力本願グロース',
        description: '自社で広告を回さず、売上の30〜40%をアフィリエイターに還元することで、無数のインフルエンサーに勝手に宣伝させる仕組みが機能します。',
      },
    ],
    moneyFlow: {
      victimOrBuyer: 'LinkedInで立派に見せたいビジネスマン、営業アポが取れないB2B企業、写真撮影が面倒な一般人',
      bait: '「スタジオ撮影不要・スマホ写真10枚で完璧な宣材写真が即日完成」という手軽さの訴求',
      profitTrap: '都度課金4,900円〜9,800円のパッケージ買い切り、または月額クレジット課金',
      takeHomeRate: '純手取り率 75%〜85%（推論API代とサーバー代を差し引いた全額が創業者の利益）',
    },
    stepByStepPlaybook: [
      {
        phase: 'STEP 1: 既存APIの選定とラッピング（所要: 2日）',
        action: 'ReplicateやOpenAIの既存モデルに特化プロンプトを被せる',
        detail: '自前で機械学習モデルを学習させる必要は一切なし。既存の最先端APIを呼び出し、ユーザーが迷わない綺麗なUI（1枚のWebフォーム）に落とし込む。',
      },
      {
        phase: 'STEP 2: ビフォーアフターのショート動画爆撃（所要: 2週間）',
        action: 'TikTok / Instagram Reelsで手元動画と劇的変化を見せる',
        detail: '「ダサい自撮りが一瞬でフォーブス誌の表紙レベルに変わる瞬間」の画面録画を量産。広告費ゼロで数百〜数千万回の再生を誘発。',
      },
      {
        phase: 'STEP 3: 競合が真似する前にアフィリエイト網を敷く（所要: 継続）',
        action: '「紹介したら報酬30%」のプログラムを公開し、拡散を自動化',
        detail: '同業者が模倣してくる前に、業界のブロガーやX運用者に高額報酬を提示して検索上位・SNSを占拠させる。',
      },
    ],
    recommendedTools: [
      { name: 'Replicate / Together AI', role: '最先端オープンソースAIモデルの高速推論', cost: '従量課金（1回数円）' },
      { name: 'Cursor / GitHub Copilot', role: 'AI主導の開発・フロントエンド実装', cost: '月額20ドル' },
      { name: 'Rewardful / Tolt', role: 'Stripe連動のアフィリエイト管理システム', cost: '月額29ドル〜' },
    ],
    relatedCompanyIds: ['solo-headshotpro', 'solo-photoai', 'b2b-clay-outbound'],
  },
  'collection-local': {
    id: 'collection-local',
    badge: 'DOSSIER 03 / 地方実業の歪み',
    badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    title: '【泥臭い地方の歪み】IT弱者の高齢現場を独占する実業DX',
    subtitle: '大手が参入できない地味で泥臭い現場。無人貸倉庫や外壁洗浄など、LINE自動化と職人外注で月利数百万円を抜く型',
    leadParagraph: '都会のキラキラしたITベンチャーがVCから資金を調達して赤字を垂れ流している横で、地方の地味な実業（貸倉庫、不用品回収、外壁洗浄）を買い叩き、スマートロックとLINEを突っ込むだけで年利30%超・資産数十億円を築く男たちがいます。その「勝てる土俵」の選び方を公開します。',
    whyNow: [
      {
        heading: '競合のITリテラシーが「昭和」のまま止まっている',
        description: '地方の老舗企業はホームページすらなく、問い合わせは電話とFAXのみ。スマホ対応とLINE自動見積もりを用意するだけで、地域シェアを瞬時に総取りできます。',
      },
      {
        heading: '大企業が絶対に参入できない市場規模の隙間',
        description: '商圏人口10万人、年間市場規模数千万円のニッチ分野は、上場企業にとって「小さすぎてコストが見合わない」ため、個人の独占が永久に維持されます。',
      },
      {
        heading: '現場作業は全て地元の職人へ外注（自分は手を出さない）',
        description: '現場の労働（掃除、運搬、施工）は提携職人に成果報酬で委託し、自分は集客システムと決済の管理だけに専念するため、実質的に半自動化が可能です。',
      },
    ],
    moneyFlow: {
      victimOrBuyer: '物置に困った地方の戸建て住民、家のリフォームや不用品処分に困った高齢者世帯',
      bait: '「初期費用0円・スマホで即日利用可能」「LINEで写真送るだけで5分で見積もり完了」',
      profitTrap: '月額5,000円〜20,000円の無人賃料自動引き落とし、または1件10万〜50万円の施工工事費',
      takeHomeRate: '純手取り率 40%〜65%（職人外注費や賃料を引いても月数百万円のキャッシュが残る）',
    },
    stepByStepPlaybook: [
      {
        phase: 'STEP 1: 地方の休眠不動産・老朽化物件の確保（所要: 1ヶ月）',
        action: '使われていない空きガレージや古い倉庫を格安（月3万〜5万）で借りる',
        detail: 'オーナーに「固定資産税の足しにしませんか」と直談判。敷金・礼金を値切り、スマート南京錠や電子キーを取り付けて区画を分ける。',
      },
      {
        phase: 'STEP 2: Googleマップ（MEO）とポスティングの集中投下（所要: 2週間）',
        action: '「地域名 + トランクルーム / 不用品回収」で検索1位を獲る',
        detail: 'Googleビジネスプロフィールを徹底的に最適化し、半径3km圏内に「即日預け入れ可能」のチラシを撒く。',
      },
      {
        phase: 'STEP 3: LINE自動受付と無人決済の構築（所要: 即日）',
        action: 'Lステップ等のツールで契約から暗証番号発行まで全自動化',
        detail: '鍵の受け渡しはスマートロックのワンタイム暗証番号を自動送信。現地対応を一切行わず、毎月銀行口座に家賃が振り込まれる仕組みを完成させる。',
      },
    ],
    recommendedTools: [
      { name: 'SwitchBot / Akerun', role: '遠隔解錠・スマートロック管理', cost: '端末代数千円〜月額数千円' },
      { name: 'Lステップ (LINE公式自動化)', role: '自動見積もり・契約締結・暗証番号発行', cost: '月額2,980円〜' },
      { name: 'MEOアナライザー / Googleマップ', role: '地域検索での上位表示と口コミ収集', cost: '月額0円' },
    ],
    relatedCompanyIds: ['niche-bolt-storage', 'local-clean-dx', 'solo-notion-freelance'],
  },
};

interface DossierModalProps {
  dossierId: string | null;
  onClose: () => void;
  companies: CompanyRecord[];
  onSelectCompany: (id: string) => void;
}

export const DossierModal: React.FC<DossierModalProps> = ({
  dossierId,
  onClose,
  companies,
  onSelectCompany,
}) => {
  if (!dossierId || !DOSSIER_COLLECTIONS[dossierId]) return null;

  const data = DOSSIER_COLLECTIONS[dossierId];
  const relatedCompanies = companies.filter((c) => data.relatedCompanyIds.includes(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0E1015] border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        
        {/* ヘッダー */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-[#141620] flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${data.badgeColor}`}>
              {data.badge}
            </span>
            <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight">
              {data.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-lg font-mono transition-colors"
          >
            ✕
          </button>
        </div>

        {/* スクロールコンテンツ */}
        <div className="p-5 sm:p-8 overflow-y-auto space-y-8 font-sans">
          
          {/* リード文 */}
          <div className="p-4 sm:p-5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
            <div className="text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider">
              調査主旨・概要
            </div>
            <p className="text-sm sm:text-base text-zinc-200 leading-relaxed font-normal">
              {data.leadParagraph}
            </p>
          </div>

          {/* 1. なぜ今このモデルが猛烈に儲かるのか */}
          <section className="space-y-4">
            <div className="border-b border-white/10 pb-2">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">MARKET GLITCH</span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                1. なぜ今、このモデルが猛烈に儲かるのか？（市場の歪み）
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.whyNow.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#11131A] border border-white/5 space-y-2">
                  <div className="text-xs font-mono text-emerald-400 font-bold">理由 0{idx + 1}</div>
                  <h4 className="text-sm font-bold text-white leading-snug">{item.heading}</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 2. 生々しい集金のカラクリ */}
          <section className="space-y-4">
            <div className="border-b border-white/10 pb-2">
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">MONEY FLOW ANATOMY</span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                2. 生々しい集金のカラクリ（誰の財布をどう開けるか）
              </h3>
            </div>
            <div className="p-5 rounded-xl bg-[#121319] border border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-zinc-500 text-[10px]">① 狙われる獲物・客層:</span>
                <p className="text-zinc-200 font-sans text-xs">{data.moneyFlow.victimOrBuyer}</p>
              </div>
              <div className="space-y-1">
                <span className="text-zinc-500 text-[10px]">② 食いつかせる撒き餌:</span>
                <p className="text-zinc-200 font-sans text-xs">{data.moneyFlow.bait}</p>
              </div>
              <div className="space-y-1">
                <span className="text-zinc-500 text-[10px]">③ 集金の罠（課金のツボ）:</span>
                <p className="text-zinc-200 font-sans text-xs">{data.moneyFlow.profitTrap}</p>
              </div>
              <div className="space-y-1">
                <span className="text-emerald-500 font-bold text-[10px]">④ 創業者純手取り率:</span>
                <p className="text-emerald-400 font-bold font-sans text-xs">{data.moneyFlow.takeHomeRate}</p>
              </div>
            </div>
          </section>

          {/* 3. 完コピ3ステップ行動手順書 */}
          <section className="space-y-4">
            <div className="border-b border-white/10 pb-2">
              <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">ACTIONABLE PLAYBOOK</span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                3. もし明日から参入するなら？（完コピ3ステップ）
              </h3>
            </div>
            <div className="space-y-3">
              {data.stepByStepPlaybook.map((step, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#12141F] border border-white/5 flex flex-col sm:flex-row sm:items-start gap-3">
                  <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-bold shrink-0">
                    {step.phase}
                  </span>
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-sm font-bold text-white">{step.action}</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed font-normal">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. 推奨武器・ツールスタック */}
          <section className="space-y-4">
            <div className="border-b border-white/10 pb-2">
              <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">TECH STACK & WEAPONS</span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                4. 実際に使われている武器・ツールスタック
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {data.recommendedTools.map((t, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#0F1117] border border-white/5 space-y-1">
                  <div className="text-xs font-bold text-white">{t.name}</div>
                  <div className="text-[11px] text-zinc-400">{t.role}</div>
                  <div className="text-[10px] font-mono text-emerald-400 font-bold pt-1 border-t border-white/5">
                    コスト: {t.cost}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. 関連する実在台帳ケーススタディ */}
          <section className="space-y-4">
            <div className="border-b border-white/10 pb-2">
              <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">VERIFIED CASE STUDIES</span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                5. この特集に該当する実在ビジネス台帳（クリックで詳細閲覧）
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedCompanies.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    onClose();
                    onSelectCompany(c.id);
                  }}
                  className="p-4 rounded-xl bg-[#141722] hover:bg-[#1A1E2C] border border-white/10 hover:border-emerald-500/40 cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors">
                      {c.japaneseName}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      詳細 →
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {c.tagline}
                  </p>
                  <div className="text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/5">
                    月商: ¥{((c.passbookDetails?.monthlyGrossJpy || 10000000) / 10000).toLocaleString()}万円
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* フッター */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#12141D] flex items-center justify-between shrink-0">
          <span className="text-xs font-mono text-zinc-500">
            ※ 実在データ・公開推計に基づく独自調査レポート
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
          >
            閉じる
          </button>
        </div>

      </div>
    </div>
  );
};
