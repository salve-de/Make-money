import { test, expect } from '@playwright/test';
import { routeReader } from './reader-fixture';

// 詳細画面（概要・数値 / メモの2タブ）が、事例ごとに「中身」か「準備中」を正直に出すことを確かめる。
// - 公開版の103社に入っている事例（published = true）: 出典つきの事実・数値・推測を出す（reader は作り物を足す）。
// - 入っていない事例: 「この事例は公開していません。」だけ。名前も詳細も出ない。
// どちらも、内部の用語は画面に出ず、メモ欄は使える。
const entities = [
  ['ent_lopia_9c', '株式会社ロピア (OIC)', false],
  ['ent_pdf_ai_65', 'PDF.ai', false],
  ['ent_disco_6146_jp', '株式会社ディスコ', false],
  ['ent_shift_3697', '株式会社SHIFT', false],
  ['ent_keyence', 'キーエンス (KEYENCE)', false],
  ['ent_case06_51de613ea122941bf718', 'Bombas', false],
  ['ent_theranos_postmortem_dead', 'Theranos', false],
  ['ent_wework_landmine', 'WeWork Inc.', false],
  ['ent_plausible', 'Plausible Analytics', true],
  ['ent_typingmind_3a81f902', 'TypingMind', false],
] as const;

const INTERNAL_PHRASES = ['サバンナOS', 'サバンナ OS', '略奪転用方程式', '身も蓋もない真実', 'カニバリズム障壁'];
const RETIRED_SECTIONS = ['#section-summary', '#section-flywheel', '#section-loot-blueprint', '#section-evidence', '#section-cash-anatomy', '#section-stream'];

for (const [id, name, published] of entities) {
  test(`a published case shows its sourced record; an unpublished one shows nothing: ${name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    if (published) await routeReader(page, id);
    await page.goto(`/?entity=${id}`);
    if (!published) {
      // 公開目録に無い事例は、名前も実行計画へのリンクも出さない
      await expect(page.getByText('この事例は公開していません。')).toBeVisible();
      await expect(page.getByText(name)).toHaveCount(0);
      await expect(page.locator(`a[href="/execute/${id}"]`)).toHaveCount(0);
      expect(errors).toEqual([]);
      return;
    }
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    const inspector = page.getByRole('complementary', { name: `${name}の企業事例インスペクター` });
    for (const selector of RETIRED_SECTIONS) await expect(page.locator(selector)).toHaveCount(0);
    if (published) {
      await expect(inspector.locator('#section-metrics')).toHaveCount(1);
      await expect(inspector.locator('#section-sources')).toHaveCount(1);
      await expect(inspector.locator('#section-analysis')).toHaveCount(1);
      await expect(inspector.locator('[data-analysis]').first()).toContainText('推測');
      await expect(inspector).not.toContainText('この事例の詳細は準備中です。');
    }
    // 財務が未収集でも、0円の実測に見せない。
    await expect(inspector).not.toContainText(/(?<![\d,.])0円/);
    for (const phrase of INTERNAL_PHRASES) {
      await expect(page.locator('body')).not.toContainText(phrase);
    }
    await page.getByRole('button', { name: 'メモ', exact: true }).click();
    await expect(page.locator('#section-notes textarea')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}
