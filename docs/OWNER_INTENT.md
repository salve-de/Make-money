# Make-Money 正本 — 何を・なぜ・どう・どこまで（最初に読む1本）

最終更新: 2026-10-02。
この文書は Make-Money の**唯一の入口**です。オーナー（ユーザー）が会話で伝えてきたことを1本にまとめています。何を作るか、なぜか、何を集め、どう集め、どこに貯め、どう見せ、何を守り、どうなれば完成か、を書きます。
オーナーは長い指示を書きません。AI・作業者は、これを読んでから動いてください。

**2026-10-02 最終プロダクト計画**: 機能範囲・ユーザー導線・個人開発としての実装境界は [`PRODUCT_FINAL_PLAN.md`](./PRODUCT_FINAL_PLAN.md) を正とします。この文書は引き続き唯一の入口であり、データ収集・事実/推論・権利・保存の規則は本書を維持します。

**優先順位**
1. この文書
2. [`PRODUCT_FINAL_PLAN.md`](./PRODUCT_FINAL_PLAN.md)（プロダクト機能・UX・実装境界に限る）
3. 土台（Universal Foundation）の正本（事実と証拠の残し方に限る。16章）
4. その他の文書

他の文書とこの文書が食い違ったら、この文書が勝ちます。プロダクト機能・UX・実装境界については、この文書から委任した `PRODUCT_FINAL_PLAN.md` が旧README・PROJECT_CHARTER・旧Phase計画より優先します。食い違う古い規則の一覧と置き換え先は17章にあります。
オーナーの訂正が入ったら、その場でこの文書と台帳（`~/.claude/intent/projects/Make-Money.md`）に書き足します（15章）。

---

## 1. なぜ作るのか
- **最終プロダクト導線（2026-10-02）**: 事例 → トレンド/需要 → Opportunity → Build → Launch → Market → Distribute/Promote → 実績Feedback → 次のTrend/Opportunity、という一つの循環を本体とします。詳細は [`PRODUCT_FINAL_PLAN.md`](./PRODUCT_FINAL_PLAN.md)。M&Aは中核計画から外します。
- 作るのは、読者が「これを見ずに動くのは損だ（自殺行為だ）」と思って金を払う、**資本主義の裏帳簿**です。誰が・誰から・何の恐怖や面倒を消して・どれだけ楽に・いくら抜いているかを、1画面で掴ませます。
- 読者は、これから稼ぎたい個人、経営者、投資家です。欲しいのは会計の正確さではありません。**金の抜き方の構造と規模感、それに1秒で刺さる強い一行**です。
- **勝ち**: 1件開くと、強い一行・物語・売上の規模・手残り・客の痛み・最初の客の集め方・大手が手を出せない理由・今も通用するかが、全部埋まっていること。事実は出典つき、推論は「推測」と印つきです。
- **負け**: 空欄や「未確認」だらけの画面です。正確でも商品として負けです。事実のふりをした作文もまた負けで、こちらは信用を失います。
- 集めたデータは Make-Money だけの物ではありません。共通の土台に入れて、Investrader・Idea Spark・GOLDMINE・将来の事業でも集め直さずに使い回します（16章）。

## 2. 何を集めるか（全項目・なぜ要るか・どこに入るか）
全事例で全項目を埋めます。事実が取れない項目は推論で埋めます（3章）。

表の見方:
- 「事実の欄」は、出典つきの事実を入れる場所です。`reader.facts` の種類（kind）と `reader.metrics` の指標（measure）です。
- 「推論の欄」は、事実が無い時に埋める推論です（`reader.analysis` の item）。
- 「土台の項目」は、深く調べる時の点検表です（46次元・12領域）。上限ではありません。

| 項目 | なぜ要るか | 事実の欄 | 推論の欄 | 土台の項目（46次元／12領域） |
|---|---|---|---|---|
| 強い一行 | 読者が1秒で「本物だ、読みたい」と思う入口 | — | HEADLINE（必須） | —（見せ方。作り直せる） |
| 4段の物語（前夜→隙→突破→金が回る仕組み） | 一行の裏の筋書き。読者が自分に重ねる | — | STORY（必須） | founder_background、why_now、breakout ／ timeline_and_outcomes |
| 社名・何の事業か・創業者・国・URL | 本物の会社だと信じてもらう土台 | DESCRIPTION、FOUNDING、TEAM | BUSINESS_MODEL（必須） | identity、founders、location ／ identity、people、product |
| 創業年・初動の時期・いま営業中か | いつの話か。昔話で読者を死地に送らない | FOUNDING、EVENT、EXIT | TIMELINE | timeline、status ／ timeline_and_outcomes |
| 売上（1点でも。推移が取れれば最高） | 規模感。推移は「伸びた・縮んだ」の物語になり最も強い | REVENUE（期間つき、複数期間を全部） | REVENUE_ESTIMATE（売上の事実が無ければ必須） | revenue、peak_revenue、mrr_arr、gmv ／ money_and_economics |
| 費用・利益・利益率・創業者の手残り | 「年商」の見栄を剥いで、手元にいくら残るか | COST、PROFIT、OPERATING_INCOME、NET_INCOME | COST_STRUCTURE、TAKE_HOME（必須） | costs、cost_breakdown、margin、owner_take_home 等 ／ money_and_economics |
| 料金と料金の変遷 | 何にいくら払わせているか | PRICING、PRICE | PRICING（事実が無い時だけ） | pricing、pricing_history、refunds ／ pricing |
| 客は誰か・客の痛み | なぜ金を払うのか（即決する恐怖・面倒・恥） | USERS（客数） | CUSTOMER、CUSTOMER_PAIN（必須） | customers、customer_pain、payer_receiver_purpose ／ customer_and_demand |
| 最初の客の集め方・伸びた転機・いまの集客 | 読者が一番盗みたい部分 | CHANNEL | FIRST_CUSTOMERS、CHANNELS（必須） | first_customers、initial_channel、breakout、current_channels ／ distribution |
| 人数・働き方・外注・自動化・初期資金 | 自分にもできるかの判断材料 | TEAM、FUNDING | CAPITAL_AND_TEAM | team_history、workload、outsourcing、automation、capital_required ／ people、operations |
| 使っている道具・技術 | 真似するための部品 | TOOL | TOOLS（事実が無い時だけ） | technology ／ technology |
| 競合・大手が手を出せない理由 | なぜ小さい者が勝てるのか | — | COMPETITION、INCUMBENT_BLINDSPOT（必須） | competitors、substitutes ／ competition_and_market |
| 誰の土台に乗っているか | 誰に首を握られているか | — | DEPENDENCIES | dependencies ／ competition_and_market |
| やめにくさ | 客が逃げない仕掛け | — | LOCK_IN | retention_churn ／ customer_and_demand |
| 前金（年払い・買い切り・予約金） | 客の金で回る形か | — | UPFRONT_CASH | pricing、cash timing ／ pricing、money_and_economics |
| 紹介報酬・提携 | 他人の欲で客が流れ込む配管 | CHANNEL | REFERRAL | current_channels ／ distribution |
| 過去の失敗・ピボット | 何を変えた瞬間に当たったか | EVENT | PIVOTS | prior_failures ／ timeline_and_outcomes |
| 失敗事例の死因 | 地雷を避けるため | EXIT、EVENT | FAILURE_CAUSE（閉鎖・失敗の事例だけ） | exit_value ／ timeline_and_outcomes |
| なぜ当時当たったか・今も通用するか | 昔話と今の勝ち目を分ける | — | WHY_IT_WORKED、VIABILITY（必須） | why_now、regulation ／ timeline_and_outcomes |
| 持ち帰れる核心 | 読者が自分の事業に持ち帰る1〜2文 | — | LESSON（必須） | — |
| 画像（アイコン・OG画像・App Store画像） | 画像ゼロは手抜きに見える。必須 | 画像台帳（7章） | — | — |
| 出典・権利・食い違い | 信用と法的な安全 | sources、各事実の attribution | — | provenance_rights、conflicts ／ provenance_rights_and_uncertainty |

- この表に無くても、稼ぎの構造を説明するのに役立つ事実は捨てずに残します（土台の `observations` と Journal）。
- 他の文書にある項目一覧の置き換え先:
  - 「4大禁忌＋5大暗黒パラメータ」（CLAUDE.md）は切り口の名前です。
    - ①初動 → FIRST_CUSTOMERS
    - ②大手の自爆 → INCUMBENT_BLINDSPOT
    - ③痛みの財布 → CUSTOMER_PAIN
    - ④手残り → TAKE_HOME
    - ⑤寄生 → DEPENDENCIES
    - ⑥監禁 → LOCK_IN
    - ⑦紹介網 → REFERRAL
    - ⑧前金 → UPFRONT_CASH
    - ⑨ピボット → PIVOTS
  - GOLDEN の10属性・土台の91細目（`registry/collection/business-case.v1.json`）・46次元（`src/lib/foundation/coverage.ts`）は、深く調べる時の点検表です。画面の項目はこの表で決めます。

## 3. 事実と推論
**種類は5つ**で、画面では必ず見分けがつくようにします。

| 種類 | 意味 | データ上の印 |
|---|---|---|
| 事実 | 公式サイト・届出・上場資料・取引所の掲載どおり | attribution / origin = OFFICIAL・FILING・LISTING・FILED |
| 本人申告 | 本人が公表した数字や発言。本人が言っているなら採用してよい | SELF_REPORTED |
| 第三者推計 | 記事や他社の推計。本人の数字として扱わない | ARTICLE・THIRD_PARTY |
| 推定 | 数字の推論。式と前提を付ける（例: 売上約$21万 − 運営費約$2万 − 決済手数料約$1万 = 手残り約$18万〜20万） | `analysis` の formula あり、または metric origin = ESTIMATED |
| 推測 | 言葉の推論（客の痛み、大手が来ない理由など） | `analysis`（basis に拠った事実の id、confidence） |

- **推論は、集めた事実と業界の相場から推して埋めます。** 相場の例は、Stripe の手数料（日本 3.6%、米国 2.9%+30¢）、App Store の手数料 15〜30%、SaaS の粗利、広告単価です。推論には、どの事実から推したか（basis）を必ず付けます。
- **やってはいけないのは1つだけ**: 推論を事実や本人の発言に見せかけることです。例えば「」で括る、「〜と語った」と書く、存在しない出典を付ける、です。
- 調べれば公開の事実があるもの（創業年・料金・本人が公表した売上）は、推測で埋める前に一次情報を取りに行きます。
- 事実の欄は、事実が無ければ空のまま残します。0円や仮の人数を事実の欄に入れません。推論は別の欄（`analysis`）に置き、画面では「推測」「推定」の印つきで出します。これは土台の「不明は不明のまま」と矛盾しません（16章）。
- 手残りの推定は「事業の手残りの推定」であって、個人の所得ではありません。本人が公表していない限り、個人の実額は「不明」です（土台の規則と同じ）。

### 3-1. 強い一行（HEADLINE）の基準
- 1秒で情景が浮かび、急所を突く言葉にします。誰が・何の恐怖や面倒を消して・どんな手間で・いくら抜いているか。40〜120文字です。
- 手本:
  - 「工場のラインが止まる恐怖を消して5億（キーエンス）」
  - 「構築10日、あとは週1時間の保守。面倒な管理は絶対にしない男の戦略」
  - 「大手が改悪した夜、怒った常連を拾って年会費を取り、社員ゼロのまま11年間、年約$20万を抜き続けた1人のブックマーク屋（Pinboard）」
- 数字は事実か推計（約・幅）から取ります。事実に無い日数・年齢・人数・経歴は作りません。発言の形にもしません。
- 出どころの断り書き（「本人申告で」）は見出しの前半に置きません。印は別に付きます。
- 後から事実と食い違ったら作り直します。

### 3-2. 4段の物語（STORY）
「前夜：…。隙：…。突破：…。金が回る仕組み：…。」の形で、1段1文、400文字以内にします。
- 前夜 = 創業者は何者で、何に苛立っていたか。
- 隙 = どんな市場の歪み、放置された不満、価格の穴を見つけたか。
- 突破 = 最初に金が動いた行動。
- 金が回る仕組み = なぜ続くか、何が危ういか。
（土台の MAKE_MONEY_RESEARCH_REQUIREMENTS §5）

### 3-3. 書き方
- 文系の経営者が1秒で分かる言葉で書きます。コンサル用語・横文字の熟語は使いません。
- 抽象的な一般論（「〜が重要」）は価値がありません。どの会社にも当てはまる文なら書き直します。
- 「出典」「本文」「確認できなかった」など作業の言葉は、画面に出しません。

## 4. 厳密さはどこまで要るか（公開の合格基準）
- **数字は大体でよい。** 「約」「幅」で書き、桁が合っていればよいです。料金や運営費を100%合わせることは目的ではありません。
- 厳しくするのは2つだけです。
  1. 事実のふりをした嘘
  2. 出してはいけない物（権利・違法指南・事業と関係ない個人情報）

  言い換えや丸めは咎めません。
- **公開の合格基準**（抜き取り監査で測る）:
  - 画面に出す事例で、主要項目の空欄率が 5% 未満。facts と analysis を合わせて数えます。
  - 事実のふりをした推論・捏造した発言が 1% 以下。
  - 出してはいけない物が 0 件。
  - 推論の水準が手本（[`data/samples/pinboard.stamped.json`](../data/samples/pinboard.stamped.json)）と並べて同等。
- 経緯: 2026-09-29〜30 に「出典どおり95%」を目指して監査を14回回しました。その結果、推論まで作文として消して、画面が空になりました。正確さの検査を守ることが目的になっていました。この失敗を繰り返しません。95% は公開の条件ではありません。事実の欄の照合の目安です。

## 5. どう集めるか
### 5-1. 探し先
一次情報を優先しますが、一次情報だけに絞りません。探し先は次の9つです。
1. 公式（サイト・料金表・規約・更新履歴・届出）
2. 本人の発信（ブログ・インタビュー・ポッドキャスト・X）
3. 過去の魚拓（Wayback などの公開アーカイブ）
4. 報道・専門メディア
5. マーケット（Product Hunt・App Store・比較サイト）
6. 客の声（レビュー・Reddit・HN・フォーラムの不満）
7. 流入・技術・求人・提携の公開シグナル（推計は推計として）
8. 失敗・閉鎖・売却の記録
9. 出典不明の手がかり（未確認として残す）

### 5-2. 2段で取る
- 第1波: 公知の事実と、推論で埋める全項目を取ります。
- 第2波: 次の3つを掘ります。
  - 創業者が後から消した初期の姿（公開アーカイブ）
  - 宣伝に埋もれた本音の不満
  - 自称ではない本当の集客経路

どちらも合法な公開情報だけを使います。403・CAPTCHA・ログイン・有料の壁は越えません。LinkedIn は使いません。

### 5-3. 実際の流れ（コマンド）
1. **出典の本文を取る**: `scripts/reader-case/fetch-sources.ts`。`data/source-cache/` に入ります。
2. **事実を出典と照合する**: `build-verify-batches.ts` → `run-verify.sh`（Codex）→ `merge-verdicts.ts` の順です。結果は `data/reader-verdicts.json` に入ります。
3. **推論で埋める**: `build-analyze-batches.ts` → `run-analyze.sh`（Codex、指示文は `scripts/reader-case/analyze-prompt.md`）→ `merge-analysis.ts` の順です。結果は `data/reader-analysis.json` に入り、機械で落とした分は `data/analyze/dropped.json` に残ります。
   機械で落とす条件:
   - 根拠の id が無い
   - 発言の捏造
   - 作業の言葉
   - 式の無い数字
   - 事実と矛盾する
   - 事実がある項目の上書き
   - 違法指南
4. **公開版を作る**: `pnpm catalog:prepare`。`data/catalog-release.json` と、事例ごとの表示印 `data/case-display.json` ができます。
5. **抜き取り監査**: 4章の基準で、画面に出る主張を出典と並べて読みます。検査スクリプトの合格は、正しさの証拠になりません。
6. **R2 に公開して本番に出す**: `pnpm catalog:publish` で R2 に入れます。本番の画面は `pnpm deploy:workers` で変わります。
7. **本番の画面で確かめる**（12章）。

- 1件ごとに、調査・保存・読み戻し・画面確認を同じ件で最後まで通します。途中の工程の成功で進捗を報告しません。

## 6. 出してよいか（権利と法）
- 事実そのもの（数字・出来事）は、著作権で守られません。自分の言葉で書けば商用で出せます。記事の文章・構成は写しません。
- **eBiz Facts（ebizfacts.com）は、利用規約で素材の商用利用・公の表示を禁じています**（2026-09-30 確認。準拠法ワイオミング州）。
  - 事例を見つける手がかりにだけ使い、数字・出来事は本人・公式の一次情報に付け替えます。
  - 付け替えるまで、eBiz しか出典の無い事例は画面に出しません（HOLD_RESOURCE）。
  - 権利3層の表で eBiz を「事実のみ可」に置く旧記述は、これで置き換えます。
- 違法・規約違反・グレーな手口のやり方は、推奨・手順化しません（自作自演・スパム・規約の抜け方・不正な取得・送りつけ営業のテンプレート）。その会社が実際にやったことを事実として述べるのは可です。
- 実在の人・会社について、事実に無い違法の疑いを推測で書きません。
- 誰の発言か出典で食い違う言葉は、本人の言葉として引きません（例: Pinboard の「パンツ一丁で…」）。
- 事業と関係ない個人情報（私生活・住所・家族）は書きません。

## 7. 画像
- 画像ゼロは不可です。法的・権利的に大丈夫なものは取ります。社内文書の制限を理由に止まらず、法律と権利を調べ直してから判断します。
- **取る物**:
  - 公式サイトのアイコン（favicon）と OG画像
  - App Store のアイコンと、ストアの画面写真（最大3枚）
- **出し方**: 小さく出し、元のページへリンクし、出典を記録します。削除依頼に応じます。
- **やらないこと**:
  - 拡大・ダウンロード・ギャラリー・大きな見出し画像にしない（土台の MEDIA_THUMBNAIL_AND_LIKENESS_POLICY と同じ線）。
  - 人物写真は使わない。
  - 出所の分からない Web 画像は取らない。
- 細則と台帳: [`MEDIA_ASSETS_AND_PROVENANCE.md`](./MEDIA_ASSETS_AND_PROVENANCE.md)。取得スクリプトは `scripts/media/`（公式サイト・App Store・自動審査・R2 への投入）です。

## 8. スタンプ（全部に印を押して保存する）
- **項目ごと**: 種類（3章の5つ）、根拠（basis・formula）、出典（どこから持ってきたか）、画面に出してよいか、の4つを押します。
- **事例ごと**: 画面に出すか、出さないならその理由を `data/case-display.json` に押します（公開版を作る時に自動で作られます）。

| 印 | 意味 |
|---|---|
| SHOW | 出典と照合した事実がある → 出す |
| HOLD_UNVERIFIED | 出典と照合できた事実が無い（出典が開けない・消えた・未照合）→ 一次情報を探し直す |
| HOLD_THIN | 事実2件以下で数字なし → 一次情報を探し直す |
| HOLD_RESOURCE | 出典が eBiz Facts だけ → 一次情報に付け替えるまで出さない |
| HOLD_SCHEMA | 形式の検査を通らない → 直す |
| HOLD_NO_RAW | 元の記録が無い → 収集からやり直す |

- 手本: [`data/samples/pinboard.stamped.json`](../data/samples/pinboard.stamped.json)。オーナーが「最高」と評価した水準です。

## 9. 薄い事例・難しい事例
- 数字が無い、出典が消えた、事実が少ない、という事例は、一次情報を1回探し直します。
- 見つからなければ捨てません。保存したまま「データが少ないので画面に出さない」と印を付けて保管し、後の収集で埋まれば出します。
  - これは「集めない（足切り）」ではありません。「集めて保存し、画面に出さない」です。
- 第三者の推計しか無い事例（例: JustinGuitar）は、第三者推計と明記すれば規模感として使えます。

## 10. どこに貯めるか
| 物 | 置き場 | 役割 |
|---|---|---|
| 事例の作業用の索引 | `data/entities-index.json`（125MB。GitHub に載らない） | 公開版を作る元。手で編集せず、スクリプトで作り直す |
| 出典の本文 | `data/source-cache/`（約7,500件、ローカルのみ） | 照合と推論の材料。権利上許される物は土台の証拠置き場（foundation-raw）へ |
| 照合の結果 | `data/reader-verdicts.json` | どの事実が出典どおりか |
| 推論 | `data/reader-analysis.json` | 作り直せる見せ方。事実の欄を書き換えない |
| 表示の印 | `data/case-display.json` | 事例ごとの出す・出さない |
| 画像 | `data/media-staging/`（取得済み・台帳つき）→ R2 | 7章 |
| 公開版 | `data/catalog-release.json` → R2 `views/make-money/catalog-v1/objects/<hash>.json.gz` | 本番の画面が読む物 |
| 土台 | R2 の foundation-raw（証拠）、foundation-lake（Journal・派生データ）、foundation-public（公開物） | 16章 |

- **読み取り専用（書き込まない）**: 土台の `universal` バケット、EDINET の保存先（`universal/data-assets/financials/`）、Investrader のデータ。
- R2 への書込みは、新規作成だけで上書きしません。書いた直後に読み戻し、バイト数とハッシュが合うことを確かめます。

## 11. どう見せるか（データ側の約束）
- 画面の実装は UI 担当の会話がやります。データの会話は画面を触りません。
- 画面の文字は次の3つからだけ作ります。作業メモ・判定規則は画面に届きません（`src/shared/reader-case.ts`）。
  - `entity.reader` の facts（出典つきの事実）
  - metrics（数字をコードが書式化したもの）
  - analysis（推論。必ず「推測」「推定」の印つき）
- 1件の画面に、強い一行・物語・売上の推移・手残り・客の痛み・最初の客・大手が手を出せない理由・今も通用するか・画像・出典が並ぶのが完成形です。

## 12. 完成の測り方（終点）
完成は「R2 に入り、本番の画面に出たか」で測ります。途中の工程の成功では測りません。
1. **R2**: 公開版（catalog release）の最新が R2 にあり、ローカルの `data/catalog-release.json` とハッシュが一致すること。測り方は `~/.claude/intent/projects/Make-Money.check`（R2 とローカルの件数・ハッシュの比較）です。
2. **中身**: 画面に出す事例で、主要項目の空欄率が 5% 未満であること。抜き取り監査が4章の基準を満たすこと。
3. **本番の画面**: 本番で実在の事例を1件以上開き、次の4つを目で確かめること。
   - 強い一行
   - 事実（出典つき）と推論（印つき）が区別されて見える
   - 画像がある
   - 作業の言葉が見えない
4. **報告**: 「マージ」「デプロイ」「R2 のデータ」を分けて書きます。main へのマージと本番反映は別です。本番は `pnpm deploy:workers` で変わり、画面の中身は R2 の公開版で決まります。

## 13. 完成までの順番
1. 照合（出典どおりの事実を決める）
2. 推論で全項目を埋める（全件）
3. 公開版と表示の印を作る
4. 抜き取り監査
5. R2 に公開
6. デプロイ
7. 本番の画面で確かめる

これを1周回した後に、次を回します。
- 次の波: eBiz だけの事例（約760件）の一次情報への付け替え、薄い事例・保留の事例の探し直し、画像（取得済み約2,500件）の R2 投入。
- その後: 出典の本文の土台への保存、12領域×9探し先の「見つかった／探したが無かった／探していない」の記録。

## 14. 担当と許可
| 誰 | 何をするか |
|---|---|
| オーナー | 目的と決定だけを言う。長い指示は書かない |
| Claude（この会話） | 指示を書く、Codex の結果を実物で確かめる、取り込み、公開、報告。軽い作業は Sonnet の下請けに任せ、結果は実物で確かめる |
| Codex（ChatGPT の契約内、gpt-6.1-sol・思考 high） | 大量の照合と推論（API 課金なし） |
| UI 担当の会話 | 画面の実装。データの会話は画面を触らない。頼まれない限り担当外は触らない |

- **許可**: push・PR・マージ・デプロイ・R2 への書込みは包括許可です（2026-09-30）。いちいち許可を求めません。削除・課金・外部への公開の追加は確認します。
- **報告**: 日本語で、結論から、平易に書きます。項目名の一覧ではなく、実在の1件で「左に項目・右に実際の中身」の実物を見せます。未達は冒頭に書きます。

## 15. 決定の経緯（新しい順）
| 日付 | 決定 | 覆した物 |
|---|---|---|
| 2026-10-02 | 最終プロダクト計画を固定。事例 → Trend/需要 → Opportunity → Build → Launch → Market → Distribution/Promotion → 実績Feedbackを本体とし、内部はIntelligence / Creation / Commerce / Feedbackの4エンジンに統合。ユーザー価値は削らず、LLM・コード生成・Hosting・決済/KYC/payout等の巨大基盤は外部providerへ委譲する | M&Aを中核から除外。独立Execution、独立Finder、Compare専用プロダクト、巨大SNS、Newsletter/Alert/Bookmark、Goal Layer、汎用AIチャットを主役にする旧案 |
| 2026-09-30 | 分析の項目に 料金・道具・時期・前金・紹介報酬・ピボット・4段の物語 を足し、全項目を推論で埋められるようにした | 料金・道具・創業年は事実が無ければ空欄になる作り |
| 2026-09-30 | 土台（Universal Foundation）との関係を決めた: 事実と証拠は土台に長く残し、推論・一行・手残り推定は作り直せる見せ方 | — |
| 2026-09-30 | 見出しは強い一行にする。項目ごと・事例ごとにスタンプを押して保存する | — |
| 2026-09-30 | eBiz Facts は利用規約で商用表示禁止。発見の手がかりにだけ使う | 権利3層で eBiz を「事実のみ可」とした 09-29 の判断 |
| 2026-09-30 | 数字は大体でよい。厳しくするのは「事実のふり」と「出してはいけない物」だけ | 「出典どおり95%」を公開条件にしたこと |
| 2026-09-30 | 空欄は負け。事実が無い項目は、推測と明記した推論で埋める | 「推測で埋めず未確認のまま残す」（台帳 09-30 の一時的な方針、CLAUDE.md・AGENTS.md・CHARTER 等の旧文） |
| 2026-09-30 | 薄い事例は捨てずに保存し、画面に出さない印を付ける | 「出典なしの事例も一覧に出せる」 |
| 2026-09-30 | push・PR・マージ・デプロイ・R2 書込みは包括許可 | 毎回の承認 |
| 2026-09-29 | 画像ゼロは不可。アイコン・OG・App Store 画像を取る（v3） | 「許諾済みか自作の画像だけ」 |
| 2026-09-29 | カタログ 3,341件の損益の96%がテンプレートの式と判明。作文を画面から外し、出典つきの事実に作り直す（honest-catalog） | 09-17 の「全件校閲済み」報告 |

- それより前の経緯は、白書 [`PROJECT_MASTER_HISTORY_AND_STRATEGY.md`](./PROJECT_MASTER_HISTORY_AND_STRATEGY.md) にあります（2026-09-29 まで）。
- 時系列の細かい訂正は、台帳 `~/.claude/intent/projects/Make-Money.md` にあります。

## 16. 土台（Universal Foundation）との関係
集めたデータは、共通の土台 [salve-de/universal-foundation](https://github.com/salve-de/universal-foundation) に入れて、他の事業でも使い回します。土台の正本は次の3つです。
- **北極星**（`docs/NORTH_STAR.md`）: 「広く取る。証拠をそのまま残す。事実は控えめに組む。変化を時系列で追う。深掘りは価値のある物だけ。事業ごとの見せ方は最後に作る」。狙いは、新しい事業を思いついた時に集め直さずに済むことです。
- **何を集めるか**（`docs/MAKE_MONEY_COLLECTION_SCOPE.md`）: 12の領域と9つの探し先（5-1）です。「見つかった／探したが無かった／探していない／該当しない／不明」を区別して記録します。
- **Make-Money の物語の決まり**（`docs/MAKE_MONEY_RESEARCH_REQUIREMENTS.md`）: 強い一行・4段の物語・客の心理・堀は残します。事実で確かめた後に作り、推論と印を付け、後から作り直せる形にします。

この文書と土台の分け方:
- **土台に入れる物（長く残す）**: 出典、取得日時、出典の本文（権利上許される時だけ）、事実・数字・出来事、食い違い、未確認。
- **作り直せる物（事業ごとの見せ方）**: 強い一行、4段の物語、推論の各項目、手残りの推定、今も通用するか。モデルが良くなった時や事実が増えた時に作り直します。
- **画面の決定はこの文書が優先**: 土台は「出典なしの手がかりも表示してよい」としています。Make-Money の画面では「データが少ない事例は保存したまま出さない」とします（9章）。

土台の決まりに届いていない所（13章の「その後」で埋める）:
- 出典の本文（`data/source-cache`）が、土台の証拠置き場に入っていない。
- 推論と表示の印が、土台の派生データとして入っていない。
- 12領域×9探し先の記録が無い。

## 17. 古い文書の扱い
次の文書には、この文書と食い違う古い規則が残っています。消さずに、該当箇所に「廃止。OWNER_INTENT の○章」と注記してあります。

| 文書 | 古い規則 | 置き換え先 |
|---|---|---|
| CLAUDE.md | 根拠が足りなければ穴埋めしない（逆算の規定）、「今夜使えるズル」の言い回し、外部書込みは毎回許可 | 3章、6章、14章 |
| AGENTS.md | 空欄を推測で埋めるな、LOOT_BLUEPRINT の転用手順、送りつけ営業のテンプレート | 3章、6章 |
| PROJECT_CHARTER.md | 分からない利益は推測で埋めない、出典なしも表示 | 3章、9章 |
| docs/DATA_COLLECTION_CONTRACT.md | 不明な項目は推測で埋めない、出典なしも一覧・詳細に出せる | 3章、9章 |
| docs/GOLDEN_INGEST_SCHEMA.md | LOOT_BLUEPRINT の転用手順、送りつけ営業のテンプレート、国の既定値 JP/GLOBAL、円換算前提 | 6章、2章（国は不明なら不明、通貨は原通貨） |
| docs/EXISTING_DATA_TO_UI.md、docs/FOUNDATION_UI_READ_PATH.md | 未確認のまま表示、未知欄を埋めない | 3章、11章 |
| docs/MAKE_MONEY_COLLECTION_SCOPE.md 末尾 | 必須項目を推測で埋めるな | 「推測を事実と偽って埋めるな」に読み替え（3章） |
| docs/COMMERCIAL_RIGHTS_PUBLICATION_HANDOFF.md、docs/RIGHTS_THREE_TIER_SPEC.md | eBiz Facts は Tier 2（事実のみ可） | 6章 |
| docs/MEDIA_ASSETS_AND_PROVENANCE.md | ストア画像のギャラリー表示、許諾済みか自作だけ | 7章 |
| HANDOFF.md、docs/architecture/AUTONOMOUS_DATA_INGEST_PROTOCOL.md | 画面は entities-index.json を直接読む | 10章（本番は R2 の公開版を読む） |
| docs/INDIVIDUAL_CURATION_REPORT.md | 全件校閲済み | 廃止（15章 09-29） |
| docs/DATA_COLLECTION_MASTER_GUIDE.md 3-4 | UNKNOWN のまま残せ | 同 Ⅰ-6（保存上の状態。画面の完成形ではない） |
| README.md、PROJECT_CHARTER.md、旧Phase記録 | M&A・独立Execution/Finder・Goal Layer等を中核または主要出口として扱う記述 | [`PRODUCT_FINAL_PLAN.md`](./PRODUCT_FINAL_PLAN.md)（2026-10-02の最終プロダクト範囲） |

## 18. 今の状態（2026-09-30 夜）
- この文書が指す仕組みの多く（`src/shared/reader-case.ts` の推論欄、`scripts/reader-case/`、`scripts/media/`、`docs/MEDIA_ASSETS_AND_PROVENANCE.md`、`docs/RIGHTS_THREE_TIER_SPEC.md`、表示の印）は、作業ブランチ `claude/honest-catalog-20260929` にあり、まだ main に入っていない。そのブランチは `data/entities-index.json`（125MB）が GitHub の上限を超えるため push できない。main へは、大きなファイルを除いた形で入れる必要がある。
- 本番の画面は、まだ 09-22 の古い公開版を読んでいる。
- 残りの順番は13章のとおり。
