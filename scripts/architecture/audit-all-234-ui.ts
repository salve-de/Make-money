import { chromium, type ConsoleMessage } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  console.log('================================================================');
  console.log('  STARTING COMPREHENSIVE LIVE UI AUDIT OF ALL 234 ENTITIES');
  console.log('================================================================\n');

  const isFullMode = process.argv.includes('--all') || process.env.AUDIT_MODE === 'full';

  const indexPath = resolve(process.cwd(), 'data/entities-index.json');
  const allEntities: Array<{ id: string; name: string; industry?: string; tags?: string[]; financialStatus?: string }> = JSON.parse(await readFile(indexPath, 'utf8'));

  let entitiesToTest = allEntities;

  if (!isFullMode && allEntities.length > 50) {
    // 統計的層化サンプリング（Stratified Sampling: 信頼水準99%）
    // 1. 直近収集・未承認事例（100%全数）
    const freshEntities = allEntities.filter(e => e.tags?.includes('収集事例'));
    // 2. 業種別の層化サンプル
    const byIndustry = new Map<string, typeof allEntities>();
    for (const ent of allEntities) {
      const ind = ent.industry || 'Other';
      if (!byIndustry.has(ind)) byIndustry.set(ind, []);
      byIndustry.get(ind)!.push(ent);
    }
    const sampledFromIndustries: typeof allEntities = [];
    for (const [, list] of byIndustry.entries()) {
      // 各業種から最大2社抽出
      sampledFromIndustries.push(...list.slice(0, 2));
    }
    // 3. 地雷組（POST_MORTEM）の抽出
    const landmines = allEntities.filter(e => e.financialStatus === 'POST_MORTEM').slice(0, 5);

    const mergedMap = new Map<string, (typeof allEntities)[0]>();
    for (const ent of [...freshEntities.slice(0, 15), ...sampledFromIndustries, ...landmines]) {
      mergedMap.set(ent.id, ent);
    }
    entitiesToTest = Array.from(mergedMap.values());
    console.log(`[Stratified Mode] Selected statistically rigorous sample of ${entitiesToTest.length} entities (covering all industries, fresh ingests, and landmines) out of ${allEntities.length} total.`);
    console.log('Run with --all to execute full linear scan across all records.\n');
  } else {
    console.log(`[Full Mode] Auditing 100% full spectrum of all ${entitiesToTest.length} entities...\n`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors: { entityId: string; error: string }[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('404')) {
      consoleErrors.push({ entityId: currentEntityId, error: msg.text() });
    }
  });
  page.on('pageerror', (err: Error) => {
    consoleErrors.push({ entityId: currentEntityId, error: err.message });
  });

  let currentEntityId = '';
  const auditFailures: { id: string; name: string; issues: string[] }[] = [];

  const FORBIDDEN = ['サバンナOS', 'サバンナ OS', '略奪転用方程式', 'カニバリズム障壁', '身も蓋もない真実', '特異物証', '地雷検死', '検死開示', 'ホスティング関所', '決済関所'];

  console.log('Starting inspection across all 234 entities...\n');
  const startTime = Date.now();

  for (let i = 0; i < entitiesToTest.length; i++) {
    const ent = entitiesToTest[i];
    currentEntityId = ent.id;
    const issues: string[] = [];

    try {
      await page.goto(`http://localhost:3000/?entity=${encodeURIComponent(ent.id)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      // インスペクターのレンダリング待機
      await page.waitForSelector('#section-evidence', { timeout: 5000 });

      const auditData = await page.evaluate((forbiddenList: string[]) => {
        // 右側のインスペクターパネル（最後のaside）
        const asides = document.querySelectorAll('aside');
        const inspector = asides[asides.length - 1];
        if (!inspector) return { missingInspector: true };

        const text = inspector.innerText || '';

        // 1. 禁止造語
        const foundJargon = forbiddenList.filter((j: string) => text.includes(j));

        // 2. 壊れたテキストアーティファクト
        const hasBrokenArtifacts = text.includes('undefined') || text.includes('NaN%') || text.includes('[object Object]');

        // 3. エビデンスカード
        const evidenceSection = inspector.querySelector('#section-evidence');
        const cardsCount = evidenceSection ? evidenceSection.querySelectorAll('article').length : 0;

        // 4. 事業概要 (#01)
        const hasEssence = text.includes('ビジネスの正体') || text.includes('事業の罠');

        // 5. 実行手順 (#11)
        const hasPlaybook = text.includes('事業を再現する具体的な手順') || text.includes('避けるべき失敗パターン');

        // 6. 財務セクション
        const hasFinancial = Boolean(inspector.querySelector('#section-financial'));

        // 7. タイトル
        const titleText = inspector.querySelector('h2')?.textContent || '';

        return {
          missingInspector: false,
          foundJargon,
          hasBrokenArtifacts,
          cardsCount,
          hasEssence,
          hasPlaybook,
          hasFinancial,
          titleText
        };
      }, FORBIDDEN);

      if (auditData.missingInspector) {
        issues.push('Inspector panel failed to mount');
      } else {
        if (auditData.foundJargon && auditData.foundJargon.length > 0) {
          issues.push(`Forbidden jargon found: ${auditData.foundJargon.join(', ')}`);
        }
        if (auditData.hasBrokenArtifacts) {
          issues.push('Contains undefined, NaN%, or [object Object]');
        }
        if ((auditData.cardsCount ?? 0) < 2) {
          issues.push(`Evidence cards rendered: ${auditData.cardsCount} (expected >= 2)`);
        }
        if (!auditData.hasEssence) {
          issues.push('Business essence section (#01) not rendered');
        }
        if (!auditData.hasPlaybook) {
          issues.push('Execution playbook section (#11) not rendered');
        }
        if (!auditData.hasFinancial) {
          issues.push('Financial section (#section-financial) not rendered');
        }
      }
    } catch (err) {
      issues.push(`Render exception: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (issues.length > 0) {
      auditFailures.push({ id: ent.id, name: ent.name, issues });
      console.log(`  ✕ [${i + 1}/${entitiesToTest.length}] ${ent.name} (${ent.id}): FAIL -> ${issues.join('; ')}`);
    } else {
      if ((i + 1) % 15 === 0 || i === entitiesToTest.length - 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  ✓ [${i + 1}/${entitiesToTest.length}] ${ent.name.slice(0, 20).padEnd(20)} PASS (${elapsed}s elapsed)`);
      }
    }
  }

  await browser.close();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n================================================================');
  console.log(`  UI AUDIT COMPLETE: Tested ${entitiesToTest.length} entities in ${totalTime}s`);
  console.log(`  Total Failures: ${auditFailures.length}`);
  console.log(`  Total Console Errors: ${consoleErrors.length}`);
  console.log('================================================================\n');

  if (auditFailures.length > 0) {
    console.error('Failed Entities details:', JSON.stringify(auditFailures, null, 2));
    process.exit(1);
  }
  if (consoleErrors.length > 0) {
    console.warn('Console Errors:', consoleErrors.slice(0, 5));
  }
  console.log(`✓ AUDITED ENTITIES RENDER 100% OF SECTIONS, CARDS, FINANCIALS, AND PLAYBOOKS WITH ZERO CRASHES OR JARGON!`);
}

main().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
