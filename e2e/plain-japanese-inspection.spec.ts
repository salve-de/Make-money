import { test, expect } from '@playwright/test';

test('verify plain Japanese UI and lack of Savannah OS jargon', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // 1. トップ画面撮影
  await page.screenshot({ path: 'scratch/ui_plain_top.png' });

  // 2. 「収集事例」クイックフィルターをクリック
  const triageBtn = page.locator('button:has-text("収集事例")').first();
  await expect(triageBtn).toBeVisible();
  await triageBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'scratch/ui_plain_triage_filtered.png' });

  // 3. ロピアの詳細画面を直接開く
  await page.goto('http://localhost:3000/?entity=ent_lopia_9c', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // ロピアの詳細画面撮影
  await page.screenshot({ path: 'scratch/ui_plain_lopia_dossier.png' });

  // 画面全体のテキストを取得し、「サバンナOS」「略奪転用」等の造語が存在しないことを検証
  const bodyText = await page.innerText('body');
  expect(bodyText).not.toContain('サバンナOS');
  expect(bodyText).not.toContain('サバンナ OS');
  expect(bodyText).not.toContain('略奪転用方程式');
  expect(bodyText).not.toContain('身も蓋もない真実');
  expect(bodyText).not.toContain('カニバリズム障壁');
  expect(bodyText).not.toContain('特異物証');

  // 平易な日本語ラベルが存在することを検証
  expect(bodyText).toContain('儲けのウラ側');
  expect(bodyText).toContain('ビジネスモデル');
  expect(bodyText).toContain('集客の事実ログ');
  expect(bodyText).toContain('競合の弱点');

  // 4. PDF.ai の詳細画面を直接開く
  await page.goto('http://localhost:3000/?entity=ent_pdf_ai_65', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/ui_plain_pdfai_dossier.png' });

  const pdfaiBodyText = await page.innerText('body');
  expect(pdfaiBodyText).not.toContain('サバンナOS');
  expect(pdfaiBodyText).not.toContain('略奪転用');
  expect(pdfaiBodyText).toContain('儲けのウラ側');
  expect(pdfaiBodyText).toContain('ビジネスモデル');
});
