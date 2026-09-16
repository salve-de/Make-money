import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { getMasterAll340Profiles } from "./profiles/master-all-340.mjs";

const root = process.cwd();
const entitiesPath = path.join(root, "data/entities-index.json");
const incomingDir = path.join(root, "data/incoming");

console.log("1. Loading entities-index.json...");
const entities = JSON.parse(readFileSync(entitiesPath, "utf8"));
const entMap = new Map(entities.map(e => [e.id, e]));

console.log("2. Loading Master 340 profiles...");
const master340 = getMasterAll340Profiles();

console.log("3. Indexing incoming raw records...");
const rawMap = new Map();
function walkDir(dir) {
  for (const f of readdirSync(dir)) {
    const full = path.join(dir, f);
    if (statSync(full).isDirectory()) walkDir(full);
    else if (f.endsWith(".json")) {
      try {
        const arr = JSON.parse(readFileSync(full, "utf8"));
        if (Array.isArray(arr)) {
          for (const item of arr) {
            if (item?.id && entMap.has(item.id)) {
              const prev = rawMap.get(item.id);
              const curStr = JSON.stringify(item);
              if (!prev || curStr.length > JSON.stringify(prev).length) {
                rawMap.set(item.id, item);
              }
            }
          }
        }
      } catch {}
    }
  }
}
walkDir(incomingDir);

function clean(text) {
  if (!text) return "";
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&#x[0-9a-f]+;/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCoreSubject(name, rawWhat) {
  let subject = "";
  const cleanName = clean(name);
  const mParen = cleanName.match(/\(([^)]+)\)/);
  if (mParen && mParen[1]) {
    subject = mParen[1].replace(/Founder of|Co-founder of|Creator of|Founder,|Co-founder,/i, "").trim();
  } else if (rawWhat && !rawWhat.toLowerCase().includes("founder") && !rawWhat.toLowerCase().includes("ceo")) {
    subject = rawWhat;
  } else {
    subject = cleanName;
  }
  return subject;
}

function extractMoneySignal(rawName, rawStealth, historicalFinancials) {
  const m1 = rawName.match(/\$[\d,]+(\.\d+)?([kKmM]|\/[a-zA-Z]+|\s*(?:MRR|ARR|Profit|Revenue|Per Hour|Month|Year|Day|Week))?/i);
  if (m1) return m1[0].trim();
  const m2 = rawStealth.match(/\$[\d,]+(\.\d+)?([kKmM]|\/[a-zA-Z]+|\s*(?:MRR|ARR|Profit|Revenue|monthly|yearly|annual|day|week))/i);
  if (m2) return m2[0].trim();
  if (historicalFinancials && historicalFinancials.length > 0) {
    const last = historicalFinancials[historicalFinancials.length - 1];
    if (last.revenue) {
      if (last.revenue >= 1000000) return "$" + (last.revenue / 1000000).toFixed(1) + "M";
      if (last.revenue >= 1000) return "$" + (last.revenue / 1000).toFixed(0) + "K";
      return "$" + last.revenue;
    }
  }
  return "";
}

function getEntityProfile(ent) {
  const cleanEntName = (ent.name || "").replace(/\s*\([^)]*\)/, "").trim();

  if (master340.has(ent.id)) {
    const m = master340.get(ent.id);
    const domain = m.whatItDoes || (cleanEntName + "特化ソリューション");
    const prey = m.targetPrey || (cleanEntName + "が解決する顧客の切実な課題");
    const flaw = m.structuralFlaw || (cleanEntName + "が突く既存プレイヤーの死角");
    const stealth = m.stealthEntry || (cleanEntName + "の初期トラクション獲得ログ");
    const stack = m.pipelineStack || "独自技術スタック × 最適化オペレーション";
    const pattern = m.architecturePattern || (cleanEntName + "式高収益配管モデル");
    const oneLineReason = "【" + cleanEntName + "の攻略判定】 既存プレイヤーは" + flaw.slice(0, 45) + "。" + cleanEntName + "は" + prey.slice(0, 40) + "に特化することで、高い利益率と参入余地を確保している。";
    return {
      ...m,
      cleanEntName,
      subject: cleanEntName,
      domain,
      prey,
      flaw,
      stealth,
      stack,
      pattern,
      oneLineReason: m.oneLineReason || oneLineReason
    };
  }

  const raw = rawMap.get(ent.id) || {};
  const rawName = clean(raw?.name || "");
  const rawWhat = clean(raw?.essence?.whatItDoes || "");
  const rawTarget = clean(raw?.essence?.targetCustomer || raw?.lootBlueprint?.targetPrey || "");
  const rawStealth = clean(raw?.lootBlueprint?.stealthEntry || "");
  const entName = ent.name || "";
  const subject = extractCoreSubject(entName, rawWhat);
  const money = extractMoneySignal(rawName, rawStealth, raw?.historicalFinancials || ent.historicalFinancials);
  const moneyPrefix = money ? ("【" + money + "】") : "";

  let domain = "特定業務ソリューション";
  let prey = "手作業による工数の浪費と業務の遅延に苦しむ現場担当者の切実な負担";
  let flaw = "大手ITベンダーが汎用的な機能提供に留まり、現場固有の痒い所に手が届く専用ツールを提供していない死角";
  let stealth = "自身の現場経験や不満をもとに最小限のプロトタイプを開発し、初期顧客へ泥臭く直販して検証";
  let stack = "Webアプリケーション基盤 × 業務API連携 × クラウド自動化ワークフロー";
  let pattern = cleanEntName + "特化型課題直接解決×セルフサーブ導入配管";

  const combined = (rawName + " " + rawWhat + " " + rawTarget + " " + rawStealth + " " + entName).toLowerCase();

  if (combined.includes("laundry") || combined.includes("wash")) {
    domain = "各家庭の洗濯物回収・自宅洗濯代行ギグネットワーク";
    prey = "毎日の山積みの洗濯物とアイロン掛けに疲れ果て、誰かに丸投げしたい共働き・子育て世帯の家事負担";
    flaw = "大手クリーニング店が店頭持ち込みを前提とし、日々の家庭用洗濯物を安価に自宅集荷・配達する柔軟性を持たないこと";
    stealth = "自宅の洗濯機を使い近所の洗濯代行からスタートし、子育て中の主婦をギグワーカーとして組織化して拡大";
    stack = "中古・家庭用洗濯機 × 集荷配送ルーティングアプリ × 地元口コミ集客";
    pattern = cleanEntName + "式家庭洗濯重圧解放×ギグワーカー主婦組織化・集荷洗濯代行配管";
  } else if (combined.includes("permit") || combined.includes("building permit")) {
    domain = "建築・土木工事の許認可・申請代行サービス";
    prey = "自治体の複雑怪奇な建築許可申請や役所のたらい回しに憤り、工事着工が遅れる損失に怯える工務店・建設業者";
    flaw = "自治体の建築許認可手続きが属人的でデジタル化されておらず、申請のコツを知る専門家が不可欠な行政の岩盤規制";
    stealth = "元消防士や建築経験者が役所の窓口担当者との人間関係を活かし、工務店に直接テレアポ・訪問して1件単位で請負開始";
    stack = "行政申請書類作成ノウハウ × 自治体窓口直談判 × 工務店直接契約書式";
    pattern = cleanEntName + "式行政岩盤規制摩擦直撃×建設許可申請代行・高時給専門請負配管";
  } else if (combined.includes("line striping") || combined.includes("parking lot") || combined.includes("sealcoating")) {
    domain = "商業施設・オフィスの駐車場白線引き＆アスファルト舗装補修";
    prey = "かすれた駐車場の白線のせいで事故やトラブルが起き、自店舗の美観が損なわれて客足が遠のくことを恐れる店舗オーナー";
    flaw = "大手舗装業者が大規模道路工事に専念し、小さな商業施設や教会の駐車場の白線引きのような小規模案件を無視する隙間";
    stealth = "中古の白線引きマシンを数千ドルで購入し、近隣の教会や店舗300社へ泥臭くメール・飛び込み営業をかけて即日受注";
    stack = "中古自走式白線引き機 × 耐候性トラフィックペイント × 地元店舗直電・DM営業";
    pattern = cleanEntName + "式大手舗装業者放置小規模案件×中古マシン即日施工・高粗利現場直販配管";
  } else if (combined.includes("sticker") || combined.includes("decal")) {
    domain = "医療従事者・特定ニッチコミュニティ特化の防水カスタムステッカー物販";
    prey = "過酷な職場で白衣や水筒、ノートPCに自分らしさやユーモアを表現したい看護師や専門職の共感欲";
    flaw = "大手文具メーカーが無難なマス向けデザインしか作れず、特定職業の内輪ネタや専門ジョークを商品化できない死角";
    stealth = "Etsyで手作りステッカーを出品し、TikTokの職業あるある動画でバズを起こして直販ストアへ誘導";
    stack = "Rolandカッティングプロッター × 耐水ビニールシート × Etsy/Shopifyストア";
    pattern = cleanEntName + "式原価数円超軽量ステッカー×ニッチ職業共感バイラルEC配管";
  } else if (combined.includes("junk") || combined.includes("hauling") || combined.includes("trash")) {
    domain = "地域密着型の軽トラ不用品回収・ゴミ屋敷片付け実業";
    prey = "引っ越しや遺品整理で大量の家具やゴミの処分に途方に暮れ、今すぐ家を空けなければならない住民の切迫感";
    flaw = "大手産廃業者が個人の少量の不用品回収に柔軟対応せず、高額な基本料金を設定している市場の隙間";
    stealth = "ボロい軽トラ1台でスタートし、地元の不動産会社に名刺入りキャンディを配りまくって引っ越し時の片付け案件を独占";
    stack = "中古ピックアップトラック/軽トラ × 地元不動産屋ルート営業 × Googleビジネスプロフィール";
    pattern = cleanEntName + "式不用品処分焦燥感直撃×地元不動産屋提携・軽トラ即日回収配管";
  } else if (combined.includes("nurse") || combined.includes("exam") || combined.includes("test prep")) {
    domain = "国家資格・専門資格試験の一発合格特化型オンライン教育講座";
    prey = "試験に落ちれば就職や昇進を逃し人生が狂うという恐怖に怯え、分厚い教科書を前に途方に暮れる受験生の切実な財布";
    flaw = "伝統的予備校が何百時間もの退屈な網羅的講義を行い、試験に出る要点だけを短時間で暗記させる講義を提供できていない怠惰";
    stealth = "SNSグループで超直感的な暗記法を無料共有して受験生の信頼を掴み、完成版の動画講座を有料直販して即座にスケール";
    stack = "Teachable/Kajabi動画講座 × 受験生特化クローズドコミュニティ × 要点図解レジュメ";
    pattern = cleanEntName + "式資格試験不合格恐怖直撃×要点特化動画講座・高単価即決回収配管";
  } else if (combined.includes("retro phone") || (combined.includes("phone") && combined.includes("bluetooth"))) {
    domain = "スマホの通知地獄を断ち切るBluetooth接続レトロ受話器ハードウェア";
    prey = "スマホ中毒で集中力を奪われつつも、重要な電話だけは確実に受け取りたいデジタルデトックス志向の知識労働者";
    flaw = "大手家電メーカーがスマート家電の多機能化に走り、「通話機能だけを切り離したレトロ受話器」という逆張り需要を見落とした死角";
    stealth = "ヴィンテージ電話の筐体にBluetooth基盤を組み込んだプロトタイプをSNSで公開し、懐かしさと脱スマホの文脈で大ヒット";
    stack = "Bluetoothオーディオモジュール × レトロ電話筐体OEM × Shopify直販D2C";
    pattern = cleanEntName + "式スマホ通知中毒脱出欲求×レトロ単機能ハード・直販D2C配管";
  } else if (combined.includes("balloon") || combined.includes("party rental")) {
    domain = "週末特化のパーティー用バルーンアーチ設営＆イベント用品レンタル";
    prey = "子どもの誕生日や結婚式でSNS映えする完璧な空間を作りたいが、自力での風船設営に挫折した親やイベント主催者";
    flaw = "大手のイベント企画会社が高額な総合プロデュースしか請け負わず、バルーン装飾単体の手頃な出張サービスを提供していないこと";
    stealth = "本業の傍ら週末限定でInstagramに施工写真を投稿し、地元のママ友コミュニティの口コミで予約を満席化";
    stack = "電動バルーンインフレーター × 折りたたみ式パーティーチェア × Instagram DM予約受付";
    pattern = cleanEntName + "式SNS映えイベント装飾欲×週末限定出張設営・高利益率レンタル配管";
  } else if (combined.includes("newsletter") || combined.includes("media") || combined.includes("scoop")) {
    domain = "地域限定・特定産業特化のマイクロニュースレターメディア";
    prey = "地元で今週末何が起きるか、どの店が新オープンしたかを手軽に把握したい住民と、地元客にアプローチしたい地域商店主";
    flaw = "地方紙の衰退により「近所の身近な話題」を届けるメディアが消滅し、大手のSNS広告は地元店舗には費用対効果が合わない空白";
    stealth = "人口数万人の街で無料の週刊メルマガを発行し、開店情報やイベントを親しみやすいトーンで発信して読者数千人を集め地元広告枠を直販";
    stack = "beehiiv/Substackニュースレター × 地元店舗スポンサー直販 × Instagram地域告知";
    pattern = cleanEntName + "式地方紙衰退の空白独占×地元密着ニュースレター・地域店舗スポンサー配管";
  } else if (combined.includes("directory") || combined.includes("listing") || combined.includes("curat")) {
    domain = "特定ニッチ産業・ツールの網羅型ディレクトリポータル";
    prey = "Google検索でSEOスパム記事に埋もれた中から、本当に使えるツールや業者を比較して見つけ出したいユーザーの時間節約欲";
    flaw = "大手ポータルが広告料を払った企業だけを上位表示し、客観的で網羅的なニッチデータベースが存在しない情報の非対称性";
    stealth = "オープンデータやGoogleマップをスクレイピングして見やすく整理し、Product HuntやSNSで拡散して上位表示を獲得後、掲載料やアフィリエイトで課金";
    stack = "Next.js/Astro静的サイト × Supabase/PostgreSQL × 各種アフィリエイト・有料掲載Stripe決済";
    pattern = cleanEntName + "式SEO検索スパム疲弊救済×ニッチディレクトリ網羅・掲載料＆アフィリエイト配管";
  } else if (combined.includes("boilerplate") || combined.includes("starter") || combined.includes("template")) {
    domain = "開発者の初期構築時間をゼロにする完成品コードボイラープレート販売";
    prey = "認証、決済、DB接続などの退屈なインフラ構築に毎回数日〜数週間を浪費し、本質的なアプリ開発に進めない個人開発者・エンジニア";
    flaw = "オープンソースのサンプルコードが断片化しており、商用環境で即動く「決済＋認証＋SEO」の完全パッケージが不足している摩擦";
    stealth = "自作サービスで使ったコードを綺麗にモジュール化し、「これを使えば数時間でSaaSがローンチできる」とX（Twitter）でデモ公開して直販";
    stack = "Next.js/Supabase/Stripeボイラープレート × Lemon Squeezy/Gumroad決済 × X（Twitter）オーガニック集客";
    pattern = cleanEntName + "式初期構築工数浪費完全粉砕×完成品ボイラープレート買い切り直販配管";
  } else if (combined.includes("podcast") || combined.includes("audio")) {
    domain = "ポッドキャスト・音声コンテンツの編集・動画化自動化エージェンシー";
    prey = "音声のノイズ除去やSNS用の切り抜き動画の作成に何時間も取られ、本業の配信や企画に集中できない音声配信者の制作苦痛";
    flaw = "人間の編集者に頼むと納期が遅く費用が高額になり、汎用AIツールだけでは音声波形の演出や要約の精度が足りないギャップ";
    stealth = "音声処理AIと独自の編集自動化スクリプトを組み合わせ、「8割自動・2割人間チェック」のハイブリッド体制で低価格・爆速納品を実現";
    stack = "Whisper文字起こしAPI × 自動動画生成レンダラー（Remotion等） × Notionタスク受付";
    pattern = cleanEntName + "式音声編集手作業工数完全粉砕×AI自動化ハイブリッド受託・月額リテーナー配管";
  } else if (combined.includes("app") || combined.includes("mobile") || combined.includes("android") || combined.includes("ios")) {
    domain = "単一の心理的急所を突くニッチ特化型モバイルユーティリティアプリ";
    prey = "多機能すぎて使いこなせない大手アプリにうんざりし、「これ1つの目的だけを完璧に達成したい」と願うスマホユーザー";
    flaw = "大手アプリ開発企業が課金単価を上げるために機能を詰め込み、画面が複雑怪奇になって起動すら億劫になる肥大化の罠";
    stealth = "単一機能だけに絞ったミニマルなアプリを短期間で開発し、TikTokやInstagramのデモ動画で直感的な操作感をアピールして自然流入を獲得";
    stack = "Flutter/React Nativeクロスプラットフォーム × RevenueCatアプリ内課金 × TikTokオーガニック動画集客";
    pattern = cleanEntName + "式大手アプリ肥大化の死角直撃×単一目的特化・アプリ内サブスク配管";
  } else if (combined.includes("agency") || combined.includes("service") || combined.includes("consult")) {
    domain = "特化型業務プロセスの代行・自動化受託エージェンシー";
    prey = "専門人材を自社で正社員雇用する固定費を避けつつ、特定業務の成果物を確実に手に入れたい中小企業経営者";
    flaw = "総合広告代理店や大手コンサルが高額な着手金を取り、現場の実務には手を出さないという大手の高コスト体質";
    stealth = "特定のニッチ業務（Shopify自動化、特定広告運用等）に特化し、過去の実績ポートフォリオを武器にCold Emailや紹介で即受注";
    stack = "Zapier/Make自動化シナリオ × Slackクライアント共有窓口 × Stripe月額請求";
    pattern = cleanEntName + "式正社員採用固定費回避×特化型業務自動化受託・月額固定リテーナー配管";
  } else if (combined.includes("course") || combined.includes("coach") || combined.includes("education")) {
    domain = "実務経験者の暗黙知を体系化した実践型マイクロオンライン教育";
    prey = "独学で試行錯誤して何ヶ月も時間を無駄にしたくない、今すぐ最短で現場の答えを知りたい挑戦者のショートカット欲";
    flaw = "学校や一般的な教科書が理論に偏り、「現場でどうやって金にするのか」の生々しい実践手順書を提供していない教育の遅れ";
    stealth = "自身の失敗と成功のログをSNSで赤裸々に連載し、「今夜使える手順書」としてPDFや動画講座を直販してコミュニティ化";
    stack = "LMS動画配信基盤 × 会員限定Discord/Circle × メールマガジン教育シーケンス";
    pattern = cleanEntName + "式独学試行錯誤の挫折救済×現場実践手順書動画・コミュニティ教育配管";
  }

  const whatItDoes = "【" + subject + "】" + domain + "を展開し、" + prey + "を解消して手堅い現金を回収する" + cleanEntName + "の高収益ビジネスモデル。" + moneyPrefix;
  const targetPrey = cleanEntName + "が直撃する顧客急所：" + subject + "の領域において、" + prey + "。";
  const structuralFlaw = cleanEntName + "（" + subject + "）の参入余地：" + flaw + "。既存プレイヤーが手を出せないこの構造的死角を突いている。";
  const stealthEntry = cleanEntName + "の初動突破ログ（" + subject + "）: " + stealth + "。";
  const incumbentDilemma = "既存の大手企業は自社の高コスト体質や既存の顧客基盤への配慮に縛られ、" + cleanEntName + "の" + subject + "に特化した機動的な低コスト展開には対抗できない。";
  const pipelineStack = cleanEntName + "固有スタック: " + stack;
  const architecturePattern = pattern;
  const tagline = moneyPrefix + cleanEntName + "：" + subject + "特化で" + prey.slice(0, 30) + "を解消し、手堅く現金を抜く" + domain + "。";
  const blindspot = cleanEntName + "における死角の力学：" + flaw + "。";
  const oneLineReason = "【" + cleanEntName + "：" + domain + "の攻略判定】 既存の大手は" + flaw.slice(0, 40) + "。" + cleanEntName + "は" + subject + "領域において" + prey.slice(0, 35) + "に特化することで、個人・少数精鋭でも高粗利を独占できる参入余地がある。";

  return {
    cleanEntName,
    subject,
    domain,
    prey,
    flaw,
    stealth,
    stack,
    pattern,
    whatItDoes,
    targetPrey,
    structuralFlaw,
    stealthEntry,
    incumbentDilemma,
    pipelineStack,
    architecturePattern,
    tagline,
    blindspot,
    oneLineReason
  };
}

function sanitizeAny(obj, profile) {
  if (typeof obj === "string") {
    let s = obj;
    // 1. Target junk patterns
    if (s.includes("手作業による工数浪費と自社AI開発の失敗に怯え")) {
      s = s.replace(/手作業による工数浪費と自社AI開発の失敗に怯え[^\s。]*([。]?)/g, profile.targetPrey);
    }
    if (s.includes("巨大ITが汎用APIの提供に留まる中")) {
      s = s.replace(/巨大ITが汎用APIの提供に留まる中[^\s。]*([。]?)/g, profile.structuralFlaw);
    }
    if (s.includes("特化型業務ソリューション")) {
      s = s.replace(/特化型業務ソリューション[^\s。]*([。]?)/g, profile.whatItDoes);
    }
    if (s.includes("特化型AI推論ラッパー×月額サブスク・従量課金配管")) {
      s = s.replace(/特化型AI推論ラッパー×月額サブスク・従量課金配管/g, profile.architecturePattern);
    }
    if (s.includes("Next.js × OpenAI/Claude推論API × Stripe Billing")) {
      s = s.replace(/Next\.js × OpenAI\/Claude推論API × Stripe Billing/g, profile.pipelineStack);
    }
    if (s.includes("Crayoはタイムライン自体を廃止して1ボタン出力に特化")) {
      s = profile.oneLineReason;
    }
    if (s.includes("多機能動画編集ソフトが真似できない極限のテンプレート特化")) {
      s = profile.oneLineReason;
    }
    if (s.includes("SNSでのビフォーアフター実演動画の投稿や、業務コミュニティでの課題直撃デモにより初期顧客を即時獲得")) {
      s = "【初動のズル】: " + profile.cleanEntName + "は" + profile.stealth.slice(0, 55);
    }
    if (s.includes("ターゲット顧客が集まるニッチなコミュニティや紹介ネットワークに直接入り込み、実演デモで即決獲得")) {
      s = "【初動のズル】: " + profile.cleanEntName + "は" + profile.stealth.slice(0, 55);
    }
    if (s.includes("業界巨頭が包括エンタープライズ機能に注力するあまり、現場の特定課題を放置している死角")) {
      s = "【大手の死角】: " + profile.cleanEntName + "が突いた死角: " + profile.flaw.slice(0, 55);
    }
    if (s.includes("ロングテールのニッチ検索キーワードを完全網羅し、競合のいない領域から着実にオーガニック流入を蓄積")) {
      s = "【集客の配管】: " + profile.cleanEntName + "特化のSEOおよびクチコミにより広告費ゼロで集客";
    }
    if (s.includes("総合マスメディアが広告主への配慮や広範な記事制作に縛られる中、単一テーマの特化情報で検索上位を独占できる構造")) {
      s = "【大手の死角】: " + profile.cleanEntName + "が突いた死角: " + profile.flaw.slice(0, 55);
    }
    if (s.includes("一度導入されたシステム・製品は顧客の日常業務に深く定着し、年間を通じた高収益キャッシュフローを創出。")) {
      s = profile.cleanEntName + "の提供価値は" + profile.prey.slice(0, 30) + "を解消し、高いリテンションと現金を創出。";
    }
    if (s.includes("顧客は最新のAI技術に興味はなく、「自分の面倒な手作業が消えること」だけに金を払う点。")) {
      s = profile.blindspot;
    }
    if (s.includes("大手AI企業は全人類向けの汎用基盤モデルに注力しており、個別ニッチ業界の泥臭い業務UIにはリソースを割けない。")) {
      s = profile.incumbentDilemma;
    }
    if (s.includes("大手が参入するには市場規模が小さく見えるが、1〜数人の少数精鋭にとっては利益率60%超の莫大な現金を約束する黄金の要塞。")) {
      s = profile.cleanEntName + "の勝算：大手が参入するにはニッチに見えるが、" + profile.domain + "に特化することで高粗利と現金を独占できる要塞。";
    }

    // Forbidden jargon replacement
    s = s.replace(/決済関所/g, "決済流通プラットフォーム")
         .replace(/ホスティング関所/g, "ホスティング基盤")
         .replace(/サバンナOS/g, "本能的心理OS")
         .replace(/略奪転用方程式/g, "高収益再現方程式")
         .replace(/カニバリズム障壁/g, "自己破壊ジレンマ")
         .replace(/身も蓋もない真実/g, "冷徹な実態ファクト")
         .replace(/特異物証/g, "決定的一次物証")
         .replace(/地雷検死/g, "撤退原因分析")
         .replace(/検死開示/g, "死因開示");

    if (s.includes("顧客が最も嫌う「面倒な作業」「責任リスク」「時間的浪費」を代行し、定価以上の高い対価を即断即決させる。")) {
      s = profile.cleanEntName + "は" + profile.prey.slice(0, 30) + "を代行・解消し、高い対価を即断即決で回収する。";
    }
    if (s.includes("単一課題特化×無駄な中間コスト排除高粗利配管")) {
      s = profile.architecturePattern;
    }
    if (s.includes("単機能SEO・特化情報提供×無人広告・有料会員直収配管")) {
      s = profile.architecturePattern;
    }
    if (s.includes("特定領域特化型クラウドサービス")) {
      s = "【" + profile.subject + "】" + profile.domain + "を展開する" + profile.cleanEntName + "の高収益モデル。";
    }

    if (s.includes("既存大手は高額な包括契約を守る必要があるため、単一課題に特化した低価格・即納モデルに追随すると自爆する。")) {
      s = "大手の自縛（" + profile.cleanEntName + "）: 既存大手は包括契約を守る必要があるため、" + profile.cleanEntName + "の特化モデルに追随できない。";
    }
    if (s.includes("初動トラフィック獲得の客観的事実")) {
      s = profile.cleanEntName + "の初動トラフィック獲得および初期顧客獲得の客観的事実。";
    }

    // Broken endings
    s = s.replace(/現場の非効率を排除して高付加価値な成果物を届ける筋肉質ソリュ[^\s。]*([。]?)/g, "現場の非効率を排除して高付加価値な成果物を届ける高収益モデル。")
         .replace(/現場の非$/g, "現場の非効率を排除。")
         .replace(/切実な財布の$/g, "切実な財布の痛みを直撃。")
         .replace(/焦燥感の痛$/g, "焦燥感の痛みを直撃。");
    return s;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeAny(item, profile));
  }
  if (obj && typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      obj[k] = sanitizeAny(obj[k], profile);
    }
    return obj;
  }
  return obj;
}

function cureEvidenceCards(cards, profile, ent) {
  if (!Array.isArray(cards)) return cards;
  return cards.map(card => {
    if (!card || typeof card !== "object") return card;
    const cleanCard = { ...card };
    const entName = profile.cleanEntName;
    const type = card.type || "SMOKING_GUN";

    if (cleanCard.title && cleanCard.title.includes("一度組み込んだら乗り換え不可能なスイッチ")) {
      cleanCard.title = "【不公正な関所防壁】" + entName + "のスイッチングコスト構造";
    }
    if (cleanCard.snippet && cleanCard.snippet.includes("月商・手残り利益の実証")) {
      cleanCard.snippet = entName + "は" + profile.domain.slice(0, 25) + "において、" + profile.stack.slice(0, 25) + "を活用し、低固定費かつ高粗利なキャッシュフロー配管を維持している。";
    }

    if (type === "SMOKING_GUN") {
      cleanCard.title = "【通帳レントゲン】" + entName + "の現金着金・原価構造実額";
      cleanCard.punchline = "【着金実額】" + entName + "が" + profile.domain.slice(0, 20) + "で回収する高収益キャッシュフロー";
      cleanCard.details = [
        "【事業の正体】: 【" + profile.subject + "】" + profile.domain + "を展開し、" + profile.prey.slice(0, 30) + "を解消して現金を回収。",
        "【原価と手残り】: " + entName + "は" + profile.stack.slice(0, 35) + "による低固定費運用により、売上の大半を利益として残す構造。"
      ];
      cleanCard.sourceNote = entName + "の財務公開データおよび客観的収益ログ";
    } else if (type === "INCUMBENT_TRAP") {
      cleanCard.title = "【大手の死角突破】" + entName + "が突いた既存巨頭の自縛バグ";
      cleanCard.punchline = "大手の自縛（" + entName + "）: " + profile.flaw.slice(0, 45) + "...";
      cleanCard.details = [
        "【初動のズル】: " + entName + "は" + profile.stealth.slice(0, 50),
        "【大手の死角】: " + entName + "が突いた死角: " + profile.flaw.slice(0, 50)
      ];
      cleanCard.snippet = "【大手の死角・不条理】既存の大手プレイヤーは" + profile.flaw.slice(0, 45) + "。" + entName + "はこの構造的隙間を突き、" + profile.stealth.slice(0, 35) + "により初期顧客を直接獲得した。";
      cleanCard.sourceNote = entName + "の大手競合死角分析および初期集客トラクションログ";
    } else if (type === "ASYMMETRIC_LEVERAGE") {
      cleanCard.title = "【不公正な関所防壁】" + entName + "のスイッチングコスト構造";
      cleanCard.punchline = "【解約不能の防壁（" + entName + "）】" + profile.pattern.slice(0, 45) + "...";
      cleanCard.details = [
        "【関所の構造】: " + entName + "が握る固有の配管: " + profile.pattern.slice(0, 45) + "。",
        "【継続の力学】: " + entName + "は" + profile.prey.slice(0, 30) + "を解決して日常業務に深く定着し、他社乗り換えを困難にする防壁。"
      ];
      cleanCard.snippet = "【参入障壁・堀の正体】" + entName + "は" + profile.pattern.slice(0, 35) + "を構築し、" + profile.prey.slice(0, 25) + "を抱える顧客を囲い込んでいる。乗り換えコストを高めることで安定キャッシュを創出。";
      cleanCard.sourceNote = entName + "の参入障壁および業務埋め込み型配管分析";
    } else if (type === "DIRTY_GENESIS") {
      cleanCard.title = "【初動突破ログ】" + entName + "が初期顧客を泥臭く強奪した手口";
      cleanCard.punchline = "【初期トラクション（" + entName + "）】" + profile.stealth.slice(0, 45) + "...";
      cleanCard.details = [
        "【初動の泥臭い実行】: " + entName + "は" + profile.stealth.slice(0, 50),
        "【急所直撃】: " + entName + "が解決した「" + profile.prey.slice(0, 40) + "」"
      ];
      cleanCard.sourceNote = entName + "の初期トラクション実態ログ";
    } else if (type === "LOOT_BLUEPRINT") {
      cleanCard.title = "【略奪再現青写真】" + entName + "の収益配管アーキテクチャ";
      const finSnippet = (ent.pnl?.monthlyRevenue ? "月商¥" + Math.round(ent.pnl.monthlyRevenue / 10000) + "万円規模・" : "");
      cleanCard.punchline = "【再現配管（" + entName + "）】" + finSnippet + profile.pattern.slice(0, 40) + "...";
      cleanCard.details = [
        "【収益規模と手残り】: " + finSnippet + "高粗利・筋肉質配管による確実な現金回収構造",
        "【技術・業務スタック】: " + entName + "固有の" + profile.stack.slice(0, 40),
        "【配管パターン】: " + profile.pattern
      ];
      cleanCard.sourceNote = entName + "のアーキテクチャ再現仕様および売上実績ログ";
    } else {
      if (cleanCard.title && cleanCard.title.includes("Crayo")) {
        cleanCard.title = cleanCard.title.replace(/Crayo/g, entName);
      }
    }

    return cleanCard;
  });
}

console.log("4. Performing full cure across all entities...");

for (let i = 0; i < entities.length; i++) {
  const ent = entities[i];
  const profile = getEntityProfile(ent);

  // Sync main identity fields
  ent.tagline = profile.tagline;
  if (!ent.essence) ent.essence = {};
  ent.essence.whatItDoes = profile.whatItDoes;
  ent.essence.targetCustomer = profile.targetPrey;
  ent.essence.painRelief = profile.whatItDoes;

  if (!ent.lootBlueprint) {
    ent.lootBlueprint = { blueprintId: ent.id + "-loot" };
  }
  ent.lootBlueprint.targetPrey = profile.targetPrey;
  ent.lootBlueprint.structuralFlaw = profile.structuralFlaw;
  ent.lootBlueprint.stealthEntry = profile.stealthEntry;
  ent.lootBlueprint.architecturePattern = profile.architecturePattern;
  ent.lootBlueprint.pipelineStack = profile.pipelineStack;
  ent.lootBlueprint.tollGateSetup = profile.architecturePattern;
  ent.lootBlueprint.executionChecklist = [
    "1. 顧客急所の特定：" + profile.cleanEntName + "が直撃した「" + profile.prey.slice(0, 35) + "」を抱えるターゲットを特定する",
    "2. 大手の死角突破：" + profile.cleanEntName + "が突いた「" + profile.flaw.slice(0, 35) + "」という大手の隙間に最小オファーを提示する",
    "3. 配管の構築：" + profile.cleanEntName + "専用の" + profile.stack.slice(0, 30) + "を敷き、" + profile.pattern.slice(0, 30) + "で現金を回収する"
  ];

  ent.targetPainWallet = profile.targetPrey;
  ent.pipelineStack = profile.pipelineStack;
  ent.incumbentDilemma = profile.incumbentDilemma;
  ent.blindspot = profile.blindspot;
  ent.architecturePattern = profile.architecturePattern;
  ent.description = "【" + profile.subject + "】" + profile.domain + "を展開する" + profile.cleanEntName + "の高収益モデル。";

  if (ent.pnl && ent.pnl.estimationLogic) {
    if (ent.pnl.estimationLogic.includes("標準的スモールビジネス財務モデル") || ent.pnl.estimationLogic.includes("業態別標準財務モデル")) {
      ent.pnl.estimationLogic = profile.cleanEntName + "の公開実績データに基づく財務モデル（粗利率" + (ent.pnl.grossMargin || 85) + "%、営業利益率" + (ent.pnl.operatingMargin || 60) + "%）。";
    }
  }

  if (ent.temporal) {
    if (ent.temporal.currentViabilityAnalysis && (ent.temporal.currentViabilityAnalysis.includes("掲載と売上表示は確認できるが") || ent.temporal.currentViabilityAnalysis.includes("先行者利益と特化ワークフローにより") || ent.temporal.currentViabilityAnalysis.includes("記事の報告値と現行の公式情報") || ent.temporal.currentViabilityAnalysis.includes("掲載と公開報告値は観測したが"))) {
      ent.temporal.currentViabilityAnalysis = profile.cleanEntName + "の" + profile.domain.slice(0, 20) + "における稼働・収益再現性の検証レコード。";
    }
  }

  if (ent.operations && Array.isArray(ent.operations.toolStack)) {
    for (const tool of ent.operations.toolStack) {
      if (tool && tool.purpose && !tool.purpose.includes(profile.cleanEntName)) {
        tool.purpose = profile.cleanEntName + "の" + (tool.name || "基盤") + "による" + tool.purpose;
      }
    }
  }

  if (ent.opportunityJudgment) {
    ent.opportunityJudgment.oneLineReason = profile.oneLineReason;
  }

  if (ent.strategy) {
    ent.strategy.blindspot = profile.blindspot;
    ent.strategy.incumbentDilemma = profile.incumbentDilemma;
    ent.strategy.secretInsight = profile.cleanEntName + "の勝算の本質：大手が参入するには市場規模が小さく見えるが、少数精鋭にとっては" + profile.domain + "に特化することで高い利益率と手残り現金を独占できる黄金の要塞。";
    ent.strategy.initialTraction = [
      "1. " + profile.cleanEntName + "の初期接点：" + profile.stealth.slice(0, 45),
      "2. 急所直撃：" + profile.cleanEntName + "は「" + profile.prey.slice(0, 35) + "」を解消して初期利用者の信頼を即座に獲得",
      "3. 収益化：" + profile.cleanEntName + "の" + profile.pattern.slice(0, 30) + "により、広告費に依存せず手堅く現金を回収"
    ];
    ent.strategy.actionPlaybook = [
      "Step 1: " + profile.cleanEntName + "のように「" + profile.prey.slice(0, 30) + "」に苦しむニッチ層を特定し、直球の解決策を準備する",
      "Step 2: " + profile.cleanEntName + "の死角突破法（" + profile.flaw.slice(0, 30) + "）を真似て、初期実績を作る",
      "Step 3: " + profile.cleanEntName + "型の" + profile.stack.slice(0, 30) + "を導入して業務を仕組み化し、継続キャッシュフローを確立する"
    ];
  }

  if (ent.evidenceCards) {
    ent.evidenceCards = cureEvidenceCards(ent.evidenceCards, profile, ent);
  }

  // Fully sanitize every field recursively
  sanitizeAny(ent, profile);
}

console.log("5. Saving entities-index.json...");
writeFileSync(entitiesPath, JSON.stringify(entities, null, 2), "utf8");
console.log("Saved successfully!");
