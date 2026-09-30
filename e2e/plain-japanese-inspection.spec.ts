import { test, expect } from '@playwright/test';
import { routeReader } from './reader-fixture';

// 詳細画面（概要・数値 / メモの2タブ）が、事例ごとに「中身」か「準備中」を正直に出すことを確かめる。
// - 公開版の103社に入っている事例（published = true）: 出典つきの事実・数値・推測を出す（reader は作り物を足す）。
// - 入っていない事例: 詳細は「準備中」。旧画面の作文セクション・0円の実測は出ない。
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
  test(`current inspector shows either the sourced record or the pending notice: ${name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    if (published) await routeReader(page, id);
    await page.goto(`/?entity=${id}`);
    if (['ent_pdf_ai_65', 'ent_disco_6146_jp', 'ent_keyence'].includes(id)) {
      await expect(page.getByRole('status')).toContainText(`${name}：詳細の公開確認が完了していない`);
      await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);
      await expect(page.getByRole('link', { name: `${name}を参考に計画を作る` })).toHaveAttribute('href', `/execute/${id}`);
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
    } else {
      await expect(inspector).toContainText('この事例の詳細は準備中です。');
      await expect(inspector.locator('#section-metrics, #section-sources, #section-analysis')).toHaveCount(0);
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
