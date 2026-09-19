# Universal Foundation → Make-Money UI automatic publication

## Goal

New scheduled research should reach the Make-Money UI without editing static TypeScript data, rebuilding case files, or manually copying spreadsheets.

## Runtime path

```text
ChatGPT scheduled collection
  -> salve-de/universal-foundation@automation-research
  -> staging/r2-queue/.../candidates/*.json
  -> foundation-r2-queue-publisher (Cloudflare Cron)
  -> /api/foundation/ingest (service binding)
  -> canonical Foundation R2 datasets
  -> views/make-money/v1/entities/<entity_id>.json
  -> /api/businesses
  -> useFoundationCatalog
  -> UI
```

## Canonical vs product view

Canonical Foundation objects remain create-only and immutable under the registered datasets.

The Make-Money serving view is explicitly rebuildable:

`foundation-lake/views/make-money/v1/entities/<entity_id>.json`

It may be replaced when newer canonical facts arrive. Mutable writes are physically restricted to the `views/` prefix by `putR2MutableView`.

Never put canonical evidence/facts into the mutable view namespace.

## Ingest behavior

`POST /api/foundation/ingest`:

1. validates `research-bundle.v1`;
2. performs rights/preflight checks;
3. creates canonical Foundation objects using create-only writes;
4. reads them back and verifies bytes/hash;
5. builds the Make-Money serving projection from the same validated bundle;
6. writes/replaces only the rebuildable product view.

If canonical ingest succeeds but view projection fails, the endpoint returns a retryable partial failure. A retry is safe because canonical ingestion is idempotent.

## List behavior

`GET /api/businesses` reads the materialized Make-Money view for list pages.

The API returns the canonical `FoundationValuePage` transport shape. The client performs the single authoritative conversion to `FinancialEntity`.

This removes the former double-adaptation mismatch where the server returned `FinancialEntity` while the client attempted to parse it as `FoundationValueSummary`.

Only entries that pass the existing dossier-quality and publication gates are included in the main ledger.

## Detail behavior

`GET /api/businesses?entity_id=<id>` reads the canonical Foundation entity + research bundle and returns `FoundationBusinessCase`.

The client then adapts it to the Make-Money dossier. The API no longer returns a pre-adapted `FinancialEntity` under a Foundation response envelope.

## Freshness

The current API cache is intentionally short:

- list pages: 30 seconds
- details: 60 seconds

No application redeploy is required when a new R2 bundle/view is written.

## Publisher

The publisher Worker lives in:

`salve-de/universal-foundation/workers/r2-queue-publisher/`

It runs every five minutes and calls this application's ingest endpoint through a Cloudflare service binding named `MAKE_MONEY_APP`.

## Failure semantics

- bad schema: not published;
- R2 conflict: not published;
- view projection failure: canonical write may already exist; retry safely;
- missing/weak research: remains in Foundation/staging but does not enter the main UI;
- publisher failures: retried next cron and recorded in R2 attempt receipts.
