import { expect, test } from '@playwright/test';

const cases = [
  {
    id: 'ent_org_4a819d424adf6b2a118f',
    name: 'Apollo Global Management',
    percent: '41.5%',
  },
  {
    id: 'ent_org_0e1d9b556075d9fc7f36',
    name: 'Starwood Real Estate Income Trust, Inc.',
    percent: '58.5%',
  },
] as const;

const forbiddenPublicStrings = [
  'rights.sec-edgar-public-facts.v1',
  'transport_typed_record_set_v1',
  'transport_typed_observation_v1',
  'exact_apollo_investing_entities',
  'exact_joint_venture_legal_name',
  'exact_jv_legal_name',
];

test.describe.configure({ mode: 'serial' });

for (const target of cases) {
  test(`c9e real local UI exposes only public-safe ${target.percent} for ${target.name}`, async ({ page }) => {
    const detailResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/businesses' &&
        url.searchParams.get('entity_id') === target.id &&
        url.searchParams.get('foundationOnly') === 'true'
      );
    }, { timeout: 60_000 });

    await page.goto(`/?entity=${encodeURIComponent(target.id)}`);

    const detailResponse = await detailResponsePromise;
    expect(detailResponse.status()).toBe(200);
    const detailPayload = await detailResponse.json();
    expect(detailPayload?.source).toBe('foundation_lake');

    const serialized = JSON.stringify(detailPayload);
    expect(serialized).toContain(target.percent.replace('%', ''));
    expect(serialized).toContain('U.S. Securities and Exchange Commission');
    expect(serialized).toContain('https://www.sec.gov/Archives/edgar/data/1711929/');
    expect(serialized).toContain('"commercialUse":"allowed"');
    expect(serialized).toContain('"publicFactDisplay":"allowed"');
    expect(serialized).toContain('"projectionMode":"fact_only"');
    for (const forbidden of forbiddenPublicStrings) {
      expect(serialized).not.toContain(forbidden);
    }

    await expect(page.getByRole('heading', { name: target.name, exact: true })).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole('button', { name: '証拠', exact: true }).click();

    const stream = page.locator('#section-stream');
    await expect(stream).toBeVisible();
    await expect(stream).toContainText(target.percent);
    await expect(stream.getByText(target.percent, { exact: true })).toHaveCount(1);
    await expect(stream).toContainText('公開・権利');
    await expect(stream).toContainText('商用表示: 許可');
    await expect(stream).toContainText('公開方式: 事実のみ');
    await expect(stream).toContainText('U.S. Securities and Exchange Commission');

    const secLink = stream.locator('a[href^="https://www.sec.gov/Archives/edgar/data/1711929/"]').first();
    await expect(secLink).toBeVisible();
    for (const forbidden of forbiddenPublicStrings) {
      await expect(stream).not.toContainText(forbidden);
    }
  });
}
