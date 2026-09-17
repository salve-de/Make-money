# PR20 deterministic visual inputs

The visual comparison is a differential test, not a set of screenshots captured from HEAD.

- Original BASE plus a pinned type-compatibility patch produces references; HEAD is forbidden to update them.
- Both servers use the same frozen clock. Browser and SSR timezone are Asia/Tokyo.
- Both revisions use the same browser origin, `https://makemoney-app.pages.dev`. Playwright intercepts every request and fetches bytes from the appropriate loopback-only BASE/HEAD server. It never contacts the deployed site. This avoids testing differing development port numbers as if they were a product layout difference. Unknown external requests are blocked.
- The same `makemoney_partner_id=p_pr20test` local-storage fixture is seeded for both. The rendered referral link is asserted explicitly, not masked.
- Catalog responses are fixed to the same valid local fallback. Checked-in business data must remain unchanged.
- CSS animations/transitions are disabled; the JS-driven ticker transform is fixed to its initial frame identically on both revisions. No financial text or panel is hidden.
- Pixel tolerance remains zero; runtime errors remain failures. Reference preparation, test inputs, images and source SHAs are recorded in artifacts.

A separate normal E2E test visits the actual noncanonical local host and verifies partner-link hydration without errors, retained IDs, and correct current-origin links. The old partner component read window.location during its first client render, which did not match its SSR fallback; the fix delays that browser-specific read until after hydration. The visual reference itself is not modified for this fix: the original component is compared on its declared canonical origin where its initial SSR/client outputs agree.
