-- One private snapshot per account; revisions prevent stale-device overwrites.
create table public.reading_libraries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null check (revision > 0),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.reading_backups (
  user_id uuid not null references auth.users(id) on delete cascade,
  revision bigint not null,
  data jsonb not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, revision)
);
alter table public.reading_libraries enable row level security;
alter table public.reading_backups enable row level security;
create policy own_library on public.reading_libraries for select to authenticated using ((select auth.uid()) = user_id);
create policy own_backups on public.reading_backups for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.reading_libraries, public.reading_backups from anon, authenticated;
grant select on public.reading_libraries, public.reading_backups to authenticated;

create function public.save_reading_library(expected_revision bigint, next_data jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  old_revision bigint;
  new_revision bigint;
begin
  if owner_id is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if next_data is null or jsonb_typeof(next_data) <> 'object'
    or next_data->'version' is distinct from '1'::jsonb
    or jsonb_typeof(next_data->'books') is distinct from 'array'
    or jsonb_typeof(next_data->'sessions') is distinct from 'array'
    or octet_length(next_data::text) > 5242880 then
    raise exception 'Invalid library snapshot' using errcode = '22023';
  end if;
  -- Per-account transaction lock also serializes creation of the first row.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
  select revision into old_revision from public.reading_libraries where user_id = owner_id;
  if expected_revision is null or expected_revision <> coalesce(old_revision, 0) then
    raise exception 'Library revision changed' using errcode = '40001';
  end if;
  new_revision := coalesce(old_revision, 0) + 1;
  insert into public.reading_libraries(user_id, revision, data)
    values(owner_id, new_revision, next_data)
    on conflict(user_id) do update set revision = excluded.revision, data = excluded.data, updated_at = now();
  insert into public.reading_backups(user_id, revision, data) values(owner_id, new_revision, next_data);
  -- Retain the most recent 30 successful saves per account.
  delete from public.reading_backups where user_id = owner_id and revision <= new_revision - 30;
  return new_revision;
end;
$$;
revoke all on function public.save_reading_library(bigint, jsonb) from public, anon;
grant execute on function public.save_reading_library(bigint, jsonb) to authenticated;
