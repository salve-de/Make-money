import { expect, type Page } from '@playwright/test';

/** 画面の部品を実際に操作して事例を選ぶ（保存の確認は各テストで行う）。 */
export async function selectCompany(page: Page, name: string) {
  const search = page.getByPlaceholder(/会社名・事業/).first();
  const previousQuery = await search.inputValue();
  // The grid is virtualized: a company outside its rendered window has no DOM row.
  // Search via the real input rather than assuming every company is mounted.
  await search.fill(name);
  const row = page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) }).filter({ visible: true });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
  await search.fill(previousQuery);
}
