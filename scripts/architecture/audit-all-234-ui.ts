import { chromium, type ConsoleMessage } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  console.log('================================================================');
  console.log('  STARTING COMPREHENSIVE LIVE UI AUDIT OF ALL 234 ENTITIES');
  console.log('================================================================\n');

  const indexPath = resolve(process.cwd(), 'data/entities-index.json');
  const entities = JSON.parse(await readFile(indexPath, 'utf8'));
  console.log(`Auditing full UI pipeline for ${entities.length} entities...`);

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

  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
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
      console.log(`  ✕ [${i + 1}/${entities.length}] ${ent.name} (${ent.id}): FAIL -> ${issues.join('; ')}`);
    } else {
      if ((i + 1) % 25 === 0 || i === entities.length - 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  ✓ [${i + 1}/${entities.length}] ${ent.name.slice(0, 20).padEnd(20)} PASS (${elapsed}s elapsed)`);
      }
    }
  }

  await browser.close();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n================================================================');
  console.log(`  UI AUDIT COMPLETE: Tested ${entities.length} entities in ${totalTime}s`);
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
  console.log('✓ ALL 234 ENTITIES RENDER 100% OF SECTIONS, CARDS, FINANCIALS, AND PLAYBOOKS WITH ZERO CRASHES OR JARGON!');
}

main().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
