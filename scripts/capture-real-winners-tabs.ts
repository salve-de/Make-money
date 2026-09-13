import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // ScreenshotOne を選択
  const screenshotRow = page.locator('tr').filter({ hasText: 'ScreenshotOne' }).first();
  await screenshotRow.click();
  await page.waitForTimeout(500);

  // 1. 財務P&L タブ
  const pnlTab = page.locator('button').filter({ hasText: '財務P&L' }).first();
  await pnlTab.click();
  await page.waitForTimeout(500);
  const outPathPnl = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_screenshotone_pnl.png');
  await page.screenshot({ path: outPathPnl, fullPage: false });
  console.log('PnL screenshot saved to:', outPathPnl);

  // 2. 配管ツール タブ
  const toolsTab = page.locator('button').filter({ hasText: '配管ツール' }).first();
  await toolsTab.click();
  await page.waitForTimeout(500);
  const outPathTools = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_screenshotone_tools.png');
  await page.screenshot({ path: outPathTools, fullPage: false });
  console.log('Tools screenshot saved to:', outPathTools);

  // 3. 略奪手順 タブ
  const blueprintTab = page.locator('button').filter({ hasText: '略奪手順' }).first();
  await blueprintTab.click();
  await page.waitForTimeout(500);
  const outPathBlueprint = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_screenshotone_blueprint.png');
  await page.screenshot({ path: outPathBlueprint, fullPage: false });
  console.log('Blueprint screenshot saved to:', outPathBlueprint);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
