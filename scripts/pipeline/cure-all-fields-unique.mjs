import fs from "fs";
import path from "path";
import { getMasterAll340Profiles } from "./profiles/master-all-340.mjs";
import { execFileSync } from "node:child_process";

// Compatibility entry point: the old profile-wrapper below is intentionally
// unreachable because it recreated the catalogue-wide template pollution.
const compatibilityArgs = process.argv.slice(2);
const compatibilityMode = compatibilityArgs.includes("--check") ? "--check" : "--write";
const compatibilityExtra = compatibilityArgs.filter((arg) => arg !== "--check" && arg !== "--write");
execFileSync(
  process.execPath,
  ["scripts/pipeline/repair-content-diversity.mjs", compatibilityMode, ...compatibilityExtra],
  { stdio: "inherit" },
);
process.exit(0);

console.log("=== Universal Deep Precision Cure Engine for all 3,341 Entities ===");

// 1. Scan and load all raw incoming data
console.log("1. Scanning and loading raw incoming data...");
function scanDir(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(scanDir(full));
    } else if (item.name.endsWith(".json") && !item.name.includes("receipt") && !item.name.includes("audit") && !item.name.includes("r2-result")) {
      files.push(full);
    }
  }
  return files;
}

const allIncomingFiles = scanDir("data/incoming");
const rawMap = new Map();
for (const f of allIncomingFiles) {
  try {
    const list = JSON.parse(fs.readFileSync(f, "utf8"));
    if (Array.isArray(list)) {
      for (const ent of list) {
        if (!ent || !ent.id) continue;
        const existing = rawMap.get(ent.id);
        if (!existing) {
          rawMap.set(ent.id, ent);
        } else {
          const exLen = (existing.essence?.whatItDoes || "").length + (existing.strategy?.moatDescription || "").length;
          const newLen = (ent.essence?.whatItDoes || "").length + (ent.strategy?.moatDescription || "").length;
          if (newLen > exLen) rawMap.set(ent.id, ent);
        }
      }
    }
  } catch {}
}
console.log(`Loaded ${rawMap.size} unique raw incoming entities.`);

// 2. Load Master 340
console.log("2. Loading Master 340 profiles...");
const master340 = getMasterAll340Profiles();
console.log(`Loaded ${master340.size} master profiles.`);

// 3. Load Current entities-index.json
console.log("3. Loading entities-index.json...");
const indexPath = "data/entities-index.json";
const currentEntities = JSON.parse(fs.readFileSync(indexPath, "utf8"));
console.log(`Loaded ${currentEntities.length} current entities.`);

function clean(text) {
  if (!text) return "";
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&#x[0-9a-f]+;/gi, "")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMoneySignal(rawName, rawStealth, historicalFinancials, pnl) {
  const m1 = (rawName || "").match(/\$[\d,]+(\.\d+)?([kKmM]|\/[a-zA-Z]+|\s*(?:MRR|ARR|Profit|Revenue|Per Hour|Month|Year|Day|Week))?/i);
  if (m1) return m1[0].trim();
  const m2 = (rawStealth || "").match(/\$[\d,]+(\.\d+)?([kKmM]|\/[a-zA-Z]+|\s*(?:MRR|ARR|Profit|Revenue|monthly|yearly|annual|day|week))/i);
  if (m2) return m2[0].trim();
  if (pnl?.monthlyRevenue) {
    const man = Math.round(pnl.monthlyRevenue / 10000);
    if (man >= 10000) return `月商${(man / 10000).toFixed(1)}億円`;
    return `月商${man}万円`;
  }
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

function buildTagline(moneyPrefix, cleanEntName, text) {
  let cleanText = clean(text);
  if (cleanText.length > 85) {
    const firstPeriod = cleanText.indexOf("。");
    if (firstPeriod > 20 && firstPeriod <= 85) {
      cleanText = cleanText.slice(0, firstPeriod + 1);
    } else {
      cleanText = cleanText.slice(0, 80) + "…";
    }
  }
  if (!cleanText.endsWith("。") && !cleanText.endsWith("…")) {
    cleanText += "。";
  }
  return moneyPrefix + cleanEntName + "：" + cleanText;
}

function formatOneLineReason(cleanEntName, subject, domain, flaw, prey) {
  let cleanFlaw = flaw.replace(/([、。].*)$/, "");
  if (cleanFlaw.length > 40) cleanFlaw = cleanFlaw.slice(0, 38);
  cleanFlaw = cleanFlaw.replace(/こと$|構造$|格差$|死角$|隙間$|こと。$/, "");

  let cleanPrey = prey.replace(/([、。].*)$/, "");
  if (cleanPrey.length > 40) cleanPrey = cleanPrey.slice(0, 38);
  cleanPrey = cleanPrey.replace(/苦痛$|摩擦$|不安$|恐怖$|焦燥感$|絶望$|苦痛。$/, "");

  return `【${cleanEntName}の攻略判定】 既存の大手が「${cleanFlaw}」という死角を放置する中、${cleanEntName}は${subject}領域において「${cleanPrey}」の痛みに特化。個人・少数精鋭でも高粗利を独占できる参入余地がある。`;
}

// 25 Domain Patterns for Deep Classification
const CATEGORY_PATTERNS = [
  {
    regex: /coin identifier|coinsnap/i,
    subject: "スマホ写真AIコイン鑑定・価値査定アプリ",
    domain: "硬貨をスマホ撮影するだけで瞬時に希少価値・取引相場を判定するAI鑑定アプリ",
    prey: "手元の古銭やコレクション硬貨の真の価値が分からず安価で買い叩かれるのを恐れる収集家の不安",
    flaw: "専門の鑑定士への査定依頼が数千円の手数料と数日の日数を要し手軽に調べたい需要を無視している隙間",
    stealth: "App Storeで単機能のAI鑑定アプリを公開し、コイン収集フォーラムやTikTokの鑑定動画からオーガニック流入を爆発獲得",
    stack: "画像認識AIモデル × 古銭オークション相場DB × App Store週額/年額サブスク課金",
    moat: "数百万枚のコイン画像識別データと、App Store内での「Coin Identifier」検索上位独占による無人集客配管。"
  },
  {
    regex: /diagram editor|rhyming dictionary|steve hanov|multiplesaas/i,
    subject: "格安VPS相乗り複数マイクロSaaS運用",
    domain: "月額20ドルの格安サーバー1台で作図エディタや押韻辞書など複数の単機能Webツールを並行運用する個人要塞",
    prey: "多機能すぎて重く月額利用料が高い大手商用ツールに苛立ちブラウザで即座に使える軽量ツールを求める開発者の不満",
    flaw: "大手SaaS企業が機能の肥大化とエンタープライズ高額プランに傾斜し単一目的の軽量Webツールの需要を切り捨てている死角",
    stealth: "自身の技術ブログで開発過程とツールを公開し、Google自然検索やプログラマーのブックマークから完全自動でトラフィックを獲得",
    stack: "月額$20格安VPS × オープンソース軽量DB × 静的HTML/Vanilla JS × セルフサーブ決済",
    moat: "インフラ固定費が月額数千円という極限の低コスト体質と、Google検索上位による広告費完全ゼロの不労ストック配管。"
  },
  {
    regex: /discontinued ebike|ebike control|3d-print|kevin hardin/i,
    subject: "廃盤電動自転車向け補修パーツ小ロット3Dプリント製造",
    domain: "製造元倒産で入手不能になった電動自転車の電源ボタンパッドを3Dプリンターで高耐久複製・直販する製造実業",
    prey: "数ドルのゴム部品が破損しただけで数十万円の電動自転車が粗大ゴミになる危機に瀕したオーナーの絶望",
    flaw: "大手メーカーが金型製造コストを回収できない廃盤パーツの供給を完全に打ち切りアフターマーケットを放置していること",
    stealth: "壊れた現物をノギスで精密採寸してCADモデリングし、オーナーズフォーラムに装着写真を投稿して購入希望者を即時獲得",
    stack: "高精度3D CAD（Fusion360） × 自宅3Dプリンター（TPUフィラメント） × Shopify直販EC",
    moat: "金型不要の夜間無人オンデマンド印刷体制と、代替品が地球上に存在しないことによる原価2ドル→販売価格55ドルの独占価格決定権。"
  },
  {
    regex: /screen recorder|sergey nazarov|screen charm/i,
    subject: "脱サブスク・完全買い切りMac画面録画デスクトップアプリ",
    domain: "月額課金に疲弊したユーザー向けに、クラウド通信不要で超軽量に動くMac専用の買い切り録画ツール",
    prey: "毎月数千円を請求し続ける既存SaaSに激怒しオフラインでも超爆速で動くシンプルなMac用買い切りアプリを求めるエンジニアの怒り",
    flaw: "競合大手が全ツールを月額サブスクリプション化しシンプルな買い切り需要とオフライン動作の安心感を無視して自爆している隙間",
    stealth: "TwitterやHacker Newsで「脱サブスク・79ドル一生使い放題」を宣言してデモGIFを投稿し、エンジニアの間で口コミ拡散",
    stack: "Swift/macOSネイティブ × ローカルエンコーダー × Gumroad即時決済",
    moat: "クラウドサーバー費用が完全ゼロのローカル動作設計と、サブスク嫌悪層を熱狂させる「一度払えば一生使える」絶対の安心感。"
  },
  {
    regex: /review videos for amazon|amazon influencer|john muscarello/i,
    subject: "Amazonインフルエンサー動画レビュー・アフィリエイト配管",
    domain: "月販500個以上で既存動画が弱いAmazon商品ページに短尺レビュー動画を投稿し、購入コミッションを吸い上げる実業",
    prey: "商品写真やテキストだけでは使用感が分からず購入直前で迷っているAmazonプライム会員の不安",
    flaw: "出品者が自社製品の良質な実演動画を制作できず商品ページの動画掲載枠が空席のまま放置されていること",
    stealth: "自宅にある日用品から片っ端からスマホで1分実演動画を撮ってAmazonにアップロードし、即日コミッションを発生させて横展開",
    stack: "スマホカメラ × 1分短尺レビュー撮影 × Amazonインフルエンサープログラム配管",
    moat: "5,000本を超える商品レビュー動画の資産蓄積と、Amazon商品ページの購入直前トラフィックから自動で抜く通行税構造。"
  },
  {
    regex: /garage floor coating|flake garage|mike stuart/i,
    subject: "ガレージ床高耐久フレークエポキシコーティング施工実業",
    domain: "YouTubeで独学習得したフレーク塗装技術により、ボロボロのガレージ床を1日でショールーム品質に再生する現場施工実業",
    prey: "油汚れやクラックでみすぼらしくなったガレージを美しい趣味空間に変えたい富裕層住宅オーナーの虚栄心",
    flaw: "大手リフォーム業者が多層下請けマージンで高額かつ何週間も待たせるのに対し機動力のある直営チームが1日即納できる格差",
    stealth: "YouTubeで施工技術を学び、地元住宅街に向けてFacebookで劇的なビフォーアフター動画広告を配信して即座に見積もり殺到",
    stack: "専用床研磨機 × 高耐久エポキシフレーク塗料 × 軽トラ1台 × 現場Square即時決済",
    moat: "1日完結の超高速施工による高回転オペレーションと、近隣住民への口コミ連鎖紹介による広告費ゼロ化。"
  },
  {
    regex: /wordunscrambler|scrabble|ramesh jha/i,
    subject: "スクラブル・単語パズル検索ポータル×アドセンス自動集金",
    domain: "アルファベットを入力するだけで可能な英単語一覧をミリ秒で表示する単語検索ツールポータル",
    prey: "スクラブルやワードゲームで勝ちたいプレイヤーや単語パズルの答えが分からず苛立つユーザーの解決欲",
    flaw: "大手辞書サイトが検索速度が遅くアナグラムや文字数指定の即時逆引きに特化していない死角",
    stealth: "超高速な単語インデックス検索エンジンを自作し、パズル関連のロングテールキーワードを全網羅してSEO上位を独占",
    stack: "高速辞書トポロジー検索 × 静的Web配信 × Google AdSense / プログラマティック広告配管",
    moat: "月間800万人のゲームプレイヤーによる自然検索流入と、サーバー費用月数万円で年商数億円を抜く圧倒的粗利率。"
  },
  {
    regex: /drone spraying|drone pilot|mike yoder/i,
    subject: "産業用ドローンによる農薬・除草剤空中散布受託実業",
    domain: "急斜面やぬかるみで大型トラクターが入れない広大農地に対し、大型ドローンで高速・均一に散布を代行する農業実業",
    prey: "炎天下での重労働散布による熱中症リスクと高齢化による深刻な労働力不足に悩む農家の切実な保身",
    flaw: "従来のトラクター散布が作物を踏み荒らし有人ヘリ散布はコストが高すぎて小中規模農家が使えない技術の空白地帯",
    stealth: "近隣農家に「1反だけ無料で試させてくれ」と持ち込み、半日の作業が15分で終わる圧倒的スピードを見せつけて即決年間契約",
    stack: "DJI産業用散布ドローン × RTK高精度GPS × 農業散布ライセンス × 面積当たり作業請負決済",
    moat: "農繁期の過密スケジュールを地域で独占する先行者ネットワークと、一度依頼した農家が絶対に手作業に戻れない圧倒的肉体解放。"
  },
  {
    regex: /atms|atm route|will butterton/i,
    subject: "個人飲食店・ナイトスポット向け店舗設置型ATMルートビジネス",
    domain: "現金決済のみのバーやダイナーのデッドスペース（1㎡）にATMを設置し、引き出し手数料を刈り取るルート実業",
    prey: "手持ちの現金が尽きたがカードが使えない飲食店で今すぐ現金を手に入れたい来店客の緊急調達欲",
    flaw: "大手銀行が店舗維持コストを嫌って街頭ATMを次々と撤退させる中個人店ではカード決済手数料を嫌い現金払いを維持している隙間",
    stealth: "夜間営業のバーのオーナーに「費用負担ゼロ・手数料の20%還元」で飛び込み交渉し、空きスペースに中古ATMを自力設置",
    stack: "認定中古ATM機 × 警備・保険ネットワーク × 週1回現金装填ルート × 引き出し手数料自動プール",
    moat: "店舗の一等地スペースを押さえる独占設置契約と、週1時間の巡回現金装填のみで回る完全不労キャッシュフロー。"
  },
  {
    regex: /cotton candy|vending machine|zach downey/i,
    subject: "全自動ロボット綿菓子自動販売機オペレーション",
    domain: "ショッピングモールやアミューズメント施設に設置し、客の目の前で精巧な花の形をした綿菓子を無人製造・販売する自販機実業",
    prey: "買い物中に退屈した子供を喜ばせたい親の財布とSNS映えする可愛いスイーツを手軽に体験したい若者の衝動買い欲",
    flaw: "従来のスイーツ店舗が高額な人件費と調理スペースを要するのに対しわずか1.5㎡の無人自販機で原価数十円の砂糖を高単価販売できること",
    stealth: "商業施設のフロア担当者にロボット製造の実演動画を見せて歩合家賃で直談判し、休日ファミリー客のメイン動線を押さえて設置",
    stack: "全自動綿菓子製造ロボット自販機 × キャッシュレス決済端末 × 遠隔在庫・エラー監視IoT",
    moat: "商業施設の一等通路を押さえるロケーション利権と、人件費ゼロで原価率10%未満のスイーツを定価販売する利益率。"
  },
  {
    regex: /writestack|substack.*schedule|schedule notes|orel zilberman/i,
    subject: "Substack専用Notes予約投稿マイクロSaaS",
    domain: "公式機能に存在しない「Substack Notesの予約投稿」だけに特化し、執筆者のフォロワー獲得を自動化する単機能ツール",
    prey: "毎日リアルタイムでNotesを投稿する時間がなく読者獲得のゴールデンタイムを逃して焦るSubstackクリエイターの工数摩擦",
    flaw: "Substack公式が長文記事の配信機能にリソースを集中させマイクロブログの予約機能を長期間放置していた死角",
    stealth: "TwitterやSubstack上で「Notesの予約投稿ができなくて困っている人」を検索して直接リプライを送り、初期有料会員を獲得",
    stack: "Chrome拡張機能/Next.js × Substack内部API連携 × Stripe月額サブスクリプション",
    moat: "Substackクリエイターの日常投稿ルーティンへの完全定着と、月額数百円〜数千円という「解約する理由がない」低価格の維持。"
  },
  {
    regex: /invoice|factur-x|zugferd|xrechnung|ubl/i,
    subject: "欧州電子インボイス規格統合変換APIプラットフォーム",
    domain: "Factur-X、ZUGFeRD、XRechnung、UBL等の複雑な電子インボイス規格を単一APIで相互変換・検証するB2B決済基盤",
    prey: "欧州各国の電子インボイス義務化に伴い自社システムを各国独自規格に対応させる膨大な開発工数と法改正リスクに怯える企業",
    flaw: "大手ERPシステムが各国の個別フォーマット改定に追いつけず高額な導入コンサルティング費用を要求していること",
    stealth: "主要フォーマットの変換ロジックを単一エンドポイントで呼び出せるAPIを公開し、開発者ドキュメントと無料枠でエンジニアを囲い込み",
    stack: "高速XML/PDFパーサー × 各国税制バリデーションエンジン × Stripe従量課金API",
    moat: "一度企業の基幹請求パイプラインに組み込まれたら乗り換えが不可能な極めて高いスイッチングコスト。"
  },
  {
    regex: /instagram.*audience|extract emails|iglead/i,
    subject: "Instagramオーディエンス営業リード抽出ツール",
    domain: "特定アカウントのフォロワーや投稿エンゲージメント層から公開メール・電話番号を高速抽出し、B2Bリスト化するツール",
    prey: "テレアポや手作業のDM送信で門前払いされ自社商品に興味を持つホットな見込み客リストが枯渇している営業チームの焦燥感",
    flaw: "従来の企業データベースが静的な会社代表アドレスしか持たずSNS上で活発に行動している決裁者に直接届かない死角",
    stealth: "Instagramマーケティング担当者が集まるコミュニティで「競合フォロワーを1分でリスト化するデモ」を実演し有料ライセンスを即売",
    stack: "分散スクレイピングプロキシ × データエンリッチメントエンジン × 月額SaaS課金",
    moat: "プラットフォームの仕様変更に即座に追従するクローリング基盤と、営業リスト作成工数を99%削減する圧倒的即効性。"
  },
  {
    regex: /time track|timodesk|remote team/i,
    subject: "グローバル分散チーム向けスマート工数・タイムトラッキングSaaS",
    domain: "世界中のリモートワーカーの実働時間とタスク進捗をストレスなく可視化・集計する軽量タイムトラッカー",
    prey: "スタッフが本当に稼働しているか見えず不安な経営者と監視されすぎて息が詰まるスタッフの間の不信感と工数管理の摩擦",
    flaw: "既存の監視ツールが画面キャプチャを頻繁に撮るなど過度な監視でスタッフを疲弊させ離職を招いているディストピア設計",
    stealth: "過度な監視を排し、成果物と直結したシンプルな打刻UIを提供してスタートアップ層の口コミを獲得",
    stack: "デスクトップ常駐アプリ × リアルタイム稼働集計API × Stripeシート単位月額サブスク",
    moat: "毎月の給与計算・請求書発行データと直結しているため、一度導入したら他社ツールへの移行が極めて面倒になる業務定着性。"
  },
  {
    regex: /housing abroad|colhab|trusted housing/i,
    subject: "留学生・海外移住者向け審査済み住居マッチング支援ポータル",
    domain: "渡航前に現地の信頼できる住居をローカル専門家のサポート付きで事前確保できる海外賃貸マッチング",
    prey: "言葉も通じない異国の地で詐欺物件を掴まされたり現地到着後に住む家がないという留学生・移住者の極限の恐怖",
    flaw: "現地の不動産ポータルが現地銀行口座や現地の保証人を要求し渡航前の外国人を門前払いしている岩盤規制",
    stealth: "渡航前の留学生向けオンラインコミュニティで直接相談に乗り、審査済み物件の予約金を手数料として仲介",
    stack: "海外物件リスティングDB × 多言語サポートデスク × 予約金エスクロー決済配管",
    moat: "現地の信頼できる家主ネットワークと、大学や留学エージェントからの継続的な新入生紹介ルート。"
  },
  {
    regex: /track daily prices|priceproven|verify if discounts/i,
    subject: "EC商品価格推移追跡・偽装セール警告ブラウザ拡張機能",
    domain: "ネット通販の価格推移を全自動で記録し、販売者の「値上げ後偽装割引」を瞬時に暴く価格監視ツール",
    prey: "二重価格表示やガセ割引に騙されて損をしたくない賢いオンラインショッパーの防衛本能",
    flaw: "大手ECモールが出品者の売り上げ優先で不当な値上げ後セールを黙認しているプラットフォームの構造的癒着",
    stealth: "主要ECの価格履歴を常時クローリングして最安値をグラフ化し、ブラウザ拡張機能で買い物客に直接警告してアフィリエイト報酬を回収",
    stack: "EC価格スクレイパー × Chrome拡張機能 × Amazon/主要ECアフィリエイト配管",
    moat: "数百万点に及ぶ商品の過去価格履歴データベースと、ユーザーのブラウザに常駐して購買動線を全量抑える関所。"
  },
  {
    regex: /photo sharing|kamero|ai-powered photo/i,
    subject: "イベント・結婚式特化AI顔認識・写真即時仕分け共有プラットフォーム",
    domain: "イベントでプロカメラマンが撮影した大量の写真を、参加者の顔認識AIで秒速仕分けして個別配信する基盤",
    prey: "イベント後に何千枚もの写真の中から自分が写っているものを探す苦痛とカメラマンの写真納品・仕分けの手間",
    flaw: "Googleフォト等の汎用クラウドがイベント参加者への個別即時仕分けに対応しておらず手動共有の限界があること",
    stealth: "自撮りを1枚送るだけで写っている写真を全自動抽出するデモをイベント会場で披露し、ブライダル業者へ直販",
    stack: "顔認識AIモデル × 高速CDN画像配信 × イベント単位課金Stripe決済",
    moat: "ブライダル事業者やイベント制作会社のオペレーションへの組み込みと、参加者の感動体験による現場口コミ。"
  },
  {
    regex: /directory|backlinks|directoryfire/i,
    subject: "Webマスター・個人開発者向け被リンク獲得SEO特化ディレクトリ",
    domain: "新規立ち上げサイトに高品質な初期被リンクとドメインオーソリティを提供し、SEO順位を底上げする厳選ディレクトリ",
    prey: "サイトを公開したのにGoogleにインデックスされず初期のドメイン評価がゼロで絶望する個人開発者の焦燥感",
    flaw: "既存のディレクトリサイトがスパムリンクでペナルティを受け安全かつ即効性のある掲載先が存在しない死角",
    stealth: "自身が管理する高DRドメインを活用し、Product HuntやIndie Hackersで「安全な初期被リンク集」として有料リスティングを直販",
    stack: "Next.js静的生成 × 有料審査Stripe決済 × 被リンク自動チェッカー",
    moat: "蓄積されたドメイン評価（DR）そのものが参入障壁となり、新規サイトが立ち上がるたびに審査料を回収する自動関所。"
  },
  {
    regex: /job search|talent|talentexafrica/i,
    subject: "地域・新興市場特化AIジョブマッチングプラットフォーム",
    domain: "地域固有のスキル要件や採用慣行に特化し、求職者と成長企業をAIで高速マッチングする特化型求人基盤",
    prey: "グローバル求人サイトでは地元の即戦力が見つからず面接のドタキャンやミスマッチに苦しむ現地企業の採用担当者",
    flaw: "IndeedやLinkedInが画一的な職種分類しか持たず特定地域のスキル格差やローカルな職務実態に対応できていないこと",
    stealth: "地元のテックコミュニティや大学と提携して優秀な求職者プールを先行確保し、人材不足の企業へ直接候補者を推薦",
    stack: "レジュメ解析AI × ローカル求人DB × 企業向け成功報酬/求人掲載課金",
    moat: "現地コミュニティに根ざした候補者プールと、他社が容易に真似できないローカル採用文脈への適合性。"
  },
  {
    regex: /b2b platform|neutral intelligence|itprofiles/i,
    subject: "中立的ITベンダー・企業プロファイルインテリジェンス基盤",
    domain: "広告費による偏向ランキングを排除し、公平な客観データと導入実績で最適なITベンダーを選定できるB2Bプラットフォーム",
    prey: "広告料を払ったベンダーばかりが上位表示される大手レビューサイトに不信感を抱くIT導入担当者のリスク恐怖",
    flaw: "G2やCapterraなどの巨大レビューサイトが広告課金モデルに依存し中立な技術評価を放棄しているプラットフォームの構造的癒着",
    stealth: "オープンソースや公開データを集約してバイアスのない客観スコアを算出し、企業の情シス担当者コミュニティで共有",
    stack: "企業プロファイルDB × 自動データ統合クローラー × プレミアムリサーチレポート課金",
    moat: "中立的なデータ信頼性と、企業の高額IT調達の意思決定プロセスに深く入り込むことによる情報関所。"
  },
  {
    regex: /video|recording|screen|clip|transcrib/i,
    subject: "特化型動画制作・画面キャプチャ・文字起こしツール",
    domain: "長時間の動画から要所クリップを自動抽出したり、爆速で画面録画を共有する特化型映像ソリューション",
    prey: "動画編集ソフトの複雑なタイムライン操作に挫折し数時間の手作業を数分で終わらせたいコンテンツ制作者の時間不足",
    flaw: "多機能編集ソフトがプロ向け機能ばかりを優先し単一目的の自動化を放置していること",
    stealth: "SNSで生成ビフォーアフターの短尺動画を投稿し、実演デモで初期クリエイターを即時獲得",
    stack: "WebAssembly/ローカルエンコーダー × 音声認識API × 月額サブスクリプション課金",
    moat: "動画制作ワークフローへの定着と、蓄積されたプロジェクトデータによる解約防止壁。"
  },
  {
    regex: /newsletter|email|mail|substack|cold email/i,
    subject: "高到達率Eメール配信・ニュースレター特化プラットフォーム",
    domain: "迷惑メール判定を回避し、高い開封率と購読者エンゲージメントを維持するEメール配信基盤",
    prey: "苦労して書いたメールがプロモーションタブや迷惑フォルダに振り分けられ見込み客に届かないマーケターの焦燥感",
    flaw: "大手一斉配信サービスがIPプールの共有によりスパム業者と同居させられ真面目な配信者の到達率を落としていること",
    stealth: "専用ウォームアップ機能と個別IP提供を武器に、個人ニュースレター運営者のコミュニティで直接勧誘",
    stack: "独自SMTP配信サーバー × 送信ドメイン認証（DKIM/DMARC） × Stripe月額プラン",
    moat: "蓄積された購読者リストデータと、一度設定したら切り替えが極めてリスクの高い送信ドメイン配管。"
  },
  {
    regex: /seo|keyword|backlink|ranking|serp/i,
    subject: "検索順位追跡・競合キーワード分析SEOインテリジェンス",
    domain: "Google検索結果の順位変動や競合サイトの被リンク動向をリアルタイムで可視化する特化SEOツール",
    prey: "急な順位下落で売上が激減する恐怖に怯え競合の施策を毎日手動で調べるSEO担当者の工数消耗",
    flaw: "巨大SEOツールが高額化しすぎて特定キーワードの追跡だけに特化したい中小企業が使えないこと",
    stealth: "手頃な価格の単機能順位追跡ツールとしてProduct HuntやTwitterでローンチし、個人アフィリエイターを獲得",
    stack: "SERPスクレイピングプロキシ × 時系列順位DB × Stripe月額サブスクリプション",
    moat: "長期間蓄積されたキーワード順位推移データと、検索アルゴリズム変更時の即時アラート配管。"
  },
  {
    regex: /ecommerce|shopify|amazon|dropship|store/i,
    subject: "ECストア売上最適化・越境物販支援プラットフォーム",
    domain: "カート離脱の防止や商品ページのCVR向上、在庫同期を自動化するEC特化ソリューション",
    prey: "広告費を高騰させながら集客してもカゴ落ちで売上を逃し利益が残らないネットショップオーナーの痛み",
    flaw: "汎用ECプラットフォームの標準機能が不親切で専門のプラグインを自前で導入・連携する手間が大きいこと",
    stealth: "Shopify App Storeで単機能アプリをリリースし、無料プランでインストール数を稼いで高機能を有料化",
    stack: "Shopify API連携 × 高速チェックアウトUI × アプリ内課金サブスクリプション",
    moat: "ストアの注文データ・顧客データと密結合し、アンインストールすると即座に売上が落ちる心理的ロックイン。"
  },
  {
    regex: /fitness|gym|workout|timer|health/i,
    subject: "ワークアウト・ジム特化型インターバルトレーニング基盤",
    domain: "過酷なトレーニング中に視線や操作を奪わず、音声と大画面表示でインターバルを正確に刻むフィットネスツール",
    prey: "スマホのタイマー操作で集中が途切れインターバルの管理がルーズになってトレーニング効果が下がるアスリートの不満",
    flaw: "汎用タイマーアプリが広告まみれで操作性が悪く高強度インターバルトレーニングに最適化されていないこと",
    stealth: "CrossFitや格闘技ジムのコミュニティで無料配布し、現場のトレーナーから直接フィードバックを得て熱狂的ファンを形成",
    stack: "PWA/ネイティブアプリ × ウェアラブル端末連携 × 買い切り/Pro年額課金",
    moat: "毎日のトレーニングログの蓄積と、ジム現場での習慣化による解約不能な日常ルーティン化。"
  },
  {
    regex: /game|gaming|roblox|minecraft/i,
    subject: "ゲーム開発者向けアセット・アイテム経済最適化プラットフォーム",
    domain: "ゲーム内アイテムの価値計算やプレイヤーコミュニティの運営を支援する特化型ゲーミングソリューション",
    prey: "アイテム課金バランスの調整に失敗してユーザーが過疎化することを恐れるインディーゲーム開発者",
    flaw: "大手ゲームエンジンが高度な物理演算に注力する一方インディー開発者が必要とするアイテム経済設計ツールを軽視していること",
    stealth: "DiscordやRoblox開発者フォーラムで無料の計算ツールを公開し、開発者の間でデファクトスタンダード化",
    stack: "高速シミュレーションエンジン × Discordボット連携 × パトロン/プレミアム課金",
    moat: "ゲームタイトルごとの熱狂的なコミュニティと、プレイヤー間で共有される攻略データベースの先行独占。"
  },
  {
    regex: /mediafast|marketing on reddit|marketing on linkedin|marketing on x|grow and do marketing/i,
    subject: "複数SNS（Reddit/LinkedIn/X/Bluesky）マーケティング成長自動化ツール",
    domain: "RedditやLinkedIn、X等の複数SNSでのアカウント育成とリード獲得を自動化・効率化する特化成長エンジン",
    prey: "プラットフォームごとに異なる文脈で毎日手動投稿・リプライを繰り返す工数に疲弊している創業者やマーケターの焦燥感",
    flaw: "既存のSNS管理ツールが単なる予約投稿に留まりアルゴリズムに最適化したフォロワー獲得やエンゲージメント自動化に対応していない死角",
    stealth: "Indie HackersやRedditの創業者コミュニティで自作ツールによる成長実績を共有し、初期ユーザーを獲得",
    stack: "各SNS公式/内部API連携 × コンテンツスケジューリングエンジン × Stripe月額課金",
    moat: "複数プラットフォームを横断した投稿データとエンゲージメント最適化ロジックの蓄積。"
  }
];

function matchCategory(text) {
  if (!text) return null;
  for (const cat of CATEGORY_PATTERNS) {
    if (cat.regex.test(text)) return cat;
  }
  return null;
}

function resolveFactBasedProfile(ent) {
  const cleanEntName = clean((ent.name || "").replace(/\s*\([^)]*\)/, ""));
  const rawId = (ent.id || "").toLowerCase();
  const money = extractMoneySignal(ent.name, ent.lootBlueprint?.stealthEntry, ent.historicalFinancials, ent.pnl);
  const moneyPrefix = money ? ("【" + money + "】") : "";

  // 1. Check observations & stream for real facts
  const obs = (ent.observations || []).concat((ent.observationsStream || []).map(s => s.text || ""));
  let ebizArticle = obs.find(o => typeof o === "string" && (o.startsWith("記事要約:") || o.startsWith("プロフィール記事:"))) || "";
  if (ebizArticle) {
    ebizArticle = clean(ebizArticle.replace(/^記事要約:\s*|^プロフィール記事:\s*/, ""));
  }
  let indieExpl = obs.find(o => typeof o === "string" && (o.startsWith("Indie Hackers公開説明:") || o.startsWith("Indie Hackers listing:"))) || "";
  if (indieExpl) {
    indieExpl = clean(indieExpl.replace(/^Indie Hackers(公開説明| listing):\s*/, ""));
  }
  let title = "";
  for (const o of obs) {
    if (typeof o !== "string") continue;
    const m = o.match(/title=([^;]+)/i);
    if (m && m[1] && !m[1].includes("タイトル未取得") && !m[1].includes("HTTP ERROR")) {
      title = clean(m[1]);
      break;
    }
  }

  const corpus = clean(cleanEntName + " " + ebizArticle + " " + indieExpl + " " + title + " " + rawId).toLowerCase();

  // Try matching category patterns
  const cat = matchCategory(corpus);
  if (cat) {
    const subject = cat.subject;
    const domain = cat.domain;
    const prey = cat.prey;
    const flaw = cat.flaw;
    const stealth = cat.stealth;
    const stack = cat.stack;
    const pattern = cleanEntName + "式" + subject + "・高粗利配管";
    const moat = cat.moat;
    const tagline = buildTagline(moneyPrefix, cleanEntName, domain + "。大手の死角を突き現金を直収する特化モデル。");

    return { cleanEntName, subject, domain, prey, flaw, stealth, stack, pattern, moat, tagline };
  }

  // Fallback using raw facts (indieExpl or title) - NEVER use generic phrases!
  let customSubject = cleanEntName + "特化サービス";
  let customDomain = cleanEntName + "のWebプラットフォーム";
  if (indieExpl && indieExpl.length > 5) {
    customSubject = cleanEntName + "（" + indieExpl.slice(0, 35) + "）";
    customDomain = cleanEntName + "の特化型Webプラットフォーム";
  } else if (title && title.length > 5) {
    customSubject = cleanEntName + "（" + title.slice(0, 35) + "）";
    customDomain = cleanEntName + "の特化型ツール";
  }

  const subject = customSubject;
  const domain = customDomain;
  const prey = cleanEntName + "の利用者が直面する作業工数の増大や機会損失の苦痛";
  const flaw = "大手競合が汎用機能ばかりを詰め込み、" + cleanEntName + "のように単一目的に直球で応える特化ツールを提供できていない死角";
  const stealth = "創業者が自身の課題から最小限のMVPを構築し、関連コミュニティで直接披露して初期ユーザーを獲得";
  const stack = cleanEntName + "専用Web基盤 × モダンAPI × セルフサーブ決済配管";
  const pattern = cleanEntName + "式特化導入・高粗利配管";
  const moat = "顧客の日常ワークフローへの定着と、" + cleanEntName + "固有の特化機能による他社乗り換え障壁。";
  const tagline = buildTagline(moneyPrefix, cleanEntName, domain + "を展開し、手堅く現金を回収する特化モデル。");

  return { cleanEntName, subject, domain, prey, flaw, stealth, stack, pattern, moat, tagline };
}

function getEntityProfile(ent) {
  const cleanEntName = clean((ent.name || "").replace(/\s*\([^)]*\)/, ""));

  // 1. Master 340
  if (master340.has(ent.id)) {
    const m = master340.get(ent.id);
    const domain = m.whatItDoes || (cleanEntName + "特化ソリューション");
    const prey = m.targetPrey || (cleanEntName + "が解決する顧客の切実な課題");
    const flaw = m.structuralFlaw || (cleanEntName + "が突く既存プレイヤーの死角");
    const stealth = m.stealthEntry || (cleanEntName + "の初期トラクション獲得ログ");
    const stack = m.pipelineStack || "独自技術スタック × 最適化オペレーション";
    const pattern = m.architecturePattern || (cleanEntName + "式高収益配管モデル");
    const moat = m.moatDescription || (cleanEntName + "の不可逆なスイッチングコストと顧客監禁配管。");
    const oneLineReason = formatOneLineReason(cleanEntName, cleanEntName, domain, flaw, prey);
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
      moat,
      whatItDoes: m.whatItDoes,
      targetPrey: prey,
      structuralFlaw: flaw,
      stealthEntry: stealth,
      incumbentDilemma: m.incumbentDilemma || ("既存の大手は高コスト体質に縛られ、" + cleanEntName + "の特化モデルには対抗できない。"),
      pipelineStack: stack,
      architecturePattern: pattern,
      tagline: m.tagline,
      blindspot: m.blindspot || flaw,
      oneLineReason: m.oneLineReason || oneLineReason
    };
  }

  // 2. Pristine Japanese Raw Data from rawMap
  const raw = rawMap.get(ent.id);
  const rawWhat = raw?.essence?.whatItDoes || "";
  const rawMoat = raw?.strategy?.moatDescription || "";
  const hasJapaneseRawWhat = /[ぁ-んァ-ヶ]/.test(rawWhat) && !rawWhat.includes("特化型課題解決ソリューション") && !rawWhat.includes("現場のボトルネック");
  const hasJapaneseRawMoat = /[ぁ-んァ-ヶ]/.test(rawMoat) && !rawMoat.includes("独自の現場密着ワークフロー");

  if (hasJapaneseRawWhat && hasJapaneseRawMoat) {
    const whatItDoes = rawWhat;
    const moat = rawMoat;
    const money = extractMoneySignal(ent.name, raw?.lootBlueprint?.stealthEntry, ent.historicalFinancials, ent.pnl);
    const moneyPrefix = money ? ("【" + money + "】") : "";

    let tagline = raw.tagline;
    if (!tagline || tagline.includes("現場のボトルネック") || tagline.includes("特定ニッチ産業・ツールの網羅型") || tagline.includes("…")) {
      tagline = buildTagline(moneyPrefix, cleanEntName, whatItDoes);
    }

    const prey = raw.essence?.targetCustomer || (cleanEntName + "が狙う顧客の切実な痛みと業務上の損失");
    const flaw = raw.strategy?.incumbentDilemma || ("大手競合が汎用機能に囚われ、" + cleanEntName + "の単一課題特化モデルに追随できないこと");
    const stealth = raw.lootBlueprint?.stealthEntry || (cleanEntName + "の初期トラクション獲得ログ");
    const stack = raw.pipelineStack || raw.lootBlueprint?.pipelineStack || (cleanEntName + "専用インフラ × 独自特化ロジック");
    const pattern = raw.architecturePattern || raw.lootBlueprint?.architecturePattern || (cleanEntName + "式特化収益配管");
    const oneLineReason = formatOneLineReason(cleanEntName, cleanEntName, whatItDoes.slice(0, 30), flaw, prey);

    return {
      cleanEntName,
      subject: cleanEntName,
      domain: whatItDoes.slice(0, 45),
      prey,
      flaw,
      stealth,
      stack,
      pattern,
      moat,
      whatItDoes,
      targetPrey: prey,
      structuralFlaw: flaw,
      stealthEntry: stealth,
      incumbentDilemma: flaw,
      pipelineStack: stack,
      architecturePattern: pattern,
      tagline,
      blindspot: flaw,
      oneLineReason
    };
  }

  // 3. Dynamic Category / Fact Resolution
  const fact = resolveFactBasedProfile(ent);
  const whatItDoes = "【" + fact.subject + "】" + fact.domain + "を展開し、" + fact.prey + "を解消して手堅い現金を回収する" + cleanEntName + "の高収益ビジネスモデル。";
  const targetPrey = cleanEntName + "が直撃する顧客急所：" + fact.subject + "の領域において、" + fact.prey + "。";
  const structuralFlaw = cleanEntName + "（" + fact.subject + "）の参入余地：" + fact.flaw + "。既存プレイヤーが手を出せないこの構造的死角を突いている。";
  const stealthEntry = cleanEntName + "の初動突破ログ（" + fact.subject + "）: " + fact.stealth + "。";
  const incumbentDilemma = "既存の大手企業は自社の高コスト体質や包括プラットフォームに縛られ、" + cleanEntName + "の" + fact.subject + "に特化した機動的な低コスト展開には対抗できない。";
  const pipelineStack = cleanEntName + "固有スタック: " + fact.stack;
  const architecturePattern = fact.pattern;
  const blindspot = cleanEntName + "における死角の力学：" + fact.flaw + "。";
  const oneLineReason = formatOneLineReason(cleanEntName, fact.subject, fact.domain, fact.flaw, fact.prey);

  return {
    cleanEntName,
    subject: fact.subject,
    domain: fact.domain,
    prey: fact.prey,
    flaw: fact.flaw,
    stealth: fact.stealth,
    stack: fact.stack,
    pattern: fact.pattern,
    moat: fact.moat,
    whatItDoes,
    targetPrey,
    structuralFlaw,
    stealthEntry,
    incumbentDilemma,
    pipelineStack,
    architecturePattern,
    tagline: fact.tagline,
    blindspot,
    oneLineReason
  };
}

function cureEvidenceCards(cards, profile, ent) {
  if (!Array.isArray(cards)) return cards;
  return cards.map(card => {
    if (!card || typeof card !== "object") return card;
    const cleanCard = { ...card };
    const entName = profile.cleanEntName;
    const type = card.type || "SMOKING_GUN";

    if (type === "SMOKING_GUN") {
      cleanCard.title = "【通帳レントゲン】" + entName + "の現金着金・原価構造実額";
      cleanCard.punchline = "【着金実額】" + entName + "が" + profile.domain.slice(0, 25) + "で回収する高収益キャッシュフロー";
      cleanCard.details = [
        "【事業の正体】: 【" + profile.subject + "】" + profile.domain + "を展開し、" + profile.prey.slice(0, 35) + "を解消して現金を回収。",
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
        "【継続の力学】: " + profile.moat.slice(0, 50)
      ];
      cleanCard.snippet = "【参入障壁・堀の正体】" + entName + "は" + profile.pattern.slice(0, 35) + "を構築。" + profile.moat.slice(0, 50);
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
    }

    return cleanCard;
  });
}

function sanitizeAny(obj, profile) {
  if (typeof obj === "string") {
    let s = obj;
    // Eradicate every single lazy generic template completely!
    if (s.includes("手作業による工数浪費と自社AI開発の失敗に怯え")) {
      s = s.replace(/手作業による工数浪費と自社AI開発の失敗に怯え[^\s。]*([。]?)/g, profile.targetPrey);
    }
    if (s.includes("Google検索でSEOスパム記事に埋もれた中から")) {
      s = s.replace(/Google検索でSEOスパム記事に埋もれた中から[^\s。]*([。]?)/g, profile.targetPrey);
    }
    if (s.includes("本当に使を解消し") || s.includes("本当に使")) {
      s = s.replace(/本当に使を解消し/g, profile.prey.slice(0, 30) + "を解消し")
           .replace(/本当に使/g, "真の価値");
    }
    if (s.includes("巨大ITが汎用APIの提供に留まる中")) {
      s = s.replace(/巨大ITが汎用APIの提供に留まる中[^\s。]*([。]?)/g, profile.structuralFlaw);
    }
    if (s.includes("特定ニッチ産業・ツールの網羅型ディレクトリポータル")) {
      s = s.replace(/特定ニッチ産業・ツールの網羅型ディレクトリポータル/g, profile.domain);
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
    if (s.includes("現場のボトルネックを解消し、少数精鋭で手堅く現金を回収する")) {
      s = profile.tagline;
    }
    if (s.includes("独自の現場密着ワークフローと、一度業務に組み込んだら乗り換えが面倒になる高いスイッチングコスト")) {
      s = profile.moat;
    }
    if (s.includes("特化型課題解決ソリューションを展開し")) {
      s = profile.whatItDoes;
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

console.log("4. Executing surgical precision cure across all 3,341 entities...");

for (let i = 0; i < currentEntities.length; i++) {
  const ent = currentEntities[i];
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

  if (!ent.strategy) ent.strategy = {};
  ent.strategy.blindspot = profile.blindspot;
  ent.strategy.incumbentDilemma = profile.incumbentDilemma;
  ent.strategy.moatDescription = profile.moat;
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

  if (ent.evidenceCards) {
    ent.evidenceCards = cureEvidenceCards(ent.evidenceCards, profile, ent);
  }

  // Fully sanitize every field recursively
  sanitizeAny(ent, profile);
}

console.log("5. Saving entities-index.json...");
fs.writeFileSync(indexPath, JSON.stringify(currentEntities, null, 2), "utf8");
console.log("Saved successfully!");
