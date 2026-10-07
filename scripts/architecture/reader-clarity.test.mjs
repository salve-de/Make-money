import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { describeUnclear, findUnclear, loadClarityRules } from './reader-clarity.mjs';

const file = resolve(import.meta.dirname, '../../data/reader-clarity.json');
const rules = loadClarityRules(file);
const ids = (text) => findUnclear(text, rules).map((h) => h.rule);

test('オーナーが怒った3例（A・B・C）を落とす', () => {
  assert.ok(ids('根拠: Cool Tools経由はよく払い、Reddit経由はほぼ払わなかった').includes('freq-pay'));
  assert.ok(ids('根拠: Cool Tools経由はよく払い、Reddit経由はほぼ払わなかった').includes('almost-never-pay'));
  for (const neg of ['ほとんど買わなかった', 'ほぼ払わずに離れた', 'ほとんど購入しなかった']) assert.ok(ids(neg).includes('almost-never-pay'), neg);
  assert.ok(ids('広告のない、読者の支払いで支える、組版（文字の組み方）の本').includes('modifier-chain'));
  assert.ok(ids('支払い方は、作者が作った文字の書体を買う、直接支払う、紙の本Typography for Lawyersを買う、の3つ。').includes('trailing-count'));
  assert.match(describeUnclear(findUnclear('Cool Tools経由はよく払い', rules)[0]), /払う人が多かった/);
});

test('辞書の各規則の悪い例は落ち、良い例は通る', () => {
  for (const rule of JSON.parse(readFileSync(file, 'utf8'))) {
    if (rule.bad) assert.ok(ids(rule.bad).includes(rule.id), `${rule.id} の悪い例が落ちない: ${rule.bad}`);
    if (rule.good) assert.deepEqual(ids(rule.good), [], `${rule.id} の良い例が落ちる: ${rule.good}`);
  }
});

test('意味の取れる文は落とさない（誤検出の見本）', () => {
  for (const text of [
    'Cool Toolsから来た読者は、お金を払う人が多かった。Redditから来た読者は、払う人がほとんどいなかった',
    '文字の組み方を教える、無料で読めるWebの本。広告は載せず、読者の支払いで成り立つ',
    '本は無料で読める。役立ったと思った読者がお金を出す道は3つ。作者が作ったフォントを買う、作者にお金を直接送る、紙の本を買う',
    '2か月で継続率12%→41%、月の定期売上347ドル→2,100ドル（約5万円→32万円）',
    '2019年の伸びの主因は、ブログ記事で来訪者を倍にし、電話・メールでの営業も倍にしたこと',
    '前: 「寄付」という呼び方に指摘を受けた。後: 「直接の支払い」に直した',
    '作業管理、時間記録、請求書、顧客専用画面、GitHub・GitLab連携を備える',
    'カメラ・編集ソフト・制作の技術なしで作れ、175以上の言語・方言に翻訳できる',
    'マーケティングの担当が使う',
    '店の商品をほとんど買った',
    '会員はほぼ払った額の分だけ使った',
    '注文の多くは、ほとんど購入した人の紹介だった',
  ]) assert.deepEqual(ids(text), [], text);
});
