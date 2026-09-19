# R2 handoff queue

This directory contains validated Foundation-compatible candidates prepared from scheduled research artifacts.

Queue files must:
- reference their source automation run files;
- preserve evidence/source lineage;
- pass the current Foundation schema/quality rules;
- enrich existing entities instead of duplicating them;
- remain append-only.

The actual R2 writer records CREATE/IDENTICAL/CONFLICT/readback receipts separately.
