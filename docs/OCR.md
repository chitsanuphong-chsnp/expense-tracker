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

## Activate

1. Run `supabase/migrations/003_ocr.sql` in Supabase SQL Editor. Safe to rerun; it adds only nullable `slips.ocr_details`. Existing owner RLS and Realtime signal triggers cover the new data.
2. In `apps/api/.env`, set `OCR_ENABLED=true`. `OCR_ENGINE=paddle` and the absolute `OCR_PYTHON` executable path have been prepared on this development machine. The installed isolated Python environment is outside this repo under the Codex task workspace.
3. Restart `npm run dev:api`.
4. Open Slips and click the OCR backlog button; run the existing local internal tick command (or deployed scheduler). Pending unlinked/nonduplicate slips are queued. New QR jobs subsequently run OCR automatically. Realtime updates the app when draft results are stored.
5. Open the slip and choose the review/save button. Amount and date/time populate the record form; edits are not overwritten by background refresh.

OCR never creates financial transactions automatically in this version. Direction and own-account transfers need verified account identity rules first, and partly masked names cannot establish those identities. Drafts require review. No OCR text is treated as bank verification. Model errors leave a retryable draft marker; QR processing is retained.

## Reproduce on another machine

Create a Python 3.12 virtual environment and install `services/ocr/requirements.txt`; set OCR_PYTHON to its Python executable. The first prediction downloads the official PP-OCRv5_mobile_det and th_PP-OCRv5_mobile_rec models. `services/ocr/infer.py` uses CPU and keeps log output away from the structured response. Temporary image files are removed after inference. Keep real slips and raw OCR outputs out of Git.

Paddle requires a Python-capable worker. This local setup does not install Python in Vercel or deploy a free OCR host. Cloud OCR hosting and scheduling remain a separate deployment step. Tesseract's Node path is available with `OCR_ENGINE=tesseract`; its language models are downloaded on first use.