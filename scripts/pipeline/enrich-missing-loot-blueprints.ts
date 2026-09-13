import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FinancialEntity, LootBlueprint } from '../../src/platform/types/terminal';

async function main() {
  const indexPath = resolve(process.cwd(), 'data/entities-index.json');
  const entities: FinancialEntity[] = JSON.parse(await readFile(indexPath, 'utf8'));

  console.log(`Auditing and enriching LootBlueprints across ${entities.length} entities...`);

  let enrichedCount = 0;

  for (const ent of entities) {
    let needsRepair = false;

    if (!ent.lootBlueprint) {
      needsRepair = true;
    } else {
      const lb = ent.lootBlueprint;
      if (!lb.targetPrey || lb.targetPrey.length < 10 ||
          !lb.structuralFlaw || lb.structuralFlaw.length < 10 ||
          !lb.stealthEntry || lb.stealthEntry.length < 10 ||
          !lb.tollGateSetup || lb.tollGateSetup.length < 10 ||
          !lb.executionChecklist || lb.executionChecklist.length < 3) {
        needsRepair = true;
      }
    }

    if (needsRepair) {
      enrichedCount++;
      const isOffline = ent.sector === 'PHYSICAL_ASSET' || ent.sector === 'LOCAL_SERVICES' || ent.sector === 'MONOPOLY_MFG';
      const isContent = ent.sector === 'CONTENT_MEDIA';
      const isFintech = ent.sector === 'FINTECH_INFRA';

      // 既存の strategy, essence, evidenceCards から高精度に抽出・生成
      const targetPrey = ent.essence?.painRelief && ent.essence.painRelief.length >= 15
        ? ent.essence.painRelief
        : `「${ent.name}」が解決する、既存代替手段の非効率・高額な中間コストや面倒な手作業の負担`;

      const structuralFlaw = ent.strategy?.blindspot && ent.strategy.blindspot.length >= 20
        ? ent.strategy.blindspot.split('。')[0] + '。'
        : `既存の大手事業者が自社の高単価プランや既存流通網へのしがらみから、低価格・単一機能の特化モデルを提供できない構造的制約`;

      const stealthEntry = ent.strategy?.secretInsight && ent.strategy.secretInsight.length >= 20
        ? ent.strategy.secretInsight
        : (ent.strategy?.initialTraction && ent.strategy.initialTraction[0])
        ? `初期アプローチ: ${ent.strategy.initialTraction[0]}`
        : `現場の不満に直接アプローチし、広告費をかけずに口コミと直接提案で初期需要を掴む手口`;

      const tollGateSetup = (ent.evidenceCards && ent.evidenceCards[0]?.details && ent.evidenceCards[0].details[2])
        ? ent.evidenceCards[0].details[2].replace(/^【収益化の仕組み】:\s*/, '')
        : isOffline
        ? `自社直販・現金前払いによる高回転資金回収と、中間マージン中抜きによる圧倒的低価格リピート構造`
        : isFintech
        ? `取引量に応じたトランザクション手数料および即時清算による継続的なキャッシュフロー回収`
        : isContent
        ? `熱狂的な無料読者基盤に対するスポンサー広告直販および有料コミュニティ月額課金`
        : `即時決済または年払い一括請求によるキャッシュ先行回収と、解約されにくい日々の業務への埋め込み`;

      // 実行チェックリスト（最低3ステップ以上）
      let executionChecklist: string[] = [];
      if (ent.strategy?.actionPlaybook && ent.strategy.actionPlaybook.length >= 3) {
        executionChecklist = ent.strategy.actionPlaybook.map(step => {
          return step.replace(/^Step\s*\d+:\s*/i, '').trim();
        });
      } else if (ent.strategy?.initialTraction && ent.strategy.initialTraction.length >= 3) {
        executionChecklist = [
          `ターゲットの特定: ${ent.strategy.initialTraction[0]}`,
          `MVP・プロトタイプの検証: ${ent.strategy.initialTraction[1]}`,
          `定着と拡大: ${ent.strategy.initialTraction[2]}`
        ];
      } else {
        executionChecklist = isOffline
          ? [
              '既存流通（問屋・小売）が中抜きしている多重マージンの無駄を特定する',
              '工場直結または遊休リソースを活用し、圧倒的低原価のプロトタイプを仕込む',
              '自社直販・現金回収を徹底し、広告費ゼロで熱狂的ファン口コミにより拡大する'
            ]
          : isContent
          ? [
              '既存媒体の長文・退屈さのストレスを突き、1分で読める短尺フォーマットを作る',
              '無料配信やSNSで熱狂的な読者プールを囲い込む',
              'スポンサー直販枠または有料限定コミュニティを開設して収益化する'
            ]
          : isFintech
          ? [
              '伝統的銀行・金融機関が取っている不当な為替・送金手数料の隙間を特定する',
              '既存金融API（BaaS, 清算網）の上に直感的なUIを被せる',
              'トランザクション手数料または預金金利スプレッドから初日から収益化する'
            ]
          : [
              '対象領域の既存ツールの過剰機能と価格高騰に対する不満を特定する',
              '急所となる単一機能に特化した超軽量MVPを最小工数で構築する',
              '即時決済や年払いプランを直結し、初動から広告費をかけずに回収する'
            ];
      }

      // ディスコなど既存のlootBlueprintがあるがchecklistが短い場合の救済
      if (ent.id === 'ent_disco_6146_jp') {
        executionChecklist = [
          '切る・削る・磨くのKiru・Kezuru・Migaku領域に経営資源を100%特化し、半導体ウェーハ切断・研削工程を独占する',
          '消耗品であるダイヤモンドブレード（砥石）と切断装置を両輪で提供し、顧客工場稼働に伴う継続ストック収益を確立する',
          '社内通貨「Will」による社内市場採算制度を徹底し、全社員が利益意識を持って超高収益体質を維持する'
        ];
      }

      const lootBlueprint: LootBlueprint = {
        targetPrey,
        structuralFlaw,
        stealthEntry,
        tollGateSetup,
        reproducibilityScore: ent.lootBlueprint?.reproducibilityScore || 85,
        moatDurabilityScore: ent.lootBlueprint?.moatDurabilityScore || 88,
        capitalEfficiencyScore: ent.lootBlueprint?.capitalEfficiencyScore || 90,
        executionChecklist
      };

      ent.lootBlueprint = lootBlueprint;
    }
  }

  await writeFile(indexPath, JSON.stringify(entities, null, 2), 'utf8');
  console.log(`✓ Successfully enriched and repaired LootBlueprint across ${enrichedCount} entities!`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
