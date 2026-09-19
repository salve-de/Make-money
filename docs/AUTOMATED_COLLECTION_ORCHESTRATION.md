# Automated Universal Collection Orchestration

## Architecture

- `main`: production application/code and stable collection contracts.
- `automation-research`: scheduled ChatGPT staging branch.
- R2 / Universal Foundation: formal source of record after validated ingest.

Drive and Excel are not required in the automated collection path.

## Hourly lanes

### BACKFILL
Enrich existing entities. Prefer missing, stale, weakly supported and high-value records. Research only what is missing or stale instead of redoing the entire case.

### DISCOVERY
Find new business, success, failure, acquisition, shutdown and emerging opportunity cases. Deduplicate before deep research.

### MONITOR
Track meaningful changes to existing entities. Store new observations as new events/metrics/evidence rather than rewriting history.

### EVOLVE
Detect recurring useful observations not represented by current fields. Keep them as observations first; promote to versioned fields only when semantics stabilize.

### R2 QUEUE
Convert validated staging output into Foundation-compatible research-bundle.v1 candidates for the R2 ingest worker.

## Concurrency model

Each scheduled run creates its own new file. The four research lanes never share a mutable output file, so they can run in parallel every hour.

```text
data/automation/backfill/YYYY/MM/DD/<timestamp>-backfill-<run_id>.json
data/automation/discovery/YYYY/MM/DD/<timestamp>-discovery-<run_id>.json
data/automation/monitor/YYYY/MM/DD/<timestamp>-monitor-<run_id>.json
data/automation/evolve/YYYY/MM/DD/<timestamp>-evolve-<run_id>.json
data/r2-queue/YYYY/MM/DD/<timestamp>-<run_id>.json
```

## Efficiency

Nominal targets are guides, not hard limits. Each run should complete the maximum safe amount within that execution. A run must not fail merely because it completed fewer than the nominal target.

- BACKFILL: nominal 25 entities/run.
- DISCOVERY: nominal 25 new candidates/run.
- MONITOR: nominal 50 entity checks/run.
- EVOLVE: analyze the latest research window and emit only meaningful candidates.
- R2 QUEUE: process as many unqueued validated staging artifacts as can be safely completed.

## Universal collection rule

The current field lists are not storage boundaries. If a materially relevant finding does not fit a current field, preserve it as an Observation. Repeated observations can later become a versioned field and trigger targeted backfill.

## GitHub staging limits

GitHub staging stores compact structured research and provenance, not large raw HTML/PDF/page bodies. Raw evidence bytes belong in R2 after rights checks.

## Failure behavior

Partial results are still valuable. Save them with explicit errors, unknowns and coverage states. Never fabricate facts to make a batch look complete.
