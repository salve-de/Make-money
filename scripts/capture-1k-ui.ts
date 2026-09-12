import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const startTime = Date.now();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const loadTime = Date.now() - startTime;
  console.log(`Page loaded with 1,136 entities in: ${loadTime}ms`);

  // 1. トップ画面キャプチャ
  const outPath1 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_1k_top.png');
  await page.screenshot({ path: outPath1, fullPage: false });
  console.log('Top screenshot saved to:', outPath1);

  // 2. 下へスクロールして無限スクロール動作を確認
  await page.evaluate(() => {
    const container = document.querySelector('.overflow-y-auto');
    if (container) container.scrollTop = 1500;
  });
  await page.waitForTimeout(500);

  const outPath2 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_1k_scrolled.png');
  await page.screenshot({ path: outPath2, fullPage: false });
  console.log('Scrolled screenshot saved to:', outPath2);

  // 3. 検索バーに「インボイス」を入力してフィルタ確認
  const searchInput = page.locator('input[placeholder*="銘柄・手口・タグ・裏帳簿を検索"]').first();
  await searchInput.fill('インボイス');
  await page.waitForTimeout(500);

  const outPath3 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_1k_search.png');
  await page.screenshot({ path: outPath3, fullPage: false });
  console.log('Search screenshot saved to:', outPath3);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
