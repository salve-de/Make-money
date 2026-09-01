# Decision Log

## 2026-09-01 — Product definition

**Decision:** Success stories、money flows、demand、productsを一つのOpportunity graphへ統合する。

**Reason:** 既存サービスは各情報を分断して提供する。ユーザーの最終目的は事実を読むことではなく、自分が取れる次の機会を見つけることである。

## 2026-09-01 — Emotional objective

**Decision:** 「このサイトを見続ければ、自分も金脈を発見できるかもしれない」という可能性感覚を最上位体験に置く。

**Guardrail:** 必ず儲かると保証しない。可能性を先に見せ、数字の種類・Evidence・リスクを後段で明示する。

## 2026-09-01 — Database plus marketplace participation

**Decision:** Product ownerが自分のサービスを掲載・Claimできるようにする。

**Reason:** 閲覧者、Builder、Product owner、Buyerが同じデータへ別目的で参加でき、DB更新と流通の循環が生まれる。

## 2026-09-01 — Core loop

**Decision:** Money Signal → Opportunity → Demand → Product → Customer → new Money Signal を中心ループにする。

## 2026-09-01 — Trust separation

**Decision:** SponsoredとOrganic、FundingとRevenue、EstimateとActualを明示的に分離する。

## 2026-09-01 — MVP architecture

**Decision:** Next.js App Router + TypeScript + Supabase-ready architecture。外部キーなしでもデモ動作する。

**Reason:** まずUI・価値・継続行動を検証し、データ取得・認証・課金を段階追加する。
