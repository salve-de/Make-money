# PR20 verification scope

## Exact equivalence versus deliberate defect repairs

The visual job compares the original base plus a pinned type-compatibility patch against HEAD, in the same runner/browser/font environment. BASE alone creates reference images; HEAD updates are forbidden, and any pixel difference fails. The report includes both SHAs, business-index hash, baseline preparation patch, images and failure traces. The comparison uses isolated local servers with the same Date clock and timezone and identical public API fixtures. Those clock overrides are test harness code, not application imports or deployment changes.

Normal reference screens are required to match. This is not proof of equivalence for every user, responsive width, API response or future browser.

The following changes intentionally repair incorrect behavior and must not be dismissed because a baseline used to behave incorrectly:
- Restored filters and URL state select the correct rows instead of ignoring requested conditions.
- Approval updates appear only after complete persistence acknowledgement; failures are visible and do not pretend the data was saved.
- A revenue-only entity with unconfirmed costs/profit retains its known revenue and displays unknown values explicitly instead of drawing a fictitious profit/cost graph. Normal complete and wholly unavailable financial displays retain their established presentation.
- Chart resources are disposed when their canvas is replaced, and recovered cleanly on tab changes.

## Browser contract migration

The base branch had already replaced the old thirteen-section, three-toggle inspector with LEDGER/AUDIT tabs. Existing E2E selectors referring to removed UI controls are updated to current controls. Numerical assertions, missing-data honesty, entity selection, note persistence, corrupted local-storage recovery, paid-data refusal and evidence availability remain tested. Tests must not be deleted merely to obtain green CI.

## Evidence status

Only completed runs against their recorded source SHA count as verification. A successful build on an earlier SHA does not certify a later commit. All source-mutating repair workflows and one-off codemods have been removed; regular Quality and read-only PR20 visual workflows perform final verification. No merge, deployment or production-data mutation is part of this repair.
