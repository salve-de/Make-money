-- GOLDMINE RADAR production completion
-- Apply after 001_initial_schema.sql.
-- This migration keeps public discovery, private research, vendor operations and moderation separate.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- -----------------------------------------------------------------------------
-- Existing core hardening
-- -----------------------------------------------------------------------------
alter table if exists public.profiles add column if not exists bio text;
alter table if exists public.profiles add column if not exists website_url text;
alter table if exists public.profiles add column if not exists country_code text;
alter table if exists public.profiles add column if not exists role text not null default 'member';
alter table if exists public.profiles add column if not exists trust_score integer not null default 0;
alter table if exists public.profiles add column if not exists early_discovery_score integer not null default 0;
alter table if exists public.profiles add column if not exists updated_at timestamptz not null default now();

alter table if exists public.products add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.products add column if not exists claim_status text not null default 'unclaimed';
alter table if exists public.products add column if not exists review_count integer not null default 0;
alter table if exists public.products add column if not exists review_average numeric(3,2) not null default 0;
alter table if exists public.products add column if not exists view_count bigint not null default 0;
alter table if exists public.products add column if not exists save_count bigint not null default 0;
alter table if exists public.products add column if not exists lead_count bigint not null default 0;

alter table if exists public.opportunities add column if not exists view_count bigint not null default 0;
alter table if exists public.opportunities add column if not exists save_count bigint not null default 0;
alter table if exists public.opportunities add column if not exists want_count bigint not null default 0;
alter table if exists public.opportunities add column if not exists would_pay_count bigint not null default 0;
alter table if exists public.opportunities add column if not exists build_count bigint not null default 0;
alter table if exists public.opportunities add column if not exists watcher_count bigint not null default 0;
alter table if exists public.opportunities add column if not exists stale_after timestamptz;
alter table if exists public.opportunities add column if not exists last_verified_at timestamptz;

alter table if exists public.product_claims add column if not exists moderation_notes text;
alter table if exists public.product_claims add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table if exists public.product_claims add column if not exists reviewed_at timestamptz;

-- -----------------------------------------------------------------------------
-- Roles and ownership
-- -----------------------------------------------------------------------------
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'member');
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() in ('moderator','admin','editor');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() = 'admin';
$$;

create table if not exists public.product_memberships (
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_role text not null default 'owner' check (membership_role in ('owner','manager','analyst')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (product_id,user_id)
);

create or replace function public.can_manage_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff() or exists (
    select 1 from public.product_memberships
    where product_id = p_product_id and user_id = auth.uid()
  ) or exists (
    select 1 from public.products
    where id = p_product_id and owner_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- User preferences and research workspace
-- -----------------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  theme text not null default 'dark' check (theme in ('dark','light','system')),
  plan_hint text not null default 'free',
  notification_frequency text not null default 'weekly' check (notification_frequency in ('instant','daily','weekly','off')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('free','opportunity','money_signal','product','demand','listing','collection')),
  entity_id text,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '',
  tags text[] not null default '{}',
  client_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id,client_id)
);
create index if not exists research_notes_owner_updated_idx on public.research_notes(owner_id,updated_at desc);

-- -----------------------------------------------------------------------------
-- Public/private collections and follows
-- -----------------------------------------------------------------------------
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '',
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  status text not null default 'published' check (status in ('draft','published','archived','removed')),
  follower_count bigint not null default 0,
  item_count integer not null default 0,
  featured boolean not null default false,
  client_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id,client_id)
);
create index if not exists collections_public_updated_idx on public.collections(visibility,status,updated_at desc);

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  position integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  primary key (collection_id,opportunity_id)
);

create table if not exists public.collection_follows (
  collection_id uuid not null references public.collections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id,user_id)
);

create or replace function public.refresh_collection_counters(p_collection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.collections c set
    follower_count = (select count(*) from public.collection_follows f where f.collection_id = p_collection_id),
    item_count = (select count(*) from public.collection_items i where i.collection_id = p_collection_id),
    updated_at = now()
  where c.id = p_collection_id;
end;
$$;

create or replace function public.collection_counter_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_collection_counters(coalesce(new.collection_id,old.collection_id));
  return coalesce(new,old);
end;
$$;

drop trigger if exists collection_items_counter on public.collection_items;
create trigger collection_items_counter after insert or delete on public.collection_items
for each row execute function public.collection_counter_trigger();
drop trigger if exists collection_follows_counter on public.collection_follows;
create trigger collection_follows_counter after insert or delete on public.collection_follows
for each row execute function public.collection_counter_trigger();

-- -----------------------------------------------------------------------------
-- Listings and applications
-- -----------------------------------------------------------------------------
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  slug text not null unique,
  listing_type text not null check (listing_type in ('beta','customer','partner','affiliate','expert','poc','feedback','investment','acquisition','hiring')),
  title text not null check (char_length(title) between 8 and 160),
  summary text not null check (char_length(summary) between 20 and 3000),
  reward text,
  region text,
  tags text[] not null default '{}',
  slots integer not null default 1 check (slots between 1 and 9999),
  application_count integer not null default 0,
  status text not null default 'pending' check (status in ('draft','pending','open','paused','closed','rejected','archived')),
  deadline timestamptz,
  published_at timestamptz,
  client_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id,client_id)
);
create index if not exists listings_public_idx on public.listings(status,published_at desc);
create index if not exists listings_owner_idx on public.listings(owner_id,updated_at desc);

create table if not exists public.listing_applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 20 and 3000),
  contact_email text,
  website_url text,
  status text not null default 'submitted' check (status in ('submitted','reviewing','accepted','rejected','withdrawn')),
  owner_note text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists listing_applications_active_unique
on public.listing_applications(listing_id,applicant_id)
where status in ('submitted','reviewing','accepted');
create index if not exists listing_applications_owner_lookup on public.listing_applications(listing_id,status,created_at desc);

create or replace function public.refresh_listing_application_count(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings l set
    application_count = (select count(*) from public.listing_applications a where a.listing_id=p_listing_id and a.status <> 'withdrawn'),
    updated_at = now()
  where l.id=p_listing_id;
end;
$$;

create or replace function public.listing_application_counter_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_listing_application_count(coalesce(new.listing_id,old.listing_id));
  return coalesce(new,old);
end;
$$;
drop trigger if exists listing_application_counter on public.listing_applications;
create trigger listing_application_counter after insert or update of status or delete on public.listing_applications
for each row execute function public.listing_application_counter_trigger();

-- -----------------------------------------------------------------------------
-- Reviews, helpful votes and corrections
-- -----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text not null check (char_length(title) between 4 and 120),
  body text not null check (char_length(body) between 30 and 5000),
  relationship text,
  verified_use boolean not null default false,
  conflict_type text check (conflict_type is null or conflict_type in ('vendor','employee','competitor','affiliate','other')),
  helpful_count integer not null default 0,
  status text not null default 'pending' check (status in ('pending','in_review','published','rejected','removed')),
  moderation_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reviews_product_public_idx on public.reviews(product_id,status,published_at desc);

create table if not exists public.review_helpful_votes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id,user_id)
);

create or replace function public.refresh_review_counters(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_product_id uuid;
begin
  update public.reviews r set helpful_count=(select count(*) from public.review_helpful_votes v where v.review_id=p_review_id),updated_at=now()
  where r.id=p_review_id returning product_id into v_product_id;
  if v_product_id is not null then
    update public.products p set
      review_count=(select count(*) from public.reviews r where r.product_id=v_product_id and r.status='published' and r.conflict_type is null),
      review_average=coalesce((select round(avg(r.rating)::numeric,2) from public.reviews r where r.product_id=v_product_id and r.status='published' and r.conflict_type is null),0),
      updated_at=now()
    where p.id=v_product_id;
  end if;
end;
$$;

create or replace function public.review_counter_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_review_counters(coalesce(new.id,old.id));
  return coalesce(new,old);
end;
$$;
drop trigger if exists review_public_counter on public.reviews;
create trigger review_public_counter after insert or update of status,rating,conflict_type or delete on public.reviews
for each row execute function public.review_counter_trigger();

create or replace function public.review_helpful_counter_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_review_counters(coalesce(new.review_id,old.review_id));
  return coalesce(new,old);
end;
$$;
drop trigger if exists review_helpful_counter on public.review_helpful_votes;
create trigger review_helpful_counter after insert or delete on public.review_helpful_votes
for each row execute function public.review_helpful_counter_trigger();

create table if not exists public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references auth.users(id) on delete set null,
  entity_type text not null check (entity_type in ('opportunity','money_signal','product','demand','listing','collection','review','url')),
  entity_id text not null,
  claim text not null check (char_length(claim) between 15 and 5000),
  source_url text not null,
  contact_email text,
  status text not null default 'pending' check (status in ('pending','in_review','needs_changes','approved','rejected','spam')),
  resolution text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists corrections_queue_idx on public.correction_requests(status,created_at);

-- -----------------------------------------------------------------------------
-- Notifications, newsletter and billing
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  route text,
  object_type text,
  object_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id,created_at desc) where read_at is null;

create table if not exists public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  frequency text not null default 'weekly' check (frequency in ('instant','daily','weekly')),
  status text not null default 'pending' check (status in ('pending','active','unsubscribed','bounced','complained')),
  confirmation_token_hash text,
  unsubscribe_token_hash text not null,
  confirmation_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists newsletter_email_active_unique on public.newsletter_subscriptions(lower(email)) where status in ('pending','active');

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'stripe',
  provider_customer_id text unique,
  provider_subscription_id text unique,
  plan_code text not null check (plan_code in ('pro','research','team')),
  status text not null check (status in ('trialing','active','past_due','paused','canceled','incomplete','unpaid')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_status_idx on public.subscriptions(user_id,status);

create table if not exists public.billing_events (
  provider_event_id text primary key,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.url_previews (
  url_hash text primary key,
  url text not null,
  final_url text not null,
  title text,
  description text,
  image_url text,
  favicon_url text,
  status_code integer,
  content_type text,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '7 days')
);

-- -----------------------------------------------------------------------------
-- Moderation/publication audit
-- -----------------------------------------------------------------------------
create table if not exists public.moderation_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  subject_type text not null,
  subject_id text not null,
  action text not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
create index if not exists moderation_audit_subject_idx on public.moderation_audit(subject_type,subject_id,created_at desc);

-- -----------------------------------------------------------------------------
-- Public views: counters stay visible without exposing private rows
-- -----------------------------------------------------------------------------
create or replace view public.public_listings
with (security_invoker=true)
as
select
  l.id,l.product_id,l.opportunity_id,l.slug,l.listing_type,l.title,l.summary,l.reward,l.region,l.tags,
  l.slots,l.application_count,l.status,l.deadline,l.published_at,l.created_at,l.updated_at,
  p.name as product_name,p.slug as product_slug,p.trust_level as product_trust
from public.listings l
left join public.products p on p.id=l.product_id
where l.status='open' and (l.deadline is null or l.deadline>=now());

create or replace view public.public_reviews
with (security_invoker=true)
as
select r.id,r.product_id,r.rating,r.title,r.body,r.relationship,r.verified_use,r.helpful_count,r.published_at,r.created_at,
       p.display_name as author_name,p.avatar_url as author_avatar
from public.reviews r
left join public.profiles p on p.id=r.author_id
where r.status='published';

create or replace view public.public_collections
with (security_invoker=true)
as
select c.id,c.slug,c.title,c.description,c.visibility,c.follower_count,c.item_count,c.featured,c.updated_at,c.created_at,
       p.handle as owner_handle,p.display_name as owner_name,p.avatar_url as owner_avatar
from public.collections c
join public.profiles p on p.id=c.owner_id
where c.visibility='public' and c.status='published';

create or replace view public.public_collection_items
with (security_invoker=true)
as
select ci.collection_id,ci.opportunity_id,ci.position,ci.note
from public.collection_items ci
join public.collections c on c.id=ci.collection_id
where c.status='published' and c.visibility in ('public','unlisted');

-- -----------------------------------------------------------------------------
-- Local-first sync RPCs
-- -----------------------------------------------------------------------------
create or replace function public.resolve_opportunity_id(p_value text)
returns uuid
language sql
stable
security definer
set search_path=public
as $$
  select id from public.opportunities
  where id::text=p_value or slug=p_value or ('opp-'||slug)=p_value
  limit 1;
$$;

create or replace function public.sync_user_preferences(p_preferences jsonb,p_theme text default 'dark',p_plan_hint text default 'free')
returns public.user_preferences
language plpgsql
security definer
set search_path=public
as $$
declare result public.user_preferences;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  insert into public.user_preferences(user_id,preferences,theme,plan_hint)
  values(auth.uid(),coalesce(p_preferences,'{}'::jsonb),coalesce(p_theme,'dark'),coalesce(p_plan_hint,'free'))
  on conflict(user_id) do update set preferences=excluded.preferences,theme=excluded.theme,plan_hint=excluded.plan_hint,updated_at=now()
  returning * into result;
  return result;
end;
$$;

create or replace function public.set_reaction(p_opportunity_id text,p_kind text,p_active boolean default true)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_kind not in ('want','would_pay','build','watch','save','too_crowded') then raise exception 'invalid reaction'; end if;
  v_id:=public.resolve_opportunity_id(p_opportunity_id);
  if v_id is null then raise exception 'opportunity not found'; end if;
  insert into public.reactions(user_id,opportunity_id,kind,active)
  values(auth.uid(),v_id,p_kind,p_active)
  on conflict(user_id,opportunity_id,kind) do update set active=excluded.active,updated_at=now();
end;
$$;

create or replace function public.sync_local_reactions(p_saved jsonb default '[]'::jsonb,p_watched jsonb default '[]'::jsonb,p_reactions jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare value text; key text; active boolean; parts text[];
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  for value in select jsonb_array_elements_text(coalesce(p_saved,'[]'::jsonb)) loop
    perform public.set_reaction(value,'save',true);
  end loop;
  for value in select jsonb_array_elements_text(coalesce(p_watched,'[]'::jsonb)) loop
    perform public.set_reaction(value,'watch',true);
  end loop;
  for key,active in select * from jsonb_each_text(coalesce(p_reactions,'{}'::jsonb)) loop
    parts:=string_to_array(key,':');
    if array_length(parts,1)>=2 and active::boolean then perform public.set_reaction(parts[1],parts[2],true); end if;
  end loop;
end;
$$;

create or replace function public.sync_research_notes(p_notes jsonb)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare item jsonb; count_inserted integer:=0;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  for item in select * from jsonb_array_elements(coalesce(p_notes,'[]'::jsonb)) loop
    insert into public.research_notes(owner_id,entity_type,entity_id,title,body,tags,client_id,updated_at)
    values(auth.uid(),coalesce(item->>'entityType','free'),nullif(item->>'entityId',''),left(coalesce(item->>'title','メモ'),120),coalesce(item->>'body',''),
      coalesce(array(select jsonb_array_elements_text(coalesce(item->'tags','[]'::jsonb))),'{}'),item->>'id',coalesce((item->>'updatedAt')::timestamptz,now()))
    on conflict(owner_id,client_id) do update set title=excluded.title,body=excluded.body,tags=excluded.tags,updated_at=excluded.updated_at;
    count_inserted:=count_inserted+1;
  end loop;
  return count_inserted;
end;
$$;

create or replace function public.sync_user_collections(p_collections jsonb)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare item jsonb; v_collection_id uuid; value text; v_opp_id uuid; processed integer:=0;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  for item in select * from jsonb_array_elements(coalesce(p_collections,'[]'::jsonb)) loop
    insert into public.collections(owner_id,slug,title,description,visibility,status,client_id,updated_at)
    values(auth.uid(),coalesce(nullif(item->>'slug',''),'mine-'||substr(md5(item::text),1,12)),left(coalesce(item->>'title','Collection'),120),coalesce(item->>'description',''),coalesce(item->>'visibility','private'),'published',item->>'id',coalesce((item->>'updatedAt')::timestamptz,now()))
    on conflict(owner_id,client_id) do update set title=excluded.title,description=excluded.description,visibility=excluded.visibility,updated_at=excluded.updated_at
    returning id into v_collection_id;
    delete from public.collection_items where collection_id=v_collection_id;
    for value in select jsonb_array_elements_text(coalesce(item->'opportunityIds','[]'::jsonb)) loop
      v_opp_id:=public.resolve_opportunity_id(value);
      if v_opp_id is not null then insert into public.collection_items(collection_id,opportunity_id) values(v_collection_id,v_opp_id) on conflict do nothing; end if;
    end loop;
    processed:=processed+1;
  end loop;
  return processed;
end;
$$;

create or replace function public.apply_to_listing(p_listing_id text,p_message text,p_contact_email text default null,p_website_url text default null)
returns public.listing_applications
language plpgsql
security definer
set search_path=public
as $$
declare v_listing_id uuid; result public.listing_applications; v_owner uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select id,owner_id into v_listing_id,v_owner from public.listings where (id::text=p_listing_id or slug=p_listing_id) and status='open' and (deadline is null or deadline>=now()) limit 1;
  if v_listing_id is null then raise exception 'listing is not open'; end if;
  if v_owner=auth.uid() then raise exception 'cannot apply to your own listing'; end if;
  insert into public.listing_applications(listing_id,applicant_id,message,contact_email,website_url)
  values(v_listing_id,auth.uid(),left(p_message,3000),nullif(p_contact_email,''),nullif(p_website_url,'')) returning * into result;
  insert into public.notifications(user_id,type,title,body,route,object_type,object_id)
  values(v_owner,'application','新しい応募があります','募集への応募内容を確認してください。','#/dashboard','listing',v_listing_id::text);
  return result;
end;
$$;

create or replace function public.create_product_claim(p_product_id text,p_method text)
returns public.product_claims
language plpgsql
security definer
set search_path=public
as $$
declare v_product_id uuid; result public.product_claims;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select id into v_product_id from public.products where id::text=p_product_id or slug=p_product_id limit 1;
  if v_product_id is null then raise exception 'product not found'; end if;
  insert into public.product_claims(product_id,claimant_id,method,status,expires_at)
  values(v_product_id,auth.uid(),p_method,'pending',now()+interval '7 days')
  on conflict(product_id,claimant_id,method) do update set status='pending',expires_at=now()+interval '7 days',updated_at=now()
  returning * into result;
  return result;
end;
$$;

-- -----------------------------------------------------------------------------
-- Moderation: claim approval and canonical materialization
-- -----------------------------------------------------------------------------
create or replace function public.review_product_claim(p_claim_id uuid,p_status text,p_notes text default null)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare c public.product_claims;
begin
  if not public.is_staff() then raise exception 'staff required'; end if;
  if p_status not in ('verified','rejected','revoked') then raise exception 'invalid status'; end if;
  select * into c from public.product_claims where id=p_claim_id for update;
  if c.id is null then raise exception 'claim not found'; end if;
  update public.product_claims set status=p_status,moderation_notes=p_notes,reviewed_by=auth.uid(),reviewed_at=now(),verified_at=case when p_status='verified' then now() else verified_at end,updated_at=now() where id=p_claim_id;
  if p_status='verified' then
    insert into public.product_memberships(product_id,user_id,membership_role,granted_by) values(c.product_id,c.claimant_id,'owner',auth.uid()) on conflict(product_id,user_id) do update set membership_role='owner',granted_by=auth.uid();
    update public.products set owner_id=c.claimant_id,claim_status='verified',trust_level=case when trust_level='unverified' then 'owner_verified' else trust_level end,updated_at=now() where id=c.product_id;
  elsif p_status='revoked' then
    delete from public.product_memberships where product_id=c.product_id and user_id=c.claimant_id;
    update public.products set owner_id=null,claim_status='revoked',updated_at=now() where id=c.product_id and owner_id=c.claimant_id;
  end if;
  insert into public.moderation_audit(actor_id,subject_type,subject_id,action,reason,after_state) values(auth.uid(),'product_claim',p_claim_id::text,p_status,p_notes,jsonb_build_object('product_id',c.product_id,'claimant_id',c.claimant_id));
end;
$$;

create or replace function public.materialize_submission(p_submission_id uuid,p_action text,p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare s public.submissions; result jsonb:='{}'::jsonb; new_id uuid;
begin
  if not public.is_staff() then raise exception 'staff required'; end if;
  if p_action not in ('approved','rejected','spam','needs_changes') then raise exception 'invalid action'; end if;
  select * into s from public.submissions where id=p_submission_id for update;
  if s.id is null then raise exception 'submission not found'; end if;
  if p_action='approved' then
    if s.submission_type in ('product','service') then
      insert into public.products(slug,name,one_liner,description,url,category,pricing,intents,status,submitted_by,published_at)
      values(coalesce(nullif(s.payload->>'slug',''),regexp_replace(lower(coalesce(s.payload->>'name','product')),'[^a-z0-9]+','-','g')||'-'||substr(s.id::text,1,6)),left(coalesce(s.payload->>'name','Untitled'),160),left(coalesce(s.payload->>'oneLiner',s.payload->>'one_liner',''),300),s.payload->>'description',coalesce(s.payload->>'url',s.submitted_url),s.payload->>'category',s.payload->>'pricing',array_remove(array[s.payload->>'intent'],null),'published',s.submitter_id,now())
      returning id into new_id;
    elsif s.submission_type in ('money_signal','signal') then
      insert into public.money_signals(slug,signal_type,amount_display,headline,summary,evidence_grade,status,created_by,published_at)
      values(coalesce(nullif(s.payload->>'slug',''),'signal-'||substr(s.id::text,1,12)),coalesce(s.payload->>'type','other'),coalesce(s.payload->>'amount','—'),left(coalesce(s.payload->>'headline','Untitled'),240),s.payload->>'summary','D','published',s.submitter_id,now()) returning id into new_id;
    elsif s.submission_type='demand' then
      insert into public.demands(slug,title,problem,payer_segment,willingness_to_pay,evidence_grade,status,created_by,published_at)
      values(coalesce(nullif(s.payload->>'slug',''),'demand-'||substr(s.id::text,1,12)),left(coalesce(s.payload->>'title','Untitled'),200),coalesce(s.payload->>'problem',''),s.payload->>'payer',s.payload->>'wtp','D','published',s.submitter_id,now()) returning id into new_id;
    elsif s.submission_type='correction' then
      null;
    end if;
  end if;
  update public.submissions set status=p_action,moderation_notes=p_notes,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_submission_id;
  result:=jsonb_build_object('submission_id',p_submission_id,'action',p_action,'canonical_id',new_id);
  insert into public.moderation_audit(actor_id,subject_type,subject_id,action,reason,before_state,after_state) values(auth.uid(),'submission',p_submission_id::text,p_action,p_notes,to_jsonb(s),result);
  if s.submitter_id is not null then insert into public.notifications(user_id,type,title,body,route,object_type,object_id) values(s.submitter_id,'moderation','投稿の審査結果',case when p_action='approved' then '投稿が公開されました。' else '投稿の状態が更新されました。' end,'#/dashboard','submission',p_submission_id::text); end if;
  return result;
end;
$$;

-- -----------------------------------------------------------------------------
-- Generic updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;

do $$
declare t text;
begin
  foreach t in array array['user_preferences','research_notes','collections','listings','listing_applications','reviews','correction_requests','newsletter_subscriptions','subscriptions'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I',t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['product_memberships','user_preferences','research_notes','collections','collection_items','collection_follows','listings','listing_applications','reviews','review_helpful_votes','correction_requests','notifications','newsletter_subscriptions','subscriptions','billing_events','url_previews','moderation_audit'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

-- reset policies for idempotency
DO $$
DECLARE r record;
BEGIN
  FOR r IN select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('product_memberships','user_preferences','research_notes','collections','collection_items','collection_follows','listings','listing_applications','reviews','review_helpful_votes','correction_requests','notifications','newsletter_subscriptions','subscriptions','billing_events','url_previews','moderation_audit') LOOP
    EXECUTE format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename);
  END LOOP;
END $$;

create policy memberships_read_own on public.product_memberships for select using(user_id=auth.uid() or public.is_staff());
create policy memberships_staff_write on public.product_memberships for all using(public.is_staff()) with check(public.is_staff());

create policy preferences_own on public.user_preferences for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy notes_own on public.research_notes for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());

create policy collections_public_read on public.collections for select using((visibility='public' and status='published') or owner_id=auth.uid() or public.is_staff());
create policy collections_owner_write on public.collections for all using(owner_id=auth.uid() or public.is_staff()) with check(owner_id=auth.uid() or public.is_staff());
create policy collection_items_read on public.collection_items for select using(exists(select 1 from public.collections c where c.id=collection_id and ((c.visibility in ('public','unlisted') and c.status='published') or c.owner_id=auth.uid() or public.is_staff())));
create policy collection_items_owner_write on public.collection_items for all using(exists(select 1 from public.collections c where c.id=collection_id and (c.owner_id=auth.uid() or public.is_staff()))) with check(exists(select 1 from public.collections c where c.id=collection_id and (c.owner_id=auth.uid() or public.is_staff())));
create policy collection_follows_read_own on public.collection_follows for select using(user_id=auth.uid() or public.is_staff());
create policy collection_follows_write_own on public.collection_follows for all using(user_id=auth.uid()) with check(user_id=auth.uid());

create policy listings_public_read on public.listings for select using(status='open' or owner_id=auth.uid() or public.is_staff());
create policy listings_owner_insert on public.listings for insert with check(owner_id=auth.uid());
create policy listings_owner_update on public.listings for update using(owner_id=auth.uid() or public.is_staff()) with check(owner_id=auth.uid() or public.is_staff());
create policy listings_owner_delete on public.listings for delete using(owner_id=auth.uid() or public.is_staff());

create policy applications_parties_read on public.listing_applications for select using(applicant_id=auth.uid() or exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=auth.uid()) or public.is_staff());
create policy applications_applicant_insert on public.listing_applications for insert with check(applicant_id=auth.uid());
create policy applications_applicant_withdraw on public.listing_applications for update using(applicant_id=auth.uid()) with check(applicant_id=auth.uid() and status='withdrawn');
create policy applications_owner_update on public.listing_applications for update using(exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=auth.uid()) or public.is_staff()) with check(exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=auth.uid()) or public.is_staff());

create policy reviews_public_read on public.reviews for select using(status='published' or author_id=auth.uid() or public.is_staff());
create policy reviews_author_insert on public.reviews for insert with check(author_id=auth.uid());
create policy reviews_author_update_pending on public.reviews for update using(author_id=auth.uid() and status in ('pending','in_review')) with check(author_id=auth.uid());
create policy review_votes_own on public.review_helpful_votes for all using(user_id=auth.uid()) with check(user_id=auth.uid());

create policy corrections_own_or_staff_read on public.correction_requests for select using(requester_id=auth.uid() or public.is_staff());
create policy corrections_authenticated_insert on public.correction_requests for insert with check(requester_id=auth.uid() or requester_id is null);
create policy corrections_staff_update on public.correction_requests for update using(public.is_staff()) with check(public.is_staff());

create policy notifications_own on public.notifications for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy newsletter_own_read on public.newsletter_subscriptions for select using(user_id=auth.uid() or public.is_staff());
create policy newsletter_own_insert on public.newsletter_subscriptions for insert with check(user_id=auth.uid() or user_id is null);
create policy subscriptions_own_read on public.subscriptions for select using(user_id=auth.uid() or public.is_staff());
create policy subscriptions_staff_write on public.subscriptions for all using(public.is_staff()) with check(public.is_staff());
create policy billing_staff_only on public.billing_events for all using(public.is_staff()) with check(public.is_staff());
create policy url_previews_public_read on public.url_previews for select using(expires_at>now());
create policy url_previews_staff_write on public.url_previews for all using(public.is_staff()) with check(public.is_staff());
create policy moderation_staff_only on public.moderation_audit for all using(public.is_staff()) with check(public.is_staff());

-- Grants for public views and RPCs
grant select on public.public_listings,public.public_reviews,public.public_collections,public.public_collection_items to anon,authenticated;
grant execute on function public.sync_user_preferences(jsonb,text,text) to authenticated;
grant execute on function public.set_reaction(text,text,boolean) to authenticated;
grant execute on function public.sync_local_reactions(jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.sync_research_notes(jsonb) to authenticated;
grant execute on function public.sync_user_collections(jsonb) to authenticated;
grant execute on function public.apply_to_listing(text,text,text,text) to authenticated;
grant execute on function public.create_product_claim(text,text) to authenticated;
grant execute on function public.review_product_claim(uuid,text,text) to authenticated;
grant execute on function public.materialize_submission(uuid,text,text) to authenticated;

comment on view public.public_listings is 'Public listing rows include application_count without exposing private applications.';
comment on view public.public_reviews is 'Published reviews only. Conflicted reviews may display but are excluded from product rating counters.';
comment on function public.review_product_claim is 'Staff approval grants an explicit product membership. Verification level alone never grants edit rights.';
comment on function public.materialize_submission is 'Turns an approved structured submission into a canonical product, demand or money signal and records an audit trail.';
