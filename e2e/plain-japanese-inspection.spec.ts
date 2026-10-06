import { test, expect } from '@playwright/test';

// 詳細画面（概要・数値 / メモの2タブ）が、事例ごとに「中身」か「準備中」を正直に出すことを確かめる。
// - 公開目録の10件（published = true）: 出典つきの事実・推測を出す。数値の欄は、数値が1件でもある事例だけ出る（Teamcamp は無い）。
// - 目録に無い事例: 「この事例は公開していません。」だけ。名前も詳細も出ない。
// どちらも、内部の用語は画面に出ず、メモ欄は使える。
// [id, 名前, 公開しているか, 数値の欄が出るか]
const entities = [
  ['ent_gorails_640d8f688451', 'GoRails', true, true],
  ['ent_codementor_ba692caa3db3', 'Codementor', true, true],
  ['ent_teamcamp_ae0c21986c4d', 'Teamcamp', true, false],
  ['ent_myoperator_49c393230a2d', 'MyOperator', true, true],
  ['ent_referralrock_8c13d5ee4cfc', 'Referral Rock', true, true],
  ['ent_ejunkie_7e9e46bd9643', 'E-junkie', true, true],
  ['ent_rfrcui_64e924ac', 'Refactoring UI', true, true],
  ['ent_heygen_8f11a1', 'HeyGen', true, true],
  ['ent_requestly_28e9f2', 'Requestly', true, true],
  ['ent_practicaltypographycom_e9aa6bc94ccf', 'Practical Typography', true, true],
  ['ent_lopia_9c', '株式会社ロピア (OIC)', false, false],
  ['ent_pdf_ai_65', 'PDF.ai', false, false],
  ['ent_disco_6146_jp', '株式会社ディスコ', false, false],
  ['ent_shift_3697', '株式会社SHIFT', false, false],
  ['ent_keyence', 'キーエンス (KEYENCE)', false, false],
  ['ent_case06_51de613ea122941bf718', 'Bombas', false, false],
  ['ent_theranos_postmortem_dead', 'Theranos', false, false],
  ['ent_wework_landmine', 'WeWork Inc.', false, false],
  ['ent_plausible', 'Plausible Analytics', false, false],
  ['ent_typingmind_3a81f902', 'TypingMind', false, false],
] as const;

const INTERNAL_PHRASES = ['サバンナOS', 'サバンナ OS', '略奪転用方程式', '身も蓋もない真実', 'カニバリズム障壁'];
const RETIRED_SECTIONS = ['#section-summary', '#section-flywheel', '#section-loot-blueprint', '#section-evidence', '#section-cash-anatomy', '#section-stream'];

for (const [id, name, published, hasMetrics] of entities) {
  test(`a published case shows its sourced record; an unpublished one shows nothing: ${name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
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
      await expect(inspector.locator('#section-metrics')).toHaveCount(hasMetrics ? 1 : 0);
      await expect(inspector.locator('#section-sources')).toHaveCount(1);
      await expect(inspector.getByRole('region', { name: '事業のあらまし' })).toHaveCount(1);
      await expect(inspector.locator('[data-analysis]').first()).toBeVisible();
      // 推測には薄い印（推測・推定）が付き、数値・計算・出典は末尾の「根拠」の区画にまとまる
      await expect(inspector.locator('#section-basis')).toHaveCount(1);
      await expect(inspector.locator('[data-analysis]').first()).toContainText(/推測|推定|見どころ/);
      await expect(inspector).not.toContainText('未確認:');
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
