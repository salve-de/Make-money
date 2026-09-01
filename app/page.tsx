"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Tab = "discover" | "signals" | "services" | "mine" | "submit";
type Reaction = "want" | "build" | "watch" | "save";

type Opportunity = {
  slug: string;
  amount: string;
  amountType: string;
  title: string;
  hook: string;
  category: string;
  team: string;
  cost: string;
  time: string;
  model: string;
  whyNow: string;
  entry: string[];
  risks: string[];
  next: string[];
  momentum: number;
  access: number;
  evidence: "DEMO";
  featured?: boolean;
  solo?: boolean;
  lowCost?: boolean;
};

type MoneySignal = {
  amount: string;
  type: string;
  title: string;
  payer: string;
  receiver: string;
  category: string;
  opportunity: string;
};

type Service = {
  slug: string;
  name: string;
  oneLiner: string;
  audience: string;
  pricing: string;
  intents: string[];
  category: string;
  related: string;
  promoted?: boolean;
};

const opportunities: Opportunity[] = [
  {
    slug: "vertical-ai-compliance",
    amount: "年2.4億円",
    amountType: "周辺市場のDEMO売上",
    title: "中小企業向け『業界専用AIコンプライアンス』",
    hook: "大企業向けの高額製品を、1業界・1義務・1画面まで細くする。",
    category: "AI / B2B SaaS",
    team: "1〜3人",
    cost: "10万円以下",
    time: "45〜90日",
    model: "月額課金",
    whyNow: "生成AI導入と社内ルールが同時に増え、現場は承認・記録を処理しきれていない。汎用チャットでは監査履歴が残らず、大企業向け製品は重い。",
    entry: ["一業界に限定したテンプレート型SaaS", "設定代行から始めて反復部分をソフトウェア化", "専門家・業界団体との販売提携"],
    risks: ["法的助言と誤認されない表示", "制度更新の継続運用", "顧客データのセキュリティ"],
    next: ["一業界の担当者5人へ現在の承認作業を聞く", "既存製品10件の最低価格を確認", "法的判断をしない最小機能を定義"],
    momentum: 82,
    access: 76,
    evidence: "DEMO",
    featured: true,
    solo: true,
    lowCost: true
  },
  {
    slug: "local-government-vendor-tools",
    amount: "47.8億円",
    amountType: "関連発注総額のDEMO",
    title: "政府・自治体の受注事業者向け『提出物自動化』",
    hook: "大型契約そのものではなく、受注者が毎月繰り返す報告作業を狙う。",
    category: "GovTech",
    team: "2〜5人",
    cost: "30万円以下",
    time: "60〜120日",
    model: "法人月額＋導入",
    whyNow: "公的支出が増えても小規模事業者が大型案件を直接取るのは難しい。一方、受注企業には実績報告、証憑整理、様式変換、再委託管理が発生する。",
    entry: ["一つの制度・提出様式に限定", "受注者向けBPOから開始", "行政手続き事業者へホワイトラベル"],
    risks: ["入札・調達規約の理解", "顧客獲得が営業寄り", "様式変更への追随"],
    next: ["公開提出様式を20件収集", "受注企業の求人から反復作業を抽出", "受注者が払う理由を確認"],
    momentum: 73,
    access: 56,
    evidence: "DEMO"
  },
  {
    slug: "micro-acquisition-operations",
    amount: "月商320万円",
    amountType: "運営対象のDEMO",
    title: "小規模Web事業の『買収後90日』運営代行",
    hook: "売買仲介ではなく、買った後に止まりやすい運営を商品化する。",
    category: "Micro M&A",
    team: "1〜4人",
    cost: "5万円以下",
    time: "14〜30日",
    model: "固定費＋成果報酬",
    whyNow: "小規模Web事業は買いやすくなったが、SEO、CS、請求、軽微な開発の引継ぎ負担は分断されたまま。",
    entry: ["買収後30日の移管パッケージ", "特定CMS・市場専門", "運営診断＋月次保守"],
    risks: ["事業差が大きく標準化しにくい", "秘密情報とアカウント移管", "成果報酬基準の定義"],
    next: ["売買後の失敗理由を20件読む", "最初の30日の作業を分解", "定額範囲を固定"],
    momentum: 71,
    access: 84,
    evidence: "DEMO",
    solo: true,
    lowCost: true
  },
  {
    slug: "review-gap-intelligence",
    amount: "月額4.8万円",
    amountType: "想定顧客単価のDEMO",
    title: "低評価レビューから『売れる不足機能』を抽出する",
    hook: "競合分析レポートではなく、次に売る機能と顧客候補を毎週出す。",
    category: "Market Intelligence",
    team: "1〜2人",
    cost: "10万円以下",
    time: "30〜60日",
    model: "B2B月額",
    whyNow: "レビュー要約だけでは意思決定にならない。価格帯、顧客属性、解約理由、競合の不足を構造化し、実装優先度へ変える部分が残る。",
    entry: ["一つのアプリストアに限定", "週次の人手レポートから開始", "Product Manager向け通知"],
    risks: ["データ取得条件", "レビューの代表性", "AI要約だけでは差別化が弱い"],
    next: ["商用利用条件を確認", "5社へ意思決定項目を聞く", "要約でなく次の行動を定義"],
    momentum: 78,
    access: 81,
    evidence: "DEMO",
    featured: true,
    solo: true,
    lowCost: true
  },
  {
    slug: "creator-revenue-backoffice",
    amount: "月商680万円",
    amountType: "対象事業者のDEMO",
    title: "小規模クリエイターの収益源をまとめるバックオフィス",
    hook: "分析ではなく、請求・税区分・未入金まで一つにする。",
    category: "Creator Economy",
    team: "1〜3人",
    cost: "20万円以下",
    time: "60〜90日",
    model: "月額＋連携",
    whyNow: "広告、サブスク、投げ銭、案件、物販で入金日と手数料が分かれ、可視化より請求漏れと月次締めに支払理由が生まれる。",
    entry: ["一つの収益源に限定", "未入金管理を先に提供", "クリエイター事務所と提携"],
    risks: ["外部API依存", "税務助言との境界", "無料表計算との競争"],
    next: ["10人の月次締めを観察", "最も面倒な収益源を特定", "会計ソフト前工程を確認"],
    momentum: 74,
    access: 70,
    evidence: "DEMO",
    solo: true
  },
  {
    slug: "ai-site-readiness",
    amount: "ARR 1.1億円",
    amountType: "対象カテゴリのDEMO",
    title: "AI検索で選ばれるための『サイト欠損検査』",
    hook: "順位レポートではなく、買い手の質問に答えられないページを特定する。",
    category: "AI Search / MarTech",
    team: "1〜3人",
    cost: "10万円以下",
    time: "45〜75日",
    model: "月額＋修正提案",
    whyNow: "検索流入が従来順位だけで説明できなくなり、AI回答に価格・比較・証拠が拾われるかが新しい不安になっている。",
    entry: ["個人開発SaaS専用", "無料監査から月次監視へ", "CMS別の修正文を出す"],
    risks: ["観測方法が不安定", "効果測定に時間", "従来SEOとの差別化"],
    next: ["20サイトの共通欠損を調査", "買い手質問の収集法を決定", "改善前後の指標を定義"],
    momentum: 91,
    access: 79,
    evidence: "DEMO",
    featured: true,
    solo: true,
    lowCost: true
  }
];

const signals: MoneySignal[] = [
  { amount: "ARR 1.1億円", type: "売上", title: "AI回答上の露出検査ツールが初期ARRを獲得", payer: "Web事業者", receiver: "AI検索最適化ツール", category: "AI Search", opportunity: "ai-site-readiness" },
  { amount: "47.8億円", type: "契約", title: "地域DX関連の委託・補助事業が集中", payer: "政府・自治体", receiver: "地域DX受注事業者", category: "GovTech", opportunity: "local-government-vendor-tools" },
  { amount: "+184%", type: "需要", title: "中小企業のAI利用規程作成需要が急増", payer: "中小企業", receiver: "コンプライアンス支援", category: "AI / B2B", opportunity: "vertical-ai-compliance" },
  { amount: "月額4.8万円", type: "契約単価", title: "競合レビュー分析の法人契約", payer: "SaaS事業者", receiver: "市場分析サービス", category: "Market Intelligence", opportunity: "review-gap-intelligence" },
  { amount: "128案件", type: "需要", title: "小規模Web事業の売買後サポート依頼が増加", payer: "事業の買い手", receiver: "運営・開発支援", category: "Micro M&A", opportunity: "micro-acquisition-operations" },
  { amount: "月商680万円", type: "売上", title: "複数収益源の入金管理ツールが成長", payer: "クリエイター", receiver: "バックオフィスSaaS", category: "Creator Economy", opportunity: "creator-revenue-backoffice" }
];

const services: Service[] = [
  { slug: "answerready", name: "AnswerReady", oneLiner: "AIの買い手質問に答えられないサイト箇所を特定するDEMO監査。", audience: "個人開発・小規模SaaS", pricing: "月額9,800円〜", intents: ["ベータ募集", "顧客募集", "紹介者募集"], category: "AI Search", related: "ai-site-readiness" },
  { slug: "rulepath", name: "RulePath", oneLiner: "業界別AI利用ルールと承認履歴を一つにするDEMO SaaS。", audience: "従業員10〜200人の企業", pricing: "月額29,800円〜", intents: ["ベータ募集", "提携先募集"], category: "AI / Compliance", related: "vertical-ai-compliance" },
  { slug: "gapwatch", name: "GapWatch", oneLiner: "競合レビューから不足機能と顧客候補を毎週出すDEMOサービス。", audience: "SaaS・アプリ担当", pricing: "月額48,000円〜", intents: ["ベータ募集", "出資相談"], category: "Market Intelligence", related: "review-gap-intelligence", promoted: true },
  { slug: "reportlane", name: "ReportLane", oneLiner: "公的事業の証憑・写真・報告様式をまとめるDEMOツール。", audience: "公共案件の受注企業", pricing: "月額49,800円〜", intents: ["顧客募集", "提携先募集"], category: "GovTech", related: "local-government-vendor-tools" },
  { slug: "handover90", name: "Handover 90", oneLiner: "小規模Web事業の買収後90日を引き継ぐDEMOサービス。", audience: "小規模事業の買い手", pricing: "30日198,000円〜", intents: ["顧客募集", "人材募集"], category: "Micro M&A", related: "micro-acquisition-operations" },
  { slug: "creatorledger", name: "CreatorLedger", oneLiner: "案件・広告・サブスクの入金をまとめるDEMO台帳。", audience: "小規模クリエイター", pricing: "月額1,980円〜", intents: ["ベータ募集", "紹介者募集"], category: "Creator Economy", related: "creator-revenue-backoffice" }
];

const categories = ["すべて", ...Array.from(new Set(opportunities.map((item) => item.category)))];

function readSaved(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("gmr:saved") || "[]") as string[];
  } catch {
    return [];
  }
}

export default function Page() {
  const [tab, setTab] = useState<Tab>("discover");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("すべて");
  const [soloOnly, setSoloOnly] = useState(false);
  const [lowCostOnly, setLowCostOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, Partial<Record<Reaction, boolean>>>>({});

  useEffect(() => setSaved(readSaved()), []);

  const filtered = useMemo(() => opportunities.filter((item) => {
    const text = `${item.title} ${item.hook} ${item.category} ${item.entry.join(" ")}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) &&
      (category === "すべて" || item.category === category) &&
      (!soloOnly || item.solo) &&
      (!lowCostOnly || item.lowCost);
  }).sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.momentum - a.momentum), [query, category, soloOnly, lowCostOnly]);

  function react(slug: string, kind: Reaction) {
    const nextValue = !reactions[slug]?.[kind];
    setReactions((current) => ({ ...current, [slug]: { ...current[slug], [kind]: nextValue } }));
    if (kind === "save") {
      const next = nextValue ? Array.from(new Set([...saved, slug])) : saved.filter((item) => item !== slug);
      setSaved(next);
      localStorage.setItem("gmr:saved", JSON.stringify(next));
    }
    void fetch("/api/reactions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ opportunitySlug: slug, kind, active: nextValue }) }).catch(() => undefined);
  }

  function go(next: Tab) {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const shownMine = opportunities.filter((item) => saved.includes(item.slug));

  return (
    <div className="app">
      <header className="header">
        <button className="brand" onClick={() => go("discover")} type="button"><span>GR</span><strong>GOLDMINE <i>RADAR</i></strong></button>
        <nav aria-label="メインナビゲーション">
          <button className={tab === "discover" ? "active" : ""} onClick={() => go("discover")} type="button">発見する</button>
          <button className={tab === "signals" ? "active" : ""} onClick={() => go("signals")} type="button">Money Signals</button>
          <button className={tab === "services" ? "active" : ""} onClick={() => go("services")} type="button">サービス</button>
          <button className={tab === "mine" ? "active" : ""} onClick={() => go("mine")} type="button">MY GOLDMINE <em>{saved.length}</em></button>
        </nav>
        <button className="goldButton compact" onClick={() => go("submit")} type="button">掲載する</button>
      </header>

      {tab === "discover" && <>
        <section className="hero">
          <div className="grid" />
          <div className="heroCopy">
            <span className="eyebrow"><b /> OPPORTUNITY INTELLIGENCE</span>
            <h1>次に金持ちになる人は、<em>何を見ているのか。</em></h1>
            <p>誰が、誰から、何に、いくら受け取ったか。<br />世界の金の動きを、あなたが入れる事業機会へ変換する。</p>
            <div className="heroActions"><a href="#radar" className="goldButton">今の金脈を探す →</a><button className="ghostButton" onClick={() => go("submit")} type="button">自分のサービスを載せる</button></div>
            <div className="proof"><span>金額タイプを分離</span><span>証拠・調査日を追跡</span><span>広告でOrganic順位は買えない</span></div>
          </div>
          <div className="radar" aria-label="DEMOレーダー"><div className="radarHead"><span>LIVE RADAR</span><small>DEMO / 2026.09.01</small></div><div className="radarVisual"><i className="ring r1" /><i className="ring r2" /><i className="ring r3" /><i className="sweep" /><span className="p1"><b /> AI SEARCH</span><span className="p2"><b /> GOVTECH</span><span className="p3"><b /> MICRO M&A</span></div><div className="radarFoot"><div><small>最も強い勢い</small><strong>AI Search</strong></div><div><small>個人向け</small><strong>4 / 6件</strong></div></div></div>
        </section>
        <section className="stats"><div><strong>6</strong><span>Opportunity Windows</span></div><div><strong>6</strong><span>Money Signals</span></div><div><strong>6</strong><span>Listed Services</span></div><div><strong>0</strong><span>Pay-to-rank</span></div></section>
        <div className="demo"><strong>DEMO DATA</strong><span>現在の金額・サービスはUI検証用の架空例です。実績としては扱いません。</span></div>
        <main className="shell" id="radar">
          <div className="sectionTitle"><div><span>OPPORTUNITY WINDOWS</span><h2>今、入口が残っている金脈</h2></div><p>過去の成功ではなく、金が動いた理由と、まだ残る入口まで見る。</p></div>
          <div className="filters"><input aria-label="金脈を検索" onChange={(e) => setQuery(e.target.value)} placeholder="AI、政府支出、1人開発、月額課金…" type="search" value={query} /><div className="chips"><button className={soloOnly ? "active" : ""} onClick={() => setSoloOnly(!soloOnly)} type="button">1人でも狙える</button><button className={lowCostOnly ? "active" : ""} onClick={() => setLowCostOnly(!lowCostOnly)} type="button">10万円以下</button>{categories.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)} type="button">{item}</button>)}</div></div>
          <div className="result"><strong>{filtered.length}</strong> 件の機会</div>
          <div className="opportunityGrid">{filtered.map((item) => <OpportunityCard expanded={expanded === item.slug} item={item} key={item.slug} onExpand={() => setExpanded(expanded === item.slug ? null : item.slug)} onReact={(kind) => react(item.slug, kind)} reactions={reactions[item.slug] || {}} />)}</div>
          <section className="loop"><div><span>THE OPPORTUNITY NETWORK</span><h2>見る人、作る人、売る人。<br />全員の行動がDBを強くする。</h2><p>金の動きを見た人が需要を示し、作る人がサービスを載せ、顧客の反応と新しい売上が次のMoney Signalになる。</p></div><div className="loopItems">{["Money Signal｜実際に金が動く", "Opportunity｜まだ残る入口", "Demand｜欲しい・払う", "Product｜サービスが掲載", "Customer｜利用・問い合わせ", "New Signal｜結果がDBへ戻る"].map((text, i) => <div key={text}><b>0{i + 1}</b><span>{text}</span></div>)}</div></section>
        </main>
      </>}

      {tab === "signals" && <DatabasePage eyebrow="MONEY SIGNAL DATABASE" title="誰が、誰に、何のために払ったのか。" copy="売上、利益、資金調達、契約、実支出を混ぜずに追う。"><div className="signalList">{signals.map((signal) => <article className="signal" key={signal.title}><div><small>{signal.type}</small><strong>{signal.amount}</strong><em>DEMO</em></div><section><span>{signal.category}</span><h2>{signal.title}</h2><p><b>{signal.payer}</b><i>→</i><b>{signal.receiver}</b></p><button onClick={() => { go("discover"); setExpanded(signal.opportunity); }} type="button">関連する機会を見る →</button></section></article>)}</div></DatabasePage>}

      {tab === "services" && <DatabasePage eyebrow="PRODUCT / SERVICE DATABASE" title="誰かが探している場所に、サービスを接続する。" copy="掲載者の宣伝だけでなく、買い手が比較でき、どのOpportunityから見られたか分かる。"><div className="sponsorNote">SPONSOREDは明示し、Organic順位には影響しません。</div><div className="serviceGrid">{services.map((service) => <article className={service.promoted ? "service promoted" : "service"} key={service.slug}>{service.promoted && <em>プロモーション</em>}<div className="serviceHead"><span>{service.name.slice(0, 2).toUpperCase()}</span><div><h2>{service.name}</h2><p>{service.oneLiner}</p></div></div><dl><div><dt>対象</dt><dd>{service.audience}</dd></div><div><dt>料金</dt><dd>{service.pricing}</dd></div></dl><div className="intent">{service.intents.map((intent) => <span key={intent}>{intent}</span>)}</div><button onClick={() => { go("discover"); setExpanded(service.related); }} type="button">関連する金脈を見る →</button></article>)}</div></DatabasePage>}

      {tab === "mine" && <DatabasePage eyebrow="MY GOLDMINE" title="見つけた可能性を、自分の資産として育てる。" copy="保存した市場と参入条件を一つに集める。現在はこのブラウザに保存します。">{shownMine.length ? <><div className="portfolio"><div><span>保存</span><strong>{shownMine.length}</strong></div><div><span>個人向け</span><strong>{shownMine.filter((x) => x.solo).length}</strong></div><div><span>急上昇</span><strong>{shownMine.filter((x) => x.momentum >= 78).length}</strong></div></div><div className="opportunityGrid">{shownMine.map((item) => <OpportunityCard expanded={expanded === item.slug} item={item} key={item.slug} onExpand={() => setExpanded(expanded === item.slug ? null : item.slug)} onReact={(kind) => react(item.slug, kind)} reactions={{ ...reactions[item.slug], save: true }} />)}</div></> : <div className="empty"><div className="emptyRadar" /><h2>まだ金脈が保存されていません</h2><p>発見画面で「保存」を押すと、ここに自分専用の候補が蓄積されます。</p><button className="goldButton" onClick={() => go("discover")} type="button">金脈を探す</button></div>}</DatabasePage>}

      {tab === "submit" && <DatabasePage eyebrow="LIST YOUR SERVICE" title="あなたのサービスを、金脈の中に載せる。" copy="基本掲載は無料。URL、対象顧客、料金、掲載目的を登録し、関連Opportunityへ接続する。"><SubmissionForm /></DatabasePage>}

      <footer><div><strong>GOLDMINE RADAR</strong><p>実際に金が動いた証拠から、まだ残る事業機会を発見する。</p></div><p>現在の値はDEMOです。富や収益を保証するサービスではありません。</p></footer>
    </div>
  );
}

function OpportunityCard({ item, expanded, reactions, onReact, onExpand }: { item: Opportunity; expanded: boolean; reactions: Partial<Record<Reaction, boolean>>; onReact: (kind: Reaction) => void; onExpand: () => void }) {
  return <article className={item.featured ? "opp featured" : "opp"}><div className="top"><div><span className="open">入口あり</span><span className="evidence">{item.evidence}</span></div><small>{item.category}</small></div><div className="money"><div><small>{item.amountType}</small><strong>{item.amount}</strong></div><div className="score"><strong>{Math.round((item.momentum + item.access) / 2)}</strong><small>RADAR</small></div></div><h2>{item.title}</h2><p className="hook">{item.hook}</p><dl className="facts"><div><dt>人数</dt><dd>{item.team}</dd></div><div><dt>開始</dt><dd>{item.cost}</dd></div><div><dt>期間</dt><dd>{item.time}</dd></div><div><dt>収益</dt><dd>{item.model}</dd></div></dl><div className="entry"><span>まだ残っている入口</span><p>{item.entry[0]}</p></div><div className="scores"><span>勢い <b>{item.momentum}</b></span><i><em style={{ width: `${item.momentum}%` }} /></i><span>個人参入 <b>{item.access}</b></span><i><em style={{ width: `${item.access}%` }} /></i></div>{expanded && <div className="expanded"><section><small>WHY NOW</small><p>{item.whyNow}</p></section><section><small>ENTRY ROUTES</small><ol>{item.entry.map((x) => <li key={x}>{x}</li>)}</ol></section><section><small>RISKS</small><ul>{item.risks.map((x) => <li key={x}>{x}</li>)}</ul></section><section><small>NEXT 7 DAYS</small><ol>{item.next.map((x) => <li key={x}>{x}</li>)}</ol></section></div>}<div className="cardActions"><div>{(["want", "build", "watch", "save"] as Reaction[]).map((kind) => <button aria-pressed={Boolean(reactions[kind])} className={reactions[kind] ? "active" : ""} key={kind} onClick={() => onReact(kind)} type="button">{{ want: "欲しい", build: "作れそう", watch: "追う", save: "保存" }[kind]}</button>)}</div><button className="details" onClick={onExpand} type="button">{expanded ? "閉じる ↑" : "詳細を見る →"}</button></div></article>;
}

function DatabasePage({ eyebrow, title, copy, children }: { eyebrow: string; title: string; copy: string; children: React.ReactNode }) {
  return <main className="database"><header><span>{eyebrow}</span><h1>{title}</h1><p>{copy}</p></header><div className="demo"><strong>DEMO DATA</strong><span>現在の値は画面検証用です。</span></div>{children}</main>;
}

function SubmissionForm() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [audience, setAudience] = useState("");
  const [pricing, setPricing] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  function preview() {
    try { const host = new URL(url).hostname.replace(/^www\./, "").split(".")[0]; if (!name) setName(host.charAt(0).toUpperCase() + host.slice(1)); setMessage(""); } catch { setMessage("https:// から始まる公開URLを入力してください。"); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSending(true); setMessage("");
    try { const response = await fetch("/api/submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, name, audience, pricing, oneLiner, email, intent: "customers" }) }); const data = await response.json() as { message?: string; error?: string; id?: string }; if (!response.ok) throw new Error(data.error || "送信に失敗しました"); setMessage(`${data.message} 受付ID: ${data.id}`); } catch (error) { setMessage(error instanceof Error ? error.message : "送信に失敗しました"); } finally { setSending(false); }
  }

  return <form className="form" onSubmit={submit}><div className="benefits"><div><b>01</b><span>関連Opportunityへ接続</span></div><div><b>02</b><span>欲しい・比較を取得</span></div><div><b>03</b><span>Claim後に分析</span></div></div><label><span>サービスURL</span><div className="urlRow"><input onChange={(e) => setUrl(e.target.value)} placeholder="https://your-service.com" required type="url" value={url} /><button className="ghostButton" onClick={preview} type="button">下書きを作る</button></div></label><div className="fieldGrid"><label><span>サービス名</span><input onChange={(e) => setName(e.target.value)} required value={name} /></label><label><span>誰向けか</span><input onChange={(e) => setAudience(e.target.value)} placeholder="例：個人開発者" required value={audience} /></label></div><label><span>一言で何を解決するか</span><textarea maxLength={180} onChange={(e) => setOneLiner(e.target.value)} required rows={3} value={oneLiner} /></label><div className="fieldGrid"><label><span>料金</span><input onChange={(e) => setPricing(e.target.value)} placeholder="例：月額1,980円〜" required value={pricing} /></label><label><span>連絡先メール</span><input onChange={(e) => setEmail(e.target.value)} required type="email" value={email} /></label></div><label className="consent"><input required type="checkbox" /><span>入力情報が正確で、未確認状態で審査されることに同意します。</span></label><button className="goldButton submit" disabled={sending} type="submit">{sending ? "送信中…" : "無料で審査へ送る"}</button>{message && <p className="formMessage">{message}</p>}<small>DEMOではAPI検証のみ行い、永続保存・公開はしません。</small></form>;
}
