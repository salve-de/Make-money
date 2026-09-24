import { expect, test, type Page, type Route } from '@playwright/test';

const entityId = 'ent_structured_0123456789abcdef0123';

function summary() {
  return {
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
}

function detail(observation: Record<string, unknown>) {
  return {
    ...summary(),
    claims: [],
    metrics: [],
    moneySignals: [],
    events: [],
    relationships: [],
    observations: [observation],
    derived: [],
    bundlesScanned: 1,
    bundleObjectsListed: 1,
    bundleScanComplete: true,
  };
}

async function routeFoundation(page: Page, detailBody: unknown) {
  await page.route('**/api/businesses*', (route: Route) => {
    const url = new URL(route.request().url());
    const isDetail = url.searchParams.get('entity_id') === entityId;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isDetail
        ? { source: 'foundation_lake', data: detailBody }
        : { source: 'foundation_lake', data: [summary()], hasMore: false, nextCursor: null }),
    });
  });
  await page.route('**/api/entities/approve*', (route: Route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ entityIds: [] }),
  }));
}

async function openEvidence(page: Page) {
  await page.goto(`/?entity=${entityId}`);
  await expect(page.getByRole('heading', { name: 'Structured Foundation Demo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '証拠', exact: true }).click();
  const stream = page.locator('#section-stream');
  await expect(stream).toBeInViewport();
  return stream;
}

test('raw-only structured metadata stays hidden on the active CompanyInspector path', async ({ page }) => {
  await routeFoundation(page, detail({
    id: 'obs_raw_only',
    kind: 'business_model.raw',
    text: 'Raw semantic text',
    originType: 'reported',
    verificationStatus: 'SUPPORTED',
    observedAt: '2026-09-24T13:29:00Z',
    collectionTier: 'CORE',
    collectionChannel: 'web',
    observer: 'DISCOVERY',
    payloadSchemaRef: 'urn:internal:schema',
    payload: {
      raw_secret: 'must-not-appear-in-ui',
    },
    evidenceIds: ['ev_structured'],
  }));

  const stream = await openEvidence(page);
  await expect(stream).toContainText('Raw semantic text');
  await expect(stream.getByText('構造化データ', { exact: true })).toHaveCount(0);
  await expect(stream).not.toContainText('must-not-appear-in-ui');
  await expect(stream).not.toContainText('DISCOVERY');
  await expect(stream).not.toContainText('urn:internal:schema');
});

test('explicit publicPayload reaches the active CompanyInspector evidence stream without internal metadata', async ({ page }) => {
  await routeFoundation(page, detail({
    id: 'obs_public',
    kind: 'business_model.revenue_signal',
    text: 'Structured revenue signal',
    originType: 'reported',
    verificationStatus: 'SUPPORTED',
    observedAt: '2026-09-24T13:29:00Z',
    observer: 'DISCOVERY',
    payloadSchemaRef: 'urn:internal:schema',
    payload: {
      raw_secret: 'must-not-appear-in-ui',
    },
    publicPayload: {
      amount: 123000000,
      currency: 'USD',
      nested: {
        public_fact: true,
      },
    },
    evidenceIds: ['ev_structured'],
  }));

  const stream = await openEvidence(page);
  await expect(stream).toContainText('Structured revenue signal');
  const structured = stream.getByText('構造化データ', { exact: true });
  await expect(structured).toBeVisible();
  await structured.click();

  await expect(stream).toContainText('business_model.revenue_signal');
  await expect(stream).toContainText('public_fact');
  await expect(stream).toContainText('123000000');
  await expect(stream).not.toContainText('must-not-appear-in-ui');
  await expect(stream).not.toContainText('DISCOVERY');
  await expect(stream).not.toContainText('urn:internal:schema');
});
