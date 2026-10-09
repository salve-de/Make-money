import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { DECIDED_UI_FILE, OWNER_CONTEXT_HEADING, ownerContext } from '../owner-context';

const tmp = (): string => { const r = mkdtempSync(join(tmpdir(), 'owner-ctx-')); mkdirSync(join(r, 'docs/owner'), { recursive: true }); return r; };

test('ownerContext: どれも無ければ空文字', () => {
  assert.equal(ownerContext(tmp()), '');
});

test('ownerContext: あるファイルだけ、見出しの後ろに中身を付ける', () => {
  const r = tmp();
  writeFileSync(join(r, 'docs/owner/LEAD_LINE_SHEET.md'), '経緯その1');
  const s = ownerContext(r);
  assert.ok(s.includes(OWNER_CONTEXT_HEADING));
  assert.ok(s.includes('経緯その1'));
  assert.ok(!s.includes('OWNER_RULES'));
});

test('ownerContext: 両方あれば両方入る', () => {
  const r = tmp();
  writeFileSync(join(r, 'docs/owner/LEAD_LINE_SHEET.md'), 'A本文');
  writeFileSync(join(r, 'docs/owner/OWNER_RULES.md'), 'B本文');
  const s = ownerContext(r);
  assert.ok(s.includes('A本文') && s.includes('B本文'));
});

test('ownerContext: 決まった画面の形の台帳（DECIDED_UI）が既定で入り、実物のファイルがある', () => {
  const r = tmp();
  mkdirSync(join(r, 'docs/design'), { recursive: true });
  writeFileSync(join(r, DECIDED_UI_FILE), '台帳の本文');
  assert.ok(ownerContext(r).includes('台帳の本文'));
  // 実際のリポジトリに台帳がある（消えたら担当への指示から外れてしまう）
  assert.ok(ownerContext(process.cwd()).includes('決まった画面の形の台帳'));
});
