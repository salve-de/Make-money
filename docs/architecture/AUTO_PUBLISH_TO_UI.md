# Universal Foundation → Make-Money UI automatic publication

## Goal

New scheduled research should reach the Make-Money UI without editing static TypeScript data, rebuilding case files, or manually copying spreadsheets.

## Runtime path

```text
ChatGPT scheduled collection
  -> salve-de/universal-foundation@automation-research
  -> staging/r2-queue/.../candidates/*.json
  -> GitHub signed push webhook
  -> foundation-r2-queue-publisher (Cloudflare Queue consumer)
  -> /api/foundation/ingest (authenticated HTTPS)
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

It has no Cron Trigger. A signed GitHub `push` webhook for
`universal-foundation@automation-research` enqueues one reconciliation event.
The queue consumer then calls this application's public HTTPS origin with the
server-only `FOUNDATION_INGEST_TOKEN`. The publisher intentionally does not use
a Cloudflare Service Binding, so this hop does not require a Service Binding/
Workers Standard dependency.

Each event reconciles the current candidate tree, so a later successful push
also recovers candidates left behind by a previously missed webhook. Large
backlogs are drained by bounded queue continuations rather than periodic polling.

## Failure semantics

- bad schema: not published;
- R2 conflict: not published;
- view projection failure: canonical write may already exist; retry safely;
- missing/weak research: remains in Foundation/staging but does not enter the main UI;
- transient publisher failures: retried by Cloudflare Queue and recorded in R2 audit Journal entries;
- no fixed-time polling occurs when there is no GitHub push.


## Existing-data migration

The materialized view is not enabled blindly over an existing lake.

Until the one-time canonical rebuild is complete, `/api/businesses` uses a hydrated canonical Foundation read path. The internal rebuild endpoint:

`POST /api/foundation/views/rebuild`

processes a bounded page of existing immutable research bundles, persists its cursor under:

`views/make-money/v1/_rebuild-state.json`

and resumes on the next event-driven publisher reconciliation. Backlog continuations keep advancing the rebuild while queued work exists. Once the state reaches `complete: true`, list reads switch to the fast materialized view.

## Cumulative updates and ordering

Each entity view stores both a summary and the accumulated Foundation business-case detail.

New bundles are merged by stable record IDs into the existing view. Historical claims, metrics, events, observations and evidence therefore remain present when a later monitoring bundle is ingested.

View replacement is protected by R2 ETag compare-and-swap. Concurrent writers retry from the newest persisted view instead of overwriting it.

An older bundle may still contribute historical evidence, but it cannot roll the view back: `projected_at` and latest identity/status selection remain monotonic.

## Existing entity updates

Canonical entity core objects remain create-only. If an incoming bundle references an already-existing entity object with different temporal fields, ingestion compares the durable identity:

- entity ID/type;
- canonical identifier;
- domain;
- canonical name when no stronger durable identifier exists.

If the durable identity is compatible, the existing entity object is retained and new claims/metrics/events/relationships/bundles are appended. A real identity conflict remains fail-closed.


## Migration request-path safety

The one-time serving-view rebuild runs only in the background Publisher path.

Public `/api/businesses` requests do **not** scan the whole canonical research-bundle lake while rebuild is incomplete:

- list pages read whatever `views/make-money/v1/entities/` rows have already been materialized and merge them with the existing local ledger client-side;
- an existing curated local dossier stays authoritative during the global rebuild;
- Foundation-only entities become visible as soon as their individual view exists;
- once the global rebuild state becomes complete, the materialized view is the normal serving layer.

This prevents a 100-row UI request from turning into an all-lake R2 fan-out.

## Atomic entity identity authority

Immutable Entity core objects are never overwritten. To safely accept later bundles that add durable identity fields, ingestion maintains a rebuildable CAS-protected authority at:

`views/foundation-ingest/v2/entity-identity/<entity_id>.json`

Before an `EXISTS_COMPATIBLE` entity preflight is allowed to continue, the incoming domain/canonical identifier/name/type must be compatible with the authority and the authority update must win an R2 ETag compare-and-swap.

This serializes concurrent identity additions such as two different domains racing against an originally blank immutable Entity core. Canonical facts remain immutable; the authority is only a coordination/derived view and can be rebuilt from accepted history.


## Bounded unresolved-history hydration

Record-only bundles may arrive before an Entity core. Those references are retained under:

`views/make-money/v1/_unresolved-by-entity/<entity_id>/<run_id>.json`

When the Entity core later becomes resolvable, Make-Money does not hydrate an unbounded history in one Worker request. It processes at most 25 unresolved control records per projection call and persists the next R2 listing cursor under:

`views/make-money/v1/_unresolved-hydration-state/<entity_id>.json`

The corresponding bundle projection remains incomplete and keeps the entity in its unresolved retry set until the per-entity cursor reaches the end. Each subsequent event-driven publisher/rebuild invocation resumes from that cursor. Resolved markers remain append/audit-visible and are not deleted.
