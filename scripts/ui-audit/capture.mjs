/**
 * 全ページをPC(1440)・タブレット(768)・スマホ(375)で撮影し、UIの数値を測る。
 * 使い方: 開発サーバーを起動してから
 *   UI_AUDIT_BASE_URL=http://localhost:3000 node scripts/ui-audit/capture.mjs
 * 出力: 画面ごとのPNGと results.json（横はみ出し・12px未満の文字・小さすぎる押し場所・色数など）。
 * 仕様は docs/design/TERMINAL_UI.md。
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.UI_AUDIT_BASE_URL || 'http://localhost:3000';
const OUT_ROOT = process.env.UI_AUDIT_OUT_DIR || path.join(os.tmpdir(), 'make-money-ui-audit');
const OUT = path.join(OUT_ROOT, 'shots') + '/';
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  pc: { width: 1440, height: 900, isMobile: false, hasTouch: false },
  tab: { width: 768, height: 1024, isMobile: true, hasTouch: true },
  sp: { width: 375, height: 812, isMobile: true, hasTouch: true },
};

let routes = [
  '/', '/?mode=PLAYBOOK', '/?mode=RADAR', '/?mode=ARCHETYPES', '/?mode=SYNTHESIS',
  '/discover', '/finder', '/macro', '/radar', '/playbook', '/registry', '/build', '/execute',
  '/marketplace', '/marketplace/new', '/partners', '/welcome', '/success',
];

const METRICS = () => {
  const vw = innerWidth;
  const all = [...document.querySelectorAll('body *')];
  const shown = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const vis = all.filter(shown);
  const txt = vis.filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  const fs = {}; let tiny = 0;
  txt.forEach((e) => { const f = Math.round(parseFloat(getComputedStyle(e).fontSize)); fs[f] = (fs[f] || 0) + 1; if (f < 12) tiny++; });
  const inter = vis.filter((e) => e.matches('a,button,[role=button],input,select,textarea'));
  const minT = vw < 1024 ? 44 : 24;
  const small = inter.filter((e) => { const r = e.getBoundingClientRect(); return r.height < minT * 0.8 || r.width < minT * 0.8; });
  const unlabeled = inter.filter((e) => !(e.innerText || '').trim() && !e.getAttribute('aria-label') && !e.title && !e.placeholder && !e.getAttribute('aria-labelledby'));
  const off = vis.filter((e) => e.getBoundingClientRect().right > vw + 2 && !['fixed', 'sticky'].includes(getComputedStyle(e).position));
  const colors = new Set(); const bgs = new Set();
  vis.forEach((e) => { const s = getComputedStyle(e); colors.add(s.color); if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') bgs.add(s.backgroundColor); });
  const h1 = [...document.querySelectorAll('h1')].filter(shown).map((e) => e.innerText.trim().slice(0, 40));
  const imgsBroken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length;
  const text = document.body.innerText;
  return {
    title: document.title, h1, vw, scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight,
    overflowX: document.documentElement.scrollWidth > vw + 1,
    fontSizes: fs, tinyTextCount: tiny, textNodes: txt.length,
    interactive: inter.length, smallTargets: small.length,
    smallEx: small.slice(0, 5).map((e) => (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 20) + ` ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`),
    unlabeled: unlabeled.length,
    offscreen: off.slice(0, 4).map((e) => e.tagName + ':' + (e.innerText || '').trim().slice(0, 20) + ':' + Math.round(e.getBoundingClientRect().right)),
    distinctTextColors: colors.size, distinctBgColors: bgs.size, brokenImages: imgsBroken,
    jargon: ['インスペクター', 'エンティティ', 'projection', 'Foundation', 'undefined', 'null', 'NaN', 'UNKNOWN', 'Primary', 'Evidence'].filter((w) => text.includes(w)),
    textSample: text.replace(/\s+/g, ' ').slice(0, 300),
  };
};

const browser = await chromium.launch();
const results = [];

// discover dynamic routes from pc root pages
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const p = await ctx.newPage();
  for (const base of ['/execute', '/radar', '/build', '/marketplace']) {
    try {
      await p.goto(BASE + base, { waitUntil: 'networkidle', timeout: 45000 });
      const href = await p.evaluate((b) => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).find((h) => h && h.startsWith(b + '/') && !h.endsWith('/new')), base);
      if (href) routes.push(href);
    } catch (e) { console.error('discover fail', base, e.message); }
  }
  await ctx.close();
}
console.error('routes', routes);

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: 1, colorScheme: 'dark' });
  for (const route of routes) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 150)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)); });
    const t0 = Date.now();
    let status = 0; let firstText = null;
    try {
      const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
      status = resp?.status() ?? 0;
      try { await page.waitForFunction(() => document.body.innerText.trim().length > 50, null, { timeout: 30000 }); firstText = Date.now() - t0; } catch {}
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(800);
      const m = await page.evaluate(METRICS);
      const slug = (route === '/' ? 'root' : route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')).slice(0, 60);
      const file = `${vpName}__${slug}.png`;
      await page.screenshot({ path: OUT + file, fullPage: false });
      await page.screenshot({ path: OUT + 'full_' + file, fullPage: true }).catch(() => {});
      results.push({ vp: vpName, route, status, finalUrl: page.url().replace(BASE, ''), msToText: firstText, errors: [...new Set(errors)].slice(0, 5), file, ...m });
      console.error(vpName, route, status, firstText);
    } catch (e) {
      results.push({ vp: vpName, route, status, error: e.message.slice(0, 200) });
      console.error('FAIL', vpName, route, e.message.slice(0, 100));
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT_ROOT, 'results.json'), JSON.stringify(results, null, 2));
console.error('saved to', OUT_ROOT);
console.error('done', results.length);
