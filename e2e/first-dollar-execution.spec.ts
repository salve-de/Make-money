import { expect, test } from '@playwright/test';
import { PRIMARY } from './reader-fixture';

test('company dossier becomes a persistent First Dollar execution project', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`/?entity=${PRIMARY.id}`);
  await expect(page.getByRole('heading', { level: 2, name: PRIMARY.name, exact: true })).toBeVisible();

  await page.getByRole('link', { name: /計画を作成/ }).click();
  await expect(page).toHaveURL(new RegExp(`/execute/${PRIMARY.id}$`));
  await expect(page.getByRole('heading', { level: 1, name: /の実行計画$/ })).toBeVisible();

  const offer = page.getByLabel('売るもの');
  await offer.fill('E2E First Dollar Offer');
  await page.getByLabel('最初の顧客').fill('E2E first customer');
  await page.getByLabel('販売価格（円）').fill('3000');

  await expect.poll(async () => page.evaluate((id) => {
    const raw = localStorage.getItem(`makemoney.execution.anonymous.${id}`);
    if (!raw) return null;
    const project = JSON.parse(raw) as { offerName?: string; targetPriceJpy?: number };
    return { offerName: project.offerName, targetPriceJpy: project.targetPriceJpy };
  }, PRIMARY.id)).toEqual({ offerName: 'E2E First Dollar Offer', targetPriceJpy: 3000 });

  await page.reload();
  await expect(page.getByLabel('売るもの')).toHaveValue('E2E First Dollar Offer');
  await expect(page.getByLabel('販売価格（円）')).toHaveValue('3000');

  await page.goto('/execute');
  await expect(page.getByRole('heading', { level: 1, name: '実行計画', exact: true })).toBeVisible();
  await expect(page.getByRole('link').filter({ hasText: 'E2E First Dollar Offer' })).toHaveCount(1);

  expect(errors).toEqual([]);
});
