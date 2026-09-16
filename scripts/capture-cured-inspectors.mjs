import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = '/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87';

const targets = [
  { name: 'Thomas Hammond (Retail Arbitrage)', key: 'cured_thomas_hammond', query: 'Thomas Hammond' },
  { name: 'Kevin Hardin (3D Printing Engineer)', key: 'cured_kevin_hardin', query: 'Kevin Hardin' },
  { name: 'Helena Bottemiller Evich (Food Fix)', key: 'cured_helena_foodfix', query: 'Helena Bottemiller' },
  { name: 'Steve Hanov (Micro-SaaS)', key: 'cured_steve_hanov', query: 'Steve Hanov' },
  { name: 'Simple Ink', key: 'cured_simple_ink', query: 'Simple Ink' },
  { name: 'Photo AI', key: 'cured_photo_ai', query: 'Photo AI' }
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1550, height: 1000 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  for (const t of targets) {
    console.log(`Auditing target: ${t.name} (query: ${t.query})...`);
    
    // Search for the entity
    const searchInput = page.locator('input[placeholder*="銘柄"], input[placeholder*="検索"], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(t.query);
      await page.waitForTimeout(1000);
      
      const firstRow = page.locator('tr, div[role="row"]').filter({ hasText: t.query }).first();
      if (await firstRow.isVisible()) {
        await firstRow.click();
        await page.waitForTimeout(1500);
      }
    }

    const fullPath = path.join(ARTIFACTS_DIR, `${t.key}_full.png`);
    await page.screenshot({ path: fullPath, fullPage: false });
    console.log(`Saved screenshot: ${fullPath}`);
  }

  await browser.close();
  console.log('Finished capturing all cured inspector screenshots!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
