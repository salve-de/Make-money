-- Small durable per-subject windows for anonymous write endpoints. The key is
-- a one-way digest, so raw client identifiers are never persisted.
CREATE TABLE IF NOT EXISTS request_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK(request_count >= 0 AND request_count <= 10000),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
