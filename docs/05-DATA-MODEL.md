# Data Model

## 1. Core graph

```text
Entity ──owns──> Product
Entity ──caused/received──> MoneySignal
MoneySignal ──supports──> Opportunity
Demand ──supports──> Opportunity
Product ──serves──> Demand
Product ──competes-in──> Opportunity
Evidence ──verifies──> MoneySignal / Product / Demand / Opportunity
User ──reacts/saves/follows──> all major objects
Product ──declares──> Intent
```

## 2. MoneySignal

Minimum fields:

- id, slug, title, summary
- signal_type
- amount_value, currency, amount_period
- amount_kind
- occurred_at, published_at, observed_at
- payer_entity_id, receiver_entity_id
- source_confidence
- evidence_status
- geography, categories
- is_demo

### amount_kind enum

- revenue
- profit
- mrr
- arr
- gmv
- funding
- contract_award
- contract_ceiling
- actual_spend
- acquisition_price
- asking_price
- estimated_revenue
- customer_spend
- market_size

異なるamount_kindは同一ランキングで無条件比較しない。

## 3. Opportunity

- id, slug, title, thesis
- status: observe / validate / enter / avoid
- horizon: now / 3m / 12m / long-term
- opportunity_type
- why_now
- buyer
- unmet_need
- entry_paths
- competition_level
- addressability
- evidence_score
- freshness_score
- demand_score
- momentum_score
- risk_score
- min_budget, min_time_weeks, team_size
- geographies, skills, categories

## 4. Product

- id, slug, name, url
- tagline, description
- target_customer
- problem_statement
- pricing_model, price_from
- stage
- owner_entity_id
- owner_claimed_at
- verification_level
- intent_types
- languages, geographies
- categories
- affiliate_url optional
- sponsored_state

## 5. Demand

- id, title, problem_statement
- who_has_problem
- current_workaround
- willingness_to_pay_range
- geography
- evidence_status
- internal_want_count
- internal_pay_count
- search_count
- categories

## 6. Evidence

- id, url, source_name
- source_type
- published_at, checked_at
- claim_text
- supports_object_type, supports_object_id
- confidence
- archived_url optional
- reviewer_id
- correction_status

### source_type enum

- official_filing
- government_data
- company_announcement
- owner_connected_metric
- owner_statement
- marketplace_verified
- reputable_third_party
- modeled_estimate
- community_submission
- rumor

## 7. Verification levels

1. unverified
2. owner_claimed
3. identity_verified
4. basic_info_verified
5. metric_connected
6. evidence_reviewed
7. audited

## 8. User events

- view
- open_detail
- save
- follow
- interesting
- profitable
- buildable
- want
- willing_to_pay
- outbound_click
- inquiry
- submit
- correction

この行動は単なるEngagementではなく、DemandとRecommendationの学習データになる。

## 9. Privacy

- 非公開売上の正確な金額を強制しない。帯域表示を許可する。
- 閲覧者の個人特定可能な行動を外部販売しない。
- Buyer Intentは集計・同意・法人契約の範囲で提供する。
- 削除、エクスポート、公開範囲の管理を設計に含める。
