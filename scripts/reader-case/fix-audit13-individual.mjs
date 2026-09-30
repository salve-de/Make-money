// 13回目の監査で見つかった個別の誤り6件を entities-index.json の該当文だけ直す（一度きりの修正・再実行しても同じ結果）。
import fs from 'node:fs';
const path = 'data/entities-index.json';
const raw = fs.readFileSync(path, 'utf8');
const ents = JSON.parse(raw);
const fixes = {
  ent_privy_2b1e94: [
    ['2025年11月のSendlane買収', '2026年2月のSendlane買収（PrivyがSendlaneを買収）'],
    ['公式は2025年にEmotiveとSendlaneを買収したと告知している', '公式は2025年にEmotive、2026年2月にSendlaneを買収したと告知している'],
  ],
  ent_logopackageexpress_46d435fe68bf: [
    ['2019年5月から2021-08-03 に投稿が10件ある。', '2019年5月から2021-08-03 の間に本人の投稿がある。'],
    ['投稿は10件（2019-05 から2021-08-03）。', '投稿の期間は2019-05 から2021-08-03。'],
    ['2019年5月から2021-08-03 の投稿10件を確認', '2019年5月から2021-08-03 の投稿を確認'],
  ],
  ent_wafflegamedailychallenge_85aa2808174d: [
    ['。同じハンドルが多数の製品を掲載している', ''],
    ['、同じハンドルが多数のゲーム・ツールサイトを掲載している（独立した確認なし）', '（独立した確認なし）'],
    ['（ワードパズルの説明。いいね1件）。同じハンドルが多数の製品を掲載している', '（ワードパズルの説明。いいね1件）'],
  ],
  ent_bullseye_34f13977532e: [
    ['フォームを送らず離脱した見込み客への営業接点を広告主・営業担当に販売。', '匿名の訪問者の名前・メール・役職・会社を割り出し、利用者のCRMやSlackへ送る。料金は連絡先1件ごとにクレジットを使う方式（公式サイト）。'],
  ],
  ent_ebizfacts_danielgendelmanrayadatingapp100m_a0f7820fee4d: [
    ['を、外部資金なしで育てた事例。', 'を、記事によれば外部資金なしで育てた事例。'],
  ],
};
let changed = 0;
for (const [id, pairs] of Object.entries(fixes)) {
  const e = ents.find((x) => x.id === id);
  if (!e) throw new Error('missing ' + id);
  const rec = (o, k) => {
    if (typeof o === 'string') {
      if (k === 'before') return o;
      let s = o;
      for (const [a, b] of pairs) if (s.includes(a)) { s = s.split(a).join(b); }
      if (s !== o) changed++;
      return s;
    }
    if (Array.isArray(o)) return o.map((v) => rec(v, k));
    if (o && typeof o === 'object') { for (const kk of Object.keys(o)) o[kk] = rec(o[kk], kk); return o; }
    return o;
  };
  rec(e, '');
}
const indent = /^\[\n  \{/.test(raw) ? 2 : 2;
fs.writeFileSync(path, JSON.stringify(ents, null, indent) + (raw.endsWith('\n') ? '\n' : ''));
console.log('changed strings:', changed);
