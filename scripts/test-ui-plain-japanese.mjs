import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });

  // 1. トップ画面撮影
  await page.screenshot({ path: 'scratch/ui_plain_top.png' });
  console.log('Saved scratch/ui_plain_top.png');

  // 2. 「収集事例」フィルターをクリック
  const triageBtn = page.locator('button:has-text("収集事例")').first();
  if (await triageBtn.isVisible()) {
    await triageBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scratch/ui_plain_triage_filtered.png' });
    console.log('Saved scratch/ui_plain_triage_filtered.png');
  }

  // 3. ロピアを検索して選択
  const searchInput = page.locator('input[placeholder*="検索"], input[type="text"]').first();
  if (await searchInput.isVisible()) {
    await searchInput.fill('ロピア');
    await page.waitForTimeout(500);
    const lopiaRow = page.locator('text=株式会社ロピア').first();
    if (await lopiaRow.isVisible()) {
      await lopiaRow.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'scratch/ui_plain_lopia_dossier.png' });
      console.log('Saved scratch/ui_plain_lopia_dossier.png');

      // スクロールして下部のセクションも撮影
      await page.evaluate(() => {
        window.scrollBy(0, 600);
      });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'scratch/ui_plain_lopia_scrolled.png' });
      console.log('Saved scratch/ui_plain_lopia_scrolled.png');
    }
  }

  // 4. PDF.ai も検索して選択
  if (await searchInput.isVisible()) {
    await searchInput.fill('PDF.ai');
    await page.waitForTimeout(500);
    const pdfaiRow = page.locator('text=PDF.ai').first();
    if (await pdfaiRow.isVisible()) {
      await pdfaiRow.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'scratch/ui_plain_pdfai_dossier.png' });
      console.log('Saved scratch/ui_plain_pdfai_dossier.png');
    }
  }

  await browser.close();
  console.log('Playwright audit finished successfully!');
}

run().catch(err => {
  console.error('Playwright error:', err);
  process.exit(1);
});
