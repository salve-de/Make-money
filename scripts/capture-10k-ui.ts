import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const startTime = Date.now();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const loadTime = Date.now() - startTime;
  console.log(`Page loaded with 10,136 entities in: ${loadTime}ms`);

  // 1. 10k トップ画面キャプチャ
  const outPath1 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_10k_top.png');
  await page.screenshot({ path: outPath1, fullPage: false });
  console.log('Top screenshot saved to:', outPath1);

  // 2. Carrd をクリックしてインスペクターを開く
  const carrdRow = page.locator('tr').filter({ hasText: 'Carrd' }).first();
  await carrdRow.click();
  await page.waitForTimeout(500);

  const outPath2 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_10k_carrd_inspector.png');
  await page.screenshot({ path: outPath2, fullPage: false });
  console.log('Carrd Inspector screenshot saved to:', outPath2);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
