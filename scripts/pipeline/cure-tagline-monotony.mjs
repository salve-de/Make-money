import fs from "fs";

const INDEX_PATH = "data/entities-index.json";
const entities = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));

console.log("[START] Total entities to process:", entities.length);

function extractRawDescription(e) {
  let desc = "";
  if (e.observations && Array.isArray(e.observations)) {
    for (const o of e.observations) {
      if (typeof o === "string") {
        if (o.includes("Indie Hackers公開説明:")) {
          desc = o.replace("Indie Hackers公開説明:", "").trim();
          break;
        }
        if (o.includes("title=")) {
          const m = o.match(/title=([^;\n]+)/);
          if (m && !desc) desc = m[1].trim();
        }
      }
    }
  }
  if (!desc && e.description && e.description.length > 10 && e.description !== "特定領域特化型クラウドサービス") {
    desc = e.description;
  }
  return desc;
}

function extractNicheLabel(e) {
  let niche = (e.profileBusinessLabel || "").trim();
  if (!niche || niche === "Other") {
    const match = (e.name || "").match(/\(([^)]+)\)/);
    if (match) niche = match[1].trim();
  }
  return niche;
}

function buildExecutiveTagline(e) {
  const name = e.name || "";
  const niche = extractNicheLabel(e);
  const rawDesc = extractRawDescription(e);
  const rev = e.pnl && e.pnl.revenueLabel ? e.pnl.revenueLabel : "高粗利ストック";
  const opMargin = e.pnl && e.pnl.operatingMargin ? e.pnl.operatingMargin : 60;
  const grossMargin = e.pnl && e.pnl.grossMargin ? e.pnl.grossMargin : 80;

  const combined = (name + " " + niche + " " + rawDesc + " " + (e.url || "")).toLowerCase();

  // 1. オフライン・物理実業の急所判定
  if (combined.includes("atm")) {
    return `店舗やバーのデッドスペースにATM端末を設置し、現金の引き出し手数料から毎月確実に月商${rev}の不労チャリンを抜く無人配管`;
  }
  if (combined.includes("lemonade")) {
    return `野外フェスや繁華街に生搾りスタンドを出店し、原価数十円のレモネードを高単価で即決販売して月商${rev}を叩き出す高粗利露店`;
  }
  if (combined.includes("vending machine")) {
    return `オフィスや工場の休憩室に自動販売機を設置し、週数時間の補充作業だけで月商${rev}を自動回収する無人ルートビジネス`;
  }
  if (combined.includes("drone") && (combined.includes("spray") || combined.includes("farm") || combined.includes("agri"))) {
    return `トラクターが入れない急斜面や農地をドローンで代行散布し、農家の重労働苦痛を切除して月商${rev}を抜く農業DX請負`;
  }
  if (combined.includes("appliance rental") || combined.includes("rental")) {
    return `単身赴任者や学生に向けて生活家電をセット貸し出しし、原価回収後も利益が続く月商${rev}のストックリース要塞`;
  }
  if (combined.includes("toilet") || combined.includes("portable restroom")) {
    return `建設現場やイベント会場向けに仮設トイレを定期リース・清掃巡回し、月商${rev}の継続利用料を吸い上げる現場インフラ`;
  }
  if (combined.includes("burrito") || combined.includes("food truck") || combined.includes("restaurant")) {
    return `テイクアウト需要の高い立地に特化し、原価率と廃棄ロスを極限まで絞り込んで月商${rev}を売り上げる高回転フード事業`;
  }
  if (combined.includes("cleaning") || combined.includes("wash") || combined.includes("trash")) {
    return `地元の法人オフィスや商業施設と定期清掃契約を結び、リピート率90%超で月商${rev}（手残り純利${opMargin}%）を抜く地域密着要塞`;
  }
  if (combined.includes("coin") && (combined.includes("snap") || combined.includes("identif"))) {
    return `写真1枚で希少コインの真贋と相場価格をAI判定させ、熱狂的コレクターから月商${rev}の高額課金を総取りする鑑定アプリ`;
  }

  // 2. 特化型AI・ソフトウェアツールの急所判定
  if (combined.includes("remote job") || combined.includes("goremotejob")) {
    return `期限切れや偽リモート求人を徹底排除し、世界中の検証済みフルリモート案件のみを届けて月商${rev}を抜く特化ジョブボード`;
  }
  if (combined.includes("coding agent") || combined.includes("crewtower")) {
    return `複数タブで並走するAIエージェントの待機通知を一元化し、エンジニアの中断コストを切除して月商${rev}を抜く常駐配管`;
  }
  if (combined.includes("geminilaunch") || (combined.includes("launch") && combined.includes("custom url"))) {
    return `ChatGPTやGeminiで生成したWebサイトのzip解凍やDNS設定を不要化し、1クリックで独自ドメイン公開させて月商${rev}を回収するホスティング`;
  }
  if (combined.includes("calorie") || combined.includes("caloi")) {
    return `毎日の食事写真を撮るだけでAIがカロリー・PFCを即時自動計算し、ダイエッターから月商${rev}の有料課金を回収する健康管理アプリ`;
  }
  if (combined.includes("tour operator") || combined.includes("softrip")) {
    return `複数日催行ツアー会社が抱える複雑な旅程・予約・在庫管理の手作業地獄を解消し、旅行事業者から月商${rev}の基幹B2Bサブスクを抜く特化SaaS`;
  }
  if (combined.includes("song") || combined.includes("meloletter")) {
    return `大切な人のエピソードからAIで完全オーダーメイド楽曲を自動生成し、月商${rev}のギフト課金を集金するパーソナル音楽SaaS`;
  }
  if (combined.includes("pitchmap") || combined.includes("discover people")) {
    return `現在地周辺で今リアルタイムに発生している商談・業務ニーズを地図上に可視化し、近隣の案件受注を支援して月商${rev}を抜く位置連動マップ`;
  }
  if (combined.includes("cold call") || combined.includes("sales practice")) {
    return `リアルなAI音声で新規開拓コールドコールの模擬練習を無制限に行わせ、営業組織から月商${rev}の研修費を抜くセールスBot`;
  }
  if (combined.includes("calculator") || combined.includes("fasting")) {
    return `健康管理や断食に特化した計算ツールを無料提供し、SEOトラフィックと広告・関連商材リンクから月商${rev}を吸い上げる計算メディア`;
  }
  if (combined.includes("whatnot") || combined.includes("live seller")) {
    return `ライブコマースの熱狂オークションでコレクター向け希少品を高速競り落としさせ、月商${rev}を売り抜くライブ転売配管`;
  }
  if (combined.includes("3d print")) {
    return `既製品が廃盤になったニッチ交換パーツの需要を掴み、家庭用3Dプリンターから受注生産で月商${rev}・粗利${grossMargin}%を叩き出すデジタル町工場`;
  }
  if (combined.includes("arbitrage") || combined.includes("resell") || combined.includes("walmart")) {
    return `大手量販店のセール品とAmazon相場の価格差を高速検知し、FBA配管へ流し込んで月商${rev}・月利${opMargin}%を自動回収する小売アービトラージ`;
  }
  if (combined.includes("ghostwrit")) {
    return `多忙な経営者の思想・事業文脈を完コピしてSNS発信を代行し、完全一人・原価ゼロで月商${rev}・手残り純利${opMargin}%を抜く高単価受託要塞`;
  }
  if (combined.includes("newsletter") || combined.includes("substack")) {
    return `業界特化の一次情報を週1本キュレーションし、専門職の購読料とスポンサー枠で月商${rev}・粗利${grossMargin}%を抜く有料ニュースレター`;
  }
  if (combined.includes("mac app") || combined.includes("desktop app")) {
    return `大手の不要なクラウド強制・高額サブスク化の隙を突き、買い切りライセンスとローカル完結で月商${rev}を抜く個人開発ユーティリティ`;
  }

  // 3. rawDescから具体的なプロダクト機能を直接抽出してユニークタグラインを合成
  if (rawDesc && rawDesc.length > 15) {
    const cleanDesc = rawDesc
      .replace(/^[0-9A-Za-zs.,-]+(is|exists to|helps|allows|provides|builds)\s+/i, "")
      .replace(/[\n\r]+/g, " ")
      .trim();

    const shortCore = cleanDesc.slice(0, 45);
    const targetLabel = niche || name.replace(/\([^)]+\)/, "").trim();

    return `「${targetLabel}」領域における「${shortCore}」の需要を掴み、月商${rev}（営業利益率${opMargin}%）のキャッシュフローを着金させる特化型モデル`;
  }

  // 4. フォールバックも社名とニッチを組み込んで完全にユニーク化
  const targetDomain = niche || name.replace(/\([^)]+\)/, "").trim();
  return `「${targetDomain}」に特化した独自の提供価値と高粗利（${grossMargin}%）の収益配管を構築し、月商${rev}を手堅く回収する自立型ビジネス`;
}

let modifiedCount = 0;
const seenTaglines = new Map();

for (let i = 0; i < entities.length; i++) {
  const e = entities[i];
  const oldTagline = e.tagline || "";

  // 既存の画一テンプレート、または重複しているタグラインを刷新
  const isGenericTemplate = oldTagline.includes("大手が放置するニッチ業務") ||
                            oldTagline.includes("大手量販店の在庫処分") ||
                            oldTagline.includes("経営者の発信・自己顕示欲求を代行") ||
                            oldTagline.includes("購買意欲が最も高いユーザーの比較検討動線") ||
                            oldTagline.includes("既製品が廃盤になったニッチ交換パーツ") ||
                            seenTaglines.has(oldTagline);

  if (isGenericTemplate) {
    const newTagline = buildExecutiveTagline(e);
    e.tagline = newTagline;
    modifiedCount++;
  }

  seenTaglines.set(e.tagline, (seenTaglines.get(e.tagline) || 0) + 1);

  // BusinessEssence も整合
  if (e.essence && e.essence.whatItDoes) {
    let w = e.essence.whatItDoes;
    w = w.replace(/^[^s]+は、/, "").trim();
    if (w.includes("大手が参入しない特定現場の単一タスク自動化") && (e.name.includes("ATM") || e.name.includes("Lemonade") || e.name.includes("Drone") || e.name.includes("Vending"))) {
      w = e.tagline;
    }
    e.essence.whatItDoes = w;
  }
}

console.log("[RESULTS]");
console.log("- Total entities processed:", entities.length);
console.log("- Monotonous template taglines rewritten:", modifiedCount);

// 重複チェック
const finalCounts = {};
for (const e of entities) {
  finalCounts[e.tagline] = (finalCounts[e.tagline] || 0) + 1;
}
const finalDuplicates = Object.values(finalCounts).filter(c => c > 1).reduce((a, b) => a + b, 0);
console.log("- Unique taglines count:", Object.keys(finalCounts).length);
console.log("- Duplicate taglines remaining:", finalDuplicates);

fs.writeFileSync(INDEX_PATH, JSON.stringify(entities, null, 2), "utf8");
console.log("[SAVED] Updated", INDEX_PATH, "successfully.");
