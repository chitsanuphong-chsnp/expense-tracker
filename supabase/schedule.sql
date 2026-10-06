-- Run after API deployment. Set these secrets using Supabase Vault UI first:
-- expense_api_url = https://YOUR-API.vercel.app (no trailing slash)
-- expense_cron_secret = same value as CRON_SECRET in Vercel
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$ declare old_id bigint; begin
  for old_id in select jobid from cron.job where jobname='expense-dispatch' loop perform cron.unschedule(old_id); end loop;
end $$;
select cron.schedule('expense-dispatch','*/5 * * * *',$$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='expense_api_url')||'/api/internal/tick',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='expense_cron_secret')),
    body:='{}'::jsonb, timeout_milliseconds:=230000
  );
$$);
