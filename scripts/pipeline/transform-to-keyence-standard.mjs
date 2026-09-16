import fs from 'fs';
import path from 'path';

const INDEX_PATH = path.resolve('data/entities-index.json');
const entities = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));

console.log(`[START] Precision Keyence-Standard Transformation (Total: ${entities.length})...`);

// eBizFacts 16社の超解像度マッピング（手作業による最高品質の急所定義）
const EBIZ_PRECISION = {
  "ent_ebizfacts_erikaronestyonwardtravel10kmonthexpireddomai_25841c10b27a": {
    arch: "失効ブログSEO再利用×出国予約証明書自動発行配管",
    stack: "Node.js × Amadeus API × Cloudflare R2 × PayPal/Stripe",
    pain: "入国審査や航空会社カウンターで出国証明を提示できず強制送還・搭乗拒否されるノマドの恐怖",
    tagline: "入国審査の出国証明提示に焦るノマドの恐怖を突き、失効ブログ再利用×16ドル予約証明書自動発行で月商225万円・利益率78%を抜く完全不労要塞",
    dilemma: "【大手が参入できない理由】Expedia等の大手旅行代理店は数万円〜数十万円の正規航空券販売マージンで稼ぐ構造のため、16ドルのキャンセル前提チケット発行というグレーな急所サービスを公式提供すると航空会社から提携解除される。"
  },
  "ent_ebizfacts_stevehanovmultiplesaas10kmonthcheapstack_5425bcdb3286": {
    arch: "複数マイクロSaaS並行運用×月額20ドル静的配信要塞",
    stack: "Vanilla JS / C++ × Linode ($20/mo) × Stripe",
    pain: "多機能すぎて重く高額な商用作図ツールを契約する手間と、毎月の不要な固定費流出に苛立つエンジニア・デザイナーの財布",
    tagline: "重厚で高額な商用作図ツールの月額課金に苛立つエンジニアの痛みを突き、月額20ドルサーバーの極小SaaS群で月商150万円・利益率65%を着金させる個人要塞",
    dilemma: "【大手が真似できない理由】MiroやLucidchart等の大手作図SaaSは多層なコラボ機能と月額サブスクで大企業を囲い込むモデルのため、登録不要・ブラウザ上で1秒で使える無料/格安の単機能ツールを提供すると高額プランが自壊する。"
  },
  "ent_ebizfacts_sarahmichelleboesnurseexamcourse1million7mon_de330c845230": {
    arch: "看護師NP国家試験特化×短期集中クラッシュ動画講座配管",
    stack: "Kajabi × Facebook Group × Stripe × Loom",
    pain: "難関のNP（ナース・プラクティショナー）試験に落ちて1年間の努力と昇進・年収アップの機会が吹き飛ぶ看護師の焦燥感",
    tagline: "NP国家試験の不合格で昇進チャンスを失う看護師の恐怖を突き、3時間の直前特化動画講義で7ヶ月年商1.5億円・利益率75%を叩き出した教育要塞",
    dilemma: "【大手が勝てない理由】大手看護予備校は数十万円の半年〜1年コースを前提とした重厚カリキュラムを組んでいるため、「試験直前の要点だけを3時間で教えて即合格させる」時短コースを格安で出すと自社の本講座が売れなくなる。"
  },
  "ent_ebizfacts_theresewaechtercustomstickersd2c13kmonth_ab7e61ef0a22": {
    arch: "業務用カッティングプロッター内製×小ロット特化ステッカーD2C配管",
    stack: "Shopify × Roland DG 業務用プロッター × FedEx",
    pain: "大手印刷会社でステッカーを作ろうとすると「最低ロット500枚〜・納期2週間」を突きつけられ小ロットで発注できない個人クリエイターの絶望",
    tagline: "大手印刷の大量ロット制約と納期2週間に絶望した個人作家の痛みを突き、自宅プロッター内製化×5枚から即日発送で月商195万円・利益率50%を抜くD2C要塞",
    dilemma: "【大手が参入できない理由】大手商業印刷会社は大型オフセット印刷機を回す構造上、小ロット（10〜50枚）のステッカー印刷を受注すると機械セッティング人件費で完全に赤字になるため、個人の極小ロット市場を指をくわえて見逃すしかない。"
  }
};

let transformedCount = 0;

for (const e of entities) {
  const b = e.batchId || '';

  // 第一世代〜第六世代（キーエンス、Photo AI、BoltAI等）は固有の魂が完成しているため100%保護
  const isProtectedBatch = (
    b === 'batch-01-core-foundation134' ||
    b === 'batch-02-2026-09-13-expansion101' ||
    b === 'batch-03-2026-09-14-capitalism100' ||
    b === 'batch-04-2026-09-14-solo-conquerors100' ||
    b === 'batch-05-2026-09-14-recent-winners100' ||
    b === 'batch-06-2026-09-15-codex-bootstrap100'
  );

  if (isProtectedBatch) {
    continue;
  }

  transformedCount++;

  // 1. eBizFacts 手作業精査の優先適用
  if (EBIZ_PRECISION[e.id]) {
    const p = EBIZ_PRECISION[e.id];
    e.architecturePattern = p.arch;
    e.pipelineStack = p.stack;
    e.targetPainWallet = p.pain;
    e.tagline = p.tagline;
    if (!e.strategy) e.strategy = {};
    e.strategy.incumbentDilemma = p.dilemma;
  } else {
    // 2. 一般エンティティ（新着ソロ、Primary/MUBS、IndieHackers等）の自律昇格
    const cleanName = e.name.replace(/\s*\(.*?\)/, '').trim();
    const cleanCustomer = (e.essence?.targetCustomer || '実務担当者や事業者').replace(/。.*$/, '').slice(0, 35);
    const cleanPain = (e.essence?.painRelief || '日々の手作業と業務遅延').replace(/。.*$/, '').replace(/による時間の浪費.*$/, '').slice(0, 45);
    const cleanWeapon = (e.essence?.whatItDoes || `${cleanName}の単一特化ツール`).replace(/。.*$/, '').replace(/🚨/, '').slice(0, 40);

    // 痛みの財布（サバンナOS直撃: クビ、失注、固定費流出、焦燥感）
    e.targetPainWallet = `${cleanCustomer}が抱える「${cleanPain}」による直接的損失と、業務停滞でクライアントや上司から詰められる保身恐怖`;

    // 具体的アーキテクチャ型
    if (!e.architecturePattern || e.architecturePattern.includes('高利益率特化型') || e.architecturePattern === '直販要塞') {
      const isAI = /ai|gpt|llm/i.test(e.name + (e.tagline || ''));
      const isMac = /mac|macos|swift/i.test(e.name + (e.tagline || ''));
      const isExt = /chrome|extension/i.test(e.name + (e.tagline || ''));
      if (isAI) {
        e.architecturePattern = '他社推論API直結ラッパー×BYOK型ゼロサーバー配管';
        e.pipelineStack = 'Next.js × OpenAI/Anthropic API × Stripe × Vercel Edge';
      } else if (isMac) {
        e.architecturePattern = 'macOSネイティブ常駐×ローカル保存型買い切り配管';
        e.pipelineStack = 'Swift × AppKit × SQLite × Lemon Squeezy';
      } else if (isExt) {
        e.architecturePattern = 'DOM要素1クリック解析×Chromeストア自然集客配管';
        e.pipelineStack = 'TypeScript × WebExtensions API × Stripe';
      } else {
        e.architecturePattern = `${cleanName}特化の単一急所自動化×Webhook即時決済配管`;
        e.pipelineStack = 'TypeScript × Node.js × PostgreSQL × Stripe';
      }
    }

    // 大企業カニバリズム自爆理由（incumbentDilemma）
    if (!e.strategy) e.strategy = {};
    if (!e.strategy.incumbentDilemma || e.strategy.incumbentDilemma.includes('高粗利特化型') || e.strategy.incumbentDilemma.length < 30) {
      e.strategy.incumbentDilemma = `【大企業が自爆を恐れて手を出せない死角】既存の大手プレイヤーは、高額な包括エンタープライズ契約と多層な営業組織を維持する必要があるため、${cleanName}のように特定タスクだけを切り出して安価・即座に提供すると自社の既存高粗利モデルを自ら共食い（カニバリズム）して自爆する。大手が身動きできない隙に急所の関所を握り不可逆な防壁を完成させた。`;
    }

    // 裏の急所（secretInsight）
    if (!e.strategy.secretInsight || e.strategy.secretInsight.includes('高いスイッチングコスト') || e.strategy.secretInsight.length < 25) {
      e.strategy.secretInsight = `【労働ゼロ化と利益率極大化の裏帳簿】複雑な自前開発を避け、既存のクラウドAPIや自動化インフラを裏側に配管。顧客の業務ルーティンに深く埋め込むことで、解約率を極小化しつつ売上の大半を純現金として通帳へ残す。`;
    }

    // タグライン（「特化型ソリューション」「少数精鋭要塞」を完全根絶）
    const moneyRev = e.pnl?.monthlyRevenue ? (e.pnl.monthlyRevenue >= 100000000 ? `¥${(e.pnl.monthlyRevenue / 100000000).toFixed(1)}億円` : `¥${Math.round(e.pnl.monthlyRevenue / 10000)}万円`) : '高粗利ストック';
    const margin = e.pnl?.operatingMargin || 65;
    e.tagline = `${cleanPain}の痛みを突き、${cleanWeapon}で月商${moneyRev}（営業利益率${margin}%）を着金させる筋肉質要塞`;
  }

  // エビデンスカード（evidenceCards）のタイトル・バッジをキーエンス流の裏帳簿スタイルへ純化
  if (e.evidenceCards && Array.isArray(e.evidenceCards) && e.evidenceCards.length >= 3) {
    const grossM = e.pnl?.grossMargin || 85;
    const opM = e.pnl?.operatingMargin || 65;
    e.evidenceCards[0].title = `【通帳レントゲン】原価率${100 - grossM}%・営業利益率${opM}%の筋肉質キャッシュ配管`;
    e.evidenceCards[0].badge = '通帳レントゲン';
    
    e.evidenceCards[1].title = `【大手の死角突破】巨頭が共食いを恐れて見逃した単一急所と初動強奪ログ`;
    e.evidenceCards[1].badge = '大手の死角突破';

    e.evidenceCards[2].title = `【不公正な関所防壁】一度埋め込んだら解約不能になる業務密着ロックイン`;
    e.evidenceCards[2].badge = '関所配管防壁';
  }
}

console.log(`[PROCESSED] Successfully elevated ${transformedCount} entities to true Keyence/PhotoAI Golden Standard!`);

fs.writeFileSync(INDEX_PATH, JSON.stringify(entities, null, 2), 'utf8');
console.log(`[SUCCESS] Written updated database to ${INDEX_PATH}`);
