-- Global editorial approval overlay. Research/source records remain immutable in R2/checked-in fixtures.
-- `approved_by` is intentionally not a foreign key: audit facts survive account deletion.
CREATE TABLE IF NOT EXISTS entity_approvals (
  entity_id TEXT PRIMARY KEY,
  approved_by TEXT NOT NULL,
  approved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(length(entity_id) BETWEEN 1 AND 200),
  CHECK(length(approved_by) BETWEEN 1 AND 128)
);
CREATE INDEX IF NOT EXISTS entity_approvals_approved_at ON entity_approvals(approved_at);
