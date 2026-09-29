# 再監査 レーンD(generated)作業手順

対象: `data/entities-index.json` の `reaudit.family === 'generated'`(1033件)。バッチ NNN = 家系配列の添字 (NNN-1)*25 .. (NNN-1)*25+24。
作業場所: リポジトリ(worktree)直下。禁止: git の書込み、`data/entities-index.json` の編集。報告は日本語(結論→根拠→次の一手)。
道具は `scripts/reaudit/lanes/`、作業ファイルは `.reaudit-work/`(.gitignore 済み)。

## 環境変数
- `LANE_TAG`: 担当タグ(例 `gen-s7`)。必須。facts の置き場と進捗 / archive 一覧のファイル名に使う。
- `LANE_WORKDIR`: 既定 `<cwd>/.reaudit-work`。ここに `targets.json`(共通)、`$LANE_TAG/facts/facts-NNN.json`、`$LANE_TAG/preflight/` を置く。
- `LANE_OUT_ROOT`(gen-build-batch): `data/incoming/...` と `reports/...` の出力先の親。既定は cwd(本物の出力)。検証で本物を上書きしたくない時だけ別ディレクトリを指定する。
- `LANE_OWNER`: 既定 `lane:D generated-research swarm <TAG>`。

## 対象
- ENTERPRISE / SCALEUP は別レーン。ビルドスクリプトが自動で外す(元の scale で判定。家系内 179件)。残りが担当(SOLO と SMALL_TEAM)。
- 対象一覧の再生成: `node scripts/reaudit/lanes/gen-targets.mjs`(索引から `.reaudit-work/targets.json` を作る。i / id / name / scale / url ほか)。調査の開始時に1回作って固定する。gen-build-batch は現在の索引の範囲とこの一覧の id を突き合わせ、違えば中止する(`$LANE_WORKDIR/$LANE_TAG/targets.json` があればそちらを優先)。

## コマンド
- 一覧作成: `node scripts/reaudit/lanes/gen-targets.mjs`
- プロファイル(検索を使わない一次調査): `python3 scripts/reaudit/lanes/prof.py START END .reaudit-work/$LANE_TAG/prof-NNN.txt`(公式トップ / 会社概要 / 料金 / 法的表記のページ + JSON-LD + sitemap の手がかり + Wikipedia 検索 API + YC + IH + 403 や消滅時の Wayback を出す。家系添字の範囲を指定)
- 個別取得: `python3 scripts/reaudit/lanes/fx.py URL [maxchars] [regex]`(正直な UA + curl + テキスト化 / 正規表現で行抽出。403 は回避しない。Wayback は CDX `https://web.archive.org/cdx/search/cdx?url=HOST/&output=txt&fl=timestamp,statuscode&filter=statuscode:200&limit=-1` で時刻を調べ `web.archive.org/web/<ts>id_/URL` を `--compressed` で見る)、`python3 scripts/reaudit/lanes/wk.py 'Title' [lang]`(Wikipedia infobox 行)
- facts 検査(ビルド前): `python3 scripts/reaudit/lanes/lintfacts.py .reaudit-work/$LANE_TAG/facts/facts-NNN.json`(半角全角括弧の混在、禁止語、tagline の金額、ハザード語 tags、url ドメインの索引衝突、ARCHIVE レコードを見る)
- 1バッチ作成: `LANE_TAG=$LANE_TAG node scripts/reaudit/lanes/gen-build-batch.mjs NNN START END`(公式 candidate-skeleton を実行 → 大手を除外 → ARCHIVE 除外 → facts を合成 → validate-candidates → 報告 md → archive 一覧と進捗を更新)
- 事前検査: `LANE_TAG=$LANE_TAG node scripts/reaudit/lanes/preflight.mjs`(incoming の全バッチ(gen / ih / ebiz)を索引の**コピー**に合成して check-ingest-quality と check-index-safety を実行。`LANE_FAMILY='gen'` で絞れる)
- 入力: `.reaudit-work/$LANE_TAG/facts/facts-NNN.json` = `{notes:[...], records:[...]}`
- 出力(リポジトリ内、担当分のみ): `data/incoming/reaudit-gen-batch-NNN-20260929.json`、`reports/reaudit-gen-batch-NNN-20260929.md`、`reports/reaudit-gen-progress-$LANE_TAG.json`、`reports/reaudit-gen-archive-candidates-$LANE_TAG-20260929.json`(`{id,name,url,reason,checkedAt}[]`)

## facts のキー
id, verdict("OK" | "ARCHIVE" + 理由), url(転送されたら正規URL), co(国の修正), tg(tagline 140字以内・日本語・金額なし), w(whatItDoes。「<社名>は/が」で始めない), c(targetCustomer), p(painRelief), ar(architecturePattern), st(pipelineStack), tags[], le(legalEntity), fo(founder), yr(foundedYear), sc+scw(scale 修正とその理由), tm {n}, cf[](conflicts), un[](追加の unknown), ur[](追加の unresearched), sr(本人申告の検索をしたら true), ac(currentViabilityAnalysis), lim(調査限界カードの punchline), rep[](本人申告の指標: original,currency,amount,unit,unitLabel,source,context,statedOn,period,sourceUrl,cls), s[](出典 {k,u,f,d[],pd,pub,l,t,cs,es,o,cls,pc})。
- 出典の種類 k: home about price press blog legal ir store gh wire self news wiki misc。既定 tier: home / about / price / press / blog / legal / ir = TIER1_OFFICIAL、store / gh / wire = TIER1_PLATFORM、self / news / wiki / misc = TIER2_FACTS_ONLY。`t` で上書き。
- le / fo が未設定なら「未確認」。

## 調査の型(1バッチ)
1. 公式トップを 25件(プロンプトは箇条書き最大約110語)。
2. /pricing + /about 系 + 転送 + Wikipedia(en / ja)を約30〜40件、1ブロックで並列。
3. 穴埋め(founder / 従業員数)。検索が使えるなら WebSearch、使えないなら prof.py と fx.py。権威あるページを取って照合。
4. 個人開発 / 自力運営だけ: 本人申告の探索(WebSearch → 一次ページを取って正確な数字・日付・期間)。Latka / Tracxn / LeadIQ / Getlatka / PitchBook 等の第三者推計は本人申告ではないので**本人申告として記録しない**。
5. ARCHIVE にするのは、到達不能(DNS 死亡)/ 売り物・駐車ページ / 無関係・別会社、の時だけ。403 / bot 対策は ARCHIVE ではない(検索やアプリストアで実在確認し、事実を減らして残す)。
6. facts を書く → lintfacts → gen-build-batch → 全 PASS → preflight。

## 規則・落とし穴
- WebSearch にはセッション上限(200回)がある。上限後は prof.py + fx.py で進める(検索の代替を作って回避しない)。
- WebFetch は小型モデルの要約。「未来日付」「テンプレートエラー」といった著作権年のコメントは無視(今日は 2026-09-29)。ありえない日付は記録しない。要約が空 / 途切れなら別 URL(GitHub、wiki、プレス)で再試行。
- 価格は表示どおり通貨つきで記録(地域通貨もあり、注記する)。換算・推計なし。矛盾して見える価格(Clay)は金額を省き、プラン名だけ残す。
- 訴訟の申立て・個人間の争い、LinkedIn 由来の事実、スクリーンショット、長い引用は記録しない。
- scale の修正は明示的な人数の根拠がある時だけ: 1=SOLO、2-10=SMALL_TEAM、11-999=SCALEUP、>=1000=ENTERPRISE(理由は scw)。YC ページの team size は 12 でも SCALEUP への修正根拠になる。
- 避ける語: 関所 死角 監禁 要塞 専用インフラ + validator の FORBIDDEN 一覧。tags にハザード語(破綻 倒産 粉飾 不正 清算 枯渇 崩壊 撤退)を入れない。
- pnl は数値 0 / unconfirmed のまま。本人申告は revenueLabel と reportedMetrics に日付・期間・URL つきでのみ。利益だけの rep(NET_PROFIT 等)は revenueLabel を「売上未確認」のままにする(builder 対応済み)。
- 文末を変え、同じ定型文を複数レコードに貼らない。
- tagline に「数字 + 円 / ドル」を入れない(validator)。「百円」などを使う。「ソロ」と言い切らない。
- 403 / タイムアウト: レコードを残し、`home` 出典に `cs:"REACHABLE_CONTENT_NOT_READ", es:"UNKNOWN"`(ドメインが応答したことだけ)を付け、Wikipedia / プレスに頼る。DNS ENOTFOUND: 検索して本当の公式サイトを探し、あれば url を直して cf に注記(Komehyo の例)。何も実在しなければ ARCHIVE。
- Wikipedia のタイトルの罠(Miro の動画プレイヤーとホワイトボードは別物)。ja.wikipedia のタイトルは percent-encode(`urllib.parse.quote`)。
- 上場している日本企業で SMALL_TEAM と誤ラベル: 会社概要(社名 / 本社 / 設立 / 資本金 / 従業員数 / 上場)を記録し、従業員数で scale を ENTERPRISE に。売上・利益は記録しない(EDINET レーン)。un に書く。日経の会社概要ページ(`nikkei.com/nkd/company/gaiyo/?scode=NNNN`)は設立 / 従業員数 / 代表を Tier2 news 出典として使える。親会社が上場(うるる 3979)なら財務は記録せず EDINET と書く。
- 第三者が述べた数字(買収側のプレスリリース、会社の発言を報じた報道)は rep[] に帰属つき(「買収側発表」「会社側発表(報道)」、dateWord は「発表日」「掲載日」)で書く。創業者 / 会社が直接言った時以外は「本人申告」と呼ばない。決算公告(例 suruga-ya.co.jp/ja/company/kessan)は Tier1 の会社公表の法定公告: rep で帰属「会社側の決算公告」、unit NET_PROFIT、jpyAmount = amount。
- 上場外国企業(Woodpecker.co GPW): 報道から売上を記録しない。届出書類が要ると書く。
- カタログの founder 名は誤りが多い(22件中7件)。公式 about / ブログ著者 / YC / Wikipedia / プレスで必ず確認。法人名は imprint / privacy / terms ページから(Productlane GmbH, BunnyWay d.o.o.)。
- JSON-LD(Organization: legalName / foundingDate / founder / numberOfEmployees)は Tier1 公式の証拠(numberOfEmployees は明示的な人数として使える)。YC ページの生 HTML に team_size がある。Wikipedia infobox の 'Number of employees'。Instatus 風の年なし 'Updated Mar 25' は Wayback の取得日で年を挟む。
- Starter Story ページの 'Estimated from public sources' は本人申告ではない。使う前に WebFetch で「インタビューか分析か」を聞く。ポッドキャストページは番組側の要約であり創業者の言葉ではない(「番組ページの記載」と書く)。日付なしのポッドキャストは statedOn を '2024年ごろ（配信日は特定できず）' にして context で説明。IH の AMA 投稿は本人申告(statedOn = 投稿日)。創業者の X 投稿は取得できないが、WebSearch 結果のタイトルに全文が出る。日付は snowflake id から `(id>>22)+1288834974657` ms。
- 買収・閉鎖の事例が多い(Kitemaker, Flowise, CodeSandbox, Koyeb, GitPod→Ona, Userflow / Beamer, TinyPilot, Uploadcare→Tiugo, Rows→Superhuman, Elevar→Audiense)。サイトが応答する限り ARCHIVE にせず、出来事を記録して残す。
- カタログの国は誤りがある(Instatus LB→EG)。ドメイン移転(leavemealone.app→.com、rechargepayments.com→getrecharge.com、getelevar.com→audiense.com)。shippino.net→shippinno.net(n が2つ)。
- 重複エンティティ: 'Leave Me Alone'(generated)と ebizfacts 側は同じ製品で、url を変えると衝突する。古い url を残して cf に注記した。
- 日本語企業: 公式の会社ページ(corp.* / company)で設立 / 代表 / 従業員数。代表名が公式ページと古い PR TIMES で異なることがある(両方記録)。HERP Careers / Wantedly は会社提供の人数(Tier2 misc)。
- 進捗 json はビルドスクリプトが書く(`reports/reaudit-gen-progress-$LANE_TAG.json`)。
- **雛形の再生成は冪等でない**: 取り込み済みの再監査結果を含む索引から `candidate-skeleton.ts` を作り直すと、legacy 情報が新しい値で上書きされ、過去のバッチ出力と一致しない。完成バッチの再生成は動作確認用で、出力は `LANE_OUT_ROOT` で別の場所へ出す。
