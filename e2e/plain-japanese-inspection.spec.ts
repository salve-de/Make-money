import { test, expect } from '@playwright/test';

// Preserve business/evidence coverage on the evidence-first two-tab inspector.
const entities = [
  ['ent_lopia_9c', '株式会社ロピア (OIC)', false],
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
    if (['ent_pdf_ai_65', 'ent_disco_6146_jp', 'ent_keyence'].includes(id)) {
      await expect(page.getByRole('status')).toContainText(`${name}：詳細の公開確認が完了していない`);
      await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);
      await expect(page.getByRole('link', { name: `${name}を参考に計画を作る` })).toHaveAttribute('href', `/execute/${id}`);
      expect(errors).toEqual([]);
      return;
    }
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('#section-summary')).toHaveCount(1);
    // Uncollected financials no longer occupy a result card; the summary must not fabricate zeros.
    await expect(page.locator('#section-summary')).not.toContainText(/(?<![\d,.])0円/);
    await expect(page.locator('#section-flywheel')).toHaveCount(0);
    await expect(page.locator('#section-loot-blueprint')).toHaveCount(1);
    await expect(page.locator('#section-evidence')).toContainText(hazard ? '撤退・破綻に関する記録' : '根拠となる記録');
    expect(await page.locator('#section-evidence article').count()).toBeGreaterThanOrEqual(2);
    for (const phrase of ['サバンナOS', 'サバンナ OS', '略奪転用方程式', '身も蓋もない真実', 'カニバリズム障壁']) {
      await expect(page.locator('body')).not.toContainText(phrase);
    }
    await page.getByRole('button', { name: '出典・記録', exact: true }).click();
    await expect(page.locator('#section-sources')).toHaveCount(1);
    await expect(page.locator('#section-stream')).toHaveCount(1);
    await expect(page.locator('#section-notes textarea')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}
