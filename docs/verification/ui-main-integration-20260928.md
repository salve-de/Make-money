# Approved UI integration — 2026-09-28

## Scope and preservation

Adopt the approved dark, compact UI from `codex/ui-trust-redesign`, based on `48fd109d`, onto remote main `221d0e4e`. User explicitly requested local and GitHub replacement with legacy-only substantive sections integrated into the new design.

Original worktrees are preserved. Primary and redesign dirty-file archives, patches and status were captured outside the repository at `/Users/satoushinya/.codex/backups/make-money-ui-promotion-20260928`. Collection data, raw captures, collection-policy edits and deployment configuration are not part of this UI commit.

## Section accounting

| Area | Disposition |
| --- | --- |
| Company overview / lead / customers / pricing | Preserve new summary cards; remove financial-availability gate that hid nonfinancial information |
| Related dossier / market pattern navigation | Restore compact related-research cards without unsupported promotional numeric badges |
| Source documents | Preserve URLs and restore document names / dates / source notes behind compact disclosure |
| Archetypes | Restore record-specific narrative, initial acquisition, tools and real entity navigation within approved cards |
| Playbook current waves | Restore record-driven background, shelf life, steps, reference cases; unknown guide IDs remain accessible |
| Playbook risk patterns | Restore mechanism, warning signs, responses and dated shelf-life changes |
| Tool radar | Keep researched product guides; unknown tools get data-driven cards instead of being discarded |
| Radar opportunity | Preserve substantive plans already restored in approved UI; do not revive unsupported company-to-number claims |
| Radar landmine | Restore record-driven mechanisms, examples and response; support records without a static guide |
| Execution detail | Restore source-case context inside disclosure rather than the old oversized sidebar |
| Synthesis | Merge loaded details, request saved IDs beyond current list, retain compact detail expansion and notes |
| Latest main data features | Keep structured observations, publication rights / public fact safeguards, detail routing, continuation and retry |
| Discover / intelligence / registry / success | Preserve real search, filtering, details and action behavior |
| Builder | Preserve real project workspace; keep example landing redirected to Synthesis |
| Partners / marketing noise | Do not restore explicitly rejected nonfunctional referral claims, oversized hero text or fabricated example flow |

## Verification

Local checks: full Vitest 114 files / 810 tests passed; `pnpm test` also passed Foundation, architecture and recovery checks before the final two added regression tests. `pnpm typecheck` including generated-schema comparison passed. `pnpm build` including lint, architecture gates, production compilation and paid-client-bundle check passed. Started the generated standalone server on 127.0.0.1:3012, observed Ready, then stopped it and confirmed no listener remains. This is startup evidence, not visual/browser acceptance.

Additional integration fixes restore tablet navigation at 768–1279px, browser Back workspace reset and source-link inspector opening. Updated browser-test selectors to the approved compact UI without restoring removed hero/marketing text. Remote CI is required before main promotion. Local live-browser verification is unavailable due the earlier explicit browser security refusal; no alternate browser/network workaround was used. Offline rendering, type/lint/build checks and standard repository CI remain separate evidence. GitHub update does not imply production deployment or full data enrichment.

CI identified a stale generated discovery artifact reference after projection changes. Regenerated `data/catalog-release.json`: only discovery hash/key changed; source hash, 3,341 source records, 3,085 published records and dossier hashes are unchanged. Generated artifacts remain local; R2 publication and deployment were not performed. A future deployment must publish the prepared catalog artifacts first.
