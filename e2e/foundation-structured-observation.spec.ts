import { expect, test } from '@playwright/test';

test('structured Foundation observation reaches the active CompanyInspector evidence stream', async ({ page }) => {
  const entityId = 'ent_structured_0123456789abcdef0123';
  const summary = {
    id: entityId,
    name: 'Structured Foundation Demo',
    entityType: 'company',
    aliases: [],
    canonicalIdentifier: null,
    domain: 'example.com',
    status: 'active',
    observedAt: '2026-09-24T13:29:00Z',
    evidenceIds: ['ev_structured'],
    valueProfile: {
      tier: 'CANDIDATE',
      score: 3,
      labels: ['事業'],
      businessSignal: 'Structured Foundation observation demo',
      painSignal: null,
      moneySignal: null,
      tractionSignal: null,
      mechanismSignal: null,
      timeSignal: '2026-09-24 観測',
      counts: {
        claims: 0,
        metrics: 0,
        moneySignals: 0,
        events: 0,
        observations: 1,
        derived: 0,
        evidence: 1,
      },
    },
  };

  const detail = {
    ...summary,
    claims: [],
    metrics: [],
    moneySignals: [],
    events: [],
    relationships: [],
    observations: [{
      id: 'obs_structured',
      kind: 'business_model.revenue_signal',
      text: 'Structured revenue signal',
      originType: 'reported',
      verificationStatus: 'SUPPORTED',
      observedAt: '2026-09-24T13:29:00Z',
      collectionTier: null,
      collectionChannel: 'web',
      observer: 'DISCOVERY',
      payloadSchemaRef: 'urn:test:structured:v1',
      payload: {
        amount: 123000000,
        currency: 'USD',
        nested: {
          must_survive_transport: true,
        },
      },
      evidenceIds: ['ev_structured'],
    }],
    derived: [],
    bundlesScanned: 1,
    bundleObjectsListed: 1,
    bundleScanComplete: true,
  };

  let detailReturned = false;
  await page.route('**/api/businesses*', (route) => {
    const url = new URL(route.request().url());
    const isDetail = url.searchParams.get('entity_id') === entityId;
    if (isDetail) detailReturned = true;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isDetail
        ? { source: 'foundation_lake', data: detail }
        : { source: 'foundation_lake', data: [summary], hasMore: false, nextCursor: null }),
    });
  });
  await page.route('**/api/entities/approve*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ entityIds: [] }),
  }));

  await page.goto(`/?entity=${entityId}`);
  await expect.poll(() => detailReturned).toBe(true);
  await expect(page.getByRole('heading', { name: 'Structured Foundation Demo', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '証拠', exact: true }).click();
  const stream = page.locator('#section-stream');
  await expect(stream).toBeInViewport();
  await expect(stream).toContainText('Structured revenue signal');

  const structured = stream.getByText('構造化データ', { exact: true });
  await expect(structured).toBeVisible();
  await structured.click();

  await expect(stream).toContainText('business_model.revenue_signal');
  await expect(stream).toContainText('urn:test:structured:v1');
  await expect(stream).toContainText('DISCOVERY');
  await expect(stream).toContainText('must_survive_transport');
  await expect(stream).toContainText('123000000');
});
