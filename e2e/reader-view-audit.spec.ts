import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

import { auditScreen, hitKey, PENDING, RULES } from '../scripts/reader-view/rules.mjs';
import { auditStructure, STRUCTURE_RULES } from '../scripts/reader-view/structure-rules.mjs';
import { collectInspector, type ScreenCase } from './support/reader-view-collect';

// 画面の自動監査（docs/COLLECT_TO_UI.md「画面の自動監査」）。
// 公開している全事例の一覧と詳細を本番と同じサーバーで実際に描き、読む人に見える文に見る人目線の規則（scripts/reader-view/rules.mjs）を掛ける。
// 既に分かっていて直す担当が決まっている違反は data/reader-view-known.json に置く。そこに無い違反が1つでも出たら落ちる（新しい事例は一発で通す）。
// 直った違反が一覧に残っていても落ちる（一覧を減らすだけで、増やさない）。結果の表は test-results/reader-view-audit/ に書く。
const ROOT = process.cwd();
const ids = Object.keys((JSON.parse(readFileSync(resolve(ROOT, 'data/catalog-release.json'), 'utf8')) as { details: Record<string, string> }).details);
const KNOWN_FILE = resolve(ROOT, 'data/reader-view-known.json');
type Hit = { id: string; where: string; rule: string; text: string };
type Known = Hit & { reason: string };
const known = JSON.parse(readFileSync(KNOWN_FILE, 'utf8')) as Known[];
// 画面の仕組みの規則（structure-rules.mjs）は、第1世代の公開事例の文の直しが済むまで、その事例の分だけ保留にする（新しい事例は保留にしない）
const PENDING_IDS_FILE = resolve(ROOT, 'data/reader-view-pending-ids.json');
const structurePendingIds = new Set<string>(existsSync(PENDING_IDS_FILE) ? (JSON.parse(readFileSync(PENDING_IDS_FILE, 'utf8')) as { ids: string[] }).ids : []);
const STRUCTURE_RULE_NAMES = new Set<string>(Object.values(STRUCTURE_RULES));
// 画像は、承認済みの画像の置き場（data/media-staging）がある環境でだけ見る。無い環境（自動テスト）では保留として表に出す。
const checkImages = process.env.READER_VIEW_IMAGES === '1' || existsSync(resolve(ROOT, 'data/media-staging'));
const OUT = resolve(ROOT, 'test-results/reader-view-audit');
// 既知の違反を書き出す時の、規則ごとの「誰が直すか」の既定（人が書き換えてよい）
const DEFAULT_REASON: Record<string, string> = {
  [RULES.ORIGIN]: '事例の文の担当が、出どころの印を外す（src/shared/origin-tag.ts の対象を広げる）',
  [RULES.SAME_SOURCE]: '画面の担当が、出典の番号を章ごとでなく画面全体で1つに振る',
  [RULES.PRICE_EXTRA]: '事例の文の担当が、料金を「プラン名＋月額＋上限」だけに短くする',
  [RULES.PRICE_LONG]: '事例の文の担当が、料金を「プラン名＋月額＋上限」だけに短くする',
  [RULES.DUP_NUMBER]: '事例の文の担当が、同じ数字を1か所だけにする',
  [RULES.DUP_PHRASE]: '事例の文の担当が、同じ話を1か所だけにする',
  [RULES.OVERVIEW_SALES]: '事例の文の担当が、売り方を概要から稼ぎ方の欄へ移す',
  [RULES.JARGON]: '事例の文の担当が、略語を言い換えるか説明を添える',
  [RULES.YEN]: '画面の担当が、畳んだ事実・数値と一覧の外貨にも円換算を添える',
  [RULES.LABEL_MISMATCH]: '事例の文の担当が、項目名に合う数字を選ぶ',
};

test.setTimeout(Math.max(120_000, ids.length * 20_000));

test('公開している全事例の画面の文が、見る人目線の規則を守っている', async ({ page }) => {
  const started = Date.now();
  await page.goto('/');
  await page.locator('[data-variant="table"] [data-entity-id]').first().waitFor();
  // 一覧は10件ずつ段階で読み込む。末尾までスクロールして、公開している全事例の行が描かれるまで待つ（増えなくなったら止める）
  const rows = page.locator('[data-variant="table"] [data-entity-id]');
  for (let still = 0, last = -1; still < 5;) {
    const present = await rows.evaluateAll((els, want) => new Set(els.map((el) => el.getAttribute('data-entity-id'))).size >= want.length && want.every((id) => els.some((el) => el.getAttribute('data-entity-id') === id)), ids);
    if (present) break;
    const count = await rows.count();
    still = count === last ? still + 1 : 0;
    last = count;
    await rows.last().scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  }
  const list = new Map<string, string>();
  for (const id of ids) {
    const row = page.locator(`[data-variant="table"] [data-entity-id="${id}"]`).first();
    list.set(id, (await row.count()) ? (await row.innerText()).trim() : '');
  }
  const screens: ScreenCase[] = [];
  for (const id of ids) {
    await page.goto(`/?entity=${id}`);
    const aside = page.locator('aside[aria-label$="の企業事例インスペクター"]');
    await aside.waitFor();
    await page.waitForLoadState('networkidle');
    screens.push({ id, list: list.get(id) ?? '', ...(await aside.evaluate(collectInspector)) });
  }
  const hits: Hit[] = screens.flatMap((screen) => [...auditScreen(screen), ...auditStructure(screen)]);
  for (const screen of screens) if (!list.get(screen.id)) hits.push({ id: screen.id, where: '一覧', rule: '一覧に行が無い', text: screen.name });
  expect(screens.length, '公開している事例が1件も描けていない').toBeGreaterThan(0);
  // 画像は、置き場がある環境では保留にしない
  const isPending = (hit: Hit) => (Boolean(PENDING[hit.rule]) && !(hit.rule === RULES.NO_IMAGE && checkImages)) || (STRUCTURE_RULE_NAMES.has(hit.rule) && structurePendingIds.has(hit.id))
    // 円の書き方をそろえた結果、これまで表記ゆれで隠れていた「円つきの同じ言い回し」が見えるようになった分は、第1世代の文の直し待ち
    || (hit.rule === RULES.DUP_PHRASE && /円/.test(hit.text) && structurePendingIds.has(hit.id));
  const pending = hits.filter(isPending);
  const active = hits.filter((hit) => !isPending(hit));
  const knownKeys = new Set(known.map(hitKey));
  const hitKeys = new Set(active.map(hitKey));
  const fresh = active.filter((hit) => !knownKeys.has(hitKey(hit)));
  const fixed = known.filter((k) => ids.includes(k.id) && !hitKeys.has(hitKey(k)));
  const seconds = Math.round((Date.now() - started) / 100) / 10;

  mkdirSync(OUT, { recursive: true });
  const nameOf = new Map(screens.map((s) => [s.id, s.name]));
  const row = (h: Hit) => `| ${nameOf.get(h.id) ?? h.id} | ${h.where} | ${h.rule} | ${h.text.replace(/\|/g, '／')} |`;
  const table = (rows: Hit[]) => (rows.length ? ['| 事例 | 画面の箇所 | 規則 | 該当文 |', '| --- | --- | --- | --- |', ...rows.map(row)].join('\n') : 'なし');
  const byRule = Object.fromEntries(Object.values(RULES).map((r) => [r, hits.filter((h) => h.rule === r).length]));
  writeFileSync(resolve(OUT, 'report.json'), JSON.stringify({ cases: screens.length, seconds, checkImages, byRule, fresh, fixed, pending, hits, screens }, null, 1));
  writeFileSync(resolve(OUT, 'report.md'), [
    `# 画面の自動監査（${screens.length}件・${seconds}秒）`,
    checkImages ? '' : '画像の検査は保留（承認済みの画像の置き場 data/media-staging が無い環境）。',
    `## 新しい違反（${fresh.length}）`, table(fresh),
    `## 直ったので data/reader-view-known.json から消すもの（${fixed.length}）`, table(fixed),
    `## 既知の違反（${active.length - fresh.length}）`, table(active.filter((h) => knownKeys.has(hitKey(h)))),
    `## 保留（${pending.length}。落とさない。画像・概要の規則と、第1世代の文の直し待ちの規則）`, Object.entries(PENDING).map(([rule, why]) => `- ${rule}: ${why}`).join('\n'), table(pending),
  ].join('\n\n'));
  console.log(`[reader-view] ${screens.length}件 ${seconds}秒 違反${active.length}（新しい${fresh.length}・既知${active.length - fresh.length}・直った${fixed.length}）保留${pending.length} 表: test-results/reader-view-audit/report.md`);
  if (process.env.READER_VIEW_WRITE_KNOWN === '1') {
    // 初回の取り込みと、直す担当が決まった違反を足す時だけ使う。理由の欄は人が書く。
    const reasons = new Map(known.map((k) => [hitKey(k), k.reason]));
    writeFileSync(KNOWN_FILE, `${JSON.stringify(active.map((h) => ({ ...h, reason: reasons.get(hitKey(h)) ?? DEFAULT_REASON[h.rule] ?? '' })), null, 1)}\n`);
    return;
  }
  expect(fresh.map(row), `新しい違反（data/reader-view-known.json に無い）。表: test-results/reader-view-audit/report.md`).toEqual([]);
  expect(fixed.map(row), '直った違反が data/reader-view-known.json に残っている（消す）').toEqual([]);
});
