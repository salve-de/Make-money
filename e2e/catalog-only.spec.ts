import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

// どの画面・どの API も、公開目録（data/catalog-release.json の details）に入っている事例だけを出す。
// 目録外 = 収集済みの全件（data/collected-registry.json）から目録を引いた残り。その ID と名前が出力のどこにも無いことを確かめる。
type RegistryRow = { id: string; name: string };
const root = process.cwd();
const manifest = JSON.parse(readFileSync(join(root, 'data/catalog-release.json'), 'utf8')) as { details: Record<string, string>; summaries: { hash: string } };
const registry = JSON.parse(readFileSync(join(root, 'data/collected-registry.json'), 'utf8')) as RegistryRow[];
const catalogIds = new Set(Object.keys(manifest.details).map((id) => id.toLowerCase()));
const outsiders = registry.filter((row) => !catalogIds.has(row.id.toLowerCase()));

// 公開してよい本文（要約・詳細）に出てくる名前（競合の名前など）は、目録外の名前としては数えない
const artifactText = (hash: string) => gunzipSync(readFileSync(join(root, '.catalog-release', `${hash}.json.gz`))).toString('utf8');
const catalogText = [
  Object.keys(manifest.details).join('\n'),
  artifactText(manifest.summaries.hash),
  ...Object.values(manifest.details).map(artifactText),
].join('\n').toLowerCase();
const outsiderNames = [...new Set(outsiders.map((row) => row.name.trim()))]
  .filter((name) => name.length >= 10 && !catalogText.includes(name.toLowerCase()));

const OUTSIDER_ID = outsiders[0].id;
const PUBLIC_PAGES = ['/', '/welcome', '/discover', '/execute', '/compare', '/build', '/marketplace', '/partners', '/legal'];
const PUBLIC_API = ['/api/businesses', '/api/businesses?limit=100', '/api/businesses?q=a', '/api/catalog'];

function expectNoOutsider(label: string, rawText: string, requestedId = ''): void {
  // 要求した ID そのもの（URL に自分で書いたもの）は、画面や応答に残っていても漏れとは数えない
  const text = requestedId ? rawText.split(requestedId).join('') : rawText;
  const lower = text.toLowerCase();
  const leakedIds = outsiders.filter((row) => lower.includes(row.id.toLowerCase())).slice(0, 3).map((row) => row.id);
  expect(leakedIds, `${label} に目録外の ID`).toEqual([]);
  const leakedNames = outsiderNames.filter((name) => text.includes(name)).slice(0, 3);
  expect(leakedNames, `${label} に目録外の名前`).toEqual([]);
}

test('there is a non-empty set of unpublished cases to check against', () => {
  expect(outsiders.length).toBeGreaterThan(1000);
  expect(catalogIds.size).toBeGreaterThan(50);
});

for (const path of PUBLIC_PAGES) {
  test(`page ${path} contains no unpublished case`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBeLessThan(500);
    expectNoOutsider(path, await response.text());
  });
}

for (const path of PUBLIC_API) {
  test(`api ${path} returns only published cases`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expectNoOutsider(path, await response.text());
  });
}

test('the ledger, discover and welcome screens render no unpublished case', async ({ page }) => {
  for (const path of ['/', '/discover', '/welcome']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expectNoOutsider(path, await page.content());
  }
});

test('?entity= with an unpublished case shows no name, numbers or execute link', async ({ page }) => {
  await page.goto(`/?entity=${OUTSIDER_ID}`);
  await expect(page.getByText('この事例は公開していません。')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expectNoOutsider('/?entity=', await page.content(), OUTSIDER_ID);
  await expect(page.locator(`a[href*="${OUTSIDER_ID}"]`)).toHaveCount(0);
});

test('detail requests for an unpublished case are 404 on every public exit', async ({ request }) => {
  for (const path of [
    `/api/businesses?entity_id=${OUTSIDER_ID}`,
    `/api/businesses?entity_id=${OUTSIDER_ID}&dossier_hash=${'a'.repeat(64)}`,
    `/api/media/file?entity_id=${OUTSIDER_ID}&asset=ma_${'a'.repeat(24)}`,
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    expectNoOutsider(path, await response.text(), OUTSIDER_ID);
  }
  const media = await request.get(`/api/media?entity_id=${OUTSIDER_ID}`);
  expect(media.status()).toBe(404);
});

test('a published case with a dossier_hash that differs from the catalog is 404', async ({ request }) => {
  const id = Object.keys(manifest.details)[0];
  const wrong = await request.get(`/api/businesses?entity_id=${id}&dossier_hash=${'b'.repeat(64)}`);
  expect(wrong.status()).toBe(404);
  const right = await request.get(`/api/businesses?entity_id=${id}&dossier_hash=${manifest.details[id]}`);
  expect(right.status()).toBe(200);
});

test('registry, radar and playbook screens no longer exist', async ({ request }) => {
  for (const path of ['/registry', '/api/registry', '/radar', '/playbook', '/macro']) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

test('a deep link with different casing opens the same published case', async ({ page }) => {
  const id = Object.keys(manifest.details)[0];
  await page.goto(`/?entity=${id.toUpperCase()}`);
  await expect(page.getByRole('complementary', { name: /の企業事例インスペクター/ })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('この事例は公開していません。')).toHaveCount(0);
});
