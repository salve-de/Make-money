# 再収集（原文照合で不合格になった項目）

あなたは、事例の事実・数字・章の行を作った担当とは別の確認役です。下の一覧は、画面に出す前の原文照合（scripts/reader-case/source-check.ts）で不合格になった項目です。

## すること
1. 項目ごとに、まず同じ出典の取り直しを試す（Web アーカイブ web.archive.org の保存版、記事の印刷版・AMP 版など）。
2. 取れない・原文に無い時は、同じ事実を書いた別の出典を探す（本人の投稿、公式、報道、提出書類）。
3. 原文に実際にある文から、15語以内の引用を写す。言い換えない。
4. 数字には必ず「何の数字か」（売上か、直接の支払いだけか、取扱高か、アンケートの区分か）と「いつ時点か」（出来事の年・月。投稿日や記事の日付を出来事の日付にしない）を付ける。
5. 原文と合わない項目は、合う形に直す（年・金額・名前を原文どおりにする）。どの出典にも無い項目は `unverified` に理由を書く（その項目だけ画面から外れる。事例全体は止めない）。

## してはいけないこと
- 原文に無い数・年を補う。概算や推定を事実の欄に入れる。
- 引用を作文する（引用は取得した本文で機械が確かめ直す）。
- 円換算を事実に入れる（円換算は画面の層が足す）。

## 返す形
`data/runner/inbox/recollect/<回の番号>.json` に、`data/fact-corrections.json` の1件と同じ形の配列で置く:
`{ id, entityId, cause: WHEN|WHAT|CONFLICT|UNREACHABLE|DUPLICATE, finding, sourceUrl, quote, checkedAt, forbid?, actions: [...] }`
actions は claim（fix か unverified）、chapter（match と replace か remove）、success、detail のどれか（要約は画面の文の作り直しで作り直すので、直し方には無い）。

## 一覧
