# Make-money × SellRelay — Zero-Base Product Direction

Status: CURRENT CROSS-PROJECT POINTER  
Updated: 2026-09-17

The current zero-based product strategy for connecting Make-money and SellRelay is maintained in the SellRelay repository:

`salve-de/SellRelay/docs/ZERO_BASE_MONEY_PLATFORM_MASTER_PLAN.md`

Canonical URL:

`https://github.com/salve-de/SellRelay/blob/main/docs/ZERO_BASE_MONEY_PLATFORM_MASTER_PLAN.md`

## Short summary

The projects should not be treated as two unrelated products.

### Make-money

Role:

> **Discovery / Intelligence / Decision Engine**

It answers:

- What is making money?
- Who succeeded and how?
- What is growing?
- What can someone like me realistically do?
- What should I investigate next?

Its key future job is not only to store more cases, but to reduce uncertainty and compress decisions.

### SellRelay

Role:

> **Action / Distribution / Transaction / Verification Engine**

It supports four core user actions coming out of intelligence:

1. Explore similar opportunities
2. Promote an existing product and earn
3. List and sell an existing product
4. Build from an opportunity using a generated Build Spec and external builder, then return to SellRelay for distribution

## Shared long-term loop

```text
DISCOVER
↓
DECIDE
↓
BUILD / EARN / SELL
↓
DISTRIBUTE
↓
TRANSACT
↓
VERIFY
↓
LEARN
↓
DISCOVER BETTER
```

## Important architecture rule

Do not merge repositories/runtimes merely because the user experience is connected.

The preferred current model is:

> **One economic network externally, separate engines internally until evidence justifies deeper consolidation.**

Make-money should retain its intelligence/data strengths. SellRelay should own distribution, attribution, commission, payout and verified transaction outcomes.

The complete rationale, competitor analysis, user psychology derivation, Money Feed concept, four actions, Money Graph, solo-developer constraints, implementation phases, metrics and non-goals are maintained in the SellRelay master document above.