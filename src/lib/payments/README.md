# Payment entitlement

The public P&L/evidence remains free. PRO sells the twelve structural analyses;
checkout is a single JPY 1,980 founding pass, not a monthly subscription.

## Source of truth

- D1 `payment_events` is an append-only ledger of normalized Stripe facts.
  Apply `migrations/d1/0002_payments.sql` after `0001_users.sql`.
- A transactional D1 batch stores a purchase and any already observed refund or
  dispute together. `id` is the Stripe event ID (with a deterministic suffix for
  observations); its primary key makes retry delivery idempotent.
- Facts refer to individual charge/subscription IDs. Refunds arriving before a
  checkout remain associated with the charge; a later grant cannot erase them.
- Full refund revokes that purchase; partial refunds preserve access. An open or
  lost dispute suspends access. A won/closed dispute restores it unless refunded.
  Separate purchases are independent: refunding an old order cannot erase a new one.
- `authorizePro(request)` verifies Firebase UID and calls `getProEntitlement(uid)`.
  D1 must prove an owned purchase. Stripe's current charge/dispute status is then
  checked, so delayed refund webhooks cannot grant stale access. Provider/database
  failure returns 503; a local flag or `users.legacy_is_pro` never authorizes.
- Stripe test and live events are partitioned and the webhook rejects mode mismatch.
  No card details, raw webhook payloads, or customer email are stored in this ledger.

## Legacy reconciliation

Migrated `stripe_customer_id`/`stripe_subscription_id` are used only to retrieve
and verify existing Stripe records. Email matching is forbidden. An anonymous
historic session requires an existing server-stored customer binding and legacy
paid flag; a conflicting Stripe UID is rejected. Subscription access requires
an active current period, paid invoice, and unrefunded invoice charge. A separate
founding-pass purchase survives subscription cancellation.

## Webhook deployment

Subscribe the signed endpoint to `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `charge.refunded`,
`charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`,
`charge.dispute.funds_withdrawn`, `charge.dispute.funds_reinstated`,
`customer.subscription.updated`, and `customer.subscription.deleted`.
Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Firebase project configuration,
and the D1 `APP_DB` binding. Node verification can use the explicit D1 REST config.
Never mix test keys with live event fulfillment. Checkout refuses to start without
persistence and webhook configuration. `/success` only checks status; it never grants.

## Verification

`pnpm exec vitest run src/lib/payments` executes real SQLite migrations/transaction
rollback and actual Stripe webhook-signature verification, with provider calls
mocked. Cases cover anonymous/wrong UID, mode mismatch, partial/full refund before
and after completion, repurchase, duplicates, disputes, delayed payment, provider
failure, legacy subscriptions, and false legacy paid flags.

On 2026-09-11 a read-only inventory of the configured Stripe test account found
one unpaid anonymous checkout session and zero subscriptions. No real charge or
refund was created. Test-mode API availability does not prove deployed Firebase,
webhook delivery, or a production purchase; those require their own end-to-end proof.

Official behavior references: [Stripe webhook ordering and duplicates](https://docs.stripe.com/webhooks),
[charge refund amounts](https://docs.stripe.com/api/charges/object),
[dispute states](https://docs.stripe.com/api/disputes/object).

## Build success versus deployment readiness

A public-page build intentionally succeeds without authentication. In that case
no Firebase client is initialized and login/signup display a configuration error.
Set **all four at browser build time**: `NEXT_PUBLIC_FIREBASE_API_KEY`,
`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and
`NEXT_PUBLIC_FIREBASE_APP_ID`. The same project ID must be available to the server
JWT verifier. Firebase must enable the chosen Google/email providers and authorize
the deployed domain. Storage bucket/messaging sender values are optional here.

Production paid readiness additionally requires applied D1 migrations, reachable
`APP_DB`, matching live Stripe key/webhook secret, registered webhook event delivery,
and a verified authenticated purchase/status/refund path. A local green build,
SQLite tests, or the test-key read-only inventory is not evidence of these settings.
Secrets are never filled with mock values or created by this application.
