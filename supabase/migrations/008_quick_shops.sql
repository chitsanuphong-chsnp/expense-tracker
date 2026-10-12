begin;
-- Favourite shops for quick entry on the home screen (e.g. 7-Eleven paid by cash or ttb/TrueMoney).
-- null = not set up yet (the app shows a 7-Eleven starter); an array once the owner edits the list.
alter table public.profiles add column if not exists quick_shops jsonb;
alter table public.profiles drop constraint if exists profiles_quick_shops_check;
alter table public.profiles add constraint profiles_quick_shops_check check (
  quick_shops is null or (jsonb_typeof(quick_shops)='array' and jsonb_array_length(quick_shops)<=12));
commit;
