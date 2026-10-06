begin;
create or replace function public.delete_unrecorded_slips(p_id uuid default null) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare ids uuid[]; total integer;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  -- Hold queue rows so a worker cannot claim existing jobs during deletion.
  perform 1 from jobs where owner_id=auth.uid() and kind in ('scan','qr') for update;
  if exists(select 1 from jobs where owner_id=auth.uid() and kind in ('scan','qr') and status='running' and lease_until>now()) then
    raise exception 'IMPORT_RUNNING';
  end if;
  perform 1 from slips where owner_id=auth.uid() for update;
  if p_id is not null and not exists(select 1 from slips where id=p_id and owner_id=auth.uid() and transaction_id is null) then
    raise exception 'SLIP_NOT_DELETABLE';
  end if;
  with recursive targets as (
    select id from slips where owner_id=auth.uid() and transaction_id is null and (p_id is null or id=p_id)
    union
    select s.id from slips s join targets t on s.duplicate_of=t.id where s.owner_id=auth.uid() and s.transaction_id is null
  ) select coalesce(array_agg(id),'{}'::uuid[]) into ids from targets;
  delete from jobs where owner_id=auth.uid() and kind='qr' and payload->>'slip_id'=any(select x::text from unnest(ids) x);
  -- Remove duplicate references within the deletion set first (financial records are preserved).
  update slips set duplicate_of=null,image_hash=null,qr_key=null where owner_id=auth.uid() and id=any(ids);
  delete from slips where owner_id=auth.uid() and id=any(ids);
  get diagnostics total=row_count;
  return total;
end $$;
revoke all on function public.delete_unrecorded_slips(uuid) from public,anon;
grant execute on function public.delete_unrecorded_slips(uuid) to authenticated;
commit;
