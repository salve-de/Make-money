import { expect, test } from '@playwright/test';

test('partner links hydrate on a noncanonical host and retain their stored ID', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('makemoney_partner_id', 'p_pr20test'));

  // Network idle is not a product invariant: the approval projection may
  // legitimately revalidate while the tab is visible. Assert the hydrated UI
  // that this test actually owns instead of waiting for global request silence.
  await page.goto('/partners');
  const referral = `${new URL(page.url()).origin}/?ref=p_pr20test`;
  await expect(page.getByText(referral, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'リンクをコピー', exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText(referral, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('makemoney_partner_id'))).toBe('p_pr20test');
  expect(errors).toEqual([]);
});