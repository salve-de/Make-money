import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { domainCovers, emptyLedger, entryFor, readLedger, reviewOverdue, suspendedEntryFor } from './rights/ledger-lib';
import { ensureDomainEntries, groupDomains } from './rights/seed';
import { sourceRefsOfRecord } from './rights/record-sources';
import { findUsage, loadUnfilteredReaders, publishedIds } from './rights/usage-lib';
import { sourcePolicy } from './reader-case/source-policy';

const ROOT = process.cwd();
// 公開中の事例の実データで確かめるものは、cwd を変える前に読んでおく
const realLedger = readLedger();
const realReaders = loadUnfilteredReaders();

test('実データ: 公開中の事例で許可されている出典は、すべて台帳のドメインに載っている', () => {
  assert.ok(publishedIds().length > 0);
  const missing: string[] = [];
  for (const [id, { reader, entityUrl }] of realReaders) {
    for (const s of reader.sources) {
      if (!sourcePolicy(s.url, entityUrl)) continue;
      const host = new URL(s.url).hostname.replace(/^www\./, '');
      if (!entryFor(realLedger, host)) missing.push(`${id} ${s.url}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('実データ: where が使用箇所を返す（news.ycombinator.com は複数の事例で使われる）', () => {
  const hits = findUsage('news.ycombinator.com', realReaders);
  assert.ok(hits.length >= 2);
  assert.ok(hits.every((h) => h.facts.length + h.metrics.length > 0));
});

test('domainCovers と entryFor: サブドメインを含み、より具体的な項目を選ぶ', () => {
  assert.ok(domainCovers('churnkey.co', 'docs.churnkey.co'));
  assert.ok(!domainCovers('churnkey.co', 'notchurnkey.co'));
  const l = emptyLedger();
  const base = realLedger.domains['gumroad.com']!;
  l.domains['example.com'] = base; l.domains['docs.example.com'] = base;
  assert.equal(entryFor(l, 'a.docs.example.com')?.domain, 'docs.example.com');
});

test('groupDomains: 親があれば親にまとめ、プラットフォームの子は別扱い', () => {
  const g = groupDomains(['churnkey.co', 'docs.churnkey.co', 'a.substack.com', 'substack.com']);
  assert.equal(g.get('docs.churnkey.co'), 'churnkey.co');
  assert.equal(g.get('a.substack.com'), 'a.substack.com');
});

test('reviewOverdue: 判断から日数がたつと期限切れ', () => {
  const e = realLedger.domains['gumroad.com']!;
  assert.ok(!reviewOverdue(e, 180, Date.parse(e.decision.decidedAt) + 179 * 86400_000));
  assert.ok(reviewOverdue(e, 180, Date.parse(e.decision.decidedAt) + 181 * 86400_000));
});

test('sourceRefsOfRecord: 調査記録の出典・事実・数字の URL を漏れなく集め、AIの権利判断を引き継ぐ', () => {
  const refs = sourceRefsOfRecord({
    id: 'ent_x', url: 'https://x.example/',
    reaudit: { sources: [{ url: 'https://blog.example.org/a', publisher: '個人ブログ', rights: { loginFree: 'yes', noPaywall: 'yes', quoteTerms: 'silent' } }] },
    facts: [{ sourceUrl: 'https://news.example.net/b' }], metrics: [{ sourceUrl: 'https://blog.example.org/a' }],
  });
  assert.deepEqual(refs.map((r) => r.url).sort(), ['https://blog.example.org/a', 'https://news.example.net/b']);
  assert.equal(refs.find((r) => r.url.includes('blog'))?.rights?.noPaywall, 'yes');
});

test('台帳の自動記録と使用停止（作業用ディレクトリで確かめる）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rights-'));
  mkdirSync(join(dir, 'data'));
  process.chdir(dir);
  try {
    const refs = [
      { caseId: 'c1', url: 'https://unknown-a.example/post', publisher: 'A', entityUrl: 'https://c1.example/' },
      { caseId: 'c1', url: 'https://ok-b.example/post', publisher: 'B', entityUrl: 'https://c1.example/', rights: { loginFree: 'yes' as const, noPaywall: 'yes' as const, quoteTerms: 'silent' as const, note: 'ログイン不要、規約に引用の禁止なし' } },
      { caseId: 'c1', url: 'https://bad-c.example/post', publisher: 'C', entityUrl: 'https://c1.example/', rights: { loginFree: 'no' as const, noPaywall: 'yes' as const, quoteTerms: 'silent' as const } },
      { caseId: 'c1', url: 'https://news.ycombinator.com/item?id=1', publisher: 'HN', entityUrl: 'https://c1.example/' },
    ];
    const ledger = emptyLedger();
    const added = ensureDomainEntries(ledger, refs, 'test');
    assert.deepEqual(added.sort(), ['bad-c.example', 'news.ycombinator.com', 'ok-b.example', 'unknown-a.example']);
    assert.equal(ledger.domains['unknown-a.example']!.decision.basis, 'unconfirmed');
    assert.equal(ledger.domains['unknown-a.example']!.status, 'active'); // 未確認でも止めない
    assert.equal(ledger.domains['ok-b.example']!.decision.basis, 'ai_judgment');
    assert.equal(ledger.domains['bad-c.example']!.status, 'suspended');
    assert.equal(ledger.domains['news.ycombinator.com']!.decision.basis, 'registry');
    assert.deepEqual(ensureDomainEntries(ledger, refs, 'test'), []); // 2回目は何も足さない
    writeFileSync('data/source-rights-ledger.json', JSON.stringify(ledger));

    // AIが3基準を満たすと判断したドメインは許可。未確認・不許可は許可しない
    assert.ok(sourcePolicy('https://ok-b.example/post'));
    assert.equal(sourcePolicy('https://unknown-a.example/post'), null);
    assert.equal(sourcePolicy('https://bad-c.example/post'), null);
    assert.ok(sourcePolicy('https://news.ycombinator.com/item?id=1'));

    // 使用停止にすると、標準の規則で許可されているサイトも不許可になり、サブドメインも含む
    ledger.domains['news.ycombinator.com']!.status = 'suspended';
    writeFileSync('data/source-rights-ledger.json', JSON.stringify(ledger));
    assert.equal(sourcePolicy('https://news.ycombinator.com/item?id=1'), null);
    assert.ok(suspendedEntryFor(ledger, 'https://news.ycombinator.com/item?id=1'));
    ledger.domains['news.ycombinator.com']!.status = 'active';
    writeFileSync('data/source-rights-ledger.json', JSON.stringify(ledger));
    assert.ok(sourcePolicy('https://news.ycombinator.com/item?id=1'));
  } finally { process.chdir(ROOT); }
});
