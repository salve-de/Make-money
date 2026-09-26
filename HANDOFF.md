> **収集基盤の最上位北極星:** 将来「これも全過去データへ追加して」と未知の項目を要求されても、canonical rewriteや全再収集ではなく、既存Evidence再利用 → versioned generic Annotation/Enrichment → historical backfill → view rebuildで済む状態を目指す。rightsは一例にすぎない。汎用extension実装が任意軸をregister/write/backfill/replay/index/rebuildできるまでは「完全」と言わない。正本は [docs/COLLECTION_TO_UI_MASTER_HANDOFF.md](docs/COLLECTION_TO_UI_MASTER_HANDOFF.md) Section 0 とUniversal Foundation lifecycle master Section 0。

> **Legacy rights/collection handoff migration complete:** The old 2026-09-26 97-section "Make-Money 定期収集・R2・商用利用・権利・公開経路 完全引継ぎ" is fully superseded as an operational dependency. Its unique historical counts, provider notes, audit state and PR lineage are preserved in the Universal Foundation lifecycle master's migration ledger; its current Make-Money instructions are preserved in [docs/COLLECTION_TO_UI_MASTER_HANDOFF.md](docs/COLLECTION_TO_UI_MASTER_HANDOFF.md). Do not keep or consult the old handoff to determine current next steps.

> **2026-09-26 collection -> UI master entrypoint:** For scheduled Web ChatGPT research, provenance, later tagging/enrichment, rights, Publisher/Queue, canonical R2, API/UI or local E2E, read [docs/COLLECTION_TO_UI_MASTER_HANDOFF.md](docs/COLLECTION_TO_UI_MASTER_HANDOFF.md) first. Cross-project semantics are owned by `salve-de/universal-foundation/docs/COLLECTION_KNOWLEDGE_LIFECYCLE_MASTER_HANDOFF.md`. Do not use legacy product JSON guides to narrow or redefine Foundation collection.

> **Commercial-rights legacy-catalog track:** read [docs/COMMERCIAL_RIGHTS_PUBLICATION_HANDOFF.md](docs/COMMERCIAL_RIGHTS_PUBLICATION_HANDOFF.md) for the separate retrospective production-R2 audit. For the current scheduled-research delivery task, the priority is the c9e local Publisher/Queue -> local R2 -> API/UI proof documented in [docs/COLLECTION_TO_UI_MASTER_HANDOFF.md](docs/COLLECTION_TO_UI_MASTER_HANDOFF.md). Do not mix the two tracks.

# Make-Money 引継ぎ入口（2026-09-26）

> **2026-09-19 First Dollar 実行レイヤー追加**: MAKE MONEY は情報DBだけで終わらせず、企業事例から `FIND → BUILD → LIST → DISTRIBUTE → SELL → EARN` を進め、実売上の最初の1円まで追う。企業詳細の `この稼ぎ方を実行` から `/execute/[id]` へ入り、未ログインは端末保存、ログイン時は D1 同期。仕様正本は [docs/FIRST_DOLLAR_EXECUTION.md](docs/FIRST_DOLLAR_EXECUTION.md)。今後の機能判断では Time to First Dollar を主要基準にする。

> **【別チャットのAntigravityへの最優先引継ぎ】**:
> ユーザーは長文指示を絶対に書かない。ユーザーの一言「勝ちの方だけ集めて」「地雷（負け）の方だけ集めて」「データ集めて（デフォルト7:3）」で完全自律稼働せよ。
> 
> ### 【北極星と理念：なぜ集めるのか】
> **「世に溢れる努力・理念・綺麗事という欺瞞の煙幕を焼き払い、世界中の生々しい金儲けの事実と手口（資本主義の裏帳簿）を冷徹に晒し、全人類の絶対の武器（資本主義のデフォルトOS）となり、マネーの関所として君臨すること。」**

>
> ### 【2026-09-24 新規最重要決定：Opportunity Builder】
> Make-Moneyは「儲かる情報を見せるDB」で止めず、**発見した金脈をその場でユーザー所有の事業へ変える実行OS**へ進化する。
>
> 現在の確定導線:
>
> ~~~
> Opportunity / 成功・失敗データ
>   ↓
> 独自アイデア
>   ↓
> ［この事業を作る］
>   ↓
> Build Spec
>   ↓
> Make-Money Builder
>   ↓
> v0 Platform API（交換可能な生成provider）
>   ↓
> Private Preview / 自然言語修正 / ソースZIP
>   ↓
> 将来: Publish → Marketplace → 売上 → Opportunity DBへ成果還流
> ~~~
>
> **絶対に誤解するな**:
> - Bolt/Lovableへユーザーを強制的に飛ばす「紹介サイト」が最終形ではない。
> - Make-MoneyがBolt/Lovable通常アカウント1個を全ユーザーへ共有する設計でもない。
> - Make-Moneyが握るのは「何を作るべきかを決めるデータ」「Build Spec」「ユーザー関係」「Marketplace」「実売上データ」。
> - v0/Bolt/Lovable等は交換可能な工場。provider名を北極星にしてはならない。
> - 生成ソース、本番Hosting/DB/Domain、顧客データ、商品・事業は原則ユーザー所有へ寄せる。
> - 開発時provider原価はMake-Money側で持てるが、本番継続原価まで無制限に背負わない。
> - 最終収益はPRO、Build Credits、Affiliate、Marketplace手数料、Stripe Connect型Platform fee、M&A、成果データAPIへ接続する。
> - PR #39時点ではBuild/Preview/修正/ZIPまで。production claim、Marketplace、Stripe Connect等は未実装。
> - PR #39の実装環境にはV0_API_KEYが無いため、実課金v0生成を完了確認済みとは扱わない。
>
> **Builderに触るAIは必ず最初に** [docs/OPPORTUNITY_BUILDER.md](docs/OPPORTUNITY_BUILDER.md) **を読むこと。そこに経緯、比較、不採用理由、費用、所有権、Security、未実装範囲を全記録している。**
> 
> ### 【最高視座：我々が最もメタ的に収集したいもの】
> 我々が収集したいのは特定の企業データではなく、綺麗事（努力・理念）を完全に剥ぎ取った後に残る**【資本主義における『富の不可逆な移転メカニズム（物理法則）』のログ】**そのものである：
> 1. **「弱点の力学」（なぜ金が動いたか）**: 人間や組織が理性を失って財布を開かざるを得なかったサバンナOSの急所（保身恐怖、極限の怠惰、虚栄心、解約不能の監禁、独占利権）。
> 2. **「配管の力学」（どうやって現金を吸い上げたか）**: 労働から解放され、大手の自爆（カニバリズム）、プラットフォーム規約の盲点、他人の欲望、前金総取りを燃料にして自動で現金を吸い上げた構造的レバレッジ（関所）。
> 3. **「現金の力学」（結果として通帳に何が起きたか）**: 見栄の年商ではなく、原価・手数料・税を全て引いた後に「創業者個人の通帳に実際に残った現金実額（真の手残り）」、または幻想が崩壊して即死した「致死出血点」。
> 
> ### 【収集エージェントの鉄則（限定の完全排除）】
> 1. **全方位・あらゆる業種規模が対象**: SaaS、製造、物販、店舗、メディア、下請け、大企業、個人、表、裏など、いかなる限定も一切禁止。金が動いた（または尽きた）事実は全て拾え。
> 2. **収集項目と足切り条件の完全分離**: 人数・粗利・原価・URL・創業者・ツール等は**すべて徹底調査して記録するが、いかなる項目や数値も【収集の足切り条件】には絶対にしない**。
> 3. **事実と手口（裏帳簿）の全量記録**: 誰から・どんな手口で・いくら抜いたか（またはどこで死んだか）の客観的ログを記録せよ。
> 
> ### 【取れるのに漏らすな：5大深層底引き網ルート（必須巡回）】
> ネット上に公開されているのにAIが浅い表面クロールで漏らしがちな以下の5大一次情報を必ず掘り尽くせ：
> 1. **創業者個人の過去ログ（X, Reddit, IndieHackers, HackerNews）**: 会社の公式発表ではなく、創業者個人のリプ欄やAMAに転がっている「初動の泥臭いズル」「Stripe管理画面スクショ」「初期P&Lのポロリ告白」。
> 2. **Wayback Machine（初期魚拓）**: 現在の洗練されたサイトではなく、創業初期の「ショボい初期機能」「買い切り時代の生々しい価格」「初期の泥臭いタグライン」。
> 3. **求人票（Job Description / Wantedly / Lever等）**: 採用要項に赤裸々に書かれた「社内で実際に稼働しているツール群（AWS, Stripe, Snowflake等）」「現場の真の課題・ボトルネック」「本当の職種別組織比率」。
> 4. **裏アフィリエイト・キックバック配管（フッター, ASP, Rewardful等）**: 表のLPには出ない「売上の30〜50%永久キックバック」「紹介報酬」という、広告費ゼロで広げている真の集客エンジン。
> 5. **解約怨嗟・悪評（Trustpilot, Reddit, G2等）**: 公式のサクラ事例ではなく、「解約できない」「データが人質」「他社に移れず泣く泣く払っている」という、高収益を支える理不尽な監禁（スイッチングコスト）の実態。
> 
> ### 【最重要：収集 ＆ UI表示の完全並行原則（後回し・分離の絶対禁止）】
> **「データを集めるだけ集めて、UI画面の表示は後回しにする」ことを厳禁とする。**
> 1. **配管直結**: トップ画面（`src/app/page.tsx`）は目録（`data/entities-index.json`）を直読し、金融端末UIへ流し込む。
> 2. **完全並行サイクル**: 【底引き網調査 ➔ P&L逆算 ➔ 完全体JSON精錬 ➔ R2保存 ➔ 目録（entities-index.json）登録 ➔ ブラウザ実機でUI表示確認】の6ステップを1セットとして並行稼働せよ。
> 3. **完了条件**: 画面の一覧テーブルに行が表示され、詳細インスペクター（P&L損益計算書、痛みの財布、ツール構成、死因解剖バッジ等）が崩れなく0.01秒で描画されることを確認して初めて1件の収集完了とみなす。
> 
> 追加の質問や手戻り確認は一切不要。以下の3大正本を読み、直ちに上記6ステップの完全並行サイクルで自走完遂せよ。

## 1. 必読の最高正本
1. **出力JSONフォーマット・完全体テンプレート**: [`docs/GOLDEN_INGEST_SCHEMA.md`](docs/GOLDEN_INGEST_SCHEMA.md)
   - 必須10大属性、円換算P&L因数分解（Stripe手数料控除・創業者手残り純利）
   - `LOOT_BLUEPRINT`（略奪転用方程式）100%必須配備
   - 現場配管ツール原価（`operations.toolStack`）
   - 勝ち組テンプレート（4.1）および地雷組テンプレート（4.2: `financialStatus: 'POST_MORTEM'` ＆ `FATAL_BLEED` 必須）
2. **調査目録・9レーン・12領域・4大禁忌**: [`docs/MAKE_MONEY_COLLECTION_SCOPE.md`](docs/MAKE_MONEY_COLLECTION_SCOPE.md)
3. **100年R2完璧構造（保存先）**: [`docs/architecture/STORAGE.md`](docs/architecture/STORAGE.md)
   - Layer 1: 生原本 ➔ `foundation-raw/blobs/sha256/<hash>`（Create-Only、上書き禁止）
   - Layer 2: 保存票 ➔ `foundation-lake/journal-entry.v1/<id>.json`（追記専用）
   - Layer 3: 目録 ➔ `data/entities-index.json`（単一目録で1行JOIN、UI直結）
   - **【絶対不可侵】**: `universal/data-assets/financials/`（EDINET正本領域）には1文字たりとも書き込むな・触れるな。
4. **横断自律収集契約**: [`docs/architecture/AUTONOMOUS_DATA_INGEST_PROTOCOL.md`](docs/architecture/AUTONOMOUS_DATA_INGEST_PROTOCOL.md)
   - **R2容量・料金の完全安全性**: 毎月10GB・100万回Class Aまで完全無料。1社最大1MBのため、1万社集めても月額0円（完全無料）。破産リスクゼロ。
5. **Opportunity Builder意思決定・実装正本**: [`docs/OPPORTUNITY_BUILDER.md`](docs/OPPORTUNITY_BUILDER.md)
   - なぜ外部Bolt/Lovable遷移を主導線にしないか
   - Make-Money / provider / user の責務、料金、所有権
   - v0 API MVP、private preview、credits上限、source ZIP
   - 将来のPublish / Marketplace / Stripe Connect / M&A / 成果データ還流

- **勝ち組（業種・規模不問、構造的勝者）**: キーエンス（直販製造業）、Gymshark（D2Cアパレル）、マニー（ニッチ独占医療器具）、ShipFast（SaaSボイラープレート）、Carrd（軽量LPインフラ）、Formula Bot（業務痛みの財布）等
- **地雷組検死（業種・規模不問、巨額炎上・即死・規約変更死）**: Humane Ai Pin（過熱即死ハードウェア）、Fast（180億調達・月商60万即死フィンテック）、Quibi（2,000億炎上短尺動画）等


