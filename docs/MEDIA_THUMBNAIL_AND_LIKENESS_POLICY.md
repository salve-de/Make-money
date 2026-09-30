# Media / Thumbnail / Likeness Publication Policy

Updated: 2026-09-30 JST

Canonical control-plane policy: `salve-de/universal-foundation/docs/MEDIA_THUMBNAIL_AND_LIKENESS_POLICY.md`.
Canonical per-asset schema: `salve-de/universal-foundation/schemas/foundation/media-use-decision.v1.schema.json`.

## Make-Money consumer rule

Make-Money must not reduce media rights to a single source-wide allow/deny flag. The same asset can be usable for one limited purpose and unusable for another.

### Facts first

Verified factual propositions and numbers should normally be rendered in Make-Money's own wording/structure. Do not require an open-content licence merely because a fact came from a public page. Copyright in source expression/media, access terms, database rights, privacy/personality/publicity and trademarks remain separate checks.

### Media use bases

A public media item needs one recorded use basis:
- explicit licence / press-kit / brand permission;
- official platform/API/embed terms;
- consent;
- public domain/open licence;
- jurisdiction-specific statutory exception;
- case-specific fair-use review;
- otherwise internal/reference only.

### Japan Article 47-5

For Japan-scoped search/information-result UI, a small image thumbnail may be eligible under Copyright Act Article 47-5 when it is genuinely incidental to computerized information search/analysis and result provision, remains minor in amount/resolution, is not drawn from a source known to be infringing, and does not unreasonably harm the copyright owner's market/interests.

This is a use-specific basis, not a blanket media licence. Do not use the same rationale for large hero images, galleries, downloadable/full-resolution copies, ad creative or decorative photography. Article 47-4 is primarily a technical/internal computer-use basis, not the normal authority for user-facing media.

### People / faces

A founder/operator photo is not automatically forbidden. Review copyright in the photo, portrait/privacy/personality interests, publicity rights, personal-information handling and source/platform terms.

Prefer official media-kit/press photos with permission or a qualifying small contextual thumbnail. Do not use a person's face as clickbait, decorative advertising or a commercial endorsement signal without a separate basis. Private persons, minors and sensitive-context images default to no public display.

### App icons

Preferred order:
1. developer/company media kit;
2. official platform/API promotional terms;
3. Japan Article 47-5 thumbnail candidate when the UI/use qualifies;
4. metadata/link only.

Apple's iTunes Search API expressly permits promotional content from the API, including App icons, to promote store content subject to its conditions. Do not generalize that to arbitrary App Store screenshots or to Google Play assets.

### App-store screenshots

Third-party screenshots default to metadata/link only. Public screenshot display needs explicit licence/platform terms/embed or a separately reviewed statutory basis. A reduced Japan search-result screenshot may be evaluated under Article 47-5; a screenshot gallery or product-tour substitute may not rely on that shortcut.

### International

- US: search thumbnails can be fair use on particular facts (Perfect 10 v. Amazon), but this is case-specific; keep a four-factor review and separate state publicity/privacy review for faces.
- EU: DSM Directive Articles 3-4 support specified TDM copying/extraction, not a general public-image republication right. Prefer licence/platform embed/link for public media.
- Do not treat a Japan Article 47-5 decision as worldwide permission.

## Required media record

For every collected media candidate keep asset/source URL, media type, case/entity, intended use, jurisdiction, use basis, attribution, rights/terms URL and review date, person/likeness flag and review, trademark/association flag, and final decision: allowed / conditional / internal_only / blocked / pending.

Until runtime supports this record end-to-end, media remains fail-closed for automatic publication; facts can still publish independently when their own gate passes.
