# Scheduled collection to R2 writer

## What changes

The scheduled collection remains the control plane in `salve-de/universal-foundation`.
The standalone `make-money-r2-writer` Worker is the data-plane writer:

```text
hourly discovery/monitor/evolve
  -> hourly R2_QUEUE staging artifact
  -> scheduled-r2-handoff.v1 materialization
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

- Collection schedules remain hourly.
- The Writer runs at minute 20 of every hour (`20 * * * *`), after the queue lane has time to finish.
- The user-facing catalog is released in three JST editions: **09:00, 15:00, and 21:00**.
- The hourly writer does not wait for those editions. Each successful batch is assigned to the
  first edition at or after its R2 readback, and the catalog shows that edition only after its
  recorded release time. This keeps ingestion timely while giving users a predictable rhythm.
- A run with no new queue artifact performs no R2 PUT.
- An identical retry performs readback only and returns `EXISTS_IDENTICAL`.
- The edition marker is one small immutable JSON object in `foundation-lake`; it is not a copy
  of the raw payload and does not move or overwrite any data.
- R2 storage/request billing follows the account's current free tier and pricing; this path does not add a new database or egress charge.

## One-time production activation

The config is fail-closed with `FOUNDATION_R2_WRITER_ENABLED=false`. Before enabling the
Worker, provide a GitHub token with minimum Contents read/write access to the private
`salve-de/universal-foundation` repository and a separate random writer token. Never commit
either value.

```sh
pnpm exec wrangler secret put FOUNDATION_GITHUB_TOKEN --config wrangler.r2-writer.jsonc
pnpm exec wrangler secret put FOUNDATION_WRITER_TOKEN --config wrangler.r2-writer.jsonc
pnpm exec wrangler deploy --config wrangler.r2-writer.jsonc --var FOUNDATION_R2_WRITER_ENABLED:true
```

After deployment, verify `/health`, then inspect the first scheduled receipt under:

```text
staging/automation/receipts/r2_writer/YYYY/MM/DD/<run_id>-receipt.json
```

The first activation should be treated as a canary. A successful receipt must show:

```text
status=SUCCESS
r2.created > 0 or r2.exists_identical > 0
r2.readback_verified == r2.planned
mutation_counts.copy_object/delete_object/move/rename/overwrite == 0
```

If any key conflicts, the entire run stops before PUT and the existing object is preserved.

## Local verification

```sh
pnpm exec wrangler deploy --config wrangler.r2-writer.jsonc --dry-run
pnpm exec eslint r2-writer/worker.ts src/lib/foundation/scheduled-r2-handoff.ts src/lib/foundation/scheduled-r2-handoff.test.ts scripts/r2-queue-materialize.ts
pnpm exec tsc --noEmit --pretty false
pnpm exec vitest run src/lib/foundation/scheduled-r2-handoff.test.ts
```
