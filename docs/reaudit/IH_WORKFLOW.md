# 再監査 レーンC(Indie Hackers)作業手順

対象: `reaudit.family === 'indiehackers'` の索引レコード(1391件)。1バッチ25件。
作業場所: リポジトリ(worktree)直下。禁止: git の書込み、`data/entities-index.json` の編集、R2 書込み。
道具は `scripts/reaudit/lanes/`。作業ファイルは `.reaudit-work/`(.gitignore 済み)。成果物 `data/incoming/reaudit-*.json` と `reports/reaudit-*` も .gitignore 済み(ローカル成果物)。

## 環境変数
- `LANE_TAG`: 担当タグ(例 `ih-s10`)。進捗ファイル名と作業ディレクトリに使う。必須(ih-progress / preflight)。
- `LANE_WORKDIR`: 作業ディレクトリ。既定は `<cwd>/.reaudit-work`。
- `LANE_OWNER`: 候補の `auditOwner` と報告の担当欄。既定 `lane:C ih-research agent`。
- `LANE_OUT_ROOT`(ih-report / ih-progress): 報告と進捗の出力先の親。既定は cwd。検証で本物を汚したくない時だけ指定する。

以下 `W=.reaudit-work/$LANE_TAG` として書く(`mkdir -p $W`)。

## 1バッチ(25件)の流れ
1. 進捗確認: `cat reports/reaudit-ih-progress-$LANE_TAG.json`(無ければ `ls data/incoming | grep ih-batch` で最新を見る)。nextIndex = N。他タグと範囲が被らないよう、呼び出し元が渡した範囲を優先する。
2. 雛形: `node --import tsx scripts/reaudit/candidate-skeleton.ts --range N-(N+24) --family indiehackers --lane ih --out $PWD/$W/skeleton-NNN.json`。**雛形は調査の最初に作って控える**(落とし穴を参照)。
3. ワークシート(name / url / IH url / IH 掲載説明)を node で出力して確認。
4. 調査(並列): 公式サイトを WebFetch(標準プロンプト)/ IH 掲載ページは1メッセージ4件まで(並列すると404になる。間隔を空けて再取得)/ WebSearch は1件ずつ(founder の発言・インタビュー・登記)。
   - 標準プロンプト(公式): "Return at most 140 words of plain English notes (quotes of 8 words or fewer): (1) what the product does; (2) who it is for; (3) plans and prices exactly as listed with currency, or 'none shown'; (4) company/legal entity, address/country, founder or team names if shown; (5) copyright year or newest dated item; (6) signs the site is live and maintained versus parked/broken/template. Do not include email addresses."
   - 標準プロンプト(IH): "Return at most 120 words of plain English notes: founder name and handle; revenue figure displayed and any 'verified' marker; team size or employee tags; start/launch date; social links (X handle, website); titles and dates of any posts by the founder; milestones. No long quotes. Do not include email addresses."
   - 有望な発言(Starter Story、HN、個人ブログ、登記簿(ariregister 等))は追加で WebFetch し、日付・金額・期間を確認してから記録。
   - 補助: `python3 scripts/reaudit/lanes/fx.py URL [maxchars] [regex]`(正直な UA で GET してテキスト化。bot 判定の回避はしない)、`wk.py 'Title' [lang]`(Wikipedia の infobox 行)。
5. `$W/findings-NNN.mjs` を書く(見本: `docs/reaudit/examples/findings-054.mjs` が完全版、`findings-008.mjs.txt` は途中で切れた断片(lint 対象外にするため拡張子 .txt))。`export default = [...]` と `export const batchNotes`。長い時は a/b/c に分けて `cat` で結合する。
6. 合成: `LANE_TAG=$LANE_TAG node scripts/reaudit/lanes/ih-merge.mjs $W/skeleton-NNN.json $W/findings-NNN.mjs --out data/incoming/reaudit-ih-batch-NNN-20260929.json`(所有者表示を変える時は `LANE_OWNER='lane:C ih-research swarm <tag>'`)
7. 検査: `node --import tsx scripts/reaudit/validate-candidates.ts data/incoming/reaudit-ih-batch-NNN-20260929.json` と、索引の仮想コピーでの検査 `LANE_TAG=$LANE_TAG LANE_FAMILY=ih node scripts/reaudit/lanes/preflight.mjs`(check-ingest-quality + check-index-safety。`$LANE_WORKDIR/$LANE_TAG/preflight/` に作る。`LANE_FAMILY` を省略すると incoming の全バッチ(gen / ih / ebiz)を合成する)。
8. 報告 / 進捗: `node scripts/reaudit/lanes/ih-report.mjs NNN N data/incoming/reaudit-ih-batch-NNN-20260929.json $W/findings-NNN.mjs "25/25 PASS" "PASS"` と `LANE_TAG=$LANE_TAG node scripts/reaudit/lanes/ih-progress.mjs NNN N N+24 25 "25/25 PASS" "PASS"`。最終報告には次の index と生成ファイル一覧、validate 結果を書く。

## 記録ルール(厳守)
- 金額は tagline に入れない(本人申告ラベルがあるときのみ可)。推計・為替換算・月次換算なし。pnl の数値は 0 + 全 unconfirmed のまま。
- IH 掲載ページの収益欄(例: 月$100K)は本人申告扱いにせず、UNVERIFIED 観測 + unknown(矛盾があれば conflicts)にだけ書く。revenueLabel は「本人申告 …(日付)/出典・独立確認なし」か、登記簿等の報告値(年次は月次換算なし)のみ。
- IH / 掲載文は転載しない(日本語で要約)。禁止語: サバンナOS 等、「Indie Hackers表示」(スペース無し連結)。AI 造語禁止。
- essence.whatItDoes は「<社名>は/が」で始めない。tagline・whatItDoes は日本語(かな含む)。
- 公式サイト到達不能は official.ok=false + unknown に「到達不能(日付/HTTP)」。IH の 404 は再取得してから判断。
- lootBlueprint は削除せず値を事実/未確認に(UI が有無で詳細取得済みを判定)。opportunityJudgment は削除。旧 ev_*_01/_02 カードは引き継がない。
- scale は根拠なければ UNKNOWN。country / sector は公式・登記で確認できた場合のみ変更。
- グレー領域(賭博ボット / スクレイパー等)は事実だけ記録し、batchNotes.decisions でオーナー判断を促す。
- tagline に金額を入れると validate が落ちる(`$1k` / `$1,000` も不可)。金額語は description / revenueLabel に。description に商品が掲げる目標額を書く時は掲載者の表記に合わせ、「掲載の説明」と出典を明記する。
- firstPost は「掲載ページの最初の投稿日」でだけ使う(マイルストーン日や最新の投稿日は入れない)。
- IH ページに掲載者のメールアドレスがあっても記録しない。個人の住所 / 電話も記録しない。取得プロンプト末尾に "Do not include email addresses." を付ける。
- backlog の query に入れる人名は findings の founder 欄にある確認済みの名前だけ(未確認の人名を作らない)。

## findings の書式メモ
- 公式ドメインが転送だけ: `official: { ok:true, claimStatus:'DOMAIN_REDIRECT_CONFIRMED', facts:[…転送の事実] }`(ih-report が「転送のみ確認」と表示)。`CAMPAIGN_PAGE_TITLE_CONFIRMED` は「題名のみ確認」。転送先を開かない/開けない時はその旨を facts に書く。
- 公式ドメインが別ドメインへ転送: 転送先ページは extras に sourceType `official_website_successor_domain`、tier `TIER2_FACTS_ONLY`(エンティティのドメインと違うため)。
- `official.subpages: [{url,label}]`: 公式の会社概要 / About など子ページから事実を書いたら、その URL を subpages に入れて reaudit.sources に記録する。ブログ記事や料金ページなど別の主張の出典は extras に入れる。
- IH 収益欄が本人のマイルストーンと同額(Referral Rock, Japan Dev)のときは `ih.listed` を省略し、収益欄の値は `ih.facts` に書く(IH_REV_NOTE=裏付けなし、の定型文が合わないため)。
- App Store ページは TIER1_PLATFORM の extras に使える(sourceType `app_store_listing`)。登記簿は extras の tier `TIER1_PUBLIC_RECORD`、reported の source は `public-registry-annual-report`。
- `searched: false` を付けた事例は、ih-merge が「Web検索は未実施」と調査限界カード・unresearched に書く。検索すれば成果が見込める事例は backlog に残す(`reports/reaudit-ih-search-backlog.json` に priority と query。追記用スクリプトは復元できなかったので JSON を直接追記する)。

## IH 収益ページ(/revenue)の採否(Rule R4)
- 創業者が入力した日付つき収益と「本人申告・独立検証なし」の注記が出ることがある。収益欄が気になる事例は試す価値あり。
- 採用: 投稿者が創業者 / 運営者本人で、事業の実在が確認でき、本人の他の発言と矛盾しない時だけ revenueLabel に(本人申告・日付・独立検証なし)。
- 採用しない: 掲載者が第三者、公式サイト到達不能で投稿にも売上なし、同日の創業者投稿と矛盾、事業の同一性が不明、@hetiantian クラスタ。採用しない時は ih.facts に「収益ページは月$X(YYYY-MM-DD 最終更新、本人申告・独立検証なし)」と書き、unknown に根拠不足を書く(ih.listed は付けない)。
- さらに分ける例: (a) 創業者の返信で範囲が違うと分かる、(b) Stripe 連携表示が無料 / 終了した企画に付く、(c) 通貨が投稿と違う(投稿の通貨を優先、換算しない)、(d) 期間が投稿にない(REVENUE_PERIOD_UNSPECIFIED)。
- Stripe 連携表示(Stripe-verified): revenueLabel に「IH の収益ページ(Stripe 連携・IH が検証済みと表示)直近30日の売上 $X(取得日)」。reported の source は `platform-verified-display`、unit は `REVENUE_LAST_30_DAYS`。2回の別取得で一致した数値だけ採用。事業の同一性が不明なら採用しない。
- 同一ハンドルが多数の製品を掲載(@hetiantian 8件)は収益欄が信用できない。batchNotes.decisions に記す。クラスタ・新規(掲載から1年未満)・第三者投稿は /revenue を取らず ih.listed + IHREV で書く。

## 調査の学び・落とし穴
- WebSearch の allowed_domains に reddit.com を入れるとエラー。x.com, news.ycombinator.com, indiehackers.com, starterstory.com, medium.com, dev.to, youtube.com, producthunt.com は使える。
- **WebSearch にはセッション上限(200回)がある**。上限後は呼ばない。検索エンジンの代替(WebFetch で検索結果ページを取る等)は上限の回避になるので行わない。上限を上げるには利用者が `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` を上げる。検索なしの方式: 公式サイト(トップ + 料金 / 会社概要 / 法的表記 / ブログ)、IH の製品ページ・/revenue、登記簿(ariregister.rik.ee/eng/company/<登記コード>)、GitHub、Wikipedia、公式サイトに載る子会社 / 親会社の URL を直接取得。
- 有望な二次情報: Starter Story(本人インタビュー: 日付・MRR・従業員数・集客)、IH のマイルストーン投稿、登記簿(年次売上・利益)、会社公式ブログ(会社発表の売上・年度)。第三者集計(Latka / Tracxn / Crunchbase / PitchBook / getlatka)は本人申告でないので採用しない。
- 重要な数字は WebFetch を別プロンプトで再取得して照合する(小型モデルの要約の誤りが実際にあった: QuotaGuard の ARR 文脈、Stripo の外部資金)。WebSearch の要約は出典ページ未確認の扱い。本人申告の根拠にする時は「紹介文に基づく」と明記。
- 公式 URL の打ち間違いに注意(ワークシートの URL をコピーして取得。infusionicsoft / infusionsoft の誤入力で「到達不能」と誤記録しかけた)。
- 1バッチの目安トークン: 検索ありで約25〜41万、検索なしで約16万。公式サイトは1メッセージ9件まで並列、IH は4件ずつ。
- macOS の `sed -i` は `-i ''` が必要。ファイル置換は python3 の `open().read().replace()` を使う。
- **雛形の再生成は冪等でない**: 索引は取り込み済みの再監査結果を含むことがある。取り込み後の索引から `candidate-skeleton.ts` を作り直すと legalEntity / tagline が新しい値になり、conflicts が二重になる。再merge が要る時は最初に控えた `skeleton-NNN.json` を使う。
- WebFetch は deferred tool。コンテキスト圧縮後は ToolSearch で `select:WebFetch` を先に読み込む。
- 圧縮後の復元: 自分のサブエージェントの作業履歴が `~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl` にある(親の jsonl ではない)。tool_use と tool_result を id で対応付けて抽出できる。findings は書き始めたら途中でも `$W` に保存しておく。
- (復元できなかった補助: recover.py、ih-backlog-add.mjs、worksheet。必要なら作り直す。)
