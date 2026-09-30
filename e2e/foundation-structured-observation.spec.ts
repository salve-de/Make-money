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

// 詳細画面は entity.reader だけを読む。Foundation の観測（observations）と構造化データ（payload / publicPayload）を並べる
// 「出典・記録」タブと証跡ストリーム（#section-stream）は撤去済み。撤去された表示そのものは確かめられないので、
// 守るべき中身を今の画面に置き換える: Foundation の内部メタデータ・生の payload・公開用の構造化データが、
// 詳細画面（本文全体）に一切出ないこと。収集しただけの観測は、公開版に入るまで「準備中」になる。
async function openDetail(page: Page) {
  await page.goto(`/?entity=${entityId}`);
  await expect(page.getByRole('heading', { name: 'Structured Foundation Demo', exact: true })).toBeVisible();
  const inspector = page.getByRole('complementary', { name: 'Structured Foundation Demoの企業事例インスペクター' });
  await expect(inspector).toContainText('この事例の詳細は準備中です。');
  await expect(page.getByRole('button', { name: '出典・記録', exact: true })).toHaveCount(0);
  await expect(page.locator('#section-stream')).toHaveCount(0);
  return page.locator('body');
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

  const body = await openDetail(page);
  await expect(body.getByText('構造化データ', { exact: true })).toHaveCount(0);
  await expect(body).not.toContainText('must-not-appear-in-ui');
  await expect(body).not.toContainText('raw_secret');
  await expect(body).not.toContainText('DISCOVERY');
  await expect(body).not.toContainText('urn:internal:schema');
  await expect(body).not.toContainText('business_model.raw');
});

test('explicit publicPayload does not reach the reader-only inspector and no internal metadata leaks', async ({ page }) => {
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

  const body = await openDetail(page);
  // 出典つきの reader を持たない観測は、公開用の構造化データであっても数字として画面に出さない（未確認の金額を実測に見せない）。
  await expect(body.getByText('構造化データ', { exact: true })).toHaveCount(0);
  await expect(body).not.toContainText('123000000');
  await expect(body).not.toContainText('123,000,000');
  await expect(body).not.toContainText('public_fact');
  await expect(body).not.toContainText('business_model.revenue_signal');
  await expect(body).not.toContainText('must-not-appear-in-ui');
  await expect(body).not.toContainText('DISCOVERY');
  await expect(body).not.toContainText('urn:internal:schema');
});
