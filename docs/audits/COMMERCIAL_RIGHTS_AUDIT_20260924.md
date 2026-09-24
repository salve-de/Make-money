# Commercial publication audit / migration — 2026-09-24

## Current release

The current catalog manifest contains 3,085 published records from a 3,341-record source set. The 2,050 pending-curation list overlaps the published release by 1,812 IDs and references roughly 1,810 source domains, so source rights cannot be safely handled by a small hand-maintained list alone.

Known restrictive examples in the legacy source-url inventory include Reddit, Medium, Threads, BBC/NPR reporting, Flippa and other third-party pages. These records are not automatically declared unlawful; they are declared **not yet rights-cleared by the current product gate**.

## Migration rule

- Do not delete immutable research.
- Run `pnpm catalog:rights:audit` against the complete local 59 MB entities-index and release manifest.
- Replace discovery-only/restrictive evidence with approved canonical sources where possible.
- Add explicit rights policy/version to evidence.
- Only then enable strict legacy release exclusion.
- New scheduled Foundation data does not wait for this legacy migration: it is fail-closed immediately through the signed publication gate.

## Why the gate is evidence-level

A provider/page may be usable for discovery but not redistribution. Conversely, a single entity can have a mix of approved and held sources. The public projection therefore filters Evidence and any dependent Claim/Metric/MoneySignal/Event/Relationship/Observation instead of deciding only at entity/domain level.
