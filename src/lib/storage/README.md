# Storage adapters

Canonical decisions and migration instructions: [STORAGE.md](../../../docs/architecture/STORAGE.md).

- `d1.ts`: private user state SQL transport. `APP_DB` Worker binding; explicit D1 credentials for Node. Parameters are bound, provider responses validated, failures never become empty results. Domain authorization and record schemas belong beside the route or domain module, not in this transport.
- `r2.ts`: object transport, create-only writes and readback verification. Foundation buckets remain research sources; application files/backups use a separate private bucket.

Every user-state query must include the authenticated owner. Never query all users' notes to construct an AI prompt. Migrations are in `migrations/d1/`. Keep adapters specific and small; adding a second project does not mean sharing its private database or bucket.

Historical PostgreSQL columns are preserved in [legacy-neon-schema.ts.txt](../../../docs/architecture/legacy-neon-schema.ts.txt) solely to check migration completeness. There is no live Neon/Drizzle adapter or seed command.
