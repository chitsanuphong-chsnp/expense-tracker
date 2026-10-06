# ตั้งค่าใช้งานจริง

ระบบเข้าสู่ระบบใหม่: ดู [AUTH.md](AUTH.md) สำหรับ OTP อีเมลฟรี, SMTP, Google, การเชื่อมบัญชี, callback และเบอร์โทรที่ยังปิด SMS

## 1. Supabase Free

1. สร้างโปรเจกต์ Supabase ส่วนตัว เลือก region ใกล้ไทย
2. เปิด SQL Editor วางไฟล์ `supabase/migrations/001_initial.sql` แล้ว Run **ครั้งเดียวในโปรเจกต์ใหม่** ไฟล์สร้างตารางและ policy ไม่ใช่ script สำหรับรันทับฐานข้อมูลที่มีอยู่
3. ใน Authentication → Sign In / Providers ปิด **Allow new users to sign up**
4. ไป Authentication → Users → Add user → Create user สร้าง email/password ของคุณ และยืนยันอีเมลผ่านตัวเลือกที่หน้า admin จัดไว้ ทำขั้นนี้หลัง migration เพื่อให้ trigger สร้างบัญชีและหมวดตั้งต้น
5. เก็บ Project URL, anon key และ service role key จากหน้า API settings / API Keys ไม่ใส่ service role ในแอป

ทุกตารางข้อมูลส่วนตัวมี owner_id และ RLS แม้ v1 มีบัญชีเดียว การเขียนธุรกรรมผ่าน RPC ตรวจเจ้าของบัญชี หมวด และสลิป รวมการเชื่อมสลิปใน transaction เดียว

## Realtime

หลังสร้างตารางแล้ว รัน `supabase/migrations/002_realtime.sql` ใน SQL Editor เพื่อเปิดการอัปเดตอัตโนมัติ ดู [REALTIME.md](REALTIME.md) สำหรับรายละเอียดและการทดสอบ

## 2. Backend ทดสอบในเครื่อง

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/app/.env.example apps/app/.env
```

แก้ `apps/api/.env`:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
CRON_SECRET=RANDOM_SECRET_AT_LEAST_32_CHARACTERS
APP_ORIGIN=http://localhost:8081
GOOGLE_SERVICE_ACCOUNT_EMAIL=YOUR_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
DRIVE_OWNER_ID=YOUR_USER_UUID_FROM_SUPABASE_AUTH
LINE_CHANNEL_ACCESS_TOKEN=YOUR_LINE_CHANNEL_ACCESS_TOKEN
LINE_CHANNEL_SECRET=YOUR_LINE_CHANNEL_SECRET
PORT=3001
```

แก้ `apps/app/.env` เฉพาะค่าสาธารณะ:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_DEMO_MODE=false
EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=false
EXPO_PUBLIC_SMS_AUTH_ENABLED=false
```

เปิด PowerShell สองหน้าต่างที่ root repo:

```powershell
npm run dev:api
```

```powershell
npm run dev
```

ล็อกอินผ่านหน้าแอป ตรวจ `http://localhost:3001/api/health` ควรแสดง `configured: true` หากเปลี่ยน env ของ Expo ต้อง restart dev server หรือ rebuild เว็บ

ยังไม่ต้องมี LINE token เพื่อบันทึกเอง แต่ยังส่งรายงานไม่ได้

## 3. Google Drive เดิม

ใช้ Shortcuts และ Apps Script ที่ทำงานแล้วต่อได้ **ไม่ต้องเปลี่ยน URL หรืออัปโหลดผ่าน Backend เพิ่ม**

1. สร้าง Google Cloud project และเปิด Google Drive API
2. สร้าง service account และคีย์ JSON แล้วตั้งค่า email/private_key ใน Backend เท่านั้น เก็บไฟล์ JSON นอก repo ตั้ง `DRIVE_OWNER_ID` เป็น UUID บัญชีของคุณจาก Supabase Authentication → Users เพื่อผูก service account กับบัญชีหลัก บัญชีอื่นจะใส่ folder ID ของคุณเพื่ออ่านข้อมูลไม่ได้
3. ใน Drive แชร์โฟลเดอร์ธนาคารทั้งสี่ให้ email ของ service account แบบ **Viewer** สิทธิ์สืบทอดไปยังโฟลเดอร์วันที่และภาพ ห้ามเปิดเป็น Anyone with the link
4. เข้าแต่ละโฟลเดอร์ เช่น `Expense/slips/ttb` แล้วคัดลอกส่วนหลัง `/folders/` จาก URL เป็น folder ID
5. ในแอป → ตั้งค่า → แหล่งสลิป ใส่ ID ของโฟลเดอร์ธนาคาร ไม่ใช้ ID ของโฟลเดอร์วันที่
6. เลือกบัญชีเงินจริงที่แต่ละแหล่งใช้ ถ้า MAKE/K-PLUS เป็นบัญชีเดียวกัน ให้เลือกบัญชีเดียวกัน
7. กด **ตรวจ Drive รอบถัดไป** งานจะเข้าคิว รอ tick ครั้งต่อไป หน้า UI จะแสดงสถานะตรวจและสลิป

รอบแรกไล่โฟลเดอร์/หน้ารายการเดิมทั้งหมด มี checkpoint รอบถัดไปตรวจหาไฟล์เพิ่ม แต่ไม่อ่าน QR ของไฟล์ที่ทำเสร็จแล้วซ้ำ ไฟล์ใหญ่กว่า 12 MB หรือภาพเกิน 24 ล้านพิกเซลจะถูกปฏิเสธและแสดงงานผิดพลาด ให้คงการย่อ JPEG อัตโนมัติใน Shortcuts เดิม

ระบบเก็บ createdTime ของ Drive เป็น **เวลาอัปโหลด** ไม่ใช้แทนวันที่ทำธุรกรรม บนหน้าบันทึกต้องระบุวันเวลาเงินจริงเองเมื่อ QR ไม่มีข้อมูล

## 4. Deploy Vercel สองโปรเจกต์

สร้าง Git remote ส่วนตัวแล้ว push repo ก่อน หรือใช้ Vercel CLI ที่ root แต่ละแอป สร้างสองโปรเจกต์จาก Git repository เดียวกัน:

| ค่า | Backend | เว็บ |
|---|---|---|
| Root Directory | `apps/api` | `apps/app` |
| Framework Preset | Other | Other |
| Install Command | `npm ci` | `npm ci` |
| Build Command | `npm run build -w @expense/api` | `npm run build -w @expense/app` |
| Output Directory | ไม่ override (ใช้ Node Function `api/index.ts`) | `dist` |

เปิด Include source files outside of the Root Directory หาก Vercel แสดงตัวเลือกนี้ เพื่ออ่าน workspace `packages/core` และ root lockfile เลือก Node.js 22.x และเปิด Fluid compute สำหรับ Backend; `maxDuration` ตั้งไว้ 300 วินาที worker จบภายในงบเวลาประมาณ 205 วินาที

ตั้ง Backend Environment Variables ตามไฟล์ `.env.example` โดยเปลี่ยน APP_ORIGIN เป็น URL เว็บจริงแบบไม่มี `/` ท้าย ตั้ง env สาธารณะของเว็บให้ใช้ API URL จริง ตั้ง DEMO_MODE=false แล้ว redeploy ทั้งสองฝั่งเมื่อเปลี่ยนค่า

ตรวจ API `/api/health` และล็อกอินเว็บก่อนตั้ง Schedule ค่า CORS ยอมรับเฉพาะ APP_ORIGIN ที่ตั้งไว้ Preview domain ที่ต่างจาก production จะไม่ผ่าน CORS โดยอัตโนมัติ

อย่าเปิด deployment protection ที่บล็อก endpoint `/api/internal/tick` และ LINE webhook ด้วยหน้า sign-in ของ Vercel; endpoint ทั้งสองมี secret/signature ของตัวเองอยู่แล้ว

Vercel Hobby ใช้สำหรับโครงการส่วนตัวที่ไม่ใช่เชิงพาณิชย์ ตรวจโควตาก่อนเปิดใช้งานจริง บริการฟรีอาจล่าช้าหรือพักโปรเจกต์ ไม่มี SLA

## 5. LINE OA / Messaging API

Flex รายวัน/สัปดาห์/เดือนมีรูปน้องคนละท่า ไฟล์ตกแต่งอยู่ใน `apps/app/public/line/` และถูกส่งออกพร้อม Expo Web ให้ `APP_ORIGIN` ใช้โดเมนเว็บจริงแบบ HTTPS และทดสอบเปิด `${APP_ORIGIN}/line/mascot-reading-v2.png` จากหน้าต่างที่ไม่ล็อกอินได้ รูปตัวละครเปิดสาธารณะได้; ภาพสลิปยังต้องตรวจสิทธิ์เช่นเดิม URL ใน localhost จะไม่แนบรูปลง payload ที่ส่งจริง พรีวิวในแอปใช้ภาพที่ฝังไว้และไม่เรียก LINE

รูปใน Flex เป็น PNG ภาพนิ่ง ขนาดต่ำกว่า 40 KB ต่อรูป แอนิเมชันใช้เฉพาะในแอป ตาม [ข้อกำหนด image ของ LINE Flex](https://developers.line.biz/en/reference/messaging-api/#f-image) ต้องใช้ HTTPS และมีขนาดไม่เกิน 1024 × 1024 pixels.


1. สร้าง LINE Official Account แล้วเปิด Messaging API ผ่านหน้า LINE OA Manager
2. ไป LINE Developers console คัดลอก Channel secret และสร้าง Channel access token เก็บไว้ใน Backend Vercel เท่านั้น
3. ตั้ง Webhook URL เป็น `https://YOUR_API.vercel.app/api/line/webhook` เปิด Use webhook และ Verify
4. เพิ่ม OA เป็นเพื่อนใน LINE ของคุณ ปิด auto-reply/greeting ที่ไม่ต้องการได้เอง
5. ในแอป → ตั้งค่า → LINE → สร้างรหัส คัดลอกข้อความ `LINK ...` ส่งให้ OA ในแชตส่วนตัวภายใน 5 นาที
6. กลับแอปกดโหลดข้อมูลใหม่ สถานะต้องแสดงเชื่อมแล้ว Webhook ตรวจ HMAC ก่อนอ่านรหัส และใช้รหัสได้ครั้งเดียว

รหัสใช้เชื่อมเฉย ๆ ระบบยังไม่ตอบกลับแชตยืนยัน ตรวจสถานะในแอปแทน

ตารางส่งตามเวลา Asia/Bangkok:

- รายวัน 23:15: ยอดธุรกรรมวันนี้ก่อน 23:00 และสลิปรอข้อมูลที่อัปโหลดวันนี้รวมรอบ 23:00
- รายสัปดาห์ จันทร์ 08:00: สัปดาห์จันทร์–อาทิตย์ก่อนหน้า
- รายเดือน วันที่ 1 เวลา 08:00: เดือนก่อนหน้า

ส่งแม้ข้อมูลยังไม่ครบ พร้อมข้อความว่ารอยอดกี่สลิป ตรวจ quota/consumption ก่อน push ถ้าโควตาหมดจะเก็บข้อผิดพลาด ไม่เปลี่ยนไปใช้แพ็กเกจเสียเงินเอง รายงานเก็บ snapshot และใช้ UUID เดิมเป็น LINE retry key

LINE เก็บ retry key 24 ชั่วโมง หากงานขาดช่วงนานเกิน 23 ชั่วโมงหลังเริ่มส่ง ระบบหยุดส่งอัตโนมัติด้วย `LINE_DELIVERY_UNKNOWN` เพื่อหลีกเลี่ยงข้อความซ้ำ ให้ตรวจประวัติใน LINE และฐานข้อมูลก่อนตัดสินใจส่งใหม่

## 6. Supabase Cron ทุก 5 นาที

ไม่ตั้ง Vercel Cron ใน repo นี้ ใช้ Supabase Cron เป็นตัวเรียก API; API เลือกงานที่ถึงเวลาเอง

1. ไป Supabase → Integrations / Database → Vault เพิ่ม secret สองชื่อ:
   - `expense_api_url`: URL Backend ไม่มี `/` ท้าย
   - `expense_cron_secret`: ค่าเดียวกับ CRON_SECRET ใน Backend
2. ใน SQL Editor รัน `supabase/schedule.sql` ตรวจว่ามี job `expense-dispatch` หนึ่งรายการ
3. ใน Cron dashboard ตรวจ run history และตรวจ HTTP response เพิ่ม เพราะสถานะ Cron สำเร็จอาจหมายถึงส่ง HTTP request เข้าคิวแล้ว ยังไม่ใช่ worker สำเร็จ

```sql
select jobname, schedule, active from cron.job;
select start_time, status, return_message from cron.job_run_details order by start_time desc limit 10;
select id, status_code, timed_out, error_msg from net._http_response order by id desc limit 10;
select kind, status, error_code, attempts, next_run_at from public.jobs order by created_at desc limit 30;
```

ตรวจ Drive ช่วง 23:05–23:55 ทุก 5 นาที และ 07:05 อีกรอบ งานที่มีคิวค้าง retry และรายงานที่ตกค้างยังทำต่อใน tick รอบอื่นได้ global lease หมดอายุหลัง 6 นาที (นานกว่า timeout ของ Vercel) และ job lease หลัง 4 นาที รายงานวันย้อนหลัง catch up สูงสุด 7 วัน เฉพาะช่วงหลังเริ่มบัญชี

เมื่อ deploy และ Cron พร้อม ปิดคอมและแอปได้ งานรันบน Cloud ทดสอบจริงด้วยการอัปโหลดสลิป ดูสถานะนำเข้าและรับ LINE หนึ่งรอบก่อนใช้ประจำ

## 7. Expo Go / มือถือ

```powershell
npm run start -w @expense/app
```

สแกน QR ของ Expo ด้วย Expo Go ที่รองรับ Expo SDK 57 เครื่องและมือถืออยู่ Wi-Fi เดียวกัน ใช้ URL Backend ที่ deploy แล้วสำหรับ `EXPO_PUBLIC_API_URL`; localhost บนมือถือคือมือถือเอง หากต้องทดสอบ API ใน LAN ให้ใส่ IP ของคอมและเปิดพอร์ต 3001 ตามที่คุณอนุญาต

รองรับ export bundle iOS/Android แต่รอบนี้ยังไม่ได้ทดสอบบนอุปกรณ์จริง ถ้า Expo Go เวอร์ชันที่ติดตั้งรองรับ SDK ต่างกัน ต้องใช้เวอร์ชันที่ตรงกันหรือพัฒนา build ภายหลัง ไม่จำเป็นต้องมี Mac สำหรับเว็บ/PWA และการลองผ่าน Expo Go

บนเว็บ HTTPS ใช้ Safari → แชร์ → เพิ่มไปยังหน้าจอโฮม หรือ Install app ของ Chrome/Edge เพื่อใช้งาน PWA

## 8. สำรองข้อมูลและแก้ปัญหา

ส่งออก CSV จากหน้า Reports สำหรับรายการเงิน CSV ไม่มีภาพ/QR หรือ configuration; สำรองฐานข้อมูลครบด้วย PostgreSQL dump ในระยะใช้งานจริง รูปต้นฉบับยังอยู่ใน Drive

- `NOT_CONFIGURED`: ตรวจ env Backend 3 ค่า Supabase และ restart/redeploy
- `DRIVE_403/404`: เปิด Drive API และแชร์โฟลเดอร์ให้ service account แบบ Viewer
- `DRIVE_NOT_ENABLED_FOR_ACCOUNT`: ตั้ง DRIVE_OWNER_ID ให้ตรง UUID ผู้ใช้หลัก; v1 ไม่เปิดการเชื่อม Drive ของผู้ใช้อื่น
- `QR_NOT_FOUND`: อ่านภาพไม่ได้ ใช้เติมรายละเอียดเองหรือปรับการย่อรูปใน Shortcuts ให้ QR คม
- `LINE_QUOTA_EXCEEDED`: ตรวจแพ็กเกจ/เดือนโควตา ไม่มีการคิดเงินเพิ่มโดยระบบ
- `WORKER_TIMEOUT`: งานหมดจำนวน retry ตรวจ job และลองอ่านสลิปใหม่จากหน้าสลิป
- Login ได้แต่ API ไม่ได้: ตรวจ API URL, APP_ORIGIN และ CORS ให้ตรง production domain

อ้างอิง: [Supabase Cron](https://supabase.com/docs/guides/cron), [Vercel Function limits](https://vercel.com/docs/functions/limitations), [LINE retry](https://developers.line.biz/en/docs/messaging-api/retrying-api-request/), [LINE pricing](https://developers.line.biz/en/docs/messaging-api/pricing/), [Mini-QR parser](https://github.com/maythiwat/promptparse)
