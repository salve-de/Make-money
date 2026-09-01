-- Create one public profile row for every authenticated user.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    nullif(lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'user_name', ''), '[^a-zA-Z0-9_-]+', '', 'g')), ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill users created before this migration.
insert into public.profiles (id, handle, display_name)
select
  u.id,
  nullif(lower(regexp_replace(coalesce(u.raw_user_meta_data ->> 'user_name', ''), '[^a-zA-Z0-9_-]+', '', 'g')), ''),
  nullif(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), '')
from auth.users u
on conflict (id) do nothing;
