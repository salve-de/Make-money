# Content and Data Standard

## Purpose

Every published page must deliver both:

1. **possibility** — why this could matter to the user
2. **truth** — what is known, estimated, inferred, stale, or unknown

A dramatic number without its meaning destroys trust. A perfectly sourced record without a usable implication does not create product value.

## Record types

### Money Signal

Required fields:

- headline
- payer
- recipient
- amount display
- amount type
- currency where relevant
- measured period
- event date
- source
- retrieval date
- evidence grade
- status
- factual summary

Forbidden combinations:

- show funding as revenue
- show GMV as company income
- show contract ceiling as actual government spend
- show asking price as transaction price
- show third-party estimate as confirmed result

### Demand

Required fields:

- specific buyer or user group
- problem or desired outcome
- evidence source
- geography/context
- evidence grade
- what is still unknown

Site reactions are directional internal evidence. They are not population-level market size.

### Opportunity

Required fields:

- linked Money Signal
- linked Demand or explicit demand gap
- title and hook
- why now
- buyer
- revenue model
- remaining entry routes
- acquisition route
- starting constraints
- risks
- next validation steps
- editor judgement and date

An Opportunity page separates:

- **source fact**
- **editor interpretation**
- **AI-assisted draft**
- **user-submitted claim**

### Product / Service

Required fields:

- canonical URL
- service name
- one-line value
- intended customer
- price or `not public`
- category
- region/language
- current Intent
- owner verification level
- submission and review state

## Editorial structure

Display order:

1. surprising concrete value
2. who achieved/received it
3. team, capital, time, distribution context
4. mechanism that generated payment
5. unmet portion
6. realistic entry routes
7. evidence
8. risks
9. next seven-day checks

This order creates motivation without hiding constraints.

## Opportunity decision labels

- **Observe:** signal exists; actionability is weak or uncertain
- **Validate:** enough evidence to run customer/research tests
- **Enter:** evidence, distribution, and access are unusually strong
- **Avoid:** adverse economics, saturation, legal risk, or data dependency dominate

No label means guaranteed profit.

## Evidence review checklist

- Is the source the closest available primary source?
- Does the date still represent the current state?
- Does the cited location support the exact claim?
- Is the denominator visible?
- Is the number concentrated in an outlier?
- Is the amount gross, net, recurring, one-time, estimated, or maximum?
- Does the opportunity remain open, or is it merely a historical success?
- Can an unknown individual realistically reach buyers?
- What would falsify the opportunity?

## Staleness

Suggested review cadence:

- prices: 30 days
- product status: 30–60 days
- active demand/trends: 30 days
- private-company self-reported revenue: 90 days
- government contracts: event-driven plus quarterly review
- statutory filings: new filing/event
- laws and program rules: event-driven and before recommendation

A stale record remains searchable only with a visible stale marker. It should not rank as a current Opportunity.

## Corrections

Corrections must preserve:

- previous value
- corrected value
- reason
- source
- reviewer
- timestamp
- materiality

Material corrections trigger re-scoring and notifications to users who saved/watched the record.

## DEMO policy

DEMO data:

- must use fictional names or clearly fictionalized examples
- must display `DEMO`
- must not be indexed as real company or market facts
- must be removed or separated before production indexing
- must never be reused in marketing as achieved results

## Initial curation target

Before public launch, curate 50–100 high-quality records in a narrow initial scope:

- Micro SaaS
- browser extensions
- Shopify/WordPress apps
- subscription apps
- developer tools
- niche databases/directories
- small web-business acquisitions

Quality is more important than record count. Each published Opportunity must be able to answer: **who paid, why they paid, why now, and what entry remains.**
