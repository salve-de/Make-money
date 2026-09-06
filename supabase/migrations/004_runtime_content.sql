-- GOLDMINE RADAR runtime content fields and public graph
-- Apply after 003_security_operations.sql.

alter table public.opportunities add column if not exists eyebrow text;
alter table public.opportunities add column if not exists insight text;
alter table public.opportunities add column if not exists region text;
alter table public.opportunities add column if not exists stage text check (stage is null or stage in ('初期','上昇中','急上昇','成熟','下降'));
alter table public.opportunities add column if not exists solo boolean;
alter table public.opportunities add column if not exists tags text[] not null default '{}';
alter table public.opportunities add column if not exists gap_score numeric(5,2) not null default 0 check (gap_score between 0 and 100);
alter table public.opportunities add column if not exists distribution_score numeric(5,2) not null default 0 check (distribution_score between 0 and 100);
alter table public.opportunities add column if not exists feasibility_score numeric(5,2) not null default 0 check (feasibility_score between 0 and 100);
alter table public.opportunities add column if not exists trend jsonb not null default '[]'::jsonb;
alter table public.opportunities add column if not exists amount_display text;
alter table public.opportunities add column if not exists amount_type text;
alter table public.opportunities add column if not exists amount_note text;

alter table public.money_signals add column if not exists category text;
alter table public.money_signals add column if not exists region text;
alter table public.money_signals add column if not exists change_percent numeric(9,2);

alter table public.products add column if not exists click_count bigint not null default 0;

alter table public.demands add column if not exists category text;
alter table public.demands add column if not exists want_count bigint not null default 0;
alter table public.demands add column if not exists would_pay_count bigint not null default 0;
alter table public.demands add column if not exists solution_count bigint not null default 0;
alter table public.demands add column if not exists pain_score numeric(5,2) not null default 50 check (pain_score between 0 and 100);

create table if not exists public.product_demands (
  product_id uuid not null references public.products(id) on delete cascade,
  demand_id uuid not null references public.demands(id) on delete cascade,
  relation text not null default 'addresses' check (relation in ('addresses','partially_addresses','creates','contradicts')),
  created_at timestamptz not null default now(),
  primary key(product_id,demand_id)
);
alter table public.product_demands enable row level security;
drop policy if exists product_demands_public_read on public.product_demands;
create policy product_demands_public_read on public.product_demands for select using(
  exists(select 1 from public.products p where p.id=product_id and p.status='published')
  and exists(select 1 from public.demands d where d.id=demand_id and d.status='published')
);
drop policy if exists product_demands_staff_write on public.product_demands;
create policy product_demands_staff_write on public.product_demands for all using(public.is_staff()) with check(public.is_staff());

create table if not exists public.demand_reactions (
  demand_id uuid not null references public.demands(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('want','would_pay','need_local','solved')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(demand_id,user_id,kind)
);
alter table public.demand_reactions enable row level security;
drop policy if exists demand_reactions_own_read on public.demand_reactions;
create policy demand_reactions_own_read on public.demand_reactions for select using(user_id=auth.uid() or public.is_staff());
drop policy if exists demand_reactions_own_write on public.demand_reactions;
create policy demand_reactions_own_write on public.demand_reactions for all using(user_id=auth.uid()) with check(user_id=auth.uid());

create or replace function public.refresh_demand_counters(p_demand_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.demands d set
    want_count=(select count(*) from public.demand_reactions r where r.demand_id=p_demand_id and r.active and r.kind='want'),
    would_pay_count=(select count(*) from public.demand_reactions r where r.demand_id=p_demand_id and r.active and r.kind='would_pay'),
    solution_count=(select count(*) from public.product_demands pd join public.products p on p.id=pd.product_id where pd.demand_id=p_demand_id and p.status='published'),
    updated_at=now()
  where d.id=p_demand_id;
end;
$$;

create or replace function public.demand_counter_trigger()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.refresh_demand_counters(coalesce(new.demand_id,old.demand_id));
  return coalesce(new,old);
end;
$$;
drop trigger if exists demand_reaction_counter on public.demand_reactions;
create trigger demand_reaction_counter after insert or update of active,kind or delete on public.demand_reactions
for each row execute function public.demand_counter_trigger();
drop trigger if exists product_demand_counter on public.product_demands;
create trigger product_demand_counter after insert or delete on public.product_demands
for each row execute function public.demand_counter_trigger();

create or replace function public.set_demand_reaction(p_demand_id text,p_kind text,p_active boolean default true)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_kind not in ('want','would_pay','need_local','solved') then raise exception 'invalid reaction'; end if;
  select id into v_id from public.demands where id::text=p_demand_id or slug=p_demand_id limit 1;
  if v_id is null then raise exception 'demand not found'; end if;
  insert into public.demand_reactions(demand_id,user_id,kind,active)
  values(v_id,auth.uid(),p_kind,p_active)
  on conflict(demand_id,user_id,kind) do update set active=excluded.active,updated_at=now();
end;
$$;
grant execute on function public.set_demand_reaction(text,text,boolean) to authenticated;

-- Public views provide names and counters without exposing private membership or application rows.
create or replace view public.public_money_signals
with (security_invoker=true)
as
select m.*,payer.name as payer_name,receiver.name as receiver_name
from public.money_signals m
left join public.entities payer on payer.id=m.payer_entity_id
left join public.entities receiver on receiver.id=m.receiver_entity_id
where m.status='published';

create or replace view public.public_products
with (security_invoker=true)
as
select p.*,coalesce(e.name,pr.display_name) as owner_name
from public.products p
left join public.entities e on e.id=p.owner_entity_id
left join public.profiles pr on pr.id=p.owner_id
where p.status='published';

create or replace view public.public_demands
with (security_invoker=true)
as
select d.* from public.demands d where d.status='published';

-- Rebuild organic ranking without duplicate output columns. Promotion tables remain absent.
create or replace view public.organic_ranked_opportunities
with (security_invoker=true)
as
select
  o.*,
  round(
    o.evidence_score * 0.25
    + o.momentum_score * 0.22
    + o.gap_score * 0.23
    + o.distribution_score * 0.14
    + o.feasibility_score * 0.16,
    2
  ) as organic_score
from public.opportunities o
where o.status='published';

-- Search indexes for live DB mode.
create index if not exists opportunities_title_trgm_idx on public.opportunities using gin(title gin_trgm_ops);
create index if not exists opportunities_hook_trgm_idx on public.opportunities using gin(hook gin_trgm_ops);
create index if not exists money_signals_headline_trgm_idx on public.money_signals using gin(headline gin_trgm_ops);
create index if not exists products_name_trgm_idx on public.products using gin(name gin_trgm_ops);
create index if not exists products_one_liner_trgm_idx on public.products using gin(one_liner gin_trgm_ops);
create index if not exists demands_title_trgm_idx on public.demands using gin(title gin_trgm_ops);
create index if not exists listings_title_trgm_idx on public.listings using gin(title gin_trgm_ops);

-- Grants for the complete public graph.
grant select on public.public_money_signals,public.public_products,public.public_demands,public.product_demands to anon,authenticated;
grant select on public.opportunity_signals,public.opportunity_demands,public.opportunity_products,public.signal_sources,public.sources to anon,authenticated;
grant select on public.organic_ranked_opportunities to anon,authenticated;

comment on view public.organic_ranked_opportunities is 'Evidence, momentum, demand gap, distribution and feasibility only. Promotions are never joined.';
comment on table public.demand_reactions is 'Authenticated demand intent. Public pages expose aggregate counters, not individual voters.';
