import type { Page } from '@playwright/test';

import type { ReaderCase } from '../src/shared/reader-case';

/**
 * 詳細画面は entity.reader だけを読む。reader は公開版を作る時（pnpm catalog:prepare）にだけ入るので、
 * E2E のサーバー（作業ツリーのデータ）は reader を持たず、どの事例も「準備中」を出す。
 * 公開済みの事例の画面を確かめる検査は、実在の事例の詳細レスポンスに、この作り物の reader を足して返す。
 * 作り物なので、金額・文はどれも実在の事例の値ではない。事実と推測を分けて出す画面の構造を確かめるためだけに使う。
 */
export const SAMPLE_READER: ReaderCase = {
  sources: [
    { id: 's1', publisher: 'サンプル公式', url: 'https://example.com/pricing', kind: 'OFFICIAL', title: '料金ページ', publishedAt: '2026-05-01' },
    { id: 's2', publisher: 'サンプル報道', url: 'https://example.com/news', kind: 'ARTICLE', title: '運営者への取材記事', publishedAt: '2026-06-10' },
  ],
  facts: [
    { id: 'f1', kind: 'DESCRIPTION', text: 'テスト用の作り物の事例。サイトの訪問数を数える月額の道具を提供する。', sourceId: 's1', attribution: 'OFFICIAL' },
    { id: 'f2', kind: 'PRICING', text: '月額の料金は訪問数に応じて段階が上がる。', sourceId: 's1', attribution: 'OFFICIAL' },
    { id: 'f3', kind: 'TEAM', text: '運営者本人は少人数のチームで運営していると述べた。', sourceId: 's2', attribution: 'SELF_REPORTED' },
  ],
  metrics: [
    { id: 'm1', measure: 'REVENUE', periodKind: 'MONTH', period: '2026-05', amount: 1_200_000, currency: 'JPY', origin: 'SELF_REPORTED', sourceId: 's2' },
    { id: 'm2', measure: 'COST', periodKind: 'MONTH', period: '2026-05', amount: 300_000, currency: 'JPY', origin: 'ESTIMATED', basis: '仮置きの計算', sourceId: 's2' },
  ],
  unknowns: ['PROFIT'],
  summaryFactId: 'f1',
  analysis: [
    { id: 'a1', item: 'HEADLINE', text: 'テスト用の見出し: 少人数のまま料金の段階を増やし、単価を上げた。', basis: ['f2'], confidence: 'MEDIUM' },
    { id: 'a2', item: 'STORY', text: 'テスト用の物語: 小さく始めて、料金の段階で単価を上げていった。', basis: ['f2', 'f3'], confidence: 'LOW' },
    { id: 'a3', item: 'TAKE_HOME', text: 'テスト用の推論: 売上から原価を引いた残りが運営者の取り分になる。', basis: ['m1', 'm2'], formula: '120万円 − 30万円 = 90万円（原価は仮置き）', confidence: 'LOW' },
  ],
};

/**
 * 実在の事例（作業ツリーのデータ）の詳細レスポンスに reader を足して返す。
 * 事例一覧の行を押す・URL の ?entity= で開く、のどちらでも同じ経路（/api/businesses?entity_id=）を通る。
 */
export async function routeReader(page: Page, entityId: string, reader: ReaderCase = SAMPLE_READER) {
  await page.route('**/api/businesses*', async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('entity_id') !== entityId || url.searchParams.has('foundationOnly')) return route.continue();
    const response = await route.fetch();
    if (!response.ok()) return route.fulfill({ response });
    const body = await response.json() as { data?: Record<string, unknown> };
    if (!body.data) return route.fulfill({ response });
    return route.fulfill({ response, json: { ...body, data: { ...body.data, reader } } });
  });
}
