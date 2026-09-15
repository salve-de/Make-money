import { test, expect } from '@playwright/test';

// The base branch already replaced the old thirteen-section layout with a four-layer,
// two-tab inspector. Preserve evidence coverage, not obsolete copy/layout assertions.
const entities = [
  ['ent_lopia_9c', 'ロピア', false],
  ['ent_pdf_ai_65', 'PDF.ai', false],
  ['ent_disco_6146_jp', '株式会社ディスコ', false],
  ['ent_shift_3697', '株式会社SHIFT', false],
  ['ent_keyence', 'キーエンス (KEYENCE)', false],
  ['ent_case06_51de613ea122941bf718', 'Bombas', false],
  ['ent_theranos_postmortem_dead', 'Theranos', true],
  ['ent_wework_landmine', 'WeWork Inc.', true],
  ['ent_plausible', 'Plausible Analytics', false],
  ['ent_typingmind_3a81f902', 'TypingMind', false],
] as const;

for (const [id, name, hazard] of entities) {
  test(`current inspector retains business/evidence/audit sections: ${name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/?entity=${id}`);
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('#section-summary')).toHaveCount(1);
    await expect(page.locator('#section-cash-anatomy')).toHaveCount(1);
    await expect(page.locator('#section-evidence')).toContainText(hazard ? '失敗・撤退の事実ログ' : '儲けのウラ側');
    expect(await page.locator('#section-evidence article').count()).toBeGreaterThanOrEqual(2);
    for (const phrase of ['サバンナOS', 'サバンナ OS', '略奪転用方程式', '身も蓋もない真実', 'カニバリズム障壁']) {
      await expect(page.locator('body')).not.toContainText(phrase);
    }
    await page.getByRole('button', { name: '【証拠】検証エビデンス', exact: true }).click();
    await expect(page.locator('#section-sources')).toHaveCount(1);
    await expect(page.locator('#section-stream')).toHaveCount(1);
    await expect(page.locator('#section-notes textarea')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}
