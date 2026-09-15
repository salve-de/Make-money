import { expect, type Page } from '@playwright/test';

/** Interact with the current two-tab inspector; keep persistence assertions in each test. */
export async function openNotes(page: Page) {
  await page.getByRole('button', { name: '【証拠】検証エビデンス', exact: true }).click();
  await page.getByRole('button', { name: '考察メモ', exact: true }).click();
  await expect(page.locator('#section-notes textarea')).toBeVisible();
}

export async function selectCompany(page: Page, name: string) {
  const row = page.getByRole('row').filter({ hasText: name }).filter({ visible: true });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
}
