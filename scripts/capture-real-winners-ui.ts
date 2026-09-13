import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  // 1. トップ一覧画面
  const outPath1 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_real_winners_top.png');
  await page.screenshot({ path: outPath1, fullPage: false });
  console.log('Top screenshot saved to:', outPath1);

  // 2. ScreenshotOne のテーブル行をクリック
  const screenshotRow = page.locator('tr').filter({ hasText: 'ScreenshotOne' }).first();
  await screenshotRow.click();
  await page.waitForTimeout(1000);

  const outPath2 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_screenshotone_inspector.png');
  await page.screenshot({ path: outPath2, fullPage: false });
  console.log('ScreenshotOne Inspector screenshot saved to:', outPath2);

  // 3. ScrapingBee のテーブル行をクリック
  const scrapingBeeRow = page.locator('tr').filter({ hasText: 'ScrapingBee' }).first();
  await scrapingBeeRow.click();
  await page.waitForTimeout(1000);

  const outPath3 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_scrapingbee_inspector.png');
  await page.screenshot({ path: outPath3, fullPage: false });
  console.log('ScrapingBee Inspector screenshot saved to:', outPath3);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
