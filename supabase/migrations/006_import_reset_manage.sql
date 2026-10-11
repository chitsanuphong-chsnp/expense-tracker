begin;
-- Automatic Drive imports skip date folders before this day (null = no limit). Set by a reset.
alter table public.profiles add column if not exists import_from date;

-- Slips uploaded in the app: no Drive file and no stored image; QR/hash still deduplicate a later Drive copy.
alter table public.slips add column if not exists origin text not null default 'drive';
alter table public.slips drop constraint if exists slips_origin_check;
alter table public.slips add constraint slips_origin_check check (origin in ('drive','upload'));
alter table public.slips alter column drive_file_id drop not null;
alter table public.slips alter column source_id drop not null;
alter table public.slips drop constraint if exists slips_origin_fields;
alter table public.slips add constraint slips_origin_fields check (
  (origin='drive' and drive_file_id is not null and source_id is not null) or (origin='upload' and drive_file_id is null));

-- Deletes every transaction and slip of the caller (Drive files, accounts, categories, rules, settings and LINE history stay).
create or replace function public.reset_transactions_and_slips(p_import_from date) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  perform 1 from jobs where owner_id=auth.uid() and kind in ('scan','qr') for update;
  if exists(select 1 from jobs where owner_id=auth.uid() and kind in ('scan','qr') and status='running' and lease_until>now()) then
    raise exception 'IMPORT_RUNNING';
  end if;
  delete from jobs where owner_id=auth.uid() and kind in ('scan','qr');
  -- Clear self-references first; keys too, so former duplicates do not collide on the canonical indexes.
  update slips set duplicate_of=null,transaction_id=null,image_hash=null,qr_key=null where owner_id=auth.uid();
  delete from slips where owner_id=auth.uid();
  delete from transactions where owner_id=auth.uid();
  update drive_sources set cursor=null,scan_complete=false,last_scan_status=null,last_scan_at=null where owner_id=auth.uid();
  update profiles set import_from=p_import_from where id=auth.uid();
end $$;

-- An account with transactions cannot be deleted (delete or reset those first); Drive sources are unlinked.
create or replace function public.delete_account(p_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  perform 1 from accounts where id=p_id and owner_id=auth.uid() for update;
  if not found then raise exception 'Not found'; end if;
  if exists(select 1 from transactions where owner_id=auth.uid() and (account_id=p_id or to_account_id=p_id)) then
    raise exception 'ACCOUNT_IN_USE';
  end if;
  update drive_sources set account_id=null where owner_id=auth.uid() and account_id=p_id;
  delete from accounts where id=p_id and owner_id=auth.uid();
end $$;

-- Transactions of a deleted category become uncategorized; its rules go with it.
create or replace function public.delete_category(p_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  perform 1 from categories where id=p_id and owner_id=auth.uid() for update;
  if not found then raise exception 'Not found'; end if;
  update transactions set category_id=null,updated_at=now() where owner_id=auth.uid() and category_id=p_id;
  delete from category_rules where owner_id=auth.uid() and category_id=p_id;
  delete from categories where id=p_id and owner_id=auth.uid();
end $$;

do $$ declare f text; begin
  foreach f in array array['reset_transactions_and_slips(date)','delete_account(uuid)','delete_category(uuid)'] loop
    execute format('revoke all on function public.%s from public,anon',f);
    execute format('grant execute on function public.%s to authenticated',f);
  end loop;
end $$;
commit;
