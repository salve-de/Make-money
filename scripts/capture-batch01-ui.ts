import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. トップ一覧画面
  const outPath1 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_batch01_top.png');
  await page.screenshot({ path: outPath1, fullPage: false });
  console.log('Top screenshot saved to:', outPath1);

  // 2. Carrd 行をクリック
  const carrdRow = page.locator('tr').filter({ hasText: 'Carrd' }).first();
  await carrdRow.click();
  await page.waitForTimeout(500);

  const outPath2 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_carrd_inspector.png');
  await page.screenshot({ path: outPath2, fullPage: false });
  console.log('Carrd Inspector screenshot saved to:', outPath2);

  // 3. TypingMind 行をクリック
  const typingMindRow = page.locator('tr').filter({ hasText: 'TypingMind' }).first();
  await typingMindRow.click();
  await page.waitForTimeout(500);

  const outPath3 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_typingmind_inspector.png');
  await page.screenshot({ path: outPath3, fullPage: false });
  console.log('TypingMind Inspector screenshot saved to:', outPath3);

  // 4. Quibi (地雷) 行をクリック
  const quibiRow = page.locator('tr').filter({ hasText: 'Quibi' }).first();
  await quibiRow.click();
  await page.waitForTimeout(500);

  const outPath4 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_quibi_inspector.png');
  await page.screenshot({ path: outPath4, fullPage: false });
  console.log('Quibi Inspector screenshot saved to:', outPath4);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
