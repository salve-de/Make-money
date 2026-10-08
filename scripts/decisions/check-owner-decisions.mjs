#!/usr/bin/env node
/**
 * オーナー決定の画面確認（読むだけ）。data/owner-decisions.json の「画面に出してはいけない物」が、
 * 本番の事例の詳細画面（読む人に見える文）に出ていないかを見る。
 *
 * 公開を止める関門ではない（オーナー方針: 先に出して、確認は後）。違反を見つけたら一覧を出して終了コード 1。
 * 終了コード: 0 = 違反なし / 1 = 違反あり / 2 = 画面を開けない事例があり、確認しきれていない（正常とは扱わない）
 *
 * 使い方: pnpm decisions:check [--site-url https://…] [--max 12] [--ids a,b] [--json]
 *   --max N   見る事例の数の上限（既定 12。一覧を世代ごとに散らして選ぶ）。0 で全件
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDecisions, scanScreen } from './owner-decisions-rules.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_SITE = 'https://make-money-app.sato-business-0117.workers.dev';
const args = process.argv.slice(2);
const val = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const site = (val('--site-url') ?? process.env.DAILY_SITE_URL ?? DEFAULT_SITE).replace(/\/$/, '');
const max = Number(val('--max') ?? 12);
const asJson = args.includes('--json');

async function listIds() {
  const ids = [];
  for (let offset = 0, guard = 0; guard < 200; guard += 1) {
    const res = await fetch(`${site}/api/catalog?pageSize=50&offset=${offset}`);
    if (!res.ok) throw new Error(`一覧が取れない: HTTP ${res.status}`);
    const page = await res.json();
    for (const row of page.data ?? []) ids.push({ id: row.id, generation: row.generation ?? 1 });
    if (page.nextOffset == null) break;
    offset = page.nextOffset;
  }
  return ids;
}

/** 世代ごとに順に1件ずつ取って散らす（新しい世代が先）。 */
function pick(rows, limit) {
  if (!limit || rows.length <= limit) return rows.map((r) => r.id);
  const groups = new Map();
  for (const r of rows) groups.set(r.generation, [...(groups.get(r.generation) ?? []), r.id]);
  const order = [...groups.keys()].sort((a, b) => b - a);
  const out = [];
  for (let i = 0; out.length < limit; i += 1) {
    let added = false;
    for (const g of order) { const id = groups.get(g)[i]; if (id && out.length < limit) { out.push(id); added = true; } }
    if (!added) break;
  }
  return out;
}

async function main() {
  const decisions = loadDecisions(resolve(ROOT, 'data/owner-decisions.json'));
  const ids = val('--ids') ? val('--ids').split(',').filter(Boolean) : pick(await listIds(), max);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const violations = [];
  const unreadable = [];
  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    for (const id of ids) {
      try {
        await page.goto(`${site}/?entity=${encodeURIComponent(id)}`, { waitUntil: 'domcontentloaded' });
        const aside = page.locator('aside[aria-label$="の企業事例インスペクター"]');
        await aside.waitFor({ timeout: 30_000 });
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
        const text = await page.evaluate(() => {
          document.querySelectorAll('details').forEach((d) => { d.open = true; });
          return document.body.innerText;
        });
        if (text.trim().length < 200) { unreadable.push(id); continue; }
        violations.push(...scanScreen(id, text, decisions));
      } catch { unreadable.push(id); }
    }
  } finally { await browser.close(); }
  const result = { site, checked: ids.length - unreadable.length, unreadable, decisions: decisions.length, violations };
  if (asJson) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`[decisions:check] ${site} ${result.checked}件の画面を、決定${decisions.length}件で確認`);
    for (const v of violations) console.log(`  違反 ${v.id}（${v.label}） ${v.caseId}: …${v.excerpt}…`);
    if (unreadable.length) console.log(`  画面を読めなかった事例: ${unreadable.join(', ')}`);
    console.log(violations.length ? `違反 ${violations.length} 件` : unreadable.length ? '違反は見つからないが、読めなかった事例があり確認しきれていない' : '違反なし');
  }
  // 違反が先。違反が無くても、読めなかった事例が1件でもあれば確認しきれていないので 2（正常とは扱わない）
  if (violations.length) process.exit(1);
  process.exit(unreadable.length || result.checked === 0 ? 2 : 0);
}

main().catch((e) => { console.error(`[decisions:check] 確認できない: ${e.message}`); process.exit(2); });
