# Browser smoke

Run `pnpm exec playwright install chromium` once, then `pnpm build` and `pnpm test:e2e`.
The suite owns a production server on 127.0.0.1:3100 and refuses to reuse an unknown process.

The main smoke uses the existing checked-in Keyence entry through the real home page,
table, selection state, inspector, financial section, evidence section, and close keyboard
action. A second real dossier covers the hazard/loss presentation and dynamic evidence.
These tests assert checked-in content as rendering regression checks; they do not
independently verify the business claims. These two paths do not mock API responses.

One boundary failure test intercepts the businesses response with malformed Foundation
JSON and verifies it is rejected while the usable core company remains available.
An API test sends only an invalid strategy payload and requires HTTP 400, before
AI generation or database writes. No test routes or production fixture changes are used.
No R2, authentication, database, or payment credentials are needed in CI. Live R2
availability, authenticated billing, and remote data correctness are separate tests.
Failures retain screenshots and traces in test-results/ and playwright-report/.

Note regressions cover plain j/k/J/K outside fields and inside the analyst textarea,
persistence across reload, and continued button-based navigation. Isolated browser
contexts seed malformed note JSON (null, array, broken syntax, and a mixed valid/invalid
map), then verify rendering, exact recovery backup, retained valid notes, and edited
text after reload. No existing user browser storage is accessed.
