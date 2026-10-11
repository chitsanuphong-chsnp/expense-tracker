# Validation

## Passed locally

- TypeScript: core, API and Expo app.
- Web production export with bundled four Noto font files, manifest, icons and service worker.
- iOS and Android Hermes bundles export successfully. Device testing still remains.
- 22 automated tests: exact satang parsing, 23:00 Thai cutoff, pending nightly uploads, Monday/week and leap-month boundaries, report scheduling, transfer exclusion, CSV formula escaping, actual image QR decoding, CRC rejection, payment QR rejection, blank-image behavior, webhook HMAC, API authentication, LINE quota and stable retry/409 behavior. Includes expired-job recovery without another job, manual links retained after delayed QR completion, and denying the primary Drive credentials to another owner.
- PostgreSQL migration runs in PGlite (PostgreSQL WASM). Tests execute real SQL, RLS and security-definer functions with two authenticated owners. They cover foreign-owner reads/edits/deletes/references, atomic fill/link retries, delete/reset, duplicate file/hash/reference behavior, unknown QR payloads, expired/exhausted leases and one-time LINE codes.
- Local API server starts and reports health without credentials; private functionality fails closed until configured.
- Browser UI verification: cash add 123.45 → daily total 393.45; edit 150 → total 420; delete → total 270. Link an existing 85-baht entry → total unchanged, pending reduced. Complete another slip for 60 → total 330. Transfer 1000 between owned accounts → total remains 330.
- Responsive browser checks at 1440×1000 and 390×844; mobile has no horizontal overflow. CSV generation is tested automatically; a browser download event could not be captured in the in-app browser and remains unverified there.

- Motion and Flex preview follow-up: reduced-motion preference persists after reload; daily/weekly/monthly previews, JSON and slip navigation verified at desktop/mobile widths. The three added tests verify example totals and the shared Flex payload. See MOTION-FLEX.md.

## Still requires configured services / devices

- Real QR samples from ttb, K-PLUS, Krungthai and MAKE; no real bank slip was provided for parser validation. Unsupported/ref-only QR remains pending; automatic amount ingestion is not enabled.
- Supabase hosted Auth, Vault, pg_cron and pg_net. PGlite validates database logic, not hosted extension/network behavior.
- Drive service account permissions, real pagination/downloads and nightly uploads.
- Vercel deployment/bundling, actual LINE Flex acceptance/quota/push and webhook pairing.
- Expo Go on physical iPhone/Android; native bundle export alone does not confirm device behavior.
- Closing all local devices while scheduled Cloud work runs.

The user requested repo and setup guide first because the cloud accounts are not created yet. No external message or deployment has been performed.

## Dependency audit

Patched image processing to sharp 0.35.5 and tests to Vitest 5.0.3. The installed Expo toolchain still reports transitive npm advisories (including braces/node-forge/xcode tooling); npm's suggested force fix would downgrade/break the Expo stack. Do not run `npm audit fix --force` blindly. Tooling consumes this trusted repo's build configuration rather than user-controlled glob/certificate inputs. Recheck audit and compatible Expo updates before public service rollout. This is a known remaining dependency risk, not a clean-audit claim.

## Notification preview follow-up

- App TypeScript and web export passed. Browser checks verified replay, close and tap-to-dismiss, plus monthly altText and desktop/mobile layout. No new dependencies or runtime console errors observed.
- The banner is an in-app simulation, not an OS notification. Actual LINE delivery and device notification settings remain unverified until LINE is configured.


## Mobile UI refresh

- App TypeScript and web production export passed. Responsive checks at 320×740, 390×844 and 1440×1000 passed. Cash add/delete totals, filters, report tabs, slip navigation and scroll reset were verified in the browser. The test cash record was removed. See MOBILE-UI.md.


## Quick entry, reports and anime mascot — 2026-10-06
26 tests passed; app TypeScript passed. Web and final iOS/Android Hermes exports passed. Calendar date/month boundaries, remembered manual account after reload, existing slip account preservation, period presets, category percentages and demo test-row cleanup verified. 320/390 mobile and 1440 desktop views inspected; reduced motion stops mascot CSS animation. Actual device FPS, Expo Go and real Drive image loading remain unverified. See QUICK-ENTRY-REPORTS-MASCOT.md. No backend, QR or financial calculation changes.


## 6 Oct 2026: mascot in modals and LINE
- Calendar, slip details, delete confirmation and image zoom share ModalCompanion; simulated Noti has a static mascot avatar.
- Daily / weekly / monthly Flex uses HTTPS public mascot PNGs. All three dist/line images served 200 image/png, each under 40 KB.
- 36 tests passed; core/API/app TypeScript passed; web/PWA and iOS/Android exports passed.
- Browser verified mobile 390x844 and desktop 1440x1000; delete cancelled without changing data. Reduced motion stopped dialog animations; original preference restored.
- Real LINE delivery, real Drive image zoom and physical native devices not tested. Details: MASCOT-DIALOGS-LINE.md.


## 6 Oct 2026: borderless modal mascot
- Browser inspection confirmed the black rectangle was the auto focus outline of the mascot button.
- Modal mascots now render decorative, unfocusable views on transparent backgrounds. Other mascot instances remain interactive.
- App TypeScript and Expo web/PWA export passed. Browser verified the delete dialog at 390x844 and 1440x1000; character animation remains active and its header contains no mascot button.
- Delete was cancelled; no transaction changed.

## 6 Oct 2026: consistent mascot proportions
- Rebalanced the waving puppet's head, torso and arm; preserve source aspect ratios and place the arm behind its shoulder.
- Removed the differently proportioned blink overlay and breathing scale. Motion distances now scale with the displayed character; home mobile width is 76px and companion banners are 68px.
- App TypeScript and Expo web/PWA export passed. All five poses inspected on the preview; home and reports verified at 390x844 and 1440x1000.
- Calendar and delete dialogs have static mascots; cancel/confirm remain side by side. Linked-slip details, all three Flex periods and simulated Noti inspected. No console errors.
- No transaction changes, new dependencies or generated images. Physical iOS/Android devices, actual FPS and real Drive image zoom were not tested in this pass.

## 6 Oct 2026: paired buttons across the app
- Shared ActionRow keeps related actions horizontal with equal widths; record, dialogs, calendar, slips, LINE settings, configured login and preview use it. Flex footer shares widths and pagination buttons are both 90px.
- Verified 320/390 mobile and 1440 desktop layouts; calendar/delete cancelled, JSON toggled and Flex slip navigation followed without changing transactions.
- Core/API/app TypeScript, 36 tests and Expo Web/PWA export passed. No new dependencies. Live LINE, configured auth, unlinked real slips and physical native devices remain unverified. See BUTTON-LAYOUT.md.

## 6 Oct 2026: remove the overlapping mascot arm
- The old torso contained its own left arm; a separately attached waving arm added a second silhouette. Wave/idle now use complete existing drawings, with layout-only margin normalization and gentle whole-character motion.
- App TypeScript and Web/PWA export passed. All five poses inspected at desktop 1280x720 and the home card at mobile 390x844. Local rAF wave sample was 142.8 Hz with changing transforms; this is not a device FPS guarantee.
- Modal and LINE mascots remain static. No generated images, raster edits, new dependencies or transaction changes. See QUICK-ENTRY-REPORTS-MASCOT.md.


## 7 Oct 2026: local OCR drafts and slip deletion
- `003_ocr.sql` adds nullable `slips.ocr_details`; `004_delete_slips.sql` adds owner-scoped `delete_unrecorded_slips`. Both are safe to rerun.
- Tests cover owner-scoped deletion, recorded transactions kept, duplicate references removed with their original, and refusal while an import lease is running. Drive files are never touched.
- OCR benchmark on four user slips is in OCR.md (Paddle selected; 12/12 amount/date/time fields on that small sample only). OCR remains a reviewed draft and never creates transactions.
- Paddle needs a local Python worker; OCR is not deployed on Vercel.

## 11 Oct 2026: migration status and docs
- User confirmed 002_realtime, 003_ocr and 004_delete_slips were run in hosted Supabase SQL Editor. Hosted Realtime refresh, OCR queue and delete flow still need a manual app check.
- Added read-only `supabase/check-migrations.sql`; a PGlite test confirms it reports 002–004 as missing on 001 only, then all seven checks pass after applying them.
- README updated: OCR draft rules, slip deletion and the migration check.
- Typecheck, 78 tests and API/Web build passed. No runtime code, dependency or SQL migration changes.

## 11 Oct 2026: 08:00 daily report and OCR on GitHub Actions
- Daily LINE report moves from 23:15 to 08:00 for the full previous day. Pending slips count when uploaded 08:00 that day to 08:00 the report morning (covers the 23:30 phone upload), once only. Unreviewed OCR amounts appear as a separate line, never in totals. Drive scans 23:35–00:30 and a 06:30 backup.
- `.github/workflows/slip-ocr.yml` runs PaddleOCR at 01:30 and a check-first 06:45 backup; failed slips retry at most three times; runner prints counts and safe error codes only.
- Typecheck, 81 tests, API/Web build passed. Preview checked at 390x844: settings schedule copy, daily Flex title by date and the OCR draft line.
- Paddle 3.3.0 installs on Linux, but this cloud container blocks the model download host, so end-to-end OCR on GitHub Actions is untested until the first manual run. Scheduled workflows need the file on `main`.
- LINE Flex shows spending only: income, net and per-account income removed; account rows read "ใช้ไป".
- `005_own_identity.sql` adds `profiles.own_names` (max 5). A recipient matching the owner's name (title/space-insensitive, first name or full) marks the slip as a likely own-account transfer: excluded from the OCR draft total, counted on its own Flex line, and the record form preselects "โอน". The owner still confirms. Tests cover masked Thai/English names, short names and the migration constraint (82 tests).
- Real-slip check (16 user slips: 8 K-PLUS, 6 ttb, 1 Krungthai, 1 MAKE), Tesseract only because this environment cannot download Paddle models. Compared with values read from the images: amount 16/16, date/time 14/16 (two K-PLUS month names unreadable, left empty, none wrong), own-account transfers flagged 3/3 with no false match on a relative sharing the surname. Parser fixes from this run: amount up to five lines below the label; masked MAKE sender name. Paddle on these slips still needs the first GitHub Actions run.
- `005_own_identity.sql` also adds `accounts.numbers` (max 3 full account/PromptPay numbers, digits only). Masked slip numbers are matched digit-by-digit (at least three visible digits) before names: recipient match → likely own transfer and preselected destination; sender match → source account (separates MAKE and K-PLUS on one bank).
- When a month name is unreadable, the date is filled from the upload day or the day before only if day number and year match; it is labelled for review. Re-parsing the same 16 real slips: amount 16/16, date/time 16/16 (2 filled from the upload day), sender number 13/16 (three ttb bill payments unreadable, fall back to the source mapping). 86 tests.

