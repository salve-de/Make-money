-- D1 Migration: 0006_dossier_pointers.sql
-- Content-Addressed Storage (CAS) pointer catalog for immutable dossiers

CREATE TABLE IF NOT EXISTS dossier_pointers (
  entity_id TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  source_revision INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dossier_pointers_updated_at ON dossier_pointers(updated_at);
