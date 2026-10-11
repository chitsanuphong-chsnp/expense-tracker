begin;
-- Slips whose OCR reads an amount are saved automatically; such rows wait for a quick check in the app.
alter table public.transactions add column if not exists needs_review boolean not null default false;
alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions add constraint transactions_source_check check (source in ('manual','qr','auto'));

-- Worker only (service role): save one slip's OCR draft as a transaction and link the slip. Returns null when the
-- slip is already linked, a duplicate, or gone; the caller has checked the draft and the accounts.
create or replace function public.auto_save_slip(p_owner uuid,p_slip_id uuid,p_id uuid,p_data jsonb) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare linked uuid; s_status text;
begin
  select transaction_id,status into linked,s_status from slips where id=p_slip_id and owner_id=p_owner for update;
  if not found or linked is not null or s_status='duplicate' then return null; end if;
  insert into transactions(id,owner_id,kind,amount_satang,account_id,to_account_id,category_id,occurred_at,note,counterparty,source,needs_review)
  values(p_id,p_owner,p_data->>'kind',(p_data->>'amount_satang')::bigint,(p_data->>'account_id')::uuid,
    nullif(p_data->>'to_account_id','')::uuid,nullif(p_data->>'category_id','')::uuid,
    (p_data->>'occurred_at')::timestamptz,'',coalesce(p_data->>'counterparty',''),'auto',true);
  update slips set transaction_id=p_id,status='linked',error_code=null where id=p_slip_id and owner_id=p_owner;
  return p_id;
end $$;
revoke all on function public.auto_save_slip(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.auto_save_slip(uuid,uuid,uuid,jsonb) to service_role;

-- Saving from the form counts as checked: same as 001, plus needs_review=false.
create or replace function public.save_transaction(p_id uuid,p_data jsonb,p_slip_id uuid default null) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); existing_owner uuid; sid uuid; result_id uuid; s_status text;
begin
  if uid is null then raise exception 'Unauthorized'; end if;
  select owner_id into existing_owner from transactions where id=p_id for update;
  if existing_owner is not null and existing_owner<>uid then raise exception 'Not found'; end if;
  if p_slip_id is not null then
    select transaction_id,status into result_id,s_status from slips where id=p_slip_id and owner_id=uid for update;
    if not found then raise exception 'Not found'; end if;
    if result_id is not null then return result_id; end if;
    if s_status='duplicate' then raise exception 'Use original slip'; end if;
  end if;
  insert into transactions(id,owner_id,kind,amount_satang,account_id,to_account_id,category_id,occurred_at,note,counterparty,source)
  values(p_id,uid,p_data->>'kind',(p_data->>'amount_satang')::bigint,(p_data->>'account_id')::uuid,
    nullif(p_data->>'to_account_id','')::uuid,nullif(p_data->>'category_id','')::uuid,
    (p_data->>'occurred_at')::timestamptz,coalesce(p_data->>'note',''),coalesce(p_data->>'counterparty',''),
    case when p_slip_id is null then 'manual' else 'qr' end)
  on conflict(id) do update set kind=excluded.kind,amount_satang=excluded.amount_satang,account_id=excluded.account_id,
    to_account_id=excluded.to_account_id,category_id=excluded.category_id,occurred_at=excluded.occurred_at,
    note=excluded.note,counterparty=excluded.counterparty,needs_review=false,updated_at=now()
    where transactions.owner_id=uid;
  if not found then raise exception 'Not found'; end if;
  if p_slip_id is not null then update slips set transaction_id=p_id,status='linked',error_code=null where id=p_slip_id and owner_id=uid; end if;
  return p_id;
end $$;

-- "ตรวจแล้ว" in the app.
create or replace function public.mark_reviewed(p_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  update transactions set needs_review=false,updated_at=now() where id=p_id and owner_id=auth.uid();
  if not found then raise exception 'Not found'; end if;
end $$;
revoke all on function public.mark_reviewed(uuid) from public,anon;
grant execute on function public.mark_reviewed(uuid) to authenticated;
commit;
