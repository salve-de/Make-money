# Scheduled collection to R2 publication

## What changes

The scheduled collection remains the control plane in `salve-de/universal-foundation`.
The scheduled-edition `foundation-r2-queue-publisher` Worker and its Queue consumer
are the single data-plane writer:

```text
hourly discovery/monitor/evolve
  -> R2_QUEUE batch (08:45 / 14:45 / 20:45 JST)
  -> staging/r2-queue/candidates/v2/<typed-sidecar-sha>/
  -> Publisher edition Cron (08:50 / 14:50 / 20:50 JST)
  -> Cloudflare Queue -> scheduled-r2-handoff.v1 materialization
  -> research-bundle.v1 + journal-entry.v1 validation
  -> all-key preflight
  -> R2 create-only PUT
  -> bytes/SHA-256 readback
  -> GitHub receipt + new-arrivals contribution
  -> public catalog exposes the latest edition
```

`NEEDS_RESEARCH` items are retained in staging and are not promoted. Source bodies with
`metadata_only` rights are not copied to R2. No delete, copy, move, rename, overwrite, or
legacy `universal` mutation is performed.

## Schedule and cost

- Collection schedules may remain hourly so source work is captured promptly.
- The declared R2_QUEUE handoff cadence is **08:45, 14:45, and 20:45 JST**.
- The Publisher source configuration declares edition reconciliation at
  **08:50, 14:50, and 20:50 JST**; each run enqueues work for its Queue consumer.
- GitHub push webhooks do not enqueue publication in the current Publisher source;
  they perform signature/reachability checks. The edition Cron is the normal
  reconciliation trigger.
- The legacy `make-money-r2-writer` Cron is disabled in production. It is not a
  second R2 writer and must not be re-enabled while the scheduled-edition
  Publisher is active.
- The user-facing catalog is released in three JST editions: **09:00, 15:00, and 21:00**.
- Each successful Publisher batch is assigned to the first edition at or after
  its stable source timestamp, and the catalog shows that edition only after
  its recorded release time. This keeps ingestion timely while giving users a
  predictable rhythm.
- The Publisher and its Queue retries are the only normal R2 write path. A
  repeated delivery performs idempotent create-only/readback work and does not
  overwrite canonical objects.
- The edition index is one small CAS-protected rebuildable view in `foundation-lake`;
  it is not a copy of the raw payload and does not move or overwrite any data.
- R2 storage/request billing follows the account's current free tier and pricing; this path does not add a new database or egress charge.

## Production state

The legacy scheduled Writer is fail-closed with
`FOUNDATION_R2_WRITER_ENABLED=false` and no Cron Trigger. Do not activate it
alongside the scheduled-edition Publisher; doing so creates a redundant consumer of
the same GitHub queue artifacts.

The above Publisher cadence describes source configuration, not live deployment
proof. Confirm the deployed Worker schedule and Queue bindings independently;
do not infer that they are active from this repository alone.

```sh
pnpm exec wrangler deploy --config wrangler.r2-writer.jsonc --var FOUNDATION_R2_WRITER_ENABLED:false
```

After deployment, verify `/health` shows `enabled:false`. Normal receipts are
recorded by the Publisher under its Foundation journal path.

```text
The old Writer receipts under
`staging/automation/receipts/r2_writer/` are historical audit artifacts only.
Publisher success is recorded in the Foundation journal after the ingest and
view/index readbacks pass.

## Local verification

```sh
pnpm exec wrangler deploy --config wrangler.r2-writer.jsonc --dry-run
pnpm exec eslint r2-writer/worker.ts src/lib/foundation/scheduled-r2-handoff.ts src/lib/foundation/scheduled-r2-handoff.test.ts scripts/r2-queue-materialize.ts
pnpm exec tsc --noEmit --pretty false
pnpm exec vitest run src/lib/foundation/scheduled-r2-handoff.test.ts
```
# 2026-09-21 統合時の再実行安全性

- writer v4 は journal ID に完全な SHA-256 を使う。旧 journal は削除・上書きしない。
- 公開便の割当時刻はキューの完了時刻（なければ bundle の取得時刻）に固定し、再実行の壁時計を使わない。
- 同じ入力の再実行で新規 PUT が0になることを回帰テストで確認する。
- 既存の成功 receipt は従来どおり再処理しない。旧版の部分成功で衝突する場合も上書きせず、原本と receipt を個別照合する。
