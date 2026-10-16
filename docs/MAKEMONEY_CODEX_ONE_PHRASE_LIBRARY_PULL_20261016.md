
# MAKEMONEY｜オーナーはCodexに一言だけ：Library直取込と取込台帳の実装・検証契約
2026-10-16／最新の明示的オーナー要件

**オーナーはZIPのダウンロード、ファイル移動、解凍、添付、JSON修正、フォルダ指定を一切しない。** 以前の「LibraryからDownloadsへ手動で移す」案はこの要件で置き換える。既存の毎時ChatGPT収集は維持し、収集対象や頻度を勝手に変更しない。

## 1. 完成時の体験

1. ChatGPTの既存毎時事例制作タスクが走り、新規の原稿、出典、研究原本、必要なSVGなどを「ChatGPT Library → /Make money/」の個別ZIPへ保存。累積ZIPは更新に失敗しうるので、個別ZIPを一次的な回収対象とする。
2. オーナーはCodexで「MAKEMONEYのChatGPT Library『Make money』から未取込の事例を全部直接取得して、重複・改訂を整理し、非公開UIに取り込んで。受領済み・表示済み・編集待ちを台帳更新して結果を報告。ファイルDL・移動・添付は頼まないで。」とだけ言う。
3. Codexが自身の正式なLibraryアクセス機能を検証して、同じChatGPTアカウントのLibraryからZIPを直接取得。個別ZIPと累積ZIPの**和集合**を対象にし、改訂や重複を安全に判定。
4. 内容は原文のままCodexローカル/private stagingへ保全し、既存の受取ツールで正式データへ変換。プレビューの実UIを1440/768/390pxで確認。記事自体が編集未合格なら非公開・要修正のまま保管。
5. 次回以降の同じ一言では台帳とLibraryの全件を照合し、未受領・新改訂だけを取り込む。すでに取り込んだ事例の件数や状態も報告。

## 2. Codexが最初にやること（実行不能なのに「できます」は禁止）

**最優先は、当該Codex環境で本当にLibrary本体のバイトを取得できるかの確認。**

- Codexの利用可能ツールから第一者ChatGPT Library機能を探す。一部環境に openai-library:library スキルや connector_openai_library に相当する list/search/read/prepare_materialize などのツールがあるが、全環境で利用可能とは限らない。
- Libraryの /Make money/ を実際に一覧し、元ファイルID・ファイル名・最終更新時刻を取得。
- 原本ZIPの少なくとも1件を、正規のLibraryファイル取得機能で**Codexの作業環境へ直接受信**し、ローカルZIPのSHAと中身を確認。名前やメタデータが見えるだけではPASSではない。Codex CloudではLibraryからのバイト転送が失敗する可能性も実際にあるため、必ず実バイトで検証。
- **ツール自体が無い／権限不足／転送403など**の場合は BLOCKED_LIBRARY_ACCESS または BLOCKED_LIBRARY_TRANSFER として停止し、必要な一度限りの接続・Codex実行環境の条件を端的に報告。オーナーにファイルの移動や添付を要求しない。非公式APIやログイン回避を使わない。
- やむを得ず他の保存経路が必要なら、ChatGPT毎時タスクからその保存先への実記事保存とCodex取得を**正規のアクションで実証**してから採用する。R2/Drive/GitHubへの定期書込は過去に失敗例があり、未検証で稼働済みと宣言しない。

## 3. 累積と個別を全部取る

2026-10-16の確認時点、累積ZIPに含まれるのはRightmoveとWho Gives A Crapの2件で、SPANXとBalsamiqの個別ZIPは別に存在していた。

- 累積ZIP「MAKEMONEY_まとめてDL_最新版.zip」を見るだけで終わらない。
- /Make money/ にある新旧の個別事例ZIPを全件一覧し、受領対象の原文＋研究原本＋添付図解がそろっているか確認。
- 古い34件の研究原本や50件のモックは、審査済み完成記事と同じ件数に含めない。
- case_id、公式domain、製品名・別名、改訂、記事・研究のSHAで同一性判定。同じrevisionで本文が違えば黙って上書きせず衝突を保留。
- 毎回同じ入力を再実行しても追加0件（冪等）。旧原稿・旧改訂を消さない。

## 4. 受領・表示・品質の状態台帳（手動整理は不要）

Codexが一言の実行ごとに、**永続する私的な台帳**を更新する。初回はローカル/private stagingに生成しても、次回実行で前回を読めるようにする。第一者Libraryのファイル更新まで利用可能なら /Make money/ の同一台帳へ安全に同期。公開GitHubリポジトリへ未公開本文を無断保存しない。

事例ごとに、最低限以下を記録する。

- 身元：事例名、case_id、公式ドメイン、商品名、revision、記事SHA、元LibraryファイルID/パス、原本ZIP SHAと取得日時
- Library発見（DISCOVERED_LIBRARY）／実ZIP取得（RETRIEVED）／原文保存とreview-only変換（STAGED_DRAFT）／正式非公開データ投入（IMPORTED_PRIVATE）
- React実UI検証（UI_VERIFIED_PRIVATE）とスクリーンショット等の証拠。単独の検査HTMLは実UIとは数えない
- 編集品質（EDITORIAL_REWORK / READY_FOR_OWNER_REVIEW 等）と出典照合状態。データの取り込み成功は記事内容の合格ではない
- 本番公開状態（明示的な承認まで NOT_APPROVED）
- 実行別の「Libraryで発見、実バイト取得、今回新規受領、既取込スキップ、改訂、編集中、実UI確認、未取得、公開済み」件数とエラー

台帳を上書きする場合は、原本ハッシュとrevisionで旧情報・改訂履歴を維持し、並行起動による更新衝突を確認。台帳の存在だけで実ファイル取得成功と偽らない。

## 5. 既存コードと役割の違い

PR #230 の scripts/case-articles/intake-library.py は**ローカルに存在するZIPからreview-only形式へ変換する既存実装**。Libraryから自動受信する機能ではない。Codexは上記の第一者Library取得を実行し、取り込んだ実ファイルを既存プログラムへ渡す。

取り込み・保存の後にPR #224の実React UIでブラウザQA。既存の review-index.html は単なる受領台帳用HTMLで、製品UIの検証と混同しない。

新しい記事の編集品質・出典は [MAKEMONEYの統一収集正本](https://github.com/salve-de/Make-money/blob/docs/makemoney-owner-reality-20261015/docs/MAKEMONEY_CASE_RESEARCH_EDITORIAL_SSOT_20261016.md) に従う。Rightmove r1は初客・立ち上げ・課金化の取材が不足しているため、技術的受入をしても記事編集は未合格。本番公開・デプロイ・課金・本番R2変更は禁止。

## 6. 合格条件と未実証

**第一関門：オーナーが1バイトも手で移さずに、CodexがLibraryの実ZIP1件を取得できたこと（SHAとZIP内容で確認）**。

第二関門：個別と累積の和集合を漏れなく取り込み、同じ要求を2回しても重複0、旧版と新改訂を非破壊で保持。永続台帳で全件の状態を確認できること。

第三関門：本物のMAKEMONEY非公開UIへ反映し、実ブラウザで確認していること。編集・根拠審査と本番公開はさらに独立。

**いずれも現時点で実Codex環境の直取得・実UIの達成は未実証。** この文書は最短の実装・検証契約であって成功報告ではない。
