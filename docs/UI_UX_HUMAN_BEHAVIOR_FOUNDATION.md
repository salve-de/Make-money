# Make-Money UI/UX・人間心理・行動設計 正本

> 更新日: 2026-09-27  
> 対象: `salve-de/Make-money` remote `main`  
> 調査時点の基準SHA: `e03c1b3b600acf175452bba515ec66f9599efd3a`  
> 注意: 本文は remote main の確認結果であり、ローカル作業treeの未commit差分は含まない。  
> 制約: DBスキーマ・収集データ構造を変更せず、既存ページ機能を保ったままUI/UXを改善する。  
> 禁止: 絵文字、誇大表現、無意味に大きい説明Hero、全ページを一本の固定ルートへ押し込むこと。

---

## 0. この文書の目的

これは「見た目を整える」ためのUIメモではない。

Make-Moneyについて、

- 人は何を求め、何を避けるか
- 何に希望・意味・自律性・有能感・安全・承認・好奇心を感じるか
- 不確実性や損失にどう反応するか
- 何を見たときに信頼し、何を見たときに胡散臭いと感じるか
- 情報が多いのに薄く見える状態と、価値ある高密度の違い
- PC / Mobile / Accessibilityでどう読む・操作するか
- その知見をMake-Moneyの各ページへどう適用するか

を、基礎研究・公的ガイド・現行コード・公開されている近接サービスの設計を突き合わせて決めるための正本である。

研究一般論をMake-Moneyへそのまま当てはめない。各項目は以下を分離する。

1. **コード上の事実**
2. **外部研究・一次資料が支持する範囲**
3. **Make-Moneyへの推論**
4. **成立しない可能性・反証条件**

---

# 1. 今回実際に確認したもの

## 1.1 GitHub上の実装

主要確認ファイル:

- `src/app/page.tsx`
- `src/app/welcome/WelcomeClient.tsx`
- `src/app/discover/page.tsx`
- `src/app/discover/DiscoverClient.tsx`
- `src/features/discover/discovery-model.ts`
- `src/platform/components/layout/TerminalShell.tsx`
- `src/platform/components/navigation/GlobalHeader.tsx`
- `src/platform/components/navigation/MobileBottomNav.tsx`
- `src/platform/hooks/useTerminalWorkspace.ts`
- `src/platform/hooks/useSelectedEntityNavigation.ts`
- `src/platform/hooks/useViewHistory.ts`
- `src/platform/hooks/useEntityFilter.ts`
- `src/platform/hooks/useAnalystNotes.ts`
- `src/platform/components/grid/InstitutionalDataGrid.tsx`
- `src/platform/components/grid/MobileFeedCard.tsx`
- `src/features/company-inspector/CompanyInspectorPane.tsx`
- `src/features/company-inspector/model/inspector-model.ts`
- `src/features/company-inspector/ui/CompanyHeader.tsx`
- `src/shared/terminal.ts`
- `src/app/playbook/page.tsx`
- `src/platform/components/playbook/PlaybookIntelligenceView.tsx`
- `src/lib/intelligence/macro-aggregator.ts`
- `src/app/radar/page.tsx`
- `src/app/radar/[id]/page.tsx`
- `src/platform/components/radar/MarketRadarView.tsx`
- `src/platform/components/radar/RadarItemDetailView.tsx`
- `src/platform/data/marketRadarData.ts`
- `src/platform/components/archetypes/TacticalArchetypesView.tsx`
- `src/platform/data/marketAnomaliesData.ts`
- `src/platform/components/synthesis/StrategySynthesisView.tsx`
- `src/components/builder/BuilderWorkspace.tsx`
- `src/app/execute/page.tsx`
- `src/app/execute/[id]/ExecutionClient.tsx`
- `src/app/partners/PartnersClient.tsx`
- `src/lib/payments/founding-pass.ts`
- `src/components/terminal/ProModal.tsx`
- `src/app/api/checkout/route.ts`
- `src/app/success/page.tsx`
- `src/app/registry/page.tsx`
- `src/app/registry/RegistryClient.tsx`
- `src/platform/components/ticker/MarketTickerStrip.tsx`
- `src/app/globals.css`

主要ドキュメント:

- `README.md`
- `PROJECT_CHARTER.md`
- `docs/PROJECT_MASTER_HISTORY_AND_STRATEGY.md`
- `docs/OPPORTUNITY_BUILDER.md`
- `docs/MAKE_MONEY_COLLECTION_SCOPE.md`

## 1.2 GitHub内で確認した「利用実態」系の情報

確認できたもの:

- 閲覧履歴は `useViewHistory.ts` で localStorage 保存
- Bookmarkはguest local / account API同期あり
- Analyst Notesはguest local / account API同期あり
- Execution Projectはユーザーの実行状態を保持
- Repository内の意思決定史には、オーナー側からの過去UI指摘・修正履歴が大量に残っている

確認できなかったもの:

- GA / PostHog / Amplitude / Clarity / Hotjar 等の典型的なプロダクト解析SDK
- 外部一般利用者の定例インタビュー結果
- 外部一般利用者のユーザビリティテスト記録
- GitHub Issues上のまとまった外部ユーザーUXフィードバック
- デバイス比率・離脱率・再訪率・検索語・ページ遷移等の実測集計

したがって「実際の全ユーザーがこう行動する」とは断定しない。一方で、現行コード、内部意思決定史、既存機能、外部研究、近接サービスから暫定設計は十分に作れる。

---

# 2. 内部の「人間本質」断定の扱い

`PROJECT_CHARTER.md` / `README.md` には、プロダクト思想として非常に強い表現がある。

例:

- 人間は隷属と屈辱から逃れるために金を求める
- 人間は「ズル」を狂気的に欲する
- 人間は綺麗事を警戒し、生々しい悪徳だけを信じる
- 人間は努力を嫌う
- 人間はカモにされる屈辱を恐れる

これらは内部仮説・ブランド思想として読むことはできるが、**人間一般の科学的事実として扱ってはならない**。

理由:

- 動機は複数であり、状況・文化・個人差が大きい
- 金銭動機だけでも、安全・自律性・status・家族・ゲーム性・達成・創造・承認などが混在する
- 「恐怖を突けば払う」「努力を嫌う」等を普遍化すると、ユーザーを一種類の人間として扱うことになる
- 強い断定コピーは説得意図を露出させ、反発・不信を生む可能性がある

**UIでは人間像を決めつけない。ユーザー本人が目的を決められる状態を作る。**

---

# 3. 人間の根本動機とMake-Moneyへの意味

## 3.1 自律性・有能感・つながり

Ryan & DeciのSelf-Determination Theoryは、自律性・有能感・関連性を重要な心理的欲求として扱う。

一次資料:
- https://www.selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf

### 支持する範囲

- 人は自分で納得して選んでいる感覚を持てる方が、自己調整や動機づけに有利になり得る
- 「自分にはできる」「理解できる」という有能感は行動継続に関係する
- 他者とのつながりも重要

### 支持しない範囲

- Make-Money利用者は全員独立志向である
- 全員が起業したい
- 全員がコミュニティを欲しい
- 自律性を高めるには選択肢を無限に増やせばよい

### Make-Moneyへの適用

**「これをやれ」と決めるのではなく、選択材料を渡す。**

したがって、

- Discoverから入ってもよい
- Ledgerから直接調べてもよい
- Radarから市場変化を見てもよい
- Company Detailへ直リンクしてもよい
- Synthesis/Builder/Executionを使わなくてもよい

一本のwizardへ押し込まない。

---

## 3.2 希望は「夢」より「経路」

Make-Moneyで「人生が変わる」を約束してはいけない。

人が前へ進みやすいのは、巨大な成果数字を見るだけでなく、

- 誰がやったか
- どの条件だったか
- 何人だったか
- 最初の顧客はどう来たか
- どこに難所があったか
- 自分と何が違うか

が分かり、「自分との距離」が見える状態。

### UIへの適用

「月商1,000万円」を単独で大きく出すより、

> 月商1,000万円 / 2人 / B2B / 直販 / 3年目 / 2025年時点

の方が意思決定に使える。

**成果 × 条件**を常にセットで見せる。

---

## 3.3 好奇心は「データ上の違和感」から作る

LoewensteinのInformation Gap Theoryが示す方向は、「知っていること」と「知りたいこと」の差が好奇心につながる、というもの。

Make-Moneyではclickbaitではなく、**実データの差そのものを好奇心にする**。

良い例:

> 月商800万円なのに2人運営  
> なぜ2人で回るのか

悪い例:

> 衝撃の裏技  
> 誰も知らない秘密  
> 絶対に見るべき

### 結論

Discover / Radar / Archetypesは、コピーで刺激するより、**比較差・異常値・構造差**を前面に出す。

---

## 3.4 不確実性・リスクは「消す」のではなく扱える形にする

Risk as Feelings:
- https://pubmed.ncbi.nlm.nih.gov/11316014/

意思決定では、確率計算だけでなく感情反応も影響する。

### Make-Moneyへの意味

情報が不完全なときに、

- VERIFIED
- REPORTED
- ESTIMATED
- UNVERIFIED

を隠して「強い結論」を出す方が短期的には気持ちよく見えるが、重要な意思決定には弱い。

必要なのは、

> 売上: 一次確認  
> 利益: 推定  
> CAC: 未確認  
> 情報時点: 2025-11

のように、不確実性を「使える状態」にすること。

### 留保

「赤を増やせば人は注意する」「損失回避は常に利益の2倍」等の単純処方は採用しない。

---

## 3.5 説得されている感覚は不信を生み得る

2025年のreactance meta-analysis:
- https://academic.oup.com/hcr/article/52/1/38/8178818

高い自由脅威言語は、怒り・反論・reactanceを増やす傾向が報告されている。

### Make-Moneyへの意味

避ける表現:

- 今すぐやれ
- 9割即死
- 絶対に勝てる
- これを持たずに動くのは自殺行為
- 数学的に勝てる
- 迷うな

UIでは、

- 顧客が払う理由
- 参入が難しい理由
- 失敗要因
- 現在の条件
- 観測できた変化

と普通の言葉で書く。

**鋭さはデータで出す。文章の威圧で出さない。**

---

## 3.6 見た目は信頼へ影響するが、綺麗なら正しいわけではない

Stanford Web Credibility Project:
- https://credibility.stanford.edu/guidelines/
- https://credibility.stanford.edu/research.html

支持されること:

- 見た目・情報設計はcredibility評価に影響する
- 外部根拠を確認しやすくすることはcredibilityに役立つ
- 宣伝を抑え、直接的で誠実な表現にすることが推奨される
- 更新時点を示すことがcredibilityに役立つ

支持されないこと:

- Dark themeなら信頼される
- Bloomberg風なら正しい
- 金融端末風なら専門家に見えるから十分

Perceptual Fluency研究:
- https://www.sciencedirect.com/science/article/pii/S1053810099903860

読みやすい文は「真実らしく」感じられる可能性がある。

### Make-Moneyへの重要な含意

**洗練されたUIは未検証値まで本当らしく見せ得る。**

よって、

> 美しいUI + verification / date / source state

をセットに設計する。

---

# 4. 情報量は減らしすぎない

Choice overload meta-analysis:
- https://doi.org/10.1086/651235

「選択肢が多いほど常に悪い」という普遍則は支持されない。条件差が大きい。

Visual clutter研究:
- https://pubmed.ncbi.nlm.nih.gov/18217832/

過剰かつ整理されていないdisplay itemsはvisual searchや認識を困難にする。

### Make-Moneyへの結論

問題は**情報量**ではなく**整理されていない情報量**。

Make-Moneyは低密度にする必要はない。

狙うのは:

> 多いが比較可能  
> 多いが優先順位がある  
> 多いが読む順番がある  
> 多いが意味の違いが見える

状態。

### 薄い高密度

> HOT / 98 / +380% / EASY / FIRE / 500万円

値の意味と由来が不明。

### 価値ある高密度

> 2人｜B2B月額｜月商800万｜営業利益率41%｜直販｜2025-11｜一次2 / 推定1

すべてが比較軸になっている。

---

# 5. 人生の意味・目的とMake-Money

Meaning in Lifeの整理:
- https://www.tandfonline.com/doi/abs/10.1080/17439760.2015.1137623

Martela & Stegerは、意味を少なくとも

- coherence: 状況が理解できる
- purpose: 方向がある
- significance: 価値があると感じる

に分ける。

### Make-Moneyへの意味

「人は金が欲しい」だけで決めない。

同じ収益目標でも、

- 会社員を辞めたい
- 家族の安全を作りたい
- 自分で作りたい
- 能力を試したい
- statusを得たい
- 市場ゲームとして楽しみたい

など目的は違う。

Make-Money自身がユーザーの人生目的を決める必要はない。

**ユーザー本人の目的に対して、現実の選択肢を理解可能にする。**

---

# 6. Make-Moneyへ何度も戻る具体的価値

再訪理由を「毎日刺激的なネタを見る」に限定しない。

人が戻る価値を4種類に分ける。

## 6.1 「こんなやり方があるのか」

担当ページ:
- Discover
- Radar
- Archetypes

価値:
- 未知の事例
- 市場変化
- 異なる収益構造
- 成功・失敗の異常値

## 6.2 「本当はどうなっているのか」

担当ページ:
- Ledger
- Company Detail
- Evidence

価値:
- 収益
- 利益
- 誰が払うか
- 何人で回るか
- 時点
- 根拠
- 未確認

## 6.3 「自分ならどうするか」

担当ページ:
- Notes
- Saved cases
- Synthesis

価値:
- 他人の事例を自分の文脈へ移す
- 複数事例を材料に考える
- 自分の考察を残す

## 6.4 「前に決めたことを続ける」

担当ページ:
- Execution
- Bookmark
- View History

価値:
- 実行状態
- 次の行動
- 実売上
- First Dollar
- 継続案件

再訪理由は、

> 世界の事例が増える  
> 自分の理解が深まる  
> 自分の判断が蓄積する  
> 自分の実行が進む

に置く。

---

# 7. 近接サービスから確認したこと

## 7.1 AlphaSense

Company Profileは単一企業の調査central hubとして、

- Summary
- financials
- documents
- market position
- Save & Alert

を集約している。

公式:
- https://help.alpha-sense.com/hc/en-us/articles/42623871994131-Company-Profiles

### Make-Moneyへの示唆

1社Detailを強い中心画面にすることは自然。
ただしAlphaSenseの構造をそのままコピーする根拠にはならない。

## 7.2 CB Insights

公式:
- https://www.cbinsights.com/what-we-offer/platform/
- https://www.cbinsights.com/cbi-company-profile/
- https://www.cbinsights.com/what-we-offer/research/

特徴:

- Company
- Market
- Search
- Analytics
- Research

を別用途として残している。

### Make-Moneyへの示唆

**ページが複数あること自体は問題ではない。**
全ページを一本のwizardへ統合する必要はない。

重要なのは、

> 各ページで何をするのかが一目で分かること

---

# 8. 全体UI原則

## 8.1 大型Hero

原則:

- Welcome: 大きめの価値提示は可。ただし1画面を占有しない。
- Discover: compact header + search/lens優先。
- Ledger: Hero不要。
- Detail: Hero不要。identity + state + key metrics。
- Playbook: compact header。
- Radar: compact filter/status header。
- Archetypes: compact search/list。
- Synthesis: workspace。
- Builder: workspace。
- Execute: compact status。
- Partners: 販売ページとして必要な範囲のみ。
- Success/Auth: status/function中心。

## 8.2 コピー

禁止:

- 絵文字
- 「衝撃」
- 「絶対」
- 「即死」
- 「今すぐ」
- 「誰も知らない」
- 「人生が変わる」
- 未検証の成功保証
- AI特有の抽象熟語の連打

推奨:

- 何が起きた
- いつ
- いくら
- 何人
- 誰が払った
- 何が未確認
- どの事例と似ている

## 8.3 視覚階層

Dark themeは維持してよい。

役割:

- 白: 主要事実
- zinc-300/400: 本文・説明
- zinc-500以下: 非重要metadata
- blue/cyan: 操作・選択
- green: 確認済みの正方向状態
- amber: 推定・注意
- red: エラー・損失・重大risk
- gray: unknown/unavailable

色だけで意味を伝えない。

WCAG:
- https://www.w3.org/TR/wcag/

## 8.4 文字とコントラスト

現行背景:
- `#07080B`
- `#0B0E14`

前回再計算では、
- zinc-400は通常文字でも十分なコントラスト
- zinc-500は通常小文字で4.5:1を下回る組み合わせがある
- zinc-600は重要文字には弱い

したがって9〜11pxの重要metadataにzinc-500/600を常用しない。

ただし「12px未満禁止」はWCAG規格ではない。文字サイズはユーザビリティ判断。

---

# 9. Accessibility

WCAG 2.2:
- https://www.w3.org/TR/wcag/

Target Size Minimum:
- Level AAは原則24×24 CSS px、spacing等の例外あり。

Apple HIG:
- https://developer.apple.com/design/human-interface-guidelines/buttons

44×44ptはApple側の一般推奨であり、WebのWCAG必須値ではない。

### Make-Money

`MobileFeedCard.tsx`のBookmark等、小型controlは実レイアウトで24px基準を最低監査し、touch主体では余裕を持たせる。

「44px未満だから即違反」とは書かない。

---

# 10. MarketTicker

`MarketTickerStrip.tsx`は自動移動表示を持つ。

WCAG 2.2のmoving content要件を考えると、長時間自動で動く情報はpause/stop/hide等を検討する。

改善候補:

- 静的horizontal strip
- 手動horizontal scroll
- 明示pause

また、リアルタイムでない場合は「LIVE」に見える演出を避け、

> SNAPSHOT · 2026-09-27

等の時点表示を優先する。

---

# 11. ページ別の役割とUI方針

## 11.1 `/welcome`

### 現行

`src/app/welcome/WelcomeClient.tsx`

大きな思想Heroあり。
検索欄風UIは固定Linkとして振る舞う箇所がある。

### 役割

初めて来た人が、

> ここには何があり、何を調べられるか

を短時間で理解する。

### 改善

上部:

> Make-Money  
> 実際の事業を、収益・運営・集客・根拠まで調べる。

その直下:

- 本物の検索
- 条件入口
- 最近の実事例

大きな思想説明は下へ。

### 代案

現状Hero維持。

利点:
- 世界観が強い

欠点:
- 価値理解より思想理解が先になる

現時点推奨:
- Heroは残すが縮小。

---

## 11.2 `/discover`

### 現行

`DiscoverClient.tsx`
`discovery-model.ts`

Lens:
- BIG_CASH
- LOW_CAPITAL
- SOLO
- LOW_WORK
- CURRENT
- FAILURE

### 役割

企業名を知らない状態から、

> 自分に関係しそうな事例を見つける

### 改善

最初の視界:

1. Search
2. Lens
3. Result

Heroは1〜2行へ縮小。

Resultは、

- 結果
- 開始条件
- 決定的一手
- 現在性

を優先。

### 注意

DiscoverとLedgerは現時点で統合しない。
両者の役割は異なる可能性があり、現行機能も違う。

---

## 11.3 `/` Ledger

### 現行

`TerminalShell`
`InstitutionalDataGrid`

高密度一覧 + search + filter + screener + inspector。

### 役割

大量の事例を高速に検索・比較する。

### 改善

高密度は維持。

主要列:

- 企業 / 何屋
- 売上
- 利益
- 利益率
- 体制
- 情報時点

第二情報:

- 顧客
- acquisition
- business model

内部pipeline用語やdebug countは一般ユーザーから弱める/管理面へ。

### やらない

- 大型Hero
- カード化
- 情報を3項目まで削減

---

## 11.4 Company Inspector

### 現行

`CompanyInspectorPane.tsx`
`CompanyHeader.tsx`

分析 / 証拠タブあり。

### 役割

1社について、

> 何の事業で、誰が払い、どう金が流れ、なぜ成立し、どこまで確認できているか

を理解する。

### 推奨順序

1. 何の事業か
2. 誰が払うか
3. 金の流れ
4. 主要実績
5. 成立理由
6. 人数・資本・集客
7. 現在性
8. 未確認
9. 詳細Evidence

### Evidence

常時:

> 一次確認 / 2026-09 / 3 sources

詳細展開:

- exact source
- locator
- verification receipt
- hash
- raw observation

主要状態は隠さない。監査詳細だけ下層へ。

---

## 11.5 `/playbook`

### 現行事実

`macro-aggregator.ts`

- `provenance: 'reference_sample'`
- `固定の参考データ・実測標本数は未確認`

`PlaybookIntelligenceView.tsx`でも一次証跡未確認を明示。

### 役割

事例横断の方法・パターンを見る。

### UI

「動的攻略本」と断定的に見せるより、

> 参考プレイブック  
> 固定参考データ / 一次証跡未確認

を明確に。

既存5タブは維持。

---

## 11.6 `/radar`

### 現行

`MarketRadarView.tsx`
`marketRadarData.ts`

Opportunity / Landmine / Dual / Category。

表示例:

- growthRate
- heatScore
- estimatedMonthlyProfit
- fatalityRate

一方、MarketRadarTrendItemには主要FinancialEntityと同様のsource/evidence構造が見当たらない。

現UIには、

- 「9割が即死」
- 死亡率85〜95%
- fire emoji
- 月利○○万円

等の強い表現あり。

### 役割

市場・事業環境の変化や注目領域を俯瞰する。

### DBを変えない暫定改善

カード主役:

- 何が変化していると見ているか
- なぜ注目しているか
- 関連実例

既存数値:

> 参考値

として一段下げる。

絵文字削除。
死亡/即死等の煽りを通常語へ。

---

## 11.7 `/radar/[id]`

### 現行

route実在:
`src/app/radar/[id]/page.tsx`

DetailからLedger entityへ移動する導線あり。

### 役割

Radarの1テーマを掘り、その市場仮説と実例を確認する。

### 改善

上部:

- テーマ
- 現在の観測
- 関連実例
- 情報時点/参考状態

下部:

- 構造説明
- リスク
- proof entity

---

## 11.8 Archetypes (`/?mode=ARCHETYPES`)

### 現行

`TacticalArchetypesView.tsx`

固定参考資料・一次証跡未確認を明示。

### 役割

複数事例の共通構造を見る。

### UI

左:
- pattern list

右:
- 共通構造
- 該当実例
- 違う条件
- 現在性

「儲かる型」の断定より、**どの実例がどう似ているか**を主役にする。

---

## 11.9 Synthesis (`/?mode=SYNTHESIS`)

### 現行

`StrategySynthesisView.tsx`

保存entity + note + idea/chat。

### 役割

他人の事例を自分の文脈へ移す。

### UI

AIチャットを主役にしない。

左:
- 選んだ事例
- 自分のNotes

右:
- 自分の案
- 元にした事例
- assumptions
- unknowns

既存`sourceEntityIds`を視覚的に近くへ。

---

## 11.10 `/build/[ideaId]`

### 現行

`BuilderWorkspace.tsx`

Build Spec + Preview + instruction composer。

「利益仮説」「実績ではなく検証前仮説」と明記済み。

### 役割

作ると決めた人がMVPを形にする。

### 改善

内部provider名より、

- 誰向け
- 何を作る
- MVP機能
- 収益方法
- Preview

を主役にする。

Builderを初回導線へ強制しない。

---

## 11.11 `/execute`

### 役割

実行中案件の一覧と状態確認。

### UI

- 件数
- First Dollar
- 実売上
- 次の行動

を明確に。

説明Hero不要。

---

## 11.12 `/execute/[id]`

### 現行

`ExecutionClient.tsx`

NEXT ACTION、価格、URL、First Dollar、実売上等。

### 役割

考えたことを実行へ移し、止まらないようにする。

Implementation Intentions meta-analysis:
- https://doi.org/10.1016/S0065-2601(06)38002-1

「いつ・どこで・どう行動するか」の具体化がgoal attainmentに有効である研究がある。

### UI

NEXT ACTIONを最上位。
全工程はその下。

ただし強制命令にしない。

---

## 11.13 `/partners`

### 現行矛盾

`PartnersClient.tsx`

- 毎月利用料の30%
- 30日tracking cookie
- 継続報酬

一方:

`founding-pass.ts`
- ¥1,980
- 永久アクセス権
- payment mode

`ProModal.tsx`
- 買い切り
- 自動更新・月額請求なし

`api/checkout/route.ts`
- Stripe `mode: "payment"`
- checkout metadataに product / userId
- 今回確認した経路では紹介IDをmetadataへ渡していない

### 結論

UIだけで直してはいけない。

Owner判断が必要:

- 買い切り + 単発紹介
- 月額 + recurring 30%
- 別商品
- Partners一時停止

決定まで主要導線で強く訴求しない。

---

## 11.14 `/success`

### 役割

購入状態を伝え、次へ戻す。

### UI

- 状態
- 使えるもの
- 次へ

だけでよい。

---

## 11.15 `/registry`

### 現行

収集済み名称・ticker・domainの重複確認。

### 役割

一般ユーザー向けではなく、収集/管理補助。

機能は維持。
主要Navigationへ出さない。

---

# 12. Navigation

## 現状

Desktop GlobalHeaderに多数destination。
一部は独立URL、一部はroot mode。

特に:

- `/playbook`
- `/radar`

の独立routeがある一方、rootではlocal modeへinterceptされる。

`useTerminalWorkspace.ts`はmode queryを読むが、local state変更が常にURL historyへ反映されるわけではない。

### 問題

- Back
- reload
- share URL
- deep link

の意味が経路で変わり得る。

### 方針

9→5等の大再設計を先にしない。

順序:

1. page roleを明確化
2. labelを普通の日本語へ
3. URL/history挙動を一貫化
4. その後必要ならgrouping

### 暫定ラベル

- 事業データ
- 発見
- プレイブック
- 市場変化
- 収益パターン
- 事業検討
- MVP作成
- 実行
- パートナー

---

# 13. Mobile

現行`MobileFeedCard`方向は維持。

Desktop tableをそのまま縮小しない。

## Mobileで優先

- 検索
- 発見
- 事例確認
- 保存
- short note
- 実行状況確認

## Desktopで優先

- table
- 複数比較
- deep detail
- Synthesis
- Builder
- Execution編集

ただし実デバイス比率は未確認なので、これは暫定設計。

USWDS Table:
- https://designsystem.digital.gov/components/table/

USWDSは、

- dense numerical data → compact / scrollable
- text-heavy data → stacked

を使い分けている。

Make-Moneyにもこの区別が適用可能。

---

# 14. Progressive Disclosure

GOV.UK Details:
- https://design-system.service.gov.uk/components/details/

GOV.UK Tabs:
- https://design-system.service.gov.uk/components/tabs/

重要点:

- 大多数が必要な情報をdetailsへ隠さない
- 比較が必要な内容を別tabsに分けると記憶負荷が増える
- tabsはregular usersの高速切替には有用
- URL/historyと連動させるのが望ましい

### Make-Money

常時表示:

- entity identity
- key metrics
- as-of
- verification state
- main business mechanism
- biggest unknown

下層へ:

- exact locator
- raw observation
- hashes
- detailed verification receipt
- long evidence excerpts

---

# 15. 今すぐ安全に直せるUI

DB・商品条件を変えずに可能。

1. Welcome Hero縮小
2. Welcomeの検索欄風Linkを本物の検索または普通のCTAへ
3. DiscoverでSearch/LensをHeroより上位へ
4. Radarの絵文字削除
5. Radarの「即死」「死亡率」等の断定コピーを通常語へ
6. Radar固定値を「参考値」として視覚的に下げる
7. Playbook/Archetypesの既存「参考/未確認」を見落としにくくする
8. Company Detailで時点・verification・source countを上部にまとめる
9. zinc-500/600の重要小文字を見直す
10. Mobile小型buttonのtarget geometryを監査
11. MarketTickerにpause/静止/手動scrollのいずれか
12. 内部pipeline/debug countを一般ユーザーから弱める
13. 「この稼ぎ方を実行」等の成功保証に見えるCTAを中立化
14. emojiを全user-facing UIから除去
15. page labelを普通の日本語へ
16. route/local modeのBack/URL挙動を一貫化

---

# 16. データ/信頼性設計として別途扱うもの

UIだけで済ませない。

- FinancialEvidenceStatusとlifecycle/time状態の分離検討
- inspector-modelのentity-IDによるverification fallback廃止
- Radarを将来source/evidence/as-ofへ接続
- Playbookをreference sampleからFoundation aggregateへ移行するか
- Archetypeを実例集合から再生成する仕組み
- Synthesis→Builder→Executionのevidence lineage強化
- hypothesisとactual resultの明示分離

DB変更禁止の今回スコープでは実装しない。

---

# 17. Owner判断が必要なこと

UI担当だけで決めない。

1. PRO価格モデル
2. Partners報酬モデル
3. Radarを実測signal productにするか参考分析にするか
4. Playbookをreference contentのまま出すかFoundation由来にするか
5. Main Navigationを将来groupingするか
6. Discover/Ledgerを将来統合するか
7. Builderを主商品にするか下流機能にするか

---

# 18. この文書で採用しない誤った一般化

以下を今後の設計根拠にしない。

- 「人間は全員金で自由になりたい」
- 「人間は全員ズルを欲する」
- 「人間は努力を嫌う」
- 「損失は必ず利益の2倍重い」
- 「選択肢は3〜5個が最適」
- 「Bottom Navは必ず5個以下」
- 「44px未満はWeb規格違反」
- 「9〜10px文字は規格違反」
- 「Dark UIは信頼される」
- 「Bloomberg風なら高級に見える」
- 「情報は少ないほど分かりやすい」
- 「1人でも誤解したらUI失敗」
- 「数字の正否を当てさせればUXを測れる」
- 「Evidenceを理解できること自体が中心価値」
- 「全ページを検索→比較→理解→判断の一本線へ押し込む」

---

# 19. 現時点の最終設計原則

Make-Moneyは、ユーザーの人生目標を決めるサービスではない。

ユーザーが、

- 新しい事業を知る
- 市場の変化を見る
- 企業を比較する
- 1社を深く理解する
- 事例からパターンを学ぶ
- 自分の案へ移す
- MVPを作る
- 実行を続ける

それぞれの場面で、**現実を前より理解し、前より自分で決められる状態**を渡す。

UIはそのために、

> 実例の差  
> 金の流れ  
> 成立条件  
> 時点  
> 根拠  
> 未知  
> 次に使える情報

を優先する。

---

# 20. 全ページ共通の一文方針

> **各ページの既存機能を保ったまま、煽りや装飾ではなく「実例の差・金の流れ・成立条件・時点・根拠・未知・次に使える情報」を視覚的に優先し、Discoverは好奇心、Ledgerは探索と比較、詳細は理解と信頼、Playbook/Radar/Archetypesは横断知識、Synthesisは自分への転用、Builderは制作、Executionは継続行動という、それぞれ別の人間の用事に最適化する。**

---

# 21. 参考資料

## 人間心理・動機づけ・意思決定

- Ryan & Deci, Self-Determination Theory  
  https://www.selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf

- Loewenstein et al., Risk as Feelings  
  https://pubmed.ncbi.nlm.nih.gov/11316014/

- Martela & Steger, Coherence / Purpose / Significance  
  https://www.tandfonline.com/doi/abs/10.1080/17439760.2015.1137623

- Psychological Reactance Meta-analysis  
  https://academic.oup.com/hcr/article/52/1/38/8178818

- Choice Overload Meta-analysis  
  https://doi.org/10.1086/651235

- Rosenholtz et al., Measuring Visual Clutter  
  https://pubmed.ncbi.nlm.nih.gov/18217832/

- Reber & Schwarz, Perceptual Fluency and Truth  
  https://www.sciencedirect.com/science/article/pii/S1053810099903860

- Gollwitzer & Sheeran, Implementation Intentions Meta-analysis  
  https://doi.org/10.1016/S0065-2601(06)38002-1

## Trust / Web / UX

- Stanford Web Credibility Guidelines  
  https://credibility.stanford.edu/guidelines/

- Stanford Web Credibility Research  
  https://credibility.stanford.edu/research.html

- WCAG 2.2  
  https://www.w3.org/TR/wcag/

- Apple Human Interface Guidelines / Buttons  
  https://developer.apple.com/design/human-interface-guidelines/buttons

- GOV.UK Details  
  https://design-system.service.gov.uk/components/details/

- GOV.UK Tabs  
  https://design-system.service.gov.uk/components/tabs/

- USWDS Table  
  https://designsystem.digital.gov/components/table/

## 近接サービス

- AlphaSense Company Profiles  
  https://help.alpha-sense.com/hc/en-us/articles/42623871994131-Company-Profiles

- CB Insights Platform  
  https://www.cbinsights.com/what-we-offer/platform/

- CB Insights Company Profile  
  https://www.cbinsights.com/cbi-company-profile/

- CB Insights Research  
  https://www.cbinsights.com/what-we-offer/research/

---

# 22. 運用上の扱い

この文書はUIの一時案ではなく、今後のMake-Money UI/UX判断で参照する設計根拠とする。

ただし研究・実装・実利用データが更新された場合は、古い結論を守ることを目的にしない。

更新原則:

1. 現行コードを読む
2. 実利用データがあれば優先
3. 外部研究の適用範囲を確認
4. 一般論をそのまま処方にしない
5. 根拠と推論を分離
6. 新しい証拠で反証されたら設計を更新する
