-- GOLDMINE RADAR security and operations completion
-- Apply after 002_platform_complete.sql.

-- Broaden roles used by the product while keeping a closed set.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('member','researcher','vendor','moderator','editor','admin'));

-- Ensure every Auth user receives a profile without granting elevated privileges.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id,display_name,handle,role)
  values(
    new.id,
    left(coalesce(new.raw_user_meta_data->>'display_name',split_part(coalesce(new.email,''),'@',1),'Member'),120),
    null,
    'member'
  )
  on conflict(id) do nothing;
  insert into public.user_preferences(user_id) values(new.id) on conflict(user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Edge Function rate limits. Only service-role functions can consume them.
create table if not exists public.function_rate_limits (
  rate_key text not null,
  action text not null,
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count >= 0),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key(rate_key,action,window_start)
);
create index if not exists function_rate_limits_expiry_idx on public.function_rate_limits(expires_at);
alter table public.function_rate_limits enable row level security;

create or replace function public.consume_function_rate_limit(
  p_key text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_limit < 1 or p_limit > 10000 or p_window_seconds < 1 or p_window_seconds > 2678400 then
    raise exception 'invalid rate limit parameters';
  end if;
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.function_rate_limits(rate_key,action,window_start,request_count,expires_at,updated_at)
  values(left(p_key,256),left(p_action,80),v_window_start,1,v_window_start+make_interval(secs=>p_window_seconds*2),now())
  on conflict(rate_key,action,window_start) do update
    set request_count=public.function_rate_limits.request_count+1,updated_at=now()
  returning request_count into v_count;
  return v_count <= p_limit;
end;
$$;
revoke all on function public.consume_function_rate_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_function_rate_limit(text,text,integer,integer) to service_role;

create or replace function public.cleanup_operational_rows()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare rate_deleted integer; audit_deleted integer;
begin
  delete from public.function_rate_limits where expires_at < now();
  get diagnostics rate_deleted = row_count;
  delete from public.edge_audit_events where created_at < now()-interval '400 days';
  get diagnostics audit_deleted = row_count;
  return jsonb_build_object('rate_limits',rate_deleted,'edge_audit',audit_deleted);
end;
$$;
revoke all on function public.cleanup_operational_rows() from public,anon,authenticated;
grant execute on function public.cleanup_operational_rows() to service_role;

create table if not exists public.edge_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  object_type text,
  object_id text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists edge_audit_action_created_idx on public.edge_audit_events(action,created_at desc);
create index if not exists edge_audit_actor_created_idx on public.edge_audit_events(actor_id,created_at desc);
alter table public.edge_audit_events enable row level security;
create policy edge_audit_staff_read on public.edge_audit_events for select using(public.is_staff());
revoke insert,update,delete on public.edge_audit_events from anon,authenticated;
grant all on public.edge_audit_events to service_role;
grant usage,select on sequence public.edge_audit_events_id_seq to service_role;

create table if not exists public.newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.newsletter_subscriptions(id) on delete cascade,
  digest_key text not null,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','skipped')),
  provider_message_id text,
  attempted_at timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(subscription_id,digest_key)
);
create index if not exists newsletter_deliveries_status_idx on public.newsletter_deliveries(status,created_at);
alter table public.newsletter_deliveries enable row level security;
create policy newsletter_delivery_owner_read on public.newsletter_deliveries for select using(
  exists(select 1 from public.newsletter_subscriptions s where s.id=subscription_id and s.user_id=auth.uid()) or public.is_staff()
);
revoke insert,update,delete on public.newsletter_deliveries from anon,authenticated;
grant all on public.newsletter_deliveries to service_role;

-- Review counter fix: deletion must refresh by product id, not by the deleted review id.
create or replace function public.refresh_product_review_counters(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products p set
    review_count=(select count(*) from public.reviews r where r.product_id=p_product_id and r.status='published' and r.conflict_type is null),
    review_average=coalesce((select round(avg(r.rating)::numeric,2) from public.reviews r where r.product_id=p_product_id and r.status='published' and r.conflict_type is null),0),
    updated_at=now()
  where p.id=p_product_id;
end;
$$;

create or replace function public.review_public_counter_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_product_review_counters(coalesce(new.product_id,old.product_id));
  return coalesce(new,old);
end;
$$;
drop trigger if exists review_public_counter on public.reviews;
create trigger review_public_counter after insert or update of status,rating,conflict_type or delete on public.reviews
for each row execute function public.review_public_counter_trigger();

create or replace function public.review_helpful_counter_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_review_id uuid; v_product_id uuid;
begin
  v_review_id:=coalesce(new.review_id,old.review_id);
  update public.reviews set helpful_count=(select count(*) from public.review_helpful_votes where review_id=v_review_id),updated_at=now()
  where id=v_review_id returning product_id into v_product_id;
  if v_product_id is not null then perform public.refresh_product_review_counters(v_product_id); end if;
  return coalesce(new,old);
end;
$$;
drop trigger if exists review_helpful_counter on public.review_helpful_votes;
create trigger review_helpful_counter after insert or delete on public.review_helpful_votes
for each row execute function public.review_helpful_counter_trigger();

-- Keep public opportunity counters deterministic and independent from promotion spend.
create or replace function public.refresh_opportunity_reaction_counters(p_opportunity_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.opportunities o set
    save_count=(select count(*) from public.reactions r where r.opportunity_id=p_opportunity_id and r.active and r.kind='save'),
    watcher_count=(select count(*) from public.reactions r where r.opportunity_id=p_opportunity_id and r.active and r.kind='watch'),
    want_count=(select count(*) from public.reactions r where r.opportunity_id=p_opportunity_id and r.active and r.kind='want'),
    would_pay_count=(select count(*) from public.reactions r where r.opportunity_id=p_opportunity_id and r.active and r.kind='would_pay'),
    build_count=(select count(*) from public.reactions r where r.opportunity_id=p_opportunity_id and r.active and r.kind='build'),
    updated_at=now()
  where o.id=p_opportunity_id;
end;
$$;

create or replace function public.reaction_counter_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_opportunity_reaction_counters(coalesce(new.opportunity_id,old.opportunity_id));
  return coalesce(new,old);
end;
$$;
drop trigger if exists opportunity_reaction_counter on public.reactions;
create trigger opportunity_reaction_counter after insert or update of active,kind or delete on public.reactions
for each row execute function public.reaction_counter_trigger();

-- Atomic helpful toggle avoids duplicate client writes.
create or replace function public.toggle_review_helpful(p_review_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not exists(select 1 from public.reviews where id=p_review_id and status='published') then raise exception 'review not found'; end if;
  if exists(select 1 from public.review_helpful_votes where review_id=p_review_id and user_id=auth.uid()) then
    delete from public.review_helpful_votes where review_id=p_review_id and user_id=auth.uid();
    return false;
  end if;
  insert into public.review_helpful_votes(review_id,user_id) values(p_review_id,auth.uid());
  return true;
end;
$$;
grant execute on function public.toggle_review_helpful(uuid) to authenticated;

-- Safe public analytics endpoint. It never accepts arbitrary columns or SQL fragments.
create or replace function public.record_public_event(
  p_anonymous_id text,
  p_event_name text,
  p_object_type text default null,
  p_object_id uuid default null,
  p_properties jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(coalesce(p_event_name,'')) not between 1 and 80 then raise exception 'invalid event'; end if;
  if length(coalesce(p_anonymous_id,'')) > 160 then raise exception 'invalid anonymous id'; end if;
  insert into public.analytics_events(user_id,anonymous_id,event_name,object_type,object_id,properties)
  values(auth.uid(),nullif(left(p_anonymous_id,160),''),left(p_event_name,80),nullif(left(coalesce(p_object_type,''),80),''),p_object_id,coalesce(p_properties,'{}'::jsonb));
end;
$$;
grant execute on function public.record_public_event(text,text,text,uuid,jsonb) to anon,authenticated;

-- Updated-at trigger for operational tables.
drop trigger if exists touch_updated_at on public.newsletter_deliveries;
create trigger touch_updated_at before update on public.newsletter_deliveries for each row execute function public.touch_updated_at();

comment on table public.function_rate_limits is 'Server-side fixed-window rate limits for Edge Functions. Never exposed to browser roles.';
comment on table public.newsletter_deliveries is 'Idempotent digest delivery ledger keyed by subscription and digest period.';
comment on function public.refresh_opportunity_reaction_counters(uuid) is 'Updates organic engagement counters only. Promotion spend is intentionally absent.';
