import { expect, test } from '@playwright/test';

test('retired referral route redirects without claiming unavailable rewards or discarding stored IDs', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('makemoney_partner_id', 'p_pr20test'));
  await page.goto('/partners');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Make Money', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'リンクをコピー', exact: true })).toHaveCount(0);
  await expect(page.getByText('30%還元', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => localStorage.getItem('makemoney_partner_id'))).toBe('p_pr20test');
  expect(errors).toEqual([]);
});
