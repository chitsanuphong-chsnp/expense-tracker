begin;
-- How the owner appears on slips. Used only to hint "own-account transfer" and the source account; never to record automatically.
alter table public.profiles add column if not exists own_names text[] not null default '{}';
alter table public.profiles drop constraint if exists profiles_own_names_limit;
alter table public.profiles add constraint profiles_own_names_limit check (cardinality(own_names) <= 5 and char_length(array_to_string(own_names, '')) <= 300);
-- Full account / PromptPay numbers, matched against masked numbers on slips (xxx-x-x8536-x).
alter table public.accounts add column if not exists numbers text[] not null default '{}';
alter table public.accounts drop constraint if exists accounts_numbers_digits;
alter table public.accounts add constraint accounts_numbers_digits check (cardinality(numbers) <= 3 and array_to_string(numbers, ',') ~ '^([0-9]{10,15}(,|$))*$');
commit;
