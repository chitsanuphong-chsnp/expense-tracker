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

## 11 Oct 2026: scheduled ticks only, immediate sync
- `supabase/schedule.sql` replaces the every-5-minute dispatcher (288 calls a day) with four jobs, 8 calls a day: 23:35–00:00 every 5 min, 08:00, 08:05 (no backup scan for now) (Bangkok). Rerunnable; removes `expense-dispatch`. A test expands the cron fields from the file and checks every call against `shouldScan`/`dueReportPeriods`, including deliveries 4 minutes late.
- "ซิงก์ตอนนี้" runs the import immediately (60 s budget per call, up to 10 calls) under the shared tick lease; reports busy instead of overlapping a scheduled run; refused for non-Drive-owner accounts (API tests).
- Failed jobs keep the existing backoff and retry at the next scheduled call; missed reports still catch up 7 days. pg_cron itself is not available in PGlite, so the SQL runs untested until Supabase.

## 11 Oct 2026: Tesseract on Vercel, no income, OCR from the app
- OCR engine is Tesseract.js inside the API. Build ships Thai/English models (`@tesseract.js-data/*`), a bundled worker and the engine `.wasm` in `dist/` (a @vercel/nft trace showed the `.wasm` files would otherwise be missing). Verified with `tesseract.js-core` hidden from `node_modules`.
- 16 real slips through `readSlipOcr`: amount, date, time and own-transfer hint 16/16 each; ~1.3 s per slip. Real slips and their OCR text stay out of Git.
- "อ่าน OCR สลิปที่ค้าง" now queues and runs immediately (same lease and 60 s loop as "ซิงก์ตอนนี้"). Paddle workflow is manual only (no schedule).
- Income removed from the app: dashboard tiles (income, net), reports cards, per-account income, record form option (still shown when editing an old income entry) and the type filter; demo data has no income. Existing income categories in a real account remain until deleted.
- Typecheck, 90 tests, API/Web build passed. Not yet run on a real Vercel deployment.

## 11 Oct 2026: date-range import, slip upload, edit/delete, reset, LINE test, header
- `006_import_reset_manage.sql`: `profiles.import_from`, upload-origin slips (no Drive ID or image), RPCs `reset_transactions_and_slips`, `delete_account`, `delete_category`. PGlite tests: owner-scoped reset keeps setup and other owners, blocked during a live import; an upload slip makes a later Drive copy a duplicate; account in use refused; category delete uncategorizes and removes its rules. A reset bug (former duplicates colliding on the canonical QR index) was found by the test and fixed by clearing keys first.
- Scan by date range (fake-Drive test: only in-range date folders and loose files by created date; stops before the deadline). Night scans use yesterday–today from `import_from`.
- API tests: sync with range/source and reversed-range 400; upload creates an upload slip with QR key and returns the existing slip for duplicates; LINE test refuses when not connected.
- UI (screenshots at 390x844, demo): slips page "ดึงสลิปจาก Drive" + "เลือกรูปสลิป" (OCR button removed, settings sync moved here); record form has one "โอนเข้าบัญชีของฉันไหม" picker instead of type chips; settings lists accounts/categories/rules with edit/delete, account numbers inside account edit, import-from date, LINE test button, reset with confirmation; new header with brand tile, date and rounded buttons. No console errors.
- Typecheck, 99 tests, API/Web build passed. Upload and LINE test not yet run against real Supabase/LINE; expo-image-picker added for photo selection.

## 11 Oct 2026: settings menu, dark mode, report filter, swipe back, opening animation, error messages
- Settings: topic cards (accounts, categories, rules, Drive, names, LINE, budget, display, user account, reset); one section open at a time.
- Dark mode: system/light/dark per device. Light colours stay the source; `theme.ts` maps surfaces to a slate palette with a hint of hue, ink to light text, accents brighter; chart bars use a calm indigo. Screens remount on theme change (data provider kept). Screenshots of home, reports, settings, record in both themes; no console errors.
- Report filter: segment day/week/month plus ‹ period › navigator (no future periods), replaces segment + date field.
- Swipe back: from the left edge (<28 px), page follows the finger; only in standalone PWA and native (Safari tabs already have it). Browser test: edge swipe goes back, mid-screen drag does not, normal tab unaffected.
- Opening animation on every launch: mascot springs in and waves, coins and sparkles, title, then zoom/fade reveal (~2 s). Mascot centred using its measured bounding box (checked at 390 and 337 px wide).
- Icon: `icon-v2.png` for header, login, app icon, favicon and PWA manifest.
- Settings not saving after sign-in: API errors reached the app only as generic codes. Missing columns/functions now return `MIGRATION_REQUIRED` (tested) and the app shows Thai messages, e.g. run migrations 005/006. Real-account saving still needs those migrations.
- Typecheck, 100 tests, API/Web build passed.

- LINE Flex redesign: compact gradient header (linearGradient box background with solid fallback) with title, amount, item count and a 60 px mascot; accounts with colour dots (no categories or share bars, since most spending is uncategorised); tinted status box (pending, OCR draft, own transfers); secondary/primary buttons. In-app preview renders the same payload (gradient, radius, padding, widths) on a light bubble in both themes. Payload under 30 KB (test).

## 12 Oct 2026 (afternoon): quick entry, LINE after import, record form
- Quick entry on home: favourite shops row → bottom sheet with a big amount and own number pad (no phone keyboard), allowed accounts per shop (7-Eleven starter: ttb first, then cash), optional category with 19 suggested ones (a missing one is created on save), shop editor (name, icon, accounts in order, default category, delete). Migration 008 `profiles.quick_shops` (≤12, null = starter); settings PATCH validates with `quickShop`. Checked in demo: 7-Eleven ฿45.50 → today 429 → 474.50, cash tile 45.50, check modal.
- After a Drive import with new slips the app calls `POST /api/line/import-summary` (one Flex for the chosen days, title "สรุปวันที่ …" or "สรุป 5 ต.ค. – 11 ต.ค."; skipped when LINE is not connected; range ≤ 62 days).
- 7-Eleven logo (owner's file `assets/shops/7eleven.png`, 3840 × 3723 green tile): padded to a square with the logo's own green (#008061) instead of cropping, so the rounded corners never cut the logo; 160 px `7eleven-icon.png` (5 KB). Shown on the home row, amount sheet and icon picker; checked at 3× zoom.
- Record form: "ผู้รับ" label; note hidden behind "+ เพิ่มหมายเหตุ".
- Tests 118 pass (check-migrations 14 rows).

## 12 Oct 2026: slips tab, home period bar, slip bank kept
- Drive import result: "บันทึกอัตโนมัติ N รายการ · ตรวจได้ในแท็บ ยังไม่ตรวจ" and "อ่านยอดไม่ได้ N ใบ · รอคุณกรอก"; `GET /api/sync/status` also returns `saved` (auto transactions since the import began). Checked with a mocked API (5 found, 4 saved, 1 waiting).
- Cash accounts show a filled green circle with a centred ฿, the same size as the bank logos (chips, rows, settings); checked zoomed in for centring.
- LINE Flex account rows show the round bank logo (or the green ฿ for cash) instead of a colour dot: 96 px PNGs in `apps/app/public/line/banks/` (ttb/MAKE with a thin ring so the white circle shows on white), linked only for a public HTTPS origin, colour dot otherwise. `Summary.byAccount[].bank` from `accountBank`. Preview and `examples/line-flex` updated; tests check the URLs and the shipped files.
- Bottom bar gets "สลิป" (with a red count of pending + unchecked); the slips page opens with a "เพิ่มสลิป" card (two buttons that unfold the Drive import or the upload form; the import keeps running and showing progress when folded) above the slip box with counted tabs.
- Home period bar: วันนี้ / เมื่อวาน / สัปดาห์นี้ / เดือนนี้ / calendar day; the hero amount, cash and own-transfer tiles follow it. Checked today 429, yesterday 306, a picked day 0 in demo.
- Fix: the form opened from a slip fell back to the first account when the slip's Drive source had no linked account, so the detected bank changed. Now sender number → linked account → account named after the bank (`accountForBank`/`accountBank` in core, also used by auto-save and the bank icons). Tests added.

## 11 Oct 2026 (night): auto-save slips, transfers apart, review tab
- Owner changed the rule: slips whose OCR amount is read are saved automatically. `autoTransaction` (core) picks the source account from the sender number or the Drive source's account, makes a transfer when the recipient number is another own account, uses the slip date/time or the upload time, applies category rules; no amount or no bank account → stays pending. Migration 007: `transactions.needs_review`, source `auto`, `auto_save_slip` (service role only), `mark_reviewed`, `save_transaction` clears the flag. Tests: `tests/auto-save.test.ts` (unit + PGlite), check-migrations now 13 rows.
- Worker saves after OCR; `POST /api/sync` also saves earlier pending slips with a readable draft; upload saves and opens the row; `POST /api/transactions/:id/reviewed`.
- Own transfers are no longer spending: `Summary.transfers`, Flex line "โอนเข้าบัญชีตัวเอง ฿X (N รายการ) · ไม่รวมในยอด", home 2×2 tiles, transfers-only list from the tile, ⇄ rows without minus.
- Slip box tab "บันทึกอัตโนมัติ (N)" with the saved values beside the image, "แก้ไข" / "ตรวจแล้ว". Checked in demo: tab → modal → ตรวจแล้ว (check modal, tab empties); transfer tile → filtered list.

## 11 Oct 2026 (evening): no report catch-up
- Slips page: the import result shows under "ดึงสลิปตอนนี้" and the upload result under "เลือกรูปสลิป" (were both at the card bottom).
- Fix: "ดึงสลิปตอนนี้" pressed again within the same 5 minutes reused the finished scan job key, so nothing was scanned (the bar showed 0 of 0). Each press now queues a fresh scan job. Test fails on the old code, passes now.
- `dueReportPeriods`: from 08:00 only yesterday, last week on Mondays, last month on the 1st. Missed days are never sent later (was up to 7 days). Queued reports still retry within 23 h. Tests updated (104 pass).

## 11 Oct 2026 (evening): bank icons, one-line chips, import cancel
- Bank logos supplied in `apps/app/assets/banks/` cut to equal 96 px circles (`*-icon.png`, 3–5 KB each; Krungthai's white margin trimmed, K+ cropped round) and shown with a hairline ring before bank/account names: chips, slip cards, Drive sources, settings accounts, transaction rows. Checked on home, transactions, record and slips screens.
- `Choices` chips stay on one line and scroll sideways everywhere (segmented bars unchanged).
- Import calls wait up to 2 min (were cut at 30 s while the server works ~60 s per round); network/timeout errors get Thai messages.
- Cancel button on the progress card: aborts waiting and calls `POST /api/sync/cancel` (drops queued scan/QR jobs). Checked with a mocked API: "ยกเลิกแล้ว · สลิปที่ดึงมาแล้วยังอยู่ · ยกเลิก 3 งานที่ค้าง".
- When an import finds no new slip the app says so (folder not uploaded yet at 23:30, or already imported) instead of a plain success.
- 104 tests pass; typecheck and build pass.

## 11 Oct 2026 (later): transfers count as spending, manual import sends no LINE, success modal, import progress
- Spending ("ใช้ไป") now includes own-account transfers (counted on the source account) in the app, reports and Flex; the "ไม่รวมโอนระหว่างบัญชี" captions are gone; OCR drafts that look like own transfers join the draft total.
- Transaction rows all look the same (red, "-"); a transfer row shows "ต้นทาง → ปลายทาง". The type filter is removed; filters are tidy rows (dates, then account and category chips that scroll sideways) with an active count and a clear button.
- "ดึงสลิปตอนนี้" runs only scan/QR jobs (`tick(...,importOnly)`): it no longer queues or sends LINE reports. Test `tests/import-only-tick.test.ts`.
- Import progress bar polls `GET /api/sync/status` (pending/done/slips found). Checked with a mocked API: 0:01 searching, 0:04 1/7, 0:07 3/7, then the check modal.
- Success modal after every successful action (auto-closes ~1.2 s). Checked: delete transaction → modal → list 21 → 20.
- Inputs 16 px so iOS does not zoom on focus.
- Flex: the "ดูสลิปรอข้อมูล" button also hides when nothing is pending.
- 103 tests pass; typecheck and build pass.

## 11 Oct 2026 (later): Flex hides empty pending notes
- The "รอข้อมูล N สลิป" line shows only when N > 0; the yellow status box is left out when it has no lines; altText drops the pending part at 0. New test in `tests/flex.test.ts` (101 tests). Preview checked with 0 pending.

## 11 Oct 2026 (later): no "จ่าย" wording, number-free opening animation
- Every remaining "จ่าย" in the app, the Flex empty state and the docs now reads "ใช้ไป" (e.g. "ยังไม่มียอดใช้ไปในช่วงนี้", picker "ไม่ใช่ (ใช้ไป)", demo category "ทั่วไป").
- Opening animation trimmed to the final scene: gradient, wallet icon pops with a spreading ring, bars grow one by one, title rises, then fade. No amounts, no slip card (~2.2 s).

## 11 Oct 2026: light by default, dark mode on every screen, story opening animation
- Default theme is light; dark or system is opt-in per device.
- Dark audit of every screen and modal (home, transactions, record, calendar, slips + detail, reports, each settings section, LINE preview, notification, account): fixed the transactions list staying white (a background routed through the text helper), glaring home chart bars, and pale primary buttons (separate deeper button colour). Palette moved to charcoal (#0c0e13 page, #161920 cards).
- Opening animation now shows the app's flow: a slip slides in, a scan line reads it and a "✓ อ่านแล้ว" tick appears, it files into the wallet icon, today's spending counts up with a small chart, then the title. The mascot (reading pose) stands beside the slip without moving. The pre-font frame uses the same gradient so there is no flash. Colour changes use opacity only, so the native driver works on phones. Frames checked at 600–3300 ms; no console errors.

- 12 Oct 2026 OCR amount fix: real K-PLUS slip (1,000.00) re-run through Tesseract locally; parser now reads 100000 satang. Drafts without an amount from the older parser are read again once on import. typecheck, Vitest 120 passed, build passed.
