#!/usr/bin/env node
/**
 * eBiz Facts 本文テキストの閲覧用ビューア（レーンB / 2026-09-29）
 * data/r2-local/ebiz-text/<entityId>.txt（extract-ebiz-raw.ts が作る私的な作業テキスト）を、ebizfacts 内 index の範囲で読みやすく表示する。
 * プロフィール系SNS（LinkedIn/Instagram/TikTok/Facebook）のリンク行と、末尾の「Related」一覧は省く。
 *
 * 使い方: node scripts/reaudit/view-ebiz-text.mjs 150 162     （両端含む。1回12〜13件程度が読みやすい）
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [a, b] = process.argv.slice(2).map(Number);
if (!Number.isFinite(a) || !Number.isFinite(b)) { console.error('usage: view-ebiz-text.mjs <from> <to>'); process.exit(64); }
const cat = JSON.parse(readFileSync(resolve(process.cwd(), 'data/entities-index.json'), 'utf8'));
const pool = cat.filter((e) => e.reaudit && e.reaudit.family === 'ebizfacts');
for (let i = a; i <= b && i < pool.length; i += 1) {
  const e = pool[i];
  const p = resolve(process.cwd(), `data/r2-local/ebiz-text/${e.id}.txt`);
  if (!existsSync(p)) { console.log(`\n##### [${i}] ${e.name} — NO RAW TEXT (原文なし: facts を書かず飛ばす)\n`); continue; }
  const t = readFileSync(p, 'utf8');
  const title = /^TITLE: (.*)$/m.exec(t)?.[1] ?? '';
  const pub = /^PUBLISHED\(catalog\): (.*)$/m.exec(t)?.[1] ?? '';
  const body = t.split('--- BODY ---')[1] ?? '';
  const parts = body.split('--- LINKS ---');
  const bodyOnly = parts[0].replace(/\n(Related|Further inspiration|More like this|As we.ve seen before)[^\n]*\n(\s*\n)?(- [^\n]*\n?)+/gi, '\n');
  const cleaned = (bodyOnly + (parts[1] ? `--- LINKS ---${parts[1]}` : '')).trim().split('\n')
    .filter((l) => !/^\[L\d+\] https?:\/\/(www\.|[a-z]{2}\.)?(linkedin|instagram|tiktok|facebook)\.com/i.test(l)).join('\n');
  console.log(`\n##### [${i}] ${e.name} | ${title} | pub ${pub.slice(0, 10)}\n${cleaned}`);
}
