#!/usr/bin/env node

import fs from 'node:fs/promises';

const INPUT = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_ebizfacts_profiles_enriched_financial_signals_1000_20260916.json';
const OUTPUT = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_ebizfacts_profiles_case_playbooks_1000_20260916.json';
const SNAPSHOT = '2026-09-16';

const clean = (value, max = 360) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function businessContext(entity) {
  return clean(entity.targetPainWallet || entity.essence?.whatItDoes || entity.name || '本文記載の事業', 180);
}

function metricContext(entity) {
  return clean(entity.pnl?.revenueLabel || '記事記載の金額区分は未確認', 220);
}

function channelContext(entity) {
  const tools = (entity.operations?.toolStack ?? []).map((tool) => tool.name).filter(Boolean);
  const channels = (entity.operations?.primaryChannels ?? []).filter((channel) => !/^eBiz Facts profile$|^external link$/i.test(channel));
  return clean([...new Set([...channels, ...tools])].slice(0, 4).join('・') || '本文記載の経路は未確認', 140);
}

function casePlaybook(entity) {
  const context = businessContext(entity);
  const metric = metricContext(entity);
  const channels = channelContext(entity);
  switch (entity.sector) {
    case 'PHYSICAL_ASSET':
      return {
        toll: `【物販・現物の関所候補】${channels}を通じた仕入れ・在庫・配送・販売手数料が現金化の前提。${metric}は第三者記事の報告で、原価・返品・手数料は未確認。`,
        steps: [
          `本文の「${context}」が示す商品・仕入れ口と販売先を切り分け、在庫を持つ箇所を確認する。`,
          `記事記載の${metric}を、販売額・仕入れ・マーケットプレイス手数料・配送・返品に分解して検証する。`,
          `仕入れ制約、在庫回転、販路規約の変更で止まる条件を確認し、単一商品の成功を一般化しない。`,
        ],
      };
    case 'CONTENT_MEDIA':
      return {
        toll: `【メディアの関所候補】${channels}で注意・視聴・購読を集め、広告・スポンサー・アフィリエイト等へ変換する配管。${metric}は第三者記事の報告で、媒体手数料・制作費・継続率は未確認。`,
        steps: [
          `本文の「${context}」から、読者・視聴者の入口と配信プラットフォームを特定する。`,
          `記事記載の${metric}を広告・スポンサー・アフィリエイト・商品販売のどれに帰属させるか、原文の金額と照合する。`,
          `アルゴリズム変更、広告単価、投稿頻度、視聴者離脱が収益を止める条件かを確認し、単発の拡散を継続売上とみなさない。`,
        ],
      };
    case 'LOCAL_SERVICES':
      return {
        toll: `【地域サービスの関所候補】地域需要の発見から見積・予約・現場作業・再来店までをつなぐ配管。${metric}は第三者記事の報告で、労務費・移動費・外注費・税は未確認。`,
        steps: [
          `本文の「${context}」について、問い合わせの入口、商圏、見積方法、予約から着金までの流れを確認する。`,
          `記事記載の${metric}を、受注単価・材料費・人件費・移動/施設費・キャンセルに分解する。`,
          `作業者の稼働上限、許認可、安全責任、地域競争が再現性を制限する箇所を確認する。`,
        ],
      };
    case 'FINTECH_INFRA':
      return {
        toll: `【金融・決済インフラの関所候補】取引・審査・決済・記録を規制と障害対応込みで継続させる配管。${metric}は第三者記事の報告で、損失引当・コンプライアンス費・決済手数料は未確認。`,
        steps: [
          `本文の「${context}」が扱う資金移動・審査・記録の責任範囲と、誰が最終的な損失を負うかを確認する。`,
          `記事記載の${metric}を、手数料収入・取引量・返金/不正損失・外部プロバイダー費に分解する。`,
          `規制、本人確認、データ保護、停止時の資金保全が事業の関所になる箇所を一次情報で確認する。`,
        ],
      };
    case 'AI_AUTOMATION':
      return {
        toll: `【AI・自動化の関所候補】特定業務の入力を自動処理し、サブスクリプションまたは従量課金へ変換する配管。${metric}は第三者記事の報告で、推論/API原価・監視・解約率は未確認。`,
        steps: [
          `本文の「${context}」から、利用者が手作業で抱えていた入力・判定・出力を一つの業務単位として特定する。`,
          `記事記載の${metric}を、課金単位・推論/API費・サポート・顧客獲得費に分解し、価格と粗利を混同しない。`,
          `モデル/API価格、出力品質、規約、データ権利の変更で止まる条件を確認し、機能の新規性だけで再現性を判断しない。`,
        ],
      };
    case 'NICHE_SAAS':
    default:
      return {
        toll: `【ニッチソフトウェアの関所候補】${channels}から特定職種の反復業務へ入り、継続課金または導入費へ変換する配管。${metric}は第三者記事の報告で、解約率・サポート費・インフラ費は未確認。`,
        steps: [
          `本文の「${context}」が示す顧客の反復業務と、既存ツールから乗り換える理由を具体化する。`,
          `記事記載の${metric}を、導入費・継続課金・決済手数料・サポート・インフラに分解する。`,
          `顧客獲得経路、データ移行、解約時の代替、外部プラットフォーム依存が再現性を制限する箇所を確認する。`,
        ],
      };
  }
}

const entities = JSON.parse(await fs.readFile(INPUT, 'utf8'));
if (!Array.isArray(entities) || entities.length !== 1000) throw new Error(`Expected 1000 entities, got ${entities?.length}`);
const repaired = entities.map((entity) => {
  const next = structuredClone(entity);
  const playbook = casePlaybook(next);
  next.strategy = {
    ...next.strategy,
    actionPlaybook: playbook.steps,
    coldOutreachTemplate: `「${businessContext(next)}」について、${metricContext(next)}の売上・利益・原価を分けて確認できる公開資料があるか尋ねる。`,
  };
  next.lootBlueprint = {
    ...next.lootBlueprint,
    tollGateSetup: playbook.toll,
    executionChecklist: playbook.steps,
  };
  next.unknownsNotes = [...new Set([...(next.unknownsNotes ?? []), `業態別プレイブックは検証手順として生成。実際の原価・利益・継続率は未確認（${SNAPSHOT}）。`])];
  return next;
});
await fs.writeFile(OUTPUT, `${JSON.stringify(repaired, null, 2)}\n`, 'utf8');
const checklistVariants = new Set(repaired.map((entity) => JSON.stringify(entity.lootBlueprint?.executionChecklist ?? []))).size;
const tollVariants = new Set(repaired.map((entity) => entity.lootBlueprint?.tollGateSetup ?? '')).size;
console.log(JSON.stringify({ input: INPUT, output: OUTPUT, count: repaired.length, checklistVariants, tollVariants }, null, 2));
