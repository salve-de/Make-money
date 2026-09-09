# Buffer collection repair

2026-09-08: appended the omitted 2017–2023 employee profit-share pools from https://buffer.com/resources/7th-profit-share/ . Amounts (USD): 300000, 394997, 368051, 243047, 89828, 0, 0. These are employee distributions, NOT founder take-home or company net income.

Run `run_buffer_reconciliation_20260908_03`: 28 planned objects, 15 created, 13 existing identical, 28 readback verified. Existing objects and EDINET were not modified. Receipts and input are in `data/collection/buffer-repair.*`.

This is a PARTIAL repair, not a completed Buffer investigation. The other 29 evidence sources from the preceding bundle still require second-pass item inventories and reconciliation. The new reconciliation gate keeps unreviewed sources pending; a saved bundle is not proof of complete research. Prior receipts are historical and are not rewritten.

The Universal profile now names 91 required dimensions, and Make-Money extracts fields from nine current consumer type roots. Source item inventories must reconcile to saved values. Unknown/source-less observations remain eligible for intake. Only `ingest-complete` enforces completion; ordinary `ingest` deliberately retains partial findings.

Verification: 10 collection/reconciliation tests passed; `npx tsc --noEmit` passed. The prior comprehensive bundle fails the new audit. This does not guarantee that any AI discovers every source or inventories every fact honestly. Other projects require their own current-code field adapters.
