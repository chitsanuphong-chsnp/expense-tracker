-- Read-only: reports whether migrations 001–007 are applied. Safe to run any time in Supabase SQL Editor.
select migration,item,ok from (values
  ('001_initial','table public.slips',to_regclass('public.slips') is not null),
  ('001_initial','function public.save_transaction',to_regprocedure('public.save_transaction(uuid,jsonb,uuid)') is not null),
  ('002_realtime','table public.data_sync_signals',to_regclass('public.data_sync_signals') is not null),
  ('002_realtime','trigger on public.slips',exists(select 1 from pg_trigger where tgname='notify_owner_data_changed' and tgrelid=to_regclass('public.slips'))),
  ('002_realtime','publication supabase_realtime',exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='data_sync_signals')),
  ('003_ocr','column public.slips.ocr_details',exists(select 1 from information_schema.columns where table_schema='public' and table_name='slips' and column_name='ocr_details')),
  ('004_delete_slips','function public.delete_unrecorded_slips',to_regprocedure('public.delete_unrecorded_slips(uuid)') is not null),
  ('005_own_identity','column public.profiles.own_names',exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='own_names')),
  ('005_own_identity','column public.accounts.numbers',exists(select 1 from information_schema.columns where table_schema='public' and table_name='accounts' and column_name='numbers')),
  ('006_import_reset_manage','column public.slips.origin',exists(select 1 from information_schema.columns where table_schema='public' and table_name='slips' and column_name='origin')),
  ('006_import_reset_manage','function public.reset_transactions_and_slips',to_regprocedure('public.reset_transactions_and_slips(date)') is not null),
  ('007_auto_save','column public.transactions.needs_review',exists(select 1 from information_schema.columns where table_schema='public' and table_name='transactions' and column_name='needs_review')),
  ('007_auto_save','function public.auto_save_slip',to_regprocedure('public.auto_save_slip(uuid,uuid,uuid,jsonb)') is not null)
) as checks(migration,item,ok)
order by migration,item;
