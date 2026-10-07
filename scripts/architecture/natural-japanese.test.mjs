import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { describeHit, findNoise, findUnnatural, loadNaturalRules } from './natural-japanese.mjs';

const rules = loadNaturalRules(resolve(import.meta.dirname, '../../data/natural-japanese.json'));
const words = (text) => findUnnatural(text, rules).map((h) => h.word);

test('くだけた動詞・話し言葉・業界用語を見つけ、言い換えの候補を出す', () => {
  const hits = findUnnatural('約9か月、待機リストから選んで招く非公開版で回した', rules);
  assert.deepEqual(hits.map((h) => h.word), ['回し']);
  assert.match(describeHit(hits[0]), /運営する/);
  for (const [text, word] of [
    ['紹介リンクの発行をソフトで回し、', '回し'],
    ['1人で事業を回す', '回す'],
    ['少人数で回したい', '回し'],
    ['店を回して利益を出した', '回し'],
    ['ベータを回させた', '回さ'],
    ['全プラン年払いで、GSTは別', 'GST'],
    ['開発者に刺さった', '刺さっ'],
    ['客が増えてる', 'てる'],
    ['使い方を説明してた', 'てた'],
    ['Redditでバズった', 'バズ'],
    ['ガチの客', 'ガチ'],
    ['初動はRedditから', '初動'],
    ['壁を突破した', '突破'],
    ['無料でマネタイズした', 'マネタイズ'],
    ['使用することができる', 'することができ'],
    ['子ども向けみたいな画面', 'みたいな'],
    ['売れまくった', 'まくっ'],
  ]) assert.ok(words(text).includes(word), `${text} → ${word}（実際: ${words(text)}）`);
});

test('正当な使い方は外す', () => {
  for (const text of [
    '資金が回る仕組み',
    '利益を広告に回した',
    '浮いた時間を開発へ回せた',
    '手元資金を回す',
    '同じ部品を使い回した',
    '提案の言い回しを試す',
    '対応を後回しにした',
    '月に1回しか送らない',
    '毎回して いた助言',
    '利用者が1万人を突破した',
    '売上が100万ドルを突破',
    '試してみたい客',
    'スペイン語の動画',
    '製品の数を増やすことから変えた',
    '年一括か月ごとかで変わる',
    '安っぽい見た目を避けた',
    '紙の本を捨てた',
    '子どもを育てる親',
    'として、',
    'について書いた',
  ]) assert.deepEqual(words(text), [], text);
});

test('料金の欄の、意味の通らないプラン名と付帯条件を見つける', () => {
  const bad = '現行の料金表は、Sedanが月5,000ルピー（約8,750円）、SUVが月15,000ルピー。冒頭に30日間の全額返金を掲げる。';
  const problems = findNoise(bad, { price: true });
  assert.ok(problems.some((p) => p.includes('Sedan')));
  assert.ok(problems.some((p) => p.includes('返金')));
  assert.deepEqual(findNoise('Team 年払いで1人月10ドル（約1,500円）、Team Pro 同15ドル（約2,250円）', { price: true }), []);
  assert.deepEqual(findNoise('10人まで使えて月約8,750円から（年払い、公式）', { price: true }), []);
  // 料金の欄でなければ、製品名＋金額は落とさない（「プラン名X」「Xプラン」だけ見る）
  assert.deepEqual(findNoise('Hatchbox: 最低月29ドル（約4,350円）'), []);
  assert.ok(findNoise('プラン名Sedanが月5,000ルピー').length > 0);
});
