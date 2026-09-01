-- GOLDMINE RADAR production data model
-- This migration is intentionally self-contained and idempotent at the table/type level.
-- Paid promotions are stored separately and are never joined into organic_ranked_opportunities.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  display_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('member','editor','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('editor','admin')
  );
$$;

create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('person','company','government','fund','community','other')),
  slug text not null unique,
  name text not null,
  summary text,
  website_url text,
  country_code text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  title text,
  publisher text,
  source_kind text not null default 'secondary' check (source_kind in ('primary','secondary','user_submitted')),
  evidence_grade text not null default 'D' check (evidence_grade in ('A','B','C','D')),
  published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  license_notes text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','stale')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  owner_entity_id uuid references public.entities(id) on delete set null,
  submitted_by uuid references public.profiles(id) on delete set null,
  name text not null,
  one_liner text not null,
  description text,
  url text not null unique,
  audience text,
  pricing text,
  business_model text,
  category text,
  regions text[] not null default '{}',
  languages text[] not null default '{}',
  intents text[] not null default '{}',
  trust_level text not null default 'unverified' check (trust_level in ('unverified','owner_verified','basic_verified','metrics_connected','evidence_verified','audited')),
  status text not null default 'pending' check (status in ('pending','published','rejected','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.money_signals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  payer_entity_id uuid references public.entities(id) on delete set null,
  receiver_entity_id uuid references public.entities(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  signal_type text not null check (signal_type in ('revenue','profit','mrr','arr','gmv','funding','contract_ceiling','actual_spend','acquisition','asking_price','estimated_revenue','demand_growth','price','other')),
  amount_numeric numeric(24,4),
  currency text,
  amount_display text not null,
  amount_period text,
  metric_start date,
  metric_end date,
  occurred_at timestamptz,
  headline text not null,
  summary text,
  evidence_grade text not null default 'D' check (evidence_grade in ('A','B','C','D')),
  confidence numeric(5,2) check (confidence is null or (confidence >= 0 and confidence <= 100)),
  status text not null default 'draft' check (status in ('draft','published','rejected','stale','archived')),
  created_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.signal_sources (
  signal_id uuid not null references public.money_signals(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  claim_text text,
  locator text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (signal_id, source_id)
);

create table if not exists public.demands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  payer_segment text,
  problem text not null,
  willingness_to_pay text,
  geography text,
  evidence_grade text not null default 'D' check (evidence_grade in ('A','B','C','D')),
  status text not null default 'draft' check (status in ('draft','published','rejected','stale','archived')),
  created_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demand_sources (
  demand_id uuid not null references public.demands(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  claim_text text,
  locator text,
  created_at timestamptz not null default now(),
  primary key (demand_id, source_id)
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  hook text not null,
  category text,
  why_now text not null,
  buyer text,
  revenue_model text,
  team_min integer check (team_min is null or team_min >= 1),
  team_max integer check (team_max is null or team_max >= team_min),
  starting_cost_numeric numeric(18,2),
  starting_cost_currency text,
  starting_cost_display text,
  time_to_validate_days integer check (time_to_validate_days is null or time_to_validate_days >= 0),
  entry_routes jsonb not null default '[]'::jsonb,
  acquisition_channels jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  next_steps jsonb not null default '[]'::jsonb,
  momentum_score numeric(5,2) not null default 0 check (momentum_score between 0 and 100),
  accessibility_score numeric(5,2) not null default 0 check (accessibility_score between 0 and 100),
  evidence_score numeric(5,2) not null default 0 check (evidence_score between 0 and 100),
  competition_score numeric(5,2) not null default 0 check (competition_score between 0 and 100),
  verdict text not null default 'observe' check (verdict in ('observe','validate','enter','avoid')),
  status text not null default 'draft' check (status in ('draft','published','rejected','stale','archived')),
  created_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunity_signals (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  signal_id uuid not null references public.money_signals(id) on delete cascade,
  relation text not null default 'supports' check (relation in ('supports','contradicts','context')),
  primary key (opportunity_id, signal_id)
);

create table if not exists public.opportunity_demands (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  demand_id uuid not null references public.demands(id) on delete cascade,
  primary key (opportunity_id, demand_id)
);

create table if not exists public.opportunity_products (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  relation text not null default 'existing_solution' check (relation in ('existing_solution','complement','substitute','new_entry')),
  primary key (opportunity_id, product_id)
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  kind text not null check (kind in ('want','would_pay','build','watch','save','too_crowded')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id, kind)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  submission_type text not null default 'product' check (submission_type in ('product','money_signal','demand','correction')),
  submitter_id uuid references public.profiles(id) on delete set null,
  contact_email text,
  submitted_url text,
  payload jsonb not null default '{}'::jsonb,
  dedup_key text,
  status text not null default 'pending' check (status in ('pending','in_review','needs_changes','approved','rejected','spam')),
  moderation_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists submissions_open_dedup_idx
  on public.submissions(dedup_key)
  where dedup_key is not null and status in ('pending','in_review','needs_changes');

create table if not exists public.product_claims (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  claimant_id uuid not null references public.profiles(id) on delete cascade,
  method text not null check (method in ('domain_email','dns_txt','html_meta','manual')),
  challenge_hash text,
  status text not null default 'pending' check (status in ('pending','verified','expired','rejected','revoked')),
  expires_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, claimant_id, method)
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  placement text not null,
  disclosure_label text not null default 'プロモーション',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','scheduled','active','paused','ended','rejected')),
  budget_numeric numeric(18,2),
  currency text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.analytics_events (
  id bigint generated by default as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text,
  event_name text not null,
  object_type text,
  object_id uuid,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  subject_type text not null,
  subject_id uuid not null,
  action text not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

-- The organic view deliberately has no join to public.promotions.
create or replace view public.organic_ranked_opportunities
with (security_invoker = true)
as
select
  o.*,
  round(
    o.evidence_score * 0.30
    + o.momentum_score * 0.25
    + o.accessibility_score * 0.25
    + (100 - o.competition_score) * 0.10
    + least(coalesce(r.quality_reactions, 0), 100) * 0.10,
    2
  ) as organic_score,
  coalesce(r.save_count, 0) as save_count,
  coalesce(r.want_count, 0) as want_count,
  coalesce(r.build_count, 0) as build_count
from public.opportunities o
left join (
  select
    opportunity_id,
    count(*) filter (where active and kind in ('save','want','would_pay','build')) as quality_reactions,
    count(*) filter (where active and kind = 'save') as save_count,
    count(*) filter (where active and kind in ('want','would_pay')) as want_count,
    count(*) filter (where active and kind = 'build') as build_count
  from public.reactions
  group by opportunity_id
) r on r.opportunity_id = o.id
where o.status = 'published';

comment on view public.organic_ranked_opportunities is
'Organic ranking only. Promotions are intentionally excluded and must be rendered in a separately disclosed surface.';

create or replace view public.active_promotions
with (security_invoker = true)
as
select p.*, pr.name as product_name, pr.slug as product_slug
from public.promotions p
join public.products pr on pr.id = p.product_id
where p.status = 'active'
  and p.starts_at <= now()
  and p.ends_at > now()
  and pr.status = 'published';

-- Updated-at triggers
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles','entities','sources','products','money_signals','demands',
    'opportunities','reactions','submissions','product_claims','promotions'
  ] LOOP
    EXECUTE format('drop trigger if exists set_updated_at on public.%I', table_name);
    EXECUTE format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
  END LOOP;
END $$;

-- Row-level security
alter table public.profiles enable row level security;
alter table public.entities enable row level security;
alter table public.sources enable row level security;
alter table public.products enable row level security;
alter table public.money_signals enable row level security;
alter table public.signal_sources enable row level security;
alter table public.demands enable row level security;
alter table public.demand_sources enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_signals enable row level security;
alter table public.opportunity_demands enable row level security;
alter table public.opportunity_products enable row level security;
alter table public.reactions enable row level security;
alter table public.submissions enable row level security;
alter table public.product_claims enable row level security;
alter table public.promotions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.moderation_actions enable row level security;

-- Idempotent policy reset.
drop policy if exists profiles_read_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_read_own on public.profiles for select to authenticated using (id = auth.uid() or public.is_editor());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Public published content.
drop policy if exists entities_public_read on public.entities;
create policy entities_public_read on public.entities for select to anon, authenticated using (status = 'published' or public.is_editor());
drop policy if exists sources_public_read on public.sources;
create policy sources_public_read on public.sources for select to anon, authenticated using (status = 'accepted' or public.is_editor());
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select to anon, authenticated using (status = 'published' or public.is_editor());
drop policy if exists signals_public_read on public.money_signals;
create policy signals_public_read on public.money_signals for select to anon, authenticated using (status = 'published' or public.is_editor());
drop policy if exists demands_public_read on public.demands;
create policy demands_public_read on public.demands for select to anon, authenticated using (status = 'published' or public.is_editor());
drop policy if exists opportunities_public_read on public.opportunities;
create policy opportunities_public_read on public.opportunities for select to anon, authenticated using (status = 'published' or public.is_editor());

drop policy if exists signal_sources_public_read on public.signal_sources;
create policy signal_sources_public_read on public.signal_sources for select to anon, authenticated using (
  exists (select 1 from public.money_signals m where m.id = signal_id and m.status = 'published')
  and exists (select 1 from public.sources s where s.id = source_id and s.status = 'accepted')
  or public.is_editor()
);
drop policy if exists demand_sources_public_read on public.demand_sources;
create policy demand_sources_public_read on public.demand_sources for select to anon, authenticated using (
  exists (select 1 from public.demands d where d.id = demand_id and d.status = 'published')
  and exists (select 1 from public.sources s where s.id = source_id and s.status = 'accepted')
  or public.is_editor()
);
drop policy if exists opportunity_signals_public_read on public.opportunity_signals;
create policy opportunity_signals_public_read on public.opportunity_signals for select to anon, authenticated using (
  exists (select 1 from public.opportunities o where o.id = opportunity_id and o.status = 'published') or public.is_editor()
);
drop policy if exists opportunity_demands_public_read on public.opportunity_demands;
create policy opportunity_demands_public_read on public.opportunity_demands for select to anon, authenticated using (
  exists (select 1 from public.opportunities o where o.id = opportunity_id and o.status = 'published') or public.is_editor()
);
drop policy if exists opportunity_products_public_read on public.opportunity_products;
create policy opportunity_products_public_read on public.opportunity_products for select to anon, authenticated using (
  exists (select 1 from public.opportunities o where o.id = opportunity_id and o.status = 'published') or public.is_editor()
);

-- Users own their reactions.
drop policy if exists reactions_read_own on public.reactions;
drop policy if exists reactions_insert_own on public.reactions;
drop policy if exists reactions_update_own on public.reactions;
drop policy if exists reactions_delete_own on public.reactions;
create policy reactions_read_own on public.reactions for select to authenticated using (user_id = auth.uid() or public.is_editor());
create policy reactions_insert_own on public.reactions for insert to authenticated with check (user_id = auth.uid());
create policy reactions_update_own on public.reactions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reactions_delete_own on public.reactions for delete to authenticated using (user_id = auth.uid());

-- Anyone may submit through the controlled API; only owners/editors may read.
drop policy if exists submissions_insert_public on public.submissions;
drop policy if exists submissions_read_own on public.submissions;
create policy submissions_insert_public on public.submissions for insert to anon, authenticated with check (submitter_id is null or submitter_id = auth.uid());
create policy submissions_read_own on public.submissions for select to authenticated using (submitter_id = auth.uid() or public.is_editor());

-- Authenticated users may create and inspect their own claim challenges.
drop policy if exists claims_read_own on public.product_claims;
drop policy if exists claims_insert_own on public.product_claims;
create policy claims_read_own on public.product_claims for select to authenticated using (claimant_id = auth.uid() or public.is_editor());
create policy claims_insert_own on public.product_claims for insert to authenticated with check (claimant_id = auth.uid());

-- Promotions are readable only when active; writes remain server/editor only.
drop policy if exists promotions_public_read on public.promotions;
create policy promotions_public_read on public.promotions for select to anon, authenticated using (
  (status = 'active' and starts_at <= now() and ends_at > now()) or public.is_editor()
);

-- Editors manage reviewed content. Service-role also bypasses RLS.
DO $$
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'entities','sources','products','money_signals','signal_sources','demands','demand_sources',
    'opportunities','opportunity_signals','opportunity_demands','opportunity_products',
    'submissions','product_claims','promotions','moderation_actions'
  ] LOOP
    policy_name := table_name || '_editor_all';
    EXECUTE format('drop policy if exists %I on public.%I', policy_name, table_name);
    EXECUTE format('create policy %I on public.%I for all to authenticated using (public.is_editor()) with check (public.is_editor())', policy_name, table_name);
  END LOOP;
END $$;

create index if not exists money_signals_status_published_idx on public.money_signals(status, published_at desc);
create index if not exists opportunities_status_score_idx on public.opportunities(status, momentum_score desc, evidence_score desc);
create index if not exists products_status_category_idx on public.products(status, category);
create index if not exists reactions_opportunity_active_idx on public.reactions(opportunity_id, kind) where active;
create index if not exists submissions_status_created_idx on public.submissions(status, created_at);
create index if not exists promotions_window_idx on public.promotions(status, starts_at, ends_at);
create index if not exists analytics_object_idx on public.analytics_events(object_type, object_id, occurred_at desc);

revoke all on public.analytics_events from anon, authenticated;
revoke all on public.moderation_actions from anon;

comment on table public.submissions is 'Untrusted intake. A submission never becomes public content without moderation.';
comment on table public.promotions is 'Paid distribution only. Must never alter organic opportunity scores.';
comment on column public.money_signals.signal_type is 'Do not conflate revenue, profit, funding, GMV, contract ceilings, or estimates.';
