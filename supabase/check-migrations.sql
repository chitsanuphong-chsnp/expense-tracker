-- Read-only: reports whether migrations 001–004 are applied. Safe to run any time in Supabase SQL Editor.
select migration,item,ok from (values
  ('001_initial','table public.slips',to_regclass('public.slips') is not null),
  ('001_initial','function public.save_transaction',to_regprocedure('public.save_transaction(uuid,jsonb,uuid)') is not null),
  ('002_realtime','table public.data_sync_signals',to_regclass('public.data_sync_signals') is not null),
  ('002_realtime','trigger on public.slips',exists(select 1 from pg_trigger where tgname='notify_owner_data_changed' and tgrelid=to_regclass('public.slips'))),
  ('002_realtime','publication supabase_realtime',exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='data_sync_signals')),
  ('003_ocr','column public.slips.ocr_details',exists(select 1 from information_schema.columns where table_schema='public' and table_name='slips' and column_name='ocr_details')),
  ('004_delete_slips','function public.delete_unrecorded_slips',to_regprocedure('public.delete_unrecorded_slips(uuid)') is not null)
) as checks(migration,item,ok)
order by migration,item;
