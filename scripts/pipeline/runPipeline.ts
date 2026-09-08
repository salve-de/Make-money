/**
 * KIN-KOROKU データ収集パイプライン - MASTER RUNNER
 * 
 * 実行方法:
 *   npx tsx scripts/pipeline/runPipeline.ts
 * 
 * 処理フロー:
 *   1. SCOUT: シグナルリードの検知・収集
 *   2. RESEARCH: A〜G項目および客観事実暴露（初期ゲリラ・規約ハック・魚拓・裏原価）の構造化抽出
 *   3. VERIFY: 出典と信頼度の判定、台帳エンティティ（FinancialEntity）への正規化出力
 */

import { runScoutStage } from './scoutSignals';
import { extractDossierFromSignal } from './extractDossier';
import { verifyAndIntegrate } from './verifyAndIntegrate';

async function main() {
  console.log('=============================================================');
  console.log('KIN-KOROKU INTELLIGENCE FACTORY: DATA PIPELINE RUNNER');
  console.log('準拠: docs/DATA_COLLECTION_CONTRACT.md & PROJECT_CHARTER.md');
  console.log('=============================================================\n');

  // Stage 1: Scout
  const leads = await runScoutStage();
  console.log(`\n>>> Stage 1 完了: ${leads.length} 件のリードを抽出`);

  // Stage 2 & 3: Research & Verify
  const entities = [];
  for (const lead of leads) {
    console.log('-------------------------------------------------------------');
    const dossier = extractDossierFromSignal(lead);
    const entity = verifyAndIntegrate(dossier);
    entities.push(entity);
  }

  console.log('\n=============================================================');
  console.log(`全パイプライン正常完了: 合計 ${entities.length} 件のエンティティを生成`);
  console.log('=============================================================');
  console.log('生成された裏帳簿エンティティ例:');
  console.log(JSON.stringify(entities[0], null, 2));
}

main().catch((err) => {
  console.error('パイプライン実行エラー:', err);
  process.exit(1);
});
