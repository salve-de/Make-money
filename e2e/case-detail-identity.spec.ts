import { expect, test } from '@playwright/test';

// 詳細の最上部が「身元カード」になり、本文が目次つきの区画に分かれ、常時PRO・運営者向けの欄が出ない。
const ID = 'ent_referralrock_8c13d5ee4cfc';

for (const [label, width, height] of [['スマホ390', 390, 844], ['スマホ320', 320, 700], ['PC1440', 1440, 900]] as const) {
  test(`${label}：詳細は身元カードから始まり、目次で区画へ飛べる。PRO帯も運営者欄も出ない`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/?entity=${ID}`);
    const card = page.getByRole('region', { name: '事業のあらまし' });
    await expect(card).toBeVisible({ timeout: 30_000 });
    // 社名は切れず（省略記号なし）、売上・料金・人数・創業の表がある
    await expect(page.getByRole('heading', { name: 'Referral Rock', exact: true })).toBeVisible();
    for (const label of ['売上', '料金', '人数', '創業']) await expect(card.getByText(label, { exact: true })).toBeVisible();
    const nav = page.getByRole('navigation', { name: '詳細の目次' });
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: '根拠' }).click();
    await expect(page.locator('#section-basis')).toBeInViewport();
    // 常時PRO（右上・下の帯）と、運営者向けの決済確認欄は読む画面に出さない
    await expect(page.getByRole('button', { name: 'PRO', exact: true })).toHaveCount(0);
    await expect(page.getByText('見本を開く')).toHaveCount(0);
    await expect(page.getByText('Stripe 読み取り専用キー')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('数字は出典に載っている値');
    // 横にはみ出さない
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
