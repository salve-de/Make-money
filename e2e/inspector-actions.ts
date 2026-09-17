import { expect, type Page } from '@playwright/test';

/** Use the visible product controls; keep persistence assertions in each test. */
export async function openNotes(page: Page) {
  await page.getByRole('button', { name: '証拠', exact: true }).click();
  await page.getByRole('button', { name: /^03\s*考察メモ$/ }).click();
  await expect(page.locator('#section-notes textarea')).toBeVisible();
}

export async function selectCompany(page: Page, name: string) {
  const notesWereOpen = await page.locator('#section-notes textarea').isVisible();
  const search = page.getByPlaceholder(/銘柄名/).first();
  const previousQuery = await search.inputValue();
  // The grid is virtualized: a company outside its rendered window has no DOM row.
  // Search via the real input rather than assuming every company is mounted.
  await search.fill(name);
  const row = page.getByRole('row').filter({ hasText: name }).filter({ visible: true });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
  await search.fill(previousQuery);
  if (notesWereOpen) await openNotes(page);
}
