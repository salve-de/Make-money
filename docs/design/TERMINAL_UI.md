# 端末型UI 仕様（A案）

2026-09-29 決定。全画面をこの仕様に合わせる。見本は Design キャンバス「金鉱録 UI方向案」の A 段（PC / スマホ一覧 / スマホ詳細）。

## 方針
- プロ用金融端末（Bloomberg / Koyfin）の作法。情報は多く、強調は1か所。
- 「AIっぽさ」の排除：丸いピル・大きな塗りボタン・色付きの丸印・グラデーション・影・カードの入れ子・絵文字を使わない。
- 区切りは 1px の罫線。枠を付けるのは浮かぶもの（メニュー・モーダル）だけ。

## トークン（`src/app/globals.css`）
Tailwind では `bg-term-*` / `text-term-*` / `border-term-*` を使う。16進の直書き（`bg-[#0E131F]` など）と `white/[0.06]` のような白の透明度指定は使わない。

| 役割 | トークン | 値 |
|---|---|---|
| 地の背景 | `term-bg` | #0a0b0c |
| パネル（ヘッダー・フッター） | `term-panel` | #111214 |
| パネル見出しバー・表見出し | `term-head` | #16171a |
| 一覧の偶数行 | `term-row-alt` | #0d0e10 |
| 罫線（パネル境界） | `term-line` | #26282c |
| 罫線（行の区切り） | `term-line-soft` | #1c1e21 |
| 強い文字（名前・確認済みの数値） | `term-fg-strong` | #ffffff |
| 本文 | `term-fg` | #d6d8db |
| 補足文 | `term-sub` | #b4b8be |
| 弱い本文・非選択タブ | `term-muted` | #a7acb3 |
| 項目名・ラベル | `term-label` | #959aa1 |
| 未確認・無効 | `term-dim` | #80858d |
| アクセント（橙、1色のみ） | `term-accent` | #ff9f1a |
| PRO帯の背景 / 罫線 | `term-accent-bg` / `term-accent-line` | #140f06 / #3a2a10 |
| 選択行・選択中の絞り込み | `term-select` / `term-select-fg` | #131d2a / #c4ccd6 |
| 成功 / エラー（状態表示のみ） | `term-positive` / `term-danger` | #3fb950 / #f06a5f |

文字色（term-dim 以上のすべて）は、どの背景（bg・row-alt・panel・head・select）の上でも 4.5:1 以上（WCAG 1.4.3）。2026-09-30 に実測で term-dim が 3.1:1 だったため、muted・label・dim・select を上の値に改めた。値を変えるときは計算し直す。

zinc 系は上の灰色に置き換え済みなので、既存の `text-zinc-400` 等もそのまま端末の灰色になる。ただし新規・改修箇所は `term-*` を使う。

## アクセント橙の使いどころ（これ以外に使わない）
パネル名（見出しバーの左端）、選択中タブの下線、PRO の文字と枠、推定値（手残り等）、件数バッジ、キーボード操作の記号。塗りつぶしの大きなボタンには使わない（PRO購入の最終ボタンだけは例外として可）。

## 文字
- 本文は OS の日本語書体（`font-sans`）。数値・金額・件数・日付・キー表記は `font-mono`（JetBrains Mono）＋ `tabular-nums`。ユーティリティ `.term-num` でも可。
- サイズ：PC 本文 13px（`text-[13px]`）、補足・ラベル・表見出し 12px（`text-xs`）、見出し 14〜18px。**12px 未満は禁止**（`text-[9px]` `text-[10px]` `text-[11px]` は使わない）。スマホ本文は 14px 以上。
- 大文字化・字間を広げた英字ラベル（`uppercase tracking-widest`）は使わない。

## 形
- 角丸：原則なし（`rounded-none`）。入力欄とボタンは最大 `rounded-sm`（2px）。`rounded-full` はアイコンの丸以外に使わない。
- 影：浮かぶ要素（ドロップダウン・モーダル）だけ。
- 高さ：PC のボタン・入力 26〜32px、一覧の行 29px 前後。スマホ（lg 未満）の押せる要素は 44px 以上。
- 押せる要素の下限：PC でも 24px（WCAG 2.5.8）。`lg:min-h-0` は使わず `lg:min-h-6`。一覧の保存ボタンは 24×24px。
- 入力欄の文字：lg 未満では 16px（`globals.css` で一括指定。16px 未満だと iPhone が入力のたびに拡大する）。

## 部品のレシピ
- **パネル見出しバー**：`<div className="term-panel-title"><span className="term-panel-name">事例一覧</span>…補足…</div>`（高さ24px、背景 term-head、下罫線）。
- **表**：見出し行 `h-[26px] bg-term-head text-xs text-term-label border-b border-term-line`。行は `border-b border-term-line-soft`、偶数行 `bg-term-row-alt`、選択行 `bg-term-select text-term-fg-strong`。数値列は右揃え＋`font-mono`。
- **項目と値（詳細）**：左に `text-xs text-term-label` の項目名、右に `font-mono` の値と小さな単位。2列グリッドで罫線区切り。
- **状態の表示**：色の丸印は使わず文字で。確認済み＝`確認`（term-muted）、未確認＝`未確認`（term-dim、数値も term-dim）、推定＝`推定` または値に「約」（term-accent）、ピーク値＝`ピーク`（term-accent）。
- **ボタン**：通常は `border border-term-line bg-transparent text-term-fg hover:bg-term-head`。主要操作は `border border-term-accent text-term-accent`（塗らない）。
- **タブ**：四角い区切り。選択中は `bg-[var(--surface-overlay)] text-term-fg-strong` ＋ 下端2pxの橙（`shadow-[inset_0_-2px_0_var(--term-accent)]`）。
- **PRO帯**：`border-t border-term-accent-line bg-term-accent-bg`、「PRO」を橙で、見られる項目を具体的に、ボタンは橙の枠線。煽り文句（今だけ・残りN名）は禁止。
- **空状態**：何が表示されるかと最初の一手を1行ずつ。大きなイラストやカードは使わない。

## 画面構成
- **PC（lg 以上）**：上部ヘッダー36px（ロゴ `MAKE MONEY`／検索コマンド欄／ファンクションタブ／保存・PRO・時刻）＋ 本体（パネルを 1px の罫線で並べる）＋ 下部の状態バー22px（件数・更新時刻・キー操作）。
- **タブレット・スマホ（lg 未満）**：上部にロゴと検索、下部に固定のメニュー（44px 以上、4〜5項目、文字ラベル）。事例は一覧→詳細の画面遷移で、URL に `?entity=` を残し「戻る」で一覧へ戻れる。
- **画面の高さ**：画面いっぱいの枠（中だけスクロールする画面）は `term-screen`、通常のページの最低の高さは `term-page` を使う（`h-dvh`・`min-h-screen` は使わない）。どちらも下部メニューの高さ（`--term-nav-space`）を引くので、最後の行がメニューに隠れず、空白だけのスクロールも出ない。
- **履歴**：事例を開く・閉じるは `src/platform/utils/entityUrl.ts` の `openEntityParam` / `closeEntityParam` を使う。一覧から開くときだけ履歴を1つ積み、事例の切り替えは置き換え、閉じるときは積んだ履歴を戻す（閉じたあとに「戻る」で同じ事例が再び開かない）。
- 横はみ出しゼロ。

## 金額
`src/platform/utils/moneyDisplay.ts` の `formatYen` / `yenParts` / `formatManYenValue` だけを使う。表記は「150万円」「1,620万円」「1.5億円」。推定は「約」。未確認は数値を出さず「未確認」または「—」。

## 文字を減らす規則（2026-10-01）
枠（ヘッダー・道具欄・帯）の文字は、中身（事例のデータ）より目立たせない。足す前に、同じ情報がすでに画面にないかを見る。

- 画面名の下に、タブ名を並べ直した説明文を置かない。画面名はヘッダーのタブが示す（見出しは `sr-only` で残す）。
- 件数・更新日は一覧の道具欄の右に1か所だけ出す（例: `113 / 3,312件　09/28 更新　● 新着 1件`）。下の帯や見出しの段で繰り返さない。
- 新着は帯を1段使わず、件数の横の小さなボタンにする。未読の間だけ橙の点を付ける。
- 詳細欄の上の操作は「保存・◀ ▶・⋯・×」まで。比較・共有・公式サイトは「⋯」の中（Carbon: 3つ以上の行操作はまとめる）。
- 左の絞り込みは、よく使う群（運営人数・営業利益率・初期資金）だけ開く。参入障壁は畳み、選んだ数を見出しに出す。「解除」は選んでいる時だけ出す（Polaris の絞り込みの作法）。
- 飾りの文字は置かない: 時計、タブの番号、キーの案内（ショートカットは `aria-keyshortcuts` と `title` で伝える）。
- 消さない文字: 法律上・信頼上の注意（「推定を含む」「売買を仲介しない」「未確認は —」など）。ただし同じ画面で2回は出さない。

### 部分ごとの借り先
| 部分 | 借り先 | 借りた点 | 借りない点 |
|---|---|---|---|
| 表の密度・数字の右寄せ | finviz screener | 1行1社、等幅の数字、右寄せ | 宣伝の帯、色の多い文字 |
| 枠・操作 | Linear | 静かな枠、アイコン操作、`1 / 84` の送り、「⋯」 | 紫の強調色 |
| 絞り込み | Shopify Polaris | よく使う2〜3群だけ開き、畳んだ群に選択数 | — |
