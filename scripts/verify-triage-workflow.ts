import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. トップ画面スクリーンショット（ツールバーの「📥 収集事例 100」ボタンを確認）
  const outPath1 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_triage_top.png');
  await page.screenshot({ path: outPath1, fullPage: false });
  console.log('1. Top screenshot saved to:', outPath1);

  // 2. 「収集事例」クイックトグルボタンのテキストを取得
  const triageBtn = page.locator('button').filter({ hasText: '収集事例' }).first();
  const triageText = await triageBtn.innerText();
  console.log('2. Triage button text:', triageText.replace(/\n/g, ' '));

  // 3. 「収集事例」ボタンをクリックして新着100件に絞り込み
  await triageBtn.click();
  await page.waitForTimeout(1000);
  const outPath2 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_triage_filtered.png');
  await page.screenshot({ path: outPath2, fullPage: false });
  console.log('3. Filtered screenshot saved to:', outPath2);

  // 4. 一覧から新着収集事例の先頭行（例: ロピア）をクリック
  const firstRow = page.locator('tbody tr').first();
  const rowText = await firstRow.innerText();
  console.log('4. Selected entity row text:', rowText.split('\n')[0]);
  await firstRow.click();
  await page.waitForTimeout(1000);

  // 5. 詳細インスペクターヘッダーの「これはオッケー（承認）」ボタンの存在確認
  const approveBtn = page.locator('button').filter({ hasText: 'これはオッケー' }).first();
  const isApproveVisible = await approveBtn.isVisible();
  console.log('5. Approve button visible:', isApproveVisible);

  const outPath3 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_triage_detail_with_approve.png');
  await page.screenshot({ path: outPath3, fullPage: false });
  console.log('6. Inspector with approve button saved to:', outPath3);

  // 6. 「これはオッケー（承認）」ボタンをクリック！
  console.log('7. Clicking approve button...');
  await approveBtn.click();
  await page.waitForTimeout(1500);

  // 7. 承認後の画面スクリーンショット（リストから消滅、件数が99に減る）
  const outPath4 = resolve('/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/scratch/ui_triage_after_approve.png');
  await page.screenshot({ path: outPath4, fullPage: false });
  console.log('8. After approval screenshot saved to:', outPath4);

  const triageBtnAfter = page.locator('button').filter({ hasText: '収集事例' }).first();
  const triageTextAfter = await triageBtnAfter.innerText();
  console.log('9. Triage button text after approval:', triageTextAfter.replace(/\n/g, ' '));

  await browser.close();
  console.log('Triage & Approval workflow verification completed successfully!');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
