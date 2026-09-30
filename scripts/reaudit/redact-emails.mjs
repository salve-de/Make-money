#!/usr/bin/env node
/**
 * メールアドレスの除去（redact-emails v1）— 2026-09-29
 * 索引の全文字列からメールアドレスを「[メールアドレス削除]」に置き換える。旧データ（legacyDisplaySnapshot 等）に
 * 残った個人・連絡先アドレスを公開面と R2 に持ち込まないため。画像ファイル名（logo@2x.png 等）は対象外。冪等。
 * 使い方: node scripts/reaudit/redact-emails.mjs [--dry-run]
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs';

const INDEX = 'data/entities-index.json';
const dryRun = process.argv.includes('--dry-run');
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const IMAGE = /\.(png|jpe?g|webp|svg|gif|avif)$/i;
const entities = JSON.parse(readFileSync(INDEX, 'utf8'));
let replaced = 0;
const touched = new Set();
const scrub = (value, id) => {
  if (typeof value === 'string') {
    return value.replace(EMAIL, (match) => {
      if (IMAGE.test(match)) return match;
      replaced += 1;
      touched.add(id);
      return '[メールアドレス削除]';
    });
  }
  if (Array.isArray(value)) return value.map((v) => scrub(v, id));
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) value[key] = scrub(value[key], id);
  }
  return value;
};
for (const entity of entities) scrub(entity, entity.id);
console.log(JSON.stringify({ replaced, records: [...touched], dryRun }));
if (!dryRun && replaced > 0) {
  const tmp = `${INDEX}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(entities, null, 2));
  renameSync(tmp, INDEX);
}
