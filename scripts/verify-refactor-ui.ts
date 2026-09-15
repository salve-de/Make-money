import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const artifactDir = '/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87';

  // 1. トップ台帳
  console.log('Capturing Ledger (http://localhost:3000/) ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: resolve(artifactDir, 'refactor_verify_ledger.png'), fullPage: false });

  // 2. 詳細（Keyence）
  console.log('Capturing Keyence Inspector (http://localhost:3000/?entity=ent_keyence) ...');
  await page.goto('http://localhost:3000/?entity=ent_keyence', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: resolve(artifactDir, 'refactor_verify_costco.png'), fullPage: false });

  // 3. Partners エコシステム
  console.log('Capturing Partners (http://localhost:3000/partners) ...');
  await page.goto('http://localhost:3000/partners', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: resolve(artifactDir, 'refactor_verify_partners.png'), fullPage: false });

  // 4. Playbook 実戦プレイブック
  console.log('Capturing Playbook (http://localhost:3000/playbook) ...');
  await page.goto('http://localhost:3000/playbook', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: resolve(artifactDir, 'refactor_verify_playbook.png'), fullPage: false });

  // 5. Radar 異常値レーダー
  console.log('Capturing Radar (http://localhost:3000/radar) ...');
  await page.goto('http://localhost:3000/radar', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: resolve(artifactDir, 'refactor_verify_radar.png'), fullPage: false });

  // 6. Synthesis 戦略壁打ち＆合成
  console.log('Capturing Synthesis (http://localhost:3000/?mode=SYNTHESIS) ...');
  await page.goto('http://localhost:3000/?mode=SYNTHESIS', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: resolve(artifactDir, 'refactor_verify_synthesis.png'), fullPage: false });

  await browser.close();
  console.log('✓ All 6 UI verification screenshots captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
