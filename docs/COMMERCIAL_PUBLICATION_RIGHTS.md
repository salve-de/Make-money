# COMMERCIAL PUBLICATION RIGHTS — Make-Money

Effective: 2026-09-24 JST.

Make-Money must never treat "public on the web", "metadata_only", or "OpenAI output" as a commercial-publication licence.

## Runtime boundary

Universal Foundation Publisher evaluates the versioned source-rights registry and signs a `foundation-publication-gate.v1` with the shared server-only ingest secret.

Make-Money:
1. verifies that signature and run identity;
2. ingests the full research bundle only into private canonical Foundation storage;
3. persists the verified publication decision under `views/make-money/v1/publication-gates/<run_id>.json`;
4. builds the user-facing view only from allowed Evidence;
5. withholds any record whose Evidence set is not wholly rights-cleared;
6. emits no New Arrivals entry when the gate is held;
7. never falls back from a missing public view to the private canonical research bundle.

A missing/invalid publication signature fails closed for the public product but does not destroy the research run.

## Rebuild safety

The view rebuild and unresolved-replay paths read the persisted publication gate before materializing a canonical bundle. Old canonical bundles with no gate are not silently republished during a rebuild.

## Legacy 3,085 release

The immutable legacy catalog remains a separate migration surface. It is not proof of rights review. Use `pnpm catalog:rights:audit` to classify all release members and their source URLs. Remediation should replace restrictive/discovery-only sources with approved first-party/government/licensed evidence before strict rights enforcement is enabled.

No legacy source object is deleted by this work.
