-- Run after API deployment. Safe to rerun. Set these secrets using Supabase Vault UI first:
-- expense_api_url = https://YOUR-API.vercel.app (no trailing slash)
-- expense_cron_secret = same value as CRON_SECRET in Vercel
--
-- pg_cron uses UTC. Bangkok = UTC+7. The API is called only at these times (8 calls a day):
--   23:35–23:55 every 5 min  (16:35–16:55 UTC)  Drive scan + QR after the 23:30 phone upload
--   00:00                    (17:00 UTC)        last night call
--   08:00                    (01:00 UTC)        LINE reports: daily / Monday weekly / 1st monthly
--   08:05                    (01:05 UTC)        retry round for a failed report
-- OCR (Tesseract) runs inside the API during the night calls; the GitHub Actions Paddle workflow is a manual backup only.
-- If cron.job_run_details says: null value in column "url" of relation "http_request_queue", a Vault secret above is missing.
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$ declare old_id bigint; begin
  -- Remove the old every-5-minute dispatcher and any earlier copy of these jobs (including a removed 06:30 backup).
  for old_id in select jobid from cron.job where jobname='expense-dispatch' or jobname like 'expense-tick-%' loop
    perform cron.unschedule(old_id);
  end loop;
end $$;
do $$ declare job record; command text := $cmd$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='expense_api_url')||'/api/internal/tick',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='expense_cron_secret')),
    body:='{}'::jsonb, timeout_milliseconds:=230000
  );
$cmd$; begin
  for job in select * from (values
    ('expense-tick-scan-night',    '35-55/5 16 * * *'),
    ('expense-tick-scan-midnight', '0 17 * * *'),
    ('expense-tick-report',        '0 1 * * *'),
    ('expense-tick-report-retry',  '5 1 * * *')
  ) as t(name,schedule) loop
    perform cron.schedule(job.name,job.schedule,command);
  end loop;
end $$;
select jobname,schedule,active from cron.job where jobname like 'expense-%' order by jobname;
