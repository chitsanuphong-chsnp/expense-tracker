# Realtime data refresh

Run `supabase/migrations/002_realtime.sql` in Supabase SQL Editor after `001_initial.sql`. The second migration is safe to rerun and preserves existing data. Do not rerun the initial migration in an existing project.

The migration publishes only `data_sync_signals`, which contains the owner ID, a random revision, and update time. RLS permits each authenticated user to read only their own signal. Clients cannot modify these signals. Triggers update the signal transactionally after changes to profiles, accounts, categories, rules, Drive sources, transactions, slips, reports and LINE connections. Deletes also update the signal; financial rows and deleted IDs are not published by this implementation.

The app listens for its owner's INSERT/UPDATE events, coalesces bursts for 350 ms, then reloads via the authenticated API. A signal arriving during a request queues another refresh so updates are not lost. Data reloads when the subscription reconnects and when the app becomes visible, receives focus, or regains connectivity. No 15-second polling remains. Background updates preserve existing data and form state; API failures can be retried manually. Demo mode does not subscribe.

Verification: app TypeScript passes; migration/database tests pass (11 tests), including reruns, existing/new users, insert/update/delete, rollback, owner isolation, forbidden writes and cascading user deletion. Hosted event delivery requires applying the migration in Supabase and remains to be verified.

Manual check: keep Slips open, run the backend import worker, and confirm imported or processed slips appear without clicking refresh. Reconnect after being offline; data should reload. Keep a record form open while another event arrives and confirm typed values remain.