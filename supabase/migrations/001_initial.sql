begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  budget_satang bigint not null default 2000000 check (budget_satang >= 0),
  reporting_started_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.accounts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(name) between 1 and 100), kind text not null check (kind in ('bank','cash')),
  bank_code text, color text not null default '#5575e7', unique(id,owner_id)
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(name) between 1 and 100), color text not null default '#a2abc0', unique(id,owner_id)
);
create table public.category_rules (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  counterparty text not null check (length(counterparty) between 1 and 200), category_id uuid not null,
  foreign key(category_id,owner_id) references public.categories(id,owner_id), unique(owner_id,counterparty)
);
create table public.drive_sources (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  source_code text not null check (source_code in ('ttb','kplus','krungthai','make')),
  folder_id text not null check (folder_id ~ '^[A-Za-z0-9_-]{10,200}$'), account_id uuid,
  last_scan_at timestamptz, last_scan_status text, scan_complete boolean not null default false,
  cursor jsonb, unique(owner_id,source_code), unique(id,owner_id),
  foreign key(account_id,owner_id) references public.accounts(id,owner_id)
);
create table public.transactions (
  id uuid primary key, owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check(kind in ('income','expense','transfer')),
  amount_satang bigint not null check(amount_satang > 0 and amount_satang <= 999999999999),
  account_id uuid not null, to_account_id uuid, category_id uuid,
  occurred_at timestamptz not null, note text not null default '' check(length(note)<=500),
  counterparty text not null default '' check(length(counterparty)<=200), source text not null default 'manual' check(source in ('manual','qr')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,owner_id),
  foreign key(account_id,owner_id) references public.accounts(id,owner_id),
  foreign key(to_account_id,owner_id) references public.accounts(id,owner_id),
  foreign key(category_id,owner_id) references public.categories(id,owner_id),
  check((kind='transfer' and to_account_id is not null and to_account_id<>account_id) or (kind<>'transfer' and to_account_id is null))
);
create index transaction_period on public.transactions(owner_id,occurred_at);
create table public.slips (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  source_code text not null check(source_code in ('ttb','kplus','krungthai','make')), drive_file_id text not null,
  source_id uuid not null, name text not null, uploaded_at timestamptz not null,
  status text not null default 'queued' check(status in ('queued','processing','needs_details','qr_unreadable','duplicate','linked','failed')),
  image_hash text, qr_payload text, qr_key text, duplicate_of uuid, transaction_id uuid, error_code text,
  created_at timestamptz not null default now(), unique(owner_id,drive_file_id), unique(id,owner_id),
  foreign key(source_id,owner_id) references public.drive_sources(id,owner_id),
  foreign key(transaction_id,owner_id) references public.transactions(id,owner_id),
  foreign key(duplicate_of,owner_id) references public.slips(id,owner_id)
);
create unique index canonical_image on public.slips(owner_id,image_hash) where duplicate_of is null and image_hash is not null;
create unique index canonical_qr on public.slips(owner_id,qr_key) where duplicate_of is null and qr_key is not null;
create unique index slip_transaction on public.slips(owner_id,transaction_id) where transaction_id is not null;
create index slips_period on public.slips(owner_id,uploaded_at);
create table public.jobs (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  job_key text not null, kind text not null check(kind in ('scan','qr','report')), payload jsonb not null,
  status text not null default 'pending' check(status in ('pending','running','done','failed')),
  next_run_at timestamptz not null default now(), lease_until timestamptz, lease_token uuid, attempts integer not null default 0,
  error_code text, created_at timestamptz not null default now(), unique(owner_id,job_key)
);
create index due_jobs on public.jobs(status,next_run_at);
create table public.scheduler_leases (
  id text primary key, token uuid not null, lease_until timestamptz not null
);
create table public.reports (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  report_key text not null, period_start timestamptz not null, period_end timestamptz not null,
  snapshot jsonb not null, status text not null default 'pending', first_attempt_at timestamptz, sent_at timestamptz, error_code text,
  created_at timestamptz not null default now(), unique(owner_id,report_key)
);
create table public.line_connections (
  owner_id uuid primary key references public.profiles(id) on delete cascade, line_user_id text not null unique,
  blocked boolean not null default false, connected_at timestamptz not null default now()
);
create table public.line_link_codes (
  code_hash text primary key, owner_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null, used_at timestamptz
);

-- Server-managed integrations are readable only through sanitized API results.
do $$ declare t text; begin
  foreach t in array array['profiles','accounts','categories','category_rules','drive_sources','transactions','slips','jobs','scheduler_leases','reports','line_connections','line_link_codes'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
  foreach t in array array['accounts','categories','category_rules','drive_sources','transactions','slips','reports'] loop
    execute format('create policy own_read on public.%I for select to authenticated using (owner_id=auth.uid())',t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
end $$;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
grant select on public.profiles to authenticated;
grant all on all tables in schema public to service_role;

create function public.create_profile() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into profiles(id) values(new.id);
  insert into accounts(owner_id,name,kind,bank_code,color) values
    (new.id,'ttb','bank','011','#5575e7'),(new.id,'K-PLUS','bank','004','#34ac95'),
    (new.id,'Krungthai','bank','006','#5ba7dc'),(new.id,'MAKE','bank','004','#9d7ae5'),(new.id,'เงินสด','cash',null,'#e6ad4b');
  insert into categories(owner_id,name,color) values
    (new.id,'อาหาร','#e4a055'),(new.id,'เครื่องดื่ม','#b488de'),(new.id,'เดินทาง','#6b99e2'),
    (new.id,'Shopping','#df81a5'),(new.id,'ค่าใช้จ่ายทั่วไป','#8ca3b5'),(new.id,'เงินเดือน','#49b097'),(new.id,'รายได้อื่น ๆ','#65b2c0');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile();

-- A transaction and slip link are committed together. Same request ID is retry-safe.
create function public.save_transaction(p_id uuid,p_data jsonb,p_slip_id uuid default null) returns uuid
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
    note=excluded.note,counterparty=excluded.counterparty,updated_at=now()
    where transactions.owner_id=uid;
  if not found then raise exception 'Not found'; end if;
  if p_slip_id is not null then update slips set transaction_id=p_id,status='linked',error_code=null where id=p_slip_id and owner_id=uid; end if;
  return p_id;
end $$;
create function public.link_slip(p_slip_id uuid,p_transaction_id uuid) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); current_id uuid; s_status text;
begin
  if uid is null then raise exception 'Unauthorized'; end if;
  if not exists(select 1 from transactions where id=p_transaction_id and owner_id=uid) then raise exception 'Not found'; end if;
  select transaction_id,status into current_id,s_status from slips where id=p_slip_id and owner_id=uid for update;
  if not found then raise exception 'Not found'; end if;
  if current_id=p_transaction_id then return current_id; end if;
  if current_id is not null or s_status='duplicate' then raise exception 'Already linked or duplicate'; end if;
  update slips set transaction_id=p_transaction_id,status='linked',error_code=null where id=p_slip_id and owner_id=uid;
  return p_transaction_id;
end $$;
create function public.delete_transaction(p_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  perform 1 from transactions where id=p_id and owner_id=auth.uid() for update;
  if not found then raise exception 'Not found'; end if;
  update slips set transaction_id=null,status=case when qr_payload is null then 'qr_unreadable' else 'needs_details' end where transaction_id=p_id and owner_id=auth.uid();
  delete from transactions where id=p_id and owner_id=auth.uid();
end $$;

create function public.claim_job() returns setof public.jobs language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update slips s set status='failed',error_code='WORKER_TIMEOUT'
    from jobs j where j.kind='qr' and j.status='running' and j.lease_until<now() and j.attempts>=5
    and s.id=(j.payload->>'slip_id')::uuid and s.owner_id=j.owner_id and s.transaction_id is null and s.status<>'duplicate';
  update jobs set status='failed',lease_token=null,lease_until=null,error_code='WORKER_TIMEOUT'
    where status='running' and lease_until<now() and attempts>=5;
  return query update jobs set status='running',lease_until=now()+interval '4 minutes',lease_token=gen_random_uuid(),attempts=attempts+1
  where id=(select id from jobs where ((status='pending' and next_run_at<=now()) or (status='running' and lease_until<now())) and attempts<5
    order by case kind when 'scan' then 0 when 'qr' then 1 else 2 end,next_run_at for update skip locked limit 1) returning *;
end $$;
create function public.acquire_tick() returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid;
begin
  insert into scheduler_leases(id,token,lease_until) values('tick',gen_random_uuid(),now()+interval '6 minutes')
    on conflict(id) do update set token=excluded.token,lease_until=excluded.lease_until
    where scheduler_leases.lease_until<now() returning token into result;
  return result;
end $$;
create function public.release_tick(p_token uuid) returns void language sql security definer set search_path=public,pg_temp as $$
  delete from scheduler_leases where id='tick' and token=p_token;
$$;
create function public.finish_qr(p_id uuid,p_hash text,p_payload text,p_qr_key text,p_error text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid; canonical uuid;
begin
  select owner_id into uid from slips where id=p_id for update;
  if uid is null then raise exception 'Not found'; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  select id into canonical from slips where owner_id=uid and id<>p_id and duplicate_of is null
    and ((p_hash is not null and image_hash=p_hash) or (p_qr_key is not null and qr_key=p_qr_key)) limit 1;
  update slips set image_hash=p_hash,qr_payload=p_payload,qr_key=p_qr_key,duplicate_of=canonical,
    status=case when canonical is not null then 'duplicate' when p_payload is null then 'qr_unreadable' else 'needs_details' end,error_code=p_error
    where id=p_id and transaction_id is null;
  return coalesce(canonical,p_id);
end $$;
create function public.consume_line_code(p_hash text,p_line_user text) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid;
begin
  update line_link_codes set used_at=now() where code_hash=p_hash and used_at is null and expires_at>now() returning owner_id into uid;
  if uid is null then return false; end if;
  insert into line_connections(owner_id,line_user_id) values(uid,p_line_user) on conflict(owner_id) do update set line_user_id=excluded.line_user_id,blocked=false,connected_at=now();
  return true;
end $$;

-- No default PUBLIC execute on security-definer procedures.
revoke all on all functions in schema public from public,anon,authenticated;
grant execute on function public.save_transaction(uuid,jsonb,uuid),public.link_slip(uuid,uuid),public.delete_transaction(uuid) to authenticated;
grant execute on all functions in schema public to service_role;
commit;

