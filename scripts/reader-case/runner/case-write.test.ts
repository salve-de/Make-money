import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hideLines } from '../owner-context';
import { jaAmount, verifyDraft, yenOff } from '../../case-write/verify';
import { extractMarkdown, markInferences, parseFactReport, tidy, writeCase } from '../../case-write/run';
import { NEWER_RULES, checkMarkdown } from '../../case-pages/lib';
import type { CaseInput } from '../../case-write/input';
import type { Caller } from '../agent-call';

const ROOT = new URL('../../..', import.meta.url).pathname;

const input: CaseInput = {
  id: 'ent_x', name: 'Xbox Shop', facts: [{ text: '2019年に公開した。' }], unknowns: [],
  sources: [
    { no: 1, url: 'https://x.example/about', text: 'We launched in 2019. Revenue was $120K in 2021 with 3,000 customers. '.repeat(5) },
    { no: 2, url: 'https://x.example/dead', text: '', error: 'http-404' },
  ],
};

const page = (body: { list?: string; did?: string; src?: string } = {}) => `# Xbox Shop

## 一覧の1行
${body.list ?? '2019年に公開し、年12万ドル（約1,800万円）を売る小さな店'}

## 概要
Xbox Shop は2019年に公開した店。2021年の売上は12万ドル（約1,800万円）。

## 成功の秘訣
1. **小さく始めた**
   客は3,000人。

## 実際にやったこと
- ${body.did ?? '2019年に公開した。'}

## 料金
- 月10ドル（約1,500円）。（推測）

## 時間順の流れ
- 2019年：公開。
- 2019年：最初の客が付いた。
- 2019年：店を広げた。
- 2021年：売上が伸びた。
- 2021年：客が3,000人になった。

## 数字と出典
1. 公式の紹介（公開年、2021年の売上、客の数）：${body.src ?? 'https://x.example/about'}

- 1ドル＝150円で計算
`;

test('hideLines: 名前を含む行と、「名前:」の後の引用を外す', () => {
  const t = ['見本', '1. 良い1行（Xbox Shop）', 'Xbox Shop:', '> 答えの概要', '>', '> 2段落目', '', '残る'].join('\n');
  assert.equal(hideLines(t, ['xbox shop']), ['見本', '', '残る'].join('\n'));
  assert.equal(hideLines(t, []), t);
});

test('jaAmount と yenOff: 円の概算のずれだけを拾う', () => {
  assert.equal(jaAmount('3万4千'), 34000);
  assert.equal(jaAmount('2,400万'), 24_000_000);
  assert.equal(jaAmount('1億2,500万'), 125_000_000);
  assert.deepEqual(yenOff('16万ドル（約2,400万円）'), []);
  assert.deepEqual(yenOff('3万4千ドル（約510万円）'), []);
  assert.equal(yenOff('3万4千ドル（約51万円）').length, 1);
});

test('verifyDraft: 出典どおりの文は通る（印の付いた推測の数字も通る）', () => {
  assert.deepEqual(verifyDraft(page(), input), []);
});

test('verifyDraft: 出典に無い数字・年、渡していない出典、本文の取れない出典を拾う', () => {
  const v = verifyDraft(page({ did: '2015年に客が5,000人になった。', src: 'https://x.example/dead' }), input);
  const rules = v.map((x) => x.rule).sort();
  assert.ok(rules.includes('number-not-in-sources'));
  assert.ok(rules.includes('year-not-in-sources'));
  assert.ok(rules.includes('unknown-source'));
});

test('verifyDraft: 外貨の後ろの円の幅（約6,000〜2万2,500円）は出典の数字として照らさない', () => {
  const v = verifyDraft(page({ did: '2019年に公開し、2021年の売上は12万ドル（約1,500万〜2,000万円）だった。' }), input);
  assert.deepEqual(v.filter((x) => x.rule === 'number-not-in-sources'), []);
  // 外貨に付いていない数は今までどおり照らす
  assert.ok(verifyDraft(page({ did: '2019年に客が約6,000〜2万人になった。' }), input).some((x) => x.rule === 'number-not-in-sources'));
});

test('verifyDraft: 本文に円の稼ぎの数字があるのに、一覧の1行に円の額が無ければ拾う', () => {
  const v = verifyDraft(page({ list: '2019年に公開した小さな店' }), input);
  assert.ok(v.some((x) => x.rule === 'lead-no-amount'));
  assert.ok(!verifyDraft(page(), input).some((x) => x.rule === 'lead-no-amount'));
});

test('writeCase: 1行から稼ぎの数字が抜けた時は、安い直し役でなく書く段へ返す', async () => {
  const seen: string[] = [];
  const caller: Caller = async (req) => { seen.push(`良い:${req.label}`); return { text: seen.length === 1 ? page({ list: '2019年に公開した小さな店' }) : page(), seconds: 0 }; };
  const replies = ['## 出典に無い事実\nなし\n\n## 使えない1行の候補\nなし', page({ list: '2019年に公開した小さな店' })];
  const cheap: Caller = async (req) => { seen.push(`安い:${req.label}`); return { text: replies.shift()!, seconds: 0 }; };
  const r = await writeCase(input, caller, { root: ROOT, cheap, maxRepairs: 1 });
  assert.deepEqual(seen, ['良い:ent_x 書く', '安い:ent_x 事実を照らす', '安い:ent_x 読む', '良い:ent_x 直す1']);
  assert.equal(r.ok, true);
});

test('verifyDraft: 一覧の1行の推定語は今の正本の検査と同じく拾う', () => {
  assert.ok(verifyDraft(page({ list: '年12万ドル（約1,800万円）と推定される店' }), input).some((x) => x.rule === 'list-line-estimate'));
});

test('extractMarkdown: 前置きと囲みを外し、最初の「# 」から返す', () => {
  assert.equal(extractMarkdown('はい。\n```markdown\n# A\n本文\n```\n'), '# A\n本文\n');
  assert.equal(extractMarkdown('前置き\n# B\nx'), '# B\nx\n');
});

test('writeCase: 書く→事実を照らす→読む→照合。合わなければ直しに返し、直れば合格', async () => {
  const seen: string[] = [];
  const replies = [page({ did: '2015年に公開した。' }), page({ did: '2015年に公開した。' }), page({ did: '2015年に公開した。' }), page()];
  const caller: Caller = async (req) => { seen.push(req.label); return { text: replies.shift()!, seconds: 0, costUsd: 0.1 }; };
  const r = await writeCase(input, caller, { root: ROOT, maxRepairs: 2 });
  assert.equal(r.ok, true);
  assert.deepEqual(seen, ['ent_x 書く', 'ent_x 事実を照らす', 'ent_x 読む', 'ent_x 直す1']);
  assert.equal(r.steps.length, 4);
  assert.equal(r.calls, 4);
});

test('writeCase: 直す上限を超えたら不合格のまま返す（書き出さないのは呼び側）', async () => {
  const caller: Caller = async () => ({ text: page({ did: '2015年に公開した。' }), seconds: 0 });
  const r = await writeCase(input, caller, { root: ROOT, maxRepairs: 1 });
  assert.equal(r.ok, false);
  assert.equal(r.calls, 4);
  assert.ok(r.violations.length > 0);
});

test('sourceText: 試しで取ってきた本文は data/source-cache でなく指定の場所に残す', async () => {
  const { mkdtempSync, existsSync, readdirSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { sourceText } = await import('../../case-write/input');
  const root = mkdtempSync(join(tmpdir(), 'case-write-'));
  const r = await sourceText(root, 'https://x.example/a', [], async (url) => ({ url, status: 200, fetchedAt: 't', via: 'direct', text: 'x'.repeat(300) }), 'data/source-cache.trial');
  assert.equal(r?.text.length, 300);
  assert.equal(existsSync(join(root, 'data/source-cache')), false);
  assert.equal(readdirSync(join(root, 'data/source-cache.trial')).length, 1);
  // 2回目は写しから読む（取りに行かない）
  const again = await sourceText(root, 'https://x.example/a', [], async () => { throw new Error('取りに行った'); }, 'data/source-cache.trial');
  assert.equal(again?.text.length, 300);
});

test('splitNotes: 「調べた側のメモ」の章を本文から切り離す（画面に出さない）', async () => {
  const { splitNotes } = await import('../../case-write/run');
  const md = '# A\n\n## 数字と出典\n1. x：https://a\n\n## 調べた側のメモ\n- 未確認：売上の期間\n';
  const r = splitNotes(md);
  assert.equal(r.notes, '- 未確認：売上の期間');
  assert.ok(!r.page.includes('未確認'));
  assert.ok(r.page.includes('## 数字と出典'));
  assert.equal(splitNotes('# A\n\n## 調べた側のメモ\nなし\n').notes, '');
  assert.equal(splitNotes('# B\n').notes, '');
});

test('writeCase: 1行は書く段が決め、読む段が変えても戻す。照らす段は一覧だけを返し、それを読む段に渡す', async () => {
  const written = `${page()}\n## 一覧の1行の候補\n- 2019年に公開し、年12万ドル（約1,800万円）を売る小さな店\n- 候補B\n- 候補C\n- 候補D\n- 候補E\n- 候補F\n`;
  const good: Array<{ label: string; system: string }> = [];
  const cheapSeen: Array<{ label: string; user: string }> = [];
  const caller: Caller = async (req) => { good.push({ label: req.label, system: req.system }); return { text: written, seconds: 0, costUsd: 0.2 }; };
  const replies = ['## 出典に無い事実\n- 「台所で作った」：出典に無い\n\n## 使えない1行の候補\nなし', page({ list: '読む段が勝手に変えた1行' })];
  const cheapSystems: Array<{ label: string; system: string }> = [];
  const cheap: Caller = async (req) => { cheapSeen.push({ label: req.label, user: req.user }); cheapSystems.push({ label: req.label, system: req.system }); return { text: replies.shift()!, seconds: 0, costUsd: 0.01 }; };
  const r = await writeCase(input, caller, { root: ROOT, cheap, maxRepairs: 0 });
  assert.deepEqual(good.map((x) => x.label), ['ent_x 書く']);
  assert.deepEqual(cheapSeen.map((x) => x.label), ['ent_x 事実を照らす', 'ent_x 読む']);
  // オーナーとのオーナーの指示の1枚は、書く・照らす・読むのどの段にも渡る（2026-10-09 オーナーの決定）
  assert.ok(good[0]!.system.includes('### docs/owner/OWNER_RULES.md') && good[0]!.system.includes('### docs/owner/LEAD_LINE_SHEET.md'));
  assert.ok(good[0]!.system.includes('### .claude/skills/natural-japanese/SKILL.md') && good[0]!.system.includes('### docs/CASE_TEXT_STANDARD.md'));
  assert.equal(cheapSystems.length, 2);
  for (const c of cheapSystems) assert.ok(c.system.includes('### docs/owner/OWNER_RULES.md'), `${c.label} にオーナーの指示の1枚が渡っていない`);
  assert.ok(cheapSeen[0]!.user.includes('6. 候補F'));
  assert.ok(cheapSeen[1]!.user.includes('「台所で作った」'));
  assert.ok(r.md.includes('## 一覧の1行\n2019年に公開し、年12万ドル（約1,800万円）を売る小さな店\n'));
  assert.ok(!r.md.includes('候補B'));
  assert.equal(r.costUsd, 0.22);
  assert.equal(r.ok, true);
});

test('writeCase: 照らす段が書く段の1行を使えないとしたら、使える候補の先頭に替える', async () => {
  const written = `${page()}\n## 一覧の1行の候補\n- 2019年に公開し、年12万ドル（約1,800万円）を売る小さな店\n- 2019年に公開し、年12万ドル（約1,800万円）を売る店\n`;
  const caller: Caller = async () => ({ text: written, seconds: 0 });
  const replies = ['## 出典に無い事実\nなし\n\n## 使えない1行の候補\n1', page()];
  const cheap: Caller = async () => ({ text: replies.shift()!, seconds: 0 });
  const r = await writeCase(input, caller, { root: ROOT, cheap, maxRepairs: 0 });
  assert.equal(r.leadPick?.chosen, '2019年に公開し、年12万ドル（約1,800万円）を売る店');
  assert.ok(r.md.includes('## 一覧の1行\n2019年に公開し、年12万ドル（約1,800万円）を売る店\n'));
});

test('照合: 「米ドル」「USドル」も外貨として拾い、円が無ければ止める', async () => {
  const { foreignWithoutYen } = await import('../../case-pages/lib');
  assert.deepEqual(foreignWithoutYen('2,661人から約95,000米ドルを集めた'), ['95,000米ドル']);
  assert.deepEqual(foreignWithoutYen('100 USドルの物'), ['100 USドル']);
  assert.deepEqual(foreignWithoutYen('9万5,245米ドル（約1,430万円）を集めた'), []);
});

test('writeCase: 照合の差し戻し（直す）の段にも、オーナーの指示の1枚が渡る', async () => {
  const bad = `${page({ list: '2019年に公開し、年12万ドルを売る小さな店' })}\n## 一覧の1行の候補\n- 候補A\n- 候補B\n- 候補C\n- 候補D\n- 候補E\n- 候補F\n`;
  const seen: Array<{ label: string; system: string }> = [];
  const caller: Caller = async (req) => { seen.push({ label: req.label, system: req.system }); return { text: bad, seconds: 0 }; };
  const cheap: Caller = async (req) => { seen.push({ label: req.label, system: req.system }); return { text: req.label.includes('照らす') ? '## 出典に無い事実\nなし\n\n## 使えない1行の候補\nなし' : bad, seconds: 0 }; };
  await writeCase(input, caller, { root: ROOT, cheap, maxRepairs: 1 });
  const fix = seen.filter((x) => x.label.includes('直す'));
  assert.ok(fix.length >= 1, '照合に合わない文を直しに返していない（試験の前提が崩れた）');
  for (const x of seen) assert.ok(x.system.includes('### docs/owner/OWNER_RULES.md'), `${x.label} にオーナーの指示の1枚が渡っていない`);
});

test('renumberSources: 「数字と出典」の欠番を詰める', async () => {
  const { renumberSources } = await import('../../case-write/run');
  const md = '## 概要\n\n1. 本文の番号は触らない\n\n## 数字と出典\n\n1. A：https://a\n3. B：https://b\n7. C：https://c\n\n- 1ドル＝150円で計算\n';
  assert.equal(renumberSources(md), '## 概要\n\n1. 本文の番号は触らない\n\n## 数字と出典\n\n1. A：https://a\n2. B：https://b\n3. C：https://c\n\n- 1ドル＝150円で計算\n');
});

test('verifyDraft: 時間順の流れが5行未満なら書き直しに回す', () => {
  const thin = page().replace(/(## 時間順の流れ\n- 2019年：公開。\n)(?:- .*\n)+/, '$1\n');
  assert.ok(verifyDraft(thin, input).some((x) => x.rule === 'timeline-thin'));
  assert.ok(!verifyDraft(page(), input).some((x) => x.rule === 'timeline-thin'));
});

test('出典の番号の飛びは検査で止まり、tidy が1から詰める', () => {
  const gap = page().replace('1. 公式の紹介', '2. 公式の紹介');
  assert.ok(checkMarkdown(gap).violations.some((x) => x.rule === 'source-number-gap'));
  assert.ok(!checkMarkdown(tidy(gap)).violations.some((x) => x.rule === 'source-number-gap'));
});

test('使っていない通貨の断りは検査で止まり、tidy が外す（使っている通貨の断りは残す）', () => {
  const noUsd = page().replace(/ドル（約[^）]*円）/g, '円').replace(/12万円/g, '1,800万円').replace('月10円', '月1,500円');
  assert.ok(!/ドル/.test(noUsd.split('## 数字と出典')[0]));
  assert.ok(checkMarkdown(noUsd).violations.some((x) => x.rule === 'unused-currency-note'));
  assert.ok(!tidy(noUsd).includes('1ドル＝150円'));
  assert.ok(tidy(page()).includes('1ドル＝150円'));
});

test('markInferences: 出典に無い見立ては消さずに（推測）を付ける。1行・概要の見立ては置けないと返す', () => {
  const md = page().replace('客は3,000人。', '客は3,000人。小さく始めたので続けやすい。');
  const r = markInferences(md, ['小さく始めたので続けやすい', '2021年の売上は12万ドル']);
  assert.ok(r.md.includes('小さく始めたので続けやすい（推測）。'));
  assert.deepEqual(r.unplaced, ['2021年の売上は12万ドル']);
  assert.equal(markInferences(r.md, ['小さく始めたので続けやすい']).md, r.md);
  assert.deepEqual(parseFactReport('## 出典に無い事実\nなし\n\n## 出典に無い見立て\n- 「小さく始めたので続けやすい」：理由づけ\n\n## 使えない1行の候補\nなし').inferences, ['小さく始めたので続けやすい']);
});

test('timeline-thin: 5行未満は検査（case-pages:check と同じ）で止まり、書く段の照合も同じ規則を使う', () => {
  const thin = page().replace(/(## 時間順の流れ\n- 2019年：公開。\n)(?:- .*\n)+/, '$1\n');
  assert.ok(checkMarkdown(thin).violations.some((x) => x.rule === 'timeline-thin'));
  assert.ok(NEWER_RULES.includes('timeline-thin') && NEWER_RULES.includes('source-number-gap') && NEWER_RULES.includes('unused-currency-note'));
});

test('number-guess: 数字・金額・年月の文に（推測）が付いていたら止める。数字の無い見立ては通る', () => {
  const bad = page().replace('- 月10ドル（約1,500円）。（推測）', '- 月10ドル（約1,500円）から（推測）。');
  assert.ok(checkMarkdown(bad).violations.some((x) => x.rule === 'number-guess'));
  const ok = page().replace('客は3,000人。', '客は3,000人。小さく始めたので続けやすい（推測）。').replace('- 月10ドル（約1,500円）。（推測）', '- 月10ドル（約1,500円）。');
  assert.ok(!checkMarkdown(ok).violations.some((x) => x.rule === 'number-guess'));
});

test('markInferences: 数字を含む文には印を付けない', () => {
  const md = page().replace('客は3,000人。', '客は3,000人。毎月89ドルを上乗せする。');
  assert.equal(markInferences(md, ['毎月89ドルを上乗せする']).md, md);
});

test('timeline-tense: 「：」の後が「る。」の行は止め、過去形と「〜している」は通す', () => {
  const now = page().replace('- 2019年：公開。', '- 2019年：店を始める。');
  assert.ok(checkMarkdown(now).violations.some((x) => x.rule === 'timeline-tense'));
  assert.ok(!checkMarkdown(page()).violations.some((x) => x.rule === 'timeline-tense'));
  assert.ok(!checkMarkdown(page().replace('- 2019年：公開。', '- 2026年：3,000人が使っている。')).violations.some((x) => x.rule === 'timeline-tense'));
});
