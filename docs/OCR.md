# Local OCR selection and setup

Compared Tesseract.js 7.0.0 (Thai + English, AUTO and SPARSE_TEXT) against PaddleOCR 3.7.0 / PaddlePaddle 3.3.0 on the four user-provided slips. Images were processed locally; no images were sent to an OCR service. Downloaded packages/models only.

Ground truth transcribed before scoring: K-PLUS 2.00 THB at 2026-10-05 21:40; Krungthai 2.00 THB at 21:40; MAKE 0.63 THB at 21:41; ttb 40.00 THB at 10:55. All fees are 0.00 and are excluded from amount extraction.

| Engine/config | Amount/date/time | Warm inference per image | Observations |
|---|---|---|---|
| Tesseract AUTO | 12/12 fields | 0.85–1.50 s | Some Thai names and references corrupted; ttb sender line polluted by logo |
| Tesseract SPARSE_TEXT | 12/12 fields | 0.82–1.35 s | Cleaner ttb names; MAKE mask/reference corrupted |
| Paddle v5 mobile detector + Thai mobile recognizer, oneDNN off | 12/12 fields | 13.10–16.54 s | Cleaner Thai words, account masks and names by visual review; reference O/0 can still be wrong |

Selection: Paddle for better text quality on these four samples, with Tesseract retained as the faster option. This is a four-image development benchmark, not a general accuracy claim or proof of fraud detection. Names were visually reviewed, not assigned a numeric accuracy score. QR remains the authoritative source of the extracted transaction reference.

The first Paddle server-detector attempt exceeded the practical per-image budget and was stopped. oneDNN acceleration failed on this Windows/Paddle combination (ConvertPirAttribute2RuntimeAttribute). Explicit mobile detection plus Thai recognition with oneDNN disabled completed all four. A draft adapter test using the final repository implementation also read all amount/date/time fields correctly (about 12–17 seconds each, including Python process startup).

## Current setup (11 Oct 2026): Tesseract on Vercel

Day-to-day OCR is Tesseract.js inside the API (`OCR_ENGINE=tesseract`, `OCR_ENABLED=true`), chosen to keep everything on Vercel. The build copies Thai/English `4.0.0_best_int` models (`@tesseract.js-data/tha`, `@tesseract.js-data/eng`) to `apps/api/dist/tessdata`, bundles the OCR worker to `dist/tesseract-worker.cjs` and places the engine `.wasm` files next to it, because Vercel's file tracing skips the `.wasm` files tesseract.js-core reads from disk. Nothing is downloaded at run time; a run with `tesseract.js-core` removed from `node_modules` still worked.

OCR runs right after QR in each night scan and when the app's "ซิงก์ตอนนี้" / "อ่าน OCR สลิปที่ค้าง" buttons are pressed. On 16 real user slips (8 K-PLUS, 6 ttb, 1 Krungthai, 1 MAKE) through the production code path: amount 16/16, date 16/16 (two filled from the upload day), time 16/16, own-account transfer hint 16/16; about 1.3 s per slip. Small sample; drafts still require review.

1. Run `supabase/migrations/003_ocr.sql` (and 005) in Supabase SQL Editor.
2. Set `OCR_ENABLED=true`, `OCR_ENGINE=tesseract` in Vercel (or `apps/api/.env` locally) and redeploy/restart.
3. Open Slips → "อ่าน OCR สลิปที่ค้าง", then review each draft before saving.

OCR never creates transactions. Account numbers and names only hint at own-account transfers; the owner confirms. No OCR text is bank verification. Model errors leave a retryable draft marker; QR results are kept.

## Backup plan: Paddle on GitHub Actions (manual)

If Tesseract proves inaccurate, `.github/workflows/slip-ocr.yml` runs PaddleOCR on GitHub's machine. It has no schedule; start it from Actions → Slip OCR → Run workflow (the file must be on `main`). It needs GitHub Secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `DRIVE_OWNER_ID`. It checks first and exits when nothing is pending, logs counts only (the repository is public) and retries a failed slip at most three times. To use Paddle locally instead: Python 3.12 venv with `services/ocr/requirements.txt`, `OCR_ENGINE=paddle`, `OCR_PYTHON=<python path>`; the first run downloads the PP-OCRv5 models. Keep real slips and raw OCR output out of Git.

## Accuracy check on all Drive slips (local, read-only)

`npx tsx --env-file=apps/api/.env scripts/ocr-eval.ts [limit]` lists every image in the configured Drive folders, runs the configured OCR engine, and writes `.local/ocr-eval.csv` (gitignored). For slips already recorded as transactions it compares OCR amount, date and time with the recorded values and prints match counts. It never writes to the database. Keep the CSV private.
