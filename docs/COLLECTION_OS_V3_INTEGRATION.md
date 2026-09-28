# Collection OS v3 と Make-Money の接続契約

この文書は、Make-MoneyをUniversal Foundationの収集結果の利用者として接続するためのローカル契約です。収集仕様そのものを複製する文書ではありません。収集の正本は常に `salve-de/universal-foundation@main` にあります。

## 正本

定期収集を実行する前に、毎回次の契約を `universal-foundation@main` から取得します。

- [Collection OS v3](https://github.com/salve-de/universal-foundation/blob/main/docs/COLLECTION_OS_V3.md)
- [Collection Operations v1](https://github.com/salve-de/universal-foundation/blob/main/docs/COLLECTION_OPERATIONS_V1.md)
- [Collection OS registry](https://github.com/salve-de/universal-foundation/blob/main/registry/collection/collection-os.v3.json)
- [collection-run.v1 schema](https://github.com/salve-de/universal-foundation/blob/main/schemas/foundation/collection-run.v1.schema.json)
- [evidence-capture-request.v1 schema](https://github.com/salve-de/universal-foundation/blob/main/schemas/foundation/evidence-capture-request.v1.schema.json)
- [coverage-snapshot.v1 schema](https://github.com/salve-de/universal-foundation/blob/main/schemas/foundation/coverage-snapshot.v1.schema.json)
- [work-item.v1 schema](https://github.com/salve-de/universal-foundation/blob/main/schemas/foundation/work-item.v1.schema.json)
- [work-claim.v1 schema](https://github.com/salve-de/universal-foundation/blob/main/schemas/foundation/work-claim.v1.schema.json)
- [Evidence Capture and Coverage contract](https://github.com/salve-de/universal-foundation/blob/main/docs/EVIDENCE_CAPTURE_AND_COVERAGE.md)

Make-Money固有の表示・品質ルールは、上記の共通契約に追加する利用者側の条件です。固定項目の不足を理由に有用な観測を捨てず、未知の情報は namespaced Observation として保持します。

## 責務の分離

| 層 | 責務 | 触ってよい正本 |
| --- | --- | --- |
| Web ChatGPT | 各レーンの調査・監査、WorkItem/Claimの取得、run artifactとcapture request作成 | `universal-foundation@automation-research` |
| Evidence Capture | `staging/evidence-capture/requests/` を読み、権利状態に応じて原本またはmetadata-onlyのreceiptを保存 | `foundation-evidence-capture`、`foundation-raw`、`foundation-restricted` |
| R2_QUEUE | upstream artifact SHA + subject + mapper versionで決定的v2候補へ変換・検証・キューへ渡す | `staging/r2-queue/candidates/v2/` |
| Publisher | 公開便Cron → Queue → authenticated ingest API → canonical R2へのcreate-only保存とreadback | `foundation-r2-queue-publisher` |
| Make-Money | canonical R2の再構築可能なviewをAPI/UIへ提供 | `views/make-money/v1`、`/api/businesses` |

定期収集はMake-Moneyの中央台帳や画面用JSONを直接編集しません。Make-MoneyのUIは、typed facts、Evidence、Metric、Event、Relationship、Observationを含む再構築可能なviewだけを読みます。

## スケジュール

時刻・Publisherの現在の構成は [AUTO_PUBLISH_TO_UI.md](architecture/AUTO_PUBLISH_TO_UI.md) と [R2_SCHEDULED_WRITER_RUNBOOK.md](R2_SCHEDULED_WRITER_RUNBOOK.md) に集約する。上流の宣言と実際の稼働証跡は別に確認する。過去の毎時R2_QUEUE/webhook起動の説明は統合時に削除した。

## 保存・更新の不変条件

- raw evidence、canonical Entity、Claim、Metric、MoneySignal、Event、Relationship、Journalはcreate-only / append-only。
- 訂正・反証・失効は旧記録を消さず、`supersedes` / `retracts` / `invalidates` で追記する。
- unknown、unavailable、推定、reported、observed、inferred、verification statusを混ぜない。
- 金額は `value`、`unit`、`currency`、`metricType`、期間/時点、根拠を分離する。期間を年額・月額へ暗黙変換しない。
- 34既知領域は探索の手掛かりであって、保存対象のallow-listではない。
- 同一目的のWorkItemはdeterministic fingerprintで一つにし、未失効Claim・freshなsource attempt・成功receiptを確認してから外部取得する。
- R2_QUEUEは新しい事実を調査・推論せず、同じupstream artifact/blob SHAとmapper versionから同じ候補bytesを再生成する。
- 2050件の保留改修、v0、EDINET正本領域、既存原本はこの経路から変更しない。
- legacy `make-money-r2-writer` のCronは無効のままにし、Publisherと二重に書き込まない。

## Make-Money側の受入条件

1. `staging/evidence-capture/requests/` に必要な根拠のrequestが生成され、Evidence Captureが保存または明示的なmetadata-only/blocked結果をby-request receiptに残す。
2. 同じupstream artifactを同じmapper versionで2回処理して、同一v2候補path/bytesになる。
3. `research-bundle.v1` と付随する根拠・権利・不確実性を検証する。
4. canonical R2へcreate-onlyで保存し、bytes/SHA-256 readbackを確認する。
5. `views/make-money/v1` を再構築可能な派生物として更新する。
6. `/api/businesses` はページング/continuationで全件を読み出せるようにする。100件は1ページの上限であり、総件数ではない。
7. UIは別ページ・スクロール・続きを読み込み、未確認値を確定値やランキング根拠として表示しない。

## 完了の判定

「スケジュールが有効」「GitHubに候補がある」「R2に一つ保存できた」は別々の事実です。完了を主張するには、対象runの receipt、canonical R2のreadback、viewのreadback、APIレスポンス、ブラウザ表示を同じrun/entityに結び付けて確認します。未確認の段階は未確認のまま報告します。
