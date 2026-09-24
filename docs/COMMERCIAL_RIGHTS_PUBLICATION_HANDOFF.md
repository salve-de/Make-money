# Commercial Rights / Public Publication Handoff

Updated: 2026-09-24 JST

## Final objective

Keep Make-Money's scheduled Web ChatGPT research broad, but make monetized user-facing publication fail closed.

Private/canonical research and public product publication are separate:

```
scheduled discovery / verification
  -> typed sidecar
  -> canonical private Foundation ingest
  -> commercial/public rights filter
  -> fact-only Make-Money projection
  -> New Arrivals / API / UI
```

A source being public, searchable, or stored as `metadata_only` does not authorize commercial display.

## User intent / constraints

- Keep discovery broad; do not restrict research to only commercially reusable websites.
- Do not change collection schedules/prompts as a shortcut.
- Preserve internal leads and provenance where permitted.
- News/social/community sources may discover opportunities but must be re-sourced before their facts become public if their terms do not permit monetized reuse.
- Public UI must not expose source article text, screenshots/media, or free-form source-derived summaries merely because canonical research contains them.
- Existing 3,085 released records require a separate retrospective rights audit.

## Current implementation

Branch: `rights-publication-gate-20260924`

New module:
- `src/lib/foundation/publication-rights.ts`

Behavior:
1. full validated bundle still goes to canonical/private Foundation R2;
2. public projection requires an explicit registered `rights_policy_id`;
3. only policies explicitly safe for automatic commercial fact display are auto-admitted;
4. records must be `SUPPORTED` and depend only on allowed Evidence;
5. free-form `observations` and `derived` text are excluded from the public fact projection;
6. if nothing survives, API returns canonical success with `view_projection.status=RIGHTS_HELD`;
7. held bundles do not enter Make-Money view or New Arrivals.

Starter auto-approved policies are deliberately narrow: `rights.e-stat.v1` and `rights.bls.v1`. Conditional policies (Gビズインフォ, EIA, Eurostat, Companies House) remain held until their exception/attribution conditions can be mechanically proven per record/dataset.

The policy SSOT is the paired Universal Foundation branch/file:
`salve-de/universal-foundation/docs/COMMERCIAL_RIGHTS_PUBLICATION_HANDOFF.md`

## Why this design

- Do not discard useful internal research.
- Do not pretend copyright-analysis permission equals website ToS permission.
- Do not pretend raw-storage permission equals publication permission.
- Do not publish a mixed bundle just because one Evidence item is safe.
- Prefer structured facts over article-like summaries.
- Default to hold when policy identity or conditions are unknown.

## Existing catalog

Current release manifest:
- sourceCount: 3,341
- publishedCount: 3,085

This release predates the new granular rights gate. It must be audited separately rather than silently grandfathered.

## Work status

- [x] External official terms review.
- [x] Current scheduled typed-sidecar rights audit.
- [x] Universal Foundation granular rights schema + provider starter policies.
- [x] Canonical/private vs public projection architecture decided.
- [x] Add fail-closed fact-only rights projection to typed ingest route.
- [x] Add the same public gate to legacy Foundation ingest route.
- [x] Add unit tests for missing policy, approved policy, conditional policy and UNVERIFIED facts.
- [ ] Run Make-Money test/type/build checks and repair any failures.
- [ ] Audit the 3,085 existing catalog records and write a durable report.
- [ ] Quarantine/exclude existing catalog records that cannot prove a public rights basis.
- [ ] Prove one real typed sidecar can ingest canonically while public view is RIGHTS_HELD.
- [ ] Prove one approved-policy fixture reaches the public projection.
- [ ] Open/merge paired PRs.
- [ ] Verify production API/UI after deployment.
- [ ] Keep this file updated after every material step.

## Resume instruction

Another chat/agent must:
1. read this file;
2. read the paired Universal Foundation handoff;
3. inspect branch/PR `rights-publication-gate-20260924`;
4. continue from the first unchecked item;
5. append concrete test/audit/PR evidence here before stopping.
