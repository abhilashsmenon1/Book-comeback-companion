-- Run after the migration in a local/test Supabase database, never production.
-- Test fixtures and writes are rolled back.
begin;
insert into auth.users (id, email) values
 ('10000000-0000-4000-8000-000000000001', 'reader-a@example.invalid'),
 ('10000000-0000-4000-8000-000000000002', 'reader-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.save_reading_library(0, '{"version":1,"books":[],"sessions":[]}');
do $$ begin
  if (select count(*) from public.reading_libraries) <> 1 then raise exception 'Owner cannot read library'; end if;
  begin
    perform public.save_reading_library(0, '{"version":1,"books":[],"sessions":[]}');
    raise exception 'Stale write was accepted';
  exception when serialization_failure then null; end;
  begin
    delete from public.reading_backups;
    raise exception 'Direct backup deletion was accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
do $$ begin
  if exists(select 1 from public.reading_libraries) then raise exception 'Cross-user library leak'; end if;
  if exists(select 1 from public.reading_backups) then raise exception 'Cross-user backup leak'; end if;
end $$;
select public.save_reading_library(0, '{"version":1,"books":[],"sessions":[]}');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$ declare i integer; begin
  for i in 1..32 loop
    perform public.save_reading_library(i, '{"version":1,"books":[],"sessions":[]}');
  end loop;
  if (select count(*) from public.reading_backups) <> 30 then raise exception 'Retention limit failed'; end if;
  if (select revision from public.reading_libraries) <> 33 then raise exception 'Revision mismatch'; end if;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon', 'public.save_reading_library(bigint,jsonb)', 'execute') then
    raise exception 'Anonymous writes allowed';
  end if;
end $$;
rollback;
