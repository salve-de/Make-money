-- Server-issued generations and revisions make execution persistence independent of browser clocks.
ALTER TABLE execution_projects
  ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1);

ALTER TABLE execution_projects
  ADD COLUMN generation INTEGER NOT NULL DEFAULT 0 CHECK(generation >= 0);

CREATE TABLE IF NOT EXISTS execution_resets (
  owner_key TEXT PRIMARY KEY,
  generation INTEGER NOT NULL DEFAULT 0 CHECK(generation >= 0),
  reset_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
