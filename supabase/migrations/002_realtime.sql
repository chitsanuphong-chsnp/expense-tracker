begin;
-- Only a revision signal is published, never financial rows or deleted IDs.
create table if not exists public.data_sync_signals (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  revision uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);
alter table public.data_sync_signals enable row level security;
drop policy if exists own_signal on public.data_sync_signals;
create policy own_signal on public.data_sync_signals for select to authenticated using (owner_id=auth.uid());
revoke all on public.data_sync_signals from anon,authenticated;
grant select on public.data_sync_signals to authenticated;
grant all on public.data_sync_signals to service_role;

create or replace function public.notify_owner_data_changed() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid; prior_owner uuid;
begin
  if tg_table_name='profiles' then
    if tg_op='DELETE' then owner=old.id; else owner=new.id; end if;
  else
    if tg_op='DELETE' then owner=old.owner_id; else owner=new.owner_id; end if;
    if tg_op='UPDATE' then prior_owner=old.owner_id; end if;
  end if;
  -- A cascading account deletion must not recreate its sync signal.
  if exists(select 1 from public.profiles where id=owner) then
    insert into public.data_sync_signals(owner_id) values(owner)
    on conflict(owner_id) do update set revision=gen_random_uuid(),updated_at=now();
  end if;
  if prior_owner is distinct from owner and exists(select 1 from public.profiles where id=prior_owner) then
    insert into public.data_sync_signals(owner_id) values(prior_owner)
    on conflict(owner_id) do update set revision=gen_random_uuid(),updated_at=now();
  end if;
  return null;
end $$;
revoke all on function public.notify_owner_data_changed() from public,anon,authenticated;
do $$ declare target text; begin
  foreach target in array array['profiles','accounts','categories','category_rules','drive_sources','transactions','slips','reports','line_connections'] loop
    execute format('drop trigger if exists notify_owner_data_changed on public.%I',target);
    execute format('create trigger notify_owner_data_changed after insert or update or delete on public.%I for each row execute function public.notify_owner_data_changed()',target);
  end loop;
end $$;
insert into public.data_sync_signals(owner_id) select id from public.profiles on conflict(owner_id) do nothing;
-- Register only this table; preserve the project's existing publication.
do $$ begin
  if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='data_sync_signals') then
    alter publication supabase_realtime add table public.data_sync_signals;
  end if;
end $$;
commit;