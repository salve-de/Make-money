-- GOLDMINE RADAR initial production schema
-- Target: Supabase PostgreSQL

begin;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  role text not null default 'member' check (role in ('member', 'researcher', 'vendor', 'moderator', 'admin')),
  skills text[] not null default '{}',
  preferred_categories text[] not null default '{}',
  preferences jsonb not null default '{}'::jsonb,
  trust_score integer not null default 0 check (trust_score between 0 and 100),
  early_finder_score integer not null default 0 check (early_finder_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator', 'admin')
  );
$$;

create table if not exists public.categories (
  id text primary key,
  label text not null,
  icon text not null default 'OP',
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  tagline text not null,
  description text not null default '',
  website_url text,
  category_id text not null references public.categories(id),
  pricing_text text not null default '未設定',
  business_model text not null default 'subscription',
  region text not null default 'global',
  languages text[] not null default '{}',
  stage text not null default 'early' check (stage in ('idea', 'beta', 'early', 'growth', 'mature', 'acquired', 'closed')),
  status text not null default 'pending' check (status in ('draft', 'pending', 'published', 'rejected', 'disputed', 'archived')),
  verification_level integer not null default 0 check (verification_level between 0 and 5),
  evidence_grade text not null default 'D' check (evidence_grade in ('A', 'B', 'C', 'D')),
  intents text[] not null default '{}',
  tags text[] not null default '{}',
  metrics jsonb not null default '{}'::jsonb,
  is_featured boolean not null default false,
  is_demo boolean not null default false,
  launched_at date,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.money_signals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  submitted_by uuid references public.profiles(id) on delete set null,
  title text not null,
  summary text not null default '',
  amount numeric(20, 2) not null default 0,
  currency text not null default 'JPY',
  amount_label text not null,
  signal_type text not null,
  source_type text not null default 'user-submission',
  evidence_grade text not null default 'D' check (evidence_grade in ('A', 'B', 'C', 'D')),
  signal_date date not null,
  period_start date,
  period_end date,
  payer text not null default '不明',
  receiver text not null default '不明',
  category_id text not null references public.categories(id),
  region text not null default 'global',
  source_name text not null default '',
  source_url text,
  confidence integer not null default 30 check (confidence between 0 and 100),
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'checking', 'verified', 'disputed', 'rejected')),
  status text not null default 'pending' check (status in ('draft', 'pending', 'published', 'rejected', 'disputed', 'archived')),
  is_demo boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  hook text not null,
  summary text not null default '',
  category_id text not null references public.categories(id),
  region text not null default 'global',
  window_status text not null default 'validate' check (window_status in ('observe', 'validate', 'enter', 'avoid', 'closed')),
  money_value numeric(20, 2) not null default 0,
  money_label text not null default '',
  momentum integer not null default 0 check (momentum between 0 and 100),
  gap_score integer not null default 0 check (gap_score between 0 and 100),
  buildability integer not null default 0 check (buildability between 0 and 100),
  evidence_grade text not null default 'D' check (evidence_grade in ('A', 'B', 'C', 'D')),
  freshness_days integer not null default 0 check (freshness_days >= 0),
  solo_friendly boolean not null default false,
  budget_band text not null default '未評価',
  time_to_mvp text not null default '未評価',
  time_to_first_sale text not null default '未評価',
  target_customer text not null default '',
  reasons text[] not null default '{}',
  openings text[] not null default '{}',
  risks text[] not null default '{}',
  first_steps text[] not null default '{}',
  tags text[] not null default '{}',
  verdict text not null default '',
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'rejected', 'disputed', 'archived')),
  is_featured boolean not null default false,
  is_demo boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  submitted_by uuid references public.profiles(id) on delete set null,
  title text not null,
  summary text not null default '',
  audience text not null,
  category_id text not null references public.categories(id),
  region text not null default 'global',
  willingness_to_pay text not null default '未設定',
  pain_score integer not null default 50 check (pain_score between 0 and 100),
  alternatives text[] not null default '{}',
  gaps text[] not null default '{}',
  tags text[] not null default '{}',
  status text not null default 'pending' check (status in ('draft', 'pending', 'published', 'rejected', 'disputed', 'archived')),
  is_demo boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evidence_sources (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references public.profiles(id) on delete set null,
  entity_type text not null check (entity_type in ('opportunity', 'money_signal', 'service', 'demand')),
  entity_id uuid not null,
  title text not null,
  publisher text,
  source_url text not null,
  source_type text not null,
  evidence_grade text not null default 'D' check (evidence_grade in ('A', 'B', 'C', 'D')),
  supports_claim text not null,
  published_at timestamptz,
  collected_at timestamptz not null default now(),
  is_primary boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'disputed', 'archived')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunity_signals (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  signal_id uuid not null references public.money_signals(id) on delete cascade,
  relevance text not null default 'supporting' check (relevance in ('primary', 'supporting', 'contradicting')),
  created_at timestamptz not null default now(),
  primary key (opportunity_id, signal_id)
);

create table if not exists public.opportunity_services (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  relationship text not null default 'existing' check (relationship in ('existing', 'competitor', 'adjacent', 'new-entry')),
  created_at timestamptz not null default now(),
  primary key (opportunity_id, service_id)
);

create table if not exists public.opportunity_demands (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  demand_id uuid not null references public.demands(id) on delete cascade,
  relevance text not null default 'supporting' check (relevance in ('primary', 'supporting', 'contradicting')),
  created_at timestamptz not null default now(),
  primary key (opportunity_id, demand_id)
);

create table if not exists public.demand_services (
  demand_id uuid not null references public.demands(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  coverage text not null default 'partial' check (coverage in ('full', 'partial', 'adjacent')),
  created_at timestamptz not null default now(),
  primary key (demand_id, service_id)
);

create table if not exists public.reactions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('opportunity', 'money_signal', 'service', 'demand')),
  entity_id uuid not null,
  reaction_type text not null check (reaction_type in ('interesting', 'profitable', 'buildable', 'too_crowded', 'want', 'partner')),
  created_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id, reaction_type)
);

create table if not exists public.saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('opportunity', 'money_signal', 'service', 'demand')),
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id)
);

create table if not exists public.follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('opportunity', 'service', 'demand', 'category')),
  entity_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id)
);

create table if not exists public.demand_votes (
  demand_id uuid not null references public.demands(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote_type text not null check (vote_type in ('want', 'pay')),
  price_band text,
  note text,
  created_at timestamptz not null default now(),
  primary key (demand_id, user_id, vote_type)
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  visibility text not null default 'private' check (visibility in ('private', 'unlisted', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  entity_type text not null check (entity_type in ('opportunity', 'money_signal', 'service', 'demand')),
  entity_id uuid not null,
  note text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, entity_type, entity_id)
);

create table if not exists public.service_claims (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  claimant_id uuid not null references public.profiles(id) on delete cascade,
  verification_method text not null check (verification_method in ('domain_email', 'dns', 'site_code', 'document', 'manual')),
  verification_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_id, claimant_id)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references public.profiles(id) on delete set null,
  submission_type text not null check (submission_type in ('service', 'money_signal', 'demand', 'opportunity', 'correction')),
  payload jsonb not null,
  source_url text,
  contact_email text,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'approved', 'rejected', 'duplicate', 'spam')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  reason text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text,
  event_name text not null,
  entity_type text,
  entity_id text,
  route text,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  cadence text not null default 'weekly' check (cadence in ('daily', 'weekly', 'alerts')),
  status text not null default 'pending' check (status in ('pending', 'active', 'unsubscribed', 'bounced')),
  consented_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  source text not null default 'website',
  unique (email, cadence)
);

create index if not exists services_category_status_idx on public.services(category_id, status);
create index if not exists services_owner_idx on public.services(owner_id);
create index if not exists services_name_trgm_idx on public.services using gin (name gin_trgm_ops);
create index if not exists signals_category_date_idx on public.money_signals(category_id, signal_date desc);
create index if not exists signals_status_grade_idx on public.money_signals(status, evidence_grade);
create index if not exists opportunities_category_status_idx on public.opportunities(category_id, status);
create index if not exists opportunities_featured_idx on public.opportunities(is_featured, published_at desc);
create index if not exists opportunities_title_trgm_idx on public.opportunities using gin (title gin_trgm_ops);
create index if not exists demands_category_status_idx on public.demands(category_id, status);
create index if not exists demands_title_trgm_idx on public.demands using gin (title gin_trgm_ops);
create index if not exists evidence_entity_idx on public.evidence_sources(entity_type, entity_id, status);
create index if not exists reactions_entity_idx on public.reactions(entity_type, entity_id, reaction_type);
create index if not exists saves_entity_idx on public.saves(entity_type, entity_id);
create index if not exists submissions_status_created_idx on public.submissions(status, created_at);
create index if not exists product_events_name_time_idx on public.product_events(event_name, occurred_at desc);
create index if not exists product_events_entity_idx on public.product_events(entity_type, entity_id, occurred_at desc);

create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();
create trigger services_set_updated_at before update on public.services
for each row execute procedure public.set_updated_at();
create trigger money_signals_set_updated_at before update on public.money_signals
for each row execute procedure public.set_updated_at();
create trigger opportunities_set_updated_at before update on public.opportunities
for each row execute procedure public.set_updated_at();
create trigger demands_set_updated_at before update on public.demands
for each row execute procedure public.set_updated_at();
create trigger evidence_sources_set_updated_at before update on public.evidence_sources
for each row execute procedure public.set_updated_at();
create trigger collections_set_updated_at before update on public.collections
for each row execute procedure public.set_updated_at();
create trigger service_claims_set_updated_at before update on public.service_claims
for each row execute procedure public.set_updated_at();
create trigger submissions_set_updated_at before update on public.submissions
for each row execute procedure public.set_updated_at();

create or replace view public.opportunity_rankings
with (security_invoker = true)
as
select
  o.*,
  round(
    o.momentum * 0.28
    + o.gap_score * 0.27
    + o.buildability * 0.20
    + (case o.evidence_grade when 'A' then 100 when 'B' then 80 when 'C' then 58 else 32 end) * 0.17
    + greatest(30, 100 - o.freshness_days * 2) * 0.08
  )::integer as opportunity_score,
  (select count(*) from public.opportunity_signals os where os.opportunity_id = o.id) as signal_count,
  (select count(*) from public.opportunity_services ovs where ovs.opportunity_id = o.id) as service_count,
  (select count(*) from public.opportunity_demands od where od.opportunity_id = o.id) as demand_count
from public.opportunities o
where o.status = 'published';

create or replace view public.demand_gap_summary
with (security_invoker = true)
as
select
  d.*,
  count(distinct ds.service_id)::integer as related_service_count,
  count(distinct dv.user_id) filter (where dv.vote_type = 'want')::integer as want_votes,
  count(distinct dv.user_id) filter (where dv.vote_type = 'pay')::integer as pay_votes,
  round(
    least(100, count(distinct dv.user_id) filter (where dv.vote_type = 'want') / 7.0) * 0.30
    + least(100, count(distinct dv.user_id) filter (where dv.vote_type = 'pay') / 2.4) * 0.27
    + d.pain_score * 0.28
    + greatest(15, 100 - count(distinct ds.service_id) * 18) * 0.15
  )::integer as gap_strength
from public.demands d
left join public.demand_services ds on ds.demand_id = d.id
left join public.demand_votes dv on dv.demand_id = d.id
where d.status = 'published'
group by d.id;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.services enable row level security;
alter table public.money_signals enable row level security;
alter table public.opportunities enable row level security;
alter table public.demands enable row level security;
alter table public.evidence_sources enable row level security;
alter table public.opportunity_signals enable row level security;
alter table public.opportunity_services enable row level security;
alter table public.opportunity_demands enable row level security;
alter table public.demand_services enable row level security;
alter table public.reactions enable row level security;
alter table public.saves enable row level security;
alter table public.follows enable row level security;
alter table public.demand_votes enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.service_claims enable row level security;
alter table public.submissions enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.product_events enable row level security;
alter table public.newsletter_subscriptions enable row level security;

create policy profiles_public_read on public.profiles for select using (true);
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy categories_public_read on public.categories for select using (true);
create policy categories_admin_write on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy services_public_read on public.services for select using (status = 'published' or owner_id = auth.uid() or public.is_admin());
create policy services_owner_insert on public.services for insert with check (owner_id = auth.uid() and status in ('draft', 'pending'));
create policy services_owner_update on public.services for update using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy services_admin_delete on public.services for delete using (public.is_admin());

create policy signals_public_read on public.money_signals for select using (status = 'published' or submitted_by = auth.uid() or public.is_admin());
create policy signals_user_insert on public.money_signals for insert with check (submitted_by = auth.uid() and status in ('draft', 'pending'));
create policy signals_user_update on public.money_signals for update using (submitted_by = auth.uid() or public.is_admin()) with check (submitted_by = auth.uid() or public.is_admin());
create policy signals_admin_delete on public.money_signals for delete using (public.is_admin());

create policy opportunities_public_read on public.opportunities for select using (status = 'published' or created_by = auth.uid() or public.is_admin());
create policy opportunities_contributor_insert on public.opportunities for insert with check (created_by = auth.uid() and status in ('draft', 'pending'));
create policy opportunities_contributor_update on public.opportunities for update using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());
create policy opportunities_admin_delete on public.opportunities for delete using (public.is_admin());

create policy demands_public_read on public.demands for select using (status = 'published' or submitted_by = auth.uid() or public.is_admin());
create policy demands_user_insert on public.demands for insert with check (submitted_by = auth.uid() and status in ('draft', 'pending'));
create policy demands_user_update on public.demands for update using (submitted_by = auth.uid() or public.is_admin()) with check (submitted_by = auth.uid() or public.is_admin());
create policy demands_admin_delete on public.demands for delete using (public.is_admin());

create policy evidence_public_read on public.evidence_sources for select using (status = 'published' or submitted_by = auth.uid() or public.is_admin());
create policy evidence_user_insert on public.evidence_sources for insert with check (submitted_by = auth.uid() and status = 'pending');
create policy evidence_owner_update on public.evidence_sources for update using (submitted_by = auth.uid() or public.is_admin()) with check (submitted_by = auth.uid() or public.is_admin());
create policy evidence_admin_delete on public.evidence_sources for delete using (public.is_admin());

create policy opportunity_signals_public_read on public.opportunity_signals for select using (
  exists (select 1 from public.opportunities o where o.id = opportunity_id and o.status = 'published')
  or public.is_admin()
);
create policy opportunity_signals_admin_write on public.opportunity_signals for all using (public.is_admin()) with check (public.is_admin());

create policy opportunity_services_public_read on public.opportunity_services for select using (
  exists (select 1 from public.opportunities o where o.id = opportunity_id and o.status = 'published')
  or public.is_admin()
);
create policy opportunity_services_admin_write on public.opportunity_services for all using (public.is_admin()) with check (public.is_admin());

create policy opportunity_demands_public_read on public.opportunity_demands for select using (
  exists (select 1 from public.opportunities o where o.id = opportunity_id and o.status = 'published')
  or public.is_admin()
);
create policy opportunity_demands_admin_write on public.opportunity_demands for all using (public.is_admin()) with check (public.is_admin());

create policy demand_services_public_read on public.demand_services for select using (
  exists (select 1 from public.demands d where d.id = demand_id and d.status = 'published')
  or public.is_admin()
);
create policy demand_services_admin_write on public.demand_services for all using (public.is_admin()) with check (public.is_admin());

create policy reactions_public_read on public.reactions for select using (true);
create policy reactions_self_insert on public.reactions for insert with check (user_id = auth.uid());
create policy reactions_self_delete on public.reactions for delete using (user_id = auth.uid());

create policy saves_self_read on public.saves for select using (user_id = auth.uid());
create policy saves_self_insert on public.saves for insert with check (user_id = auth.uid());
create policy saves_self_delete on public.saves for delete using (user_id = auth.uid());

create policy follows_self_read on public.follows for select using (user_id = auth.uid());
create policy follows_self_insert on public.follows for insert with check (user_id = auth.uid());
create policy follows_self_delete on public.follows for delete using (user_id = auth.uid());

create policy demand_votes_public_read on public.demand_votes for select using (true);
create policy demand_votes_self_insert on public.demand_votes for insert with check (user_id = auth.uid());
create policy demand_votes_self_update on public.demand_votes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy demand_votes_self_delete on public.demand_votes for delete using (user_id = auth.uid());

create policy collections_public_or_owner_read on public.collections for select using (visibility = 'public' or owner_id = auth.uid() or public.is_admin());
create policy collections_owner_insert on public.collections for insert with check (owner_id = auth.uid());
create policy collections_owner_update on public.collections for update using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy collections_owner_delete on public.collections for delete using (owner_id = auth.uid() or public.is_admin());

create policy collection_items_read on public.collection_items for select using (
  exists (
    select 1 from public.collections c
    where c.id = collection_id and (c.visibility = 'public' or c.owner_id = auth.uid() or public.is_admin())
  )
);
create policy collection_items_owner_insert on public.collection_items for insert with check (
  exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = auth.uid())
);
create policy collection_items_owner_update on public.collection_items for update using (
  exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = auth.uid())
) with check (
  exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = auth.uid())
);
create policy collection_items_owner_delete on public.collection_items for delete using (
  exists (select 1 from public.collections c where c.id = collection_id and (c.owner_id = auth.uid() or public.is_admin()))
);

create policy service_claims_self_read on public.service_claims for select using (claimant_id = auth.uid() or public.is_admin());
create policy service_claims_self_insert on public.service_claims for insert with check (claimant_id = auth.uid() and status = 'pending');
create policy service_claims_admin_update on public.service_claims for update using (public.is_admin()) with check (public.is_admin());

create policy submissions_self_or_admin_read on public.submissions for select using (submitted_by = auth.uid() or public.is_admin());
create policy submissions_authenticated_insert on public.submissions for insert with check (submitted_by = auth.uid() and status = 'pending');
create policy submissions_anon_insert on public.submissions for insert to anon with check (submitted_by is null and status = 'pending');
create policy submissions_admin_update on public.submissions for update using (public.is_admin()) with check (public.is_admin());
create policy submissions_admin_delete on public.submissions for delete using (public.is_admin());

create policy moderation_admin_all on public.moderation_actions for all using (public.is_admin()) with check (public.is_admin());

create policy product_events_insert on public.product_events for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());
create policy product_events_admin_read on public.product_events for select using (public.is_admin());

create policy newsletter_anon_insert on public.newsletter_subscriptions for insert to anon, authenticated with check (status = 'pending');
create policy newsletter_admin_all on public.newsletter_subscriptions for all using (public.is_admin()) with check (public.is_admin());

commit;
