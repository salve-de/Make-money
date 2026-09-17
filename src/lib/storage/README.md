# Storage adapters

Canonical decisions and migration instructions: [STORAGE.md](../../../docs/architecture/STORAGE.md).

- `d1.ts`: D1 SQL transport. `APP_DB` Worker binding; explicit D1 credentials for Node. Parameters are bound, provider responses validated, failures never become empty results. Domain authorization and record schemas belong beside the route or domain module, not in this transport.
- `entity-approvals.ts`: global editorial approval overlay in D1. It never rewrites R2 research objects or checked-in entity fixtures. Production writes require the route's verified Firebase identity plus the D1 `admin` role. Batch writes are idempotent and success is acknowledged only after every requested entity is read back.
- `local-entity-approvals.ts`: local-development fixture editor only. It uses an inter-process lock, recovery journal, atomic replacement and fsync; packaged production JSON is never treated as mutable storage.
- `r2.ts`: object transport, create-only writes and readback verification. Foundation buckets remain research sources; application files/backups use a separate private bucket.

Every user-state query must include the authenticated owner. Global editorial state is the narrow exception: approval IDs are intentionally shared across readers, while writer identity is server-authorized and stored only as an audit field. Never query all users' notes to construct an AI prompt. Migrations are in `migrations/d1/`. Keep adapters specific and small; adding a second project does not mean sharing its private database or bucket.

Historical PostgreSQL columns are preserved in [legacy-neon-schema.ts.txt](../../../docs/architecture/legacy-neon-schema.ts.txt) solely to check migration completeness. There is no live Neon/Drizzle adapter or seed command.
