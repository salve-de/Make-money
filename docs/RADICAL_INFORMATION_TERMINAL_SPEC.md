# KIN-KOROKU Radical Information Terminal Specification

## 1. Outcome contract

### Mission

KIN-KOROKU is the starting point for discovering, comparing, and monitoring real money-making structures. It is not a startup course, aptitude test, or inspirational media site.

### User decision

After opening the product, a user must be able to answer:

1. Which opportunity or money flow deserves attention now?
2. Which numbers are public, payment-verified, estimated, or unknown?
3. What is the next useful action: inspect, compare, save, monitor, or obtain the execution asset?

### Non-negotiable truth conditions

- Every material number has a period, basis, source class, and last-checked date.
- Missing data is shown as missing. It is never replaced with a convenient default.
- Estimated data cannot use the visual language of audited or payment-verified data.
- Every visible action either works or is clearly marked unavailable.
- Private saves and notes never become public automatically.

## 2. Reference patterns and what we borrow

- Bloomberg Terminal: one workspace connecting news, data, analytics, monitoring, and execution; customizable monitors and alerts.
- PitchBook: broad universe, flexible screening, saved dynamic searches, static lists, alerts, profiles, and lifecycle workflows.
- S&P Capital IQ Pro: standardized financials, peer benchmarking, screening, dashboards, visualization, and defensible outputs.
- AlphaSense: cross-source search, filtering, exact evidence snippets, monitoring, and noise reduction.
- Similarweb / Koyfin / TradingView: persistent watchlists, custom dashboards, saved views, and alerts attached to the research object.
- Carbon Design System / Nielsen Norman Group: table-first workflows, explicit filter state, predictable sorting, progressive disclosure, and task-based information hierarchy.

We borrow the workflow and information architecture, not a superficial dark theme or a fixed two-pane layout.

## 2.1 Scale contract: 1,000-company universe

The next ingestion phase is expected to add approximately 1,000 companies. The product must therefore treat the current 22 records as a sample, not as the layout or query model.

- **RADAR never renders the whole universe.** It renders a freshness- and signal-ranked slice (target 12–24 rows) plus the total universe count.
- **EXPLORE owns the full universe.** Search, facets, sort, column visibility, saved views, and zero-result recovery must remain usable at 1,000+ records.
- **No eager dossier rendering.** A row renders summary fields only; financial history, source ledger, charts, and execution assets load when the dossier is opened.
- **The list must have a bounded rendering strategy.** Use server-side/query pagination or windowed rendering before the 1,000-company import is accepted. A single unbounded `map()` over every rich row is not an acceptance implementation.
- **Filter state is queryable and shareable.** Search text, facets, sort, page/cursor, and selected record belong to one URL-addressable state model.
- **Ingestion must be deduplicated and evidence-aware.** Each record needs a stable ID, canonical name, source class, source URL, checked date, coverage status, and update history so new collection does not create duplicate or unverifiable rows.
- **Performance acceptance.** Adding records must not increase the first-screen RADAR payload or visible row count. EXPLORE must preserve interaction responsiveness while filtering 1,000 records, and the mobile view must not become a horizontal spreadsheet.

The scale plan is intentionally split: RADAR answers “what deserves attention now?”, while EXPLORE answers “show me the complete universe under these constraints.”

## 3. Product information architecture

### RADAR — current money flows

The default landing surface. It shows what changed, what is unusually profitable, and why it matters now.

Required modules:

- freshness-ranked money-flow feed
- change reason and timestamp
- source-status distribution
- high-signal opportunity table
- quick filters grounded in money constraints
- saved-monitor changes

### EXPLORE — complete opportunity universe

The searchable and comparable dataset. It is the primary route for finding a needle in the full universe.

Required capabilities:

- full-text search
- multi-axis filtering
- column sorting and visibility
- result counts per facet
- saved searches
- watchlist addition
- shareable URL state
- zero-result relaxation suggestions

### DOSSIER — evidence-first investigation

The detail view for one opportunity or company.

Required order:

1. conclusion and money model
2. normalized financial metrics
3. source and confidence ledger
4. customer, pricing, acquisition, and operating mechanics
5. moat and failure conditions
6. comparable opportunities
7. execution assets and monetization boundary

### WORKBENCH — private action surface

The user's saved opportunities, saved searches, comparisons, notes, alerts, and unlocked assets.

## 4. Navigation and responsive behavior

### Desktop

- persistent utility navigation
- workspace-specific toolbar
- table or feed receives the largest area
- dossier opens as a route or inspector depending on task
- no layout is sacred; the current task determines the split

### Mobile

- RADAR, EXPLORE, WORKBENCH are the primary bottom-navigation destinations
- complex filters open in a bottom sheet and use explicit Apply
- dossiers become a single vertical reading flow with sticky evidence header
- no horizontal scrolling for primary actions or key metrics
- dense tables collapse into labeled rows with a consistent “more metrics” disclosure

## 5. Visual and interaction rules

- neutral graphite/white foundation; one semantic accent per state
- no decorative gradient, oversized hero, or repeated marketing card
- use hairline rules, aligned columns, tabular numerals, and short labels
- no more than one primary action per region
- status always includes text, not color alone
- focus is visible and never hidden behind sticky UI
- targets are touch-safe; compact controls must have spacing or an equivalent larger control
- search and filters retain state in URL and browser history
- simple filters can update instantly; multi-axis filters use Apply
- table sorting lives in column headers; global actions live in the table toolbar
- advanced detail is progressively disclosed, but the path to it is obvious
- primary surfaces do not spend space on instructional paragraphs; data labels, familiar icons, column alignment, and state changes carry the meaning
- desktop, compact desktop, and mobile are separate compositions: do not merely shrink the desktop canvas
- at compact widths, lower-priority columns collapse before the main action becomes unreachable
- on mobile, a record becomes a labeled vertical row and the primary action stays in the first viewport

## 6. Data contract for evidence

Every surfaced metric should converge on:

```ts
type EvidenceClass = 'AUDITED_PUBLIC' | 'VERIFIED_PAYMENT' | 'ESTIMATED_MODEL' | 'UNAVAILABLE';

interface EvidenceMetric {
  value: number | null;
  unit: 'JPY' | 'PERCENT' | 'COUNT' | 'HOURS';
  period: string | null;
  evidenceClass: EvidenceClass;
  sourceLabel: string | null;
  sourceUrl: string | null;
  checkedAt: string | null;
  methodNote: string | null;
}
```

Display rules:

- never call a mixed set “実査済み”
- never infer a monthly figure without showing “年商÷12換算”
- never present a placeholder as a metric
- show the evidence class next to the value at the point of decision

## 7. Function inventory decision

### Keep and integrate

- terminal company universe
- financial dossier
- multidimensional screening
- evidence badges
- company and opportunity search
- bookmarks API
- authenticated PRO access
- source-backed newsletter, only when subscriber data is real

### Merge into the new architecture

- PORTAL + market signals + collections + leaderboard -> RADAR modules and saved views
- TERMINAL + company detail -> EXPLORE and DOSSIER
- FINDER + resource diagnosis -> EXPLORE constraint presets, not a separate aptitude product
- IDEAS_VAULT -> WORKBENCH opportunity records
- live ticker -> timestamped change feed and alerts

### Remove or defer

- static subscriber and traction claims without a source
- fake submission success paths
- duplicate `/finder` state and modal flow
- unexplained PRO gates
- primary CTAs that promise a result but do not execute it
- seven-day homework as the product's main value proposition
- three-question / three-result aptitude framing

## 8. Implementation sequence

1. Create shared evidence, navigation, filter, and saved-item contracts.
2. Replace the default PORTAL with RADAR and prove the first-screen hierarchy.
3. Consolidate EXPLORE and DOSSIER around one URL-addressable state model.
4. Replace FINDER and IDEAS_VAULT with integrated constraint and workbench views.
5. Connect bookmarks and alerts to persisted user state.
6. Remove or quarantine legacy routes and dead components.
7. Test desktop and mobile task flows with real data and empty/error states.

## 9. Acceptance gates

- At a glance, a user can identify the top current signal and its evidence class.
- A user can filter the universe, see the result count, and recover from zero results.
- A user can open a dossier and trace each headline number to its evidence.
- A user can save an opportunity, reload, and find it in WORKBENCH.
- A user can return to a URL and recover the same view, filters, sort, and selected item.
- No visible button is dead, misleading, or merely decorative.
- Mobile primary actions work without horizontal scrolling.
- TypeScript passes; changed-file lint has zero errors; browser checks cover anonymous, empty, reload, and keyboard flows.

## References

- https://professional.bloomberg.com/products/bloomberg-terminal/
- https://pitchbook.com/products
- https://www.spglobal.com/market-intelligence/en/solutions/products/sp-capital-iq-pro
- https://www.alpha-sense.com/solutions/market-intelligence-platform/
- https://www.similarweb.com/corp/knowledge-center/
- https://carbondesignsystem.com/components/data-table/usage/
- https://carbondesignsystem.com/patterns/filtering/
- https://www.nngroup.com/articles/applying-filters/
- https://www.nngroup.com/articles/progressive-disclosure/
- https://www.w3.org/TR/WCAG22/
