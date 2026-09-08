# 新規収集・R2保存の入口

## 収集完了の新しい必須検査

Universalの `docs/COLLECTION_RECONCILIATION.md` と `registry/collection/business-case.v1.json` を必ず読む。共通91細目と、現在のMake-Moneyコードの台帳・レーダー・分析等9契約の出力項目を生成し、資料内で見つけた全ての関連情報（表の過去年分も含む）を保存レコードと照合する。画面に出さない情報も保持する。

実装ブランチで `foundation-collect.ts requirements` → 調査・資料別抽出台帳作成 → `audit` → `ingest-complete` を実行。未読資料・未保存値・値の不一致・古いコードhashが残れば完了にしない。部分保存は通常ingestで許可する。旧ALL_DIMENSIONS_ATTEMPTEDやR2保存成功は全収集の証明ではない。

この入口はmainに置く。検証済みの収集実装は `codex/collection-handoff-20260908`（初回実証コミット `9a23717`）にある。無関係なアプリ改修をmainへ混ぜないため分離している。

1. 認証付きで `salve-de/universal-foundation` のmainを読む。AGENTS、UNIVERSAL_COLLECTION_BASELINE、AI_COLLECTION_AND_STORAGE_CONTRACT、MAKE_MONEY_AGENT_RUNBOOK、MAKE_MONEY_RESEARCH_REQUIREMENTSが正本。
2. このリポジトリの `codex/collection-handoff-20260908` を別の作業場所へ取得し、同ブランチの `docs/COLLECT_AND_STORE.md` を読む。既存の作業場所を強制切替・破棄しない。
3. AI自身が検索して新規データを集める。Universal共通要件とMAKEMONEY要件の和集合を対象とし、利益・費用・個人手残りを売上で代用しない。出典なしはUNVERIFIEDとして保持。追加観測も捨てない。
4. 同ブランチのCLIで正本schemaと全項目の調査状態を検証し、R2へ新規保存する。全項目を調査していない場合はPARTIALとして報告する。

検索/ブラウザ、Node/npm、非公開UniversalへのGitHub認証、R2認証が必要。このMacは既存Keychainラッパーを利用できる。別環境には安全に許可済み認証を渡す必要があり、GitHub閲覧だけではR2書込権限は付かない。

既存R2、EDINET、既存shadowの整理・上書き・移動・削除は禁止。新規保存だけを行う。

実証: Bufferの2024年開示から新規6件を保存、全6件SHA/bytes一致、再実行は新規0・同一6。証拠は実装ブランチの `data/collection/buffer-2024.saved.json` と `buffer-2024.repeat.json`。これは保存経路の実証であり、Bufferの全項目調査完了ではない。
