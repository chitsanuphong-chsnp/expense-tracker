begin;
alter table public.slips add column if not exists ocr_details jsonb;
comment on column public.slips.ocr_details is 'OCR draft fields, not bank-verified; requires owner review before creating a transaction.';
commit;