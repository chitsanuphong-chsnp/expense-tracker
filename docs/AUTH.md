# ระบบเข้าสู่ระบบ

## สิ่งที่เตรียมไว้

- `/login`: อีเมล/รหัสผ่าน, OTP อีเมล, Google, ลืมรหัสผ่าน, แสดง/ซ่อนรหัสผ่าน, จดจำการเข้าสู่ระบบ
- `/auth/callback`: รับ OAuth และลิงก์รีเซ็ตรหัสผ่านแบบ PKCE
- `/auth/reset-password`: ตั้งรหัสผ่านใหม่หลังยืนยันตัวตน แล้วออกจากระบบเพื่อเข้าสู่ระบบด้วยรหัสใหม่
- `/account`: ดูช่องทางของบัญชี เชื่อม Google และเตรียมเชื่อมเบอร์ที่ยืนยันด้วย OTP
- `/api/me`: ข้อมูลช่องทางที่ยืนยันแล้วของผู้ใช้ปัจจุบัน ไม่มี user metadata หรือ session token
- บัญชีส่วนตัว v1 ไม่มีหน้าสมัครสมาชิกสาธารณะ OTP ใช้ `shouldCreateUser: false`

ยังต้องสร้าง Supabase และตั้งค่า provider/SMTP ก่อนใช้งานจริง โหมดตัวอย่างไม่มีการส่ง OTP หรือเข้าสู่ Google และไม่อ้างว่ายืนยันตัวตนแล้ว

## 1. Supabase ฟรีและบัญชีแรก

ทำ migration และสร้างผู้ใช้ email/password ตาม [SETUP.md](SETUP.md) ก่อน ตรวจว่า email ของบัญชีแรกยืนยันแล้ว ปิด Allow new users to sign up และ Anonymous sign-ins ใน Supabase

Authentication → URL Configuration:

- Site URL: URL เว็บจริงของคุณ
- Redirect URLs: `http://localhost:8081/auth/callback` สำหรับเครื่องพัฒนา
- เพิ่ม `https://YOUR_APP.vercel.app/auth/callback` และโดเมนจริงถ้ามี
- สำหรับ native development/production build เพิ่ม `expense-tracker://auth/callback`
- ใช้รายการ URL ที่เจาะจง ไม่เปิด wildcard ให้โดเมนอื่น

ใน Authentication ตั้ง Password minimum length อย่างน้อย 10 ตัวอักษร OTP length 6 digits และตรวจ expiry/rate limits ของโครงการ แอปมีการรอส่งซ้ำ 60 วินาที แต่ rate limit ฝั่ง Supabase เป็นข้อบังคับจริง ผู้ใช้ยังสามารถเรียก API โดยตรงได้

## 2. OTP อีเมลและรีเซ็ตรหัสผ่านโดยไม่เสียเงินภายในโควตา

Supabase built-in SMTP เหมาะทดสอบ: ส่งเฉพาะอีเมลสมาชิกทีมโครงการและจำกัดประมาณ 2 อีเมลต่อชั่วโมง จึงควรตั้ง Custom SMTP สำหรับใช้งานจริง [เอกสาร Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

ตัวเลือกที่มีแพ็กเกจฟรีคือ Brevo Free ซึ่งระบุโควตา 300 อีเมลต่อวันและรองรับ transactional SMTP ตรวจโควตาจริงบนบัญชีอีกครั้งก่อนเปิดใช้ [Brevo Free](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan), [Brevo SMTP](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP)

1. สมัคร Brevo Free เพิ่มและยืนยัน sender email ของคุณ
2. เปิด Transactional → SMTP & API คัดลอก SMTP host, port, login และสร้าง SMTP key
3. วางใน Supabase Authentication → SMTP Settings → Enable Custom SMTP ใช้ SMTP key เป็น password ไม่ใช่บัญชี Brevo password
4. ใส่ sender email ที่ยืนยันแล้วและ sender name เช่น Expense Tracker
5. เก็บ SMTP key ใน Supabase เท่านั้น ไม่ใส่ Expo env, repo หรือแชต
6. ทดสอบส่งไปอีเมลบัญชีส่วนตัว ตรวจ spam และ rate limits ของทั้งสองบริการ

Authentication → Email Templates → Magic Link: เปลี่ยนเนื้อหาให้แสดง OTP แทนปุ่ม magic link เช่น:

```html
<h2>รหัสเข้าสู่ Expense Tracker</h2>
<p>รหัสยืนยันของคุณ: <strong>{{ .Token }}</strong></p>
<p>หากไม่ได้ขอรหัสนี้ สามารถละเว้นอีเมลนี้ได้</p>
```

Email Template → Reset Password: เก็บลิงก์ `{{ .ConfirmationURL }}` ไว้ เช่น:

```html
<h2>ตั้งรหัสผ่านใหม่</h2>
<p><a href="{{ .ConfirmationURL }}">ตั้งรหัสผ่าน Expense Tracker</a></p>
```

OTP อีเมลใช้รหัส 6 หลักจาก template ส่วน reset ใช้ลิงก์ PKCE ต้องเปิดจากเครื่อง/เบราว์เซอร์ที่ขอลิงก์ การขอ reset ตอบข้อความกลาง ไม่บอกว่ามีอีเมลนั้นหรือไม่ [OTP อีเมล](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Password recovery](https://supabase.com/docs/guides/auth/passwords)

## 3. Google Login

1. สร้าง Google Cloud project → Google Auth Platform/OAuth consent screen ให้เรียบร้อย เพิ่มบัญชีคุณเป็น test user ถ้าอยู่ testing
2. สร้าง OAuth Client แบบ Web application
3. Authorized redirect URI ใช้ `https://YOUR_PROJECT.supabase.co/auth/v1/callback` จากหน้า Google provider ของ Supabase ไม่ใช่ `/auth/callback` ของแอป
4. ใน Supabase Authentication → Sign In / Providers → Google เปิด provider วาง Client ID และ Client Secret
5. เปิด **Allow manual linking** ใน Supabase หากจะใช้ปุ่มเชื่อม Google จากหน้า `/account`
6. แก้ `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true` แล้ว restart/rebuild Expo
7. ทดสอบด้วยบัญชี Google ของเจ้าของที่ยืนยันอีเมลตรงกัน หรือเข้าสู่ระบบอีเมลก่อนแล้วกดเชื่อม Google ในหน้า บัญชีผู้ใช้

Client Secret อยู่ใน Supabase เท่านั้น Google OAuth สำหรับ native ใช้ browser session + custom scheme ใน development build/แอปที่ build แล้ว Expo Go ใช้ทดสอบ UI และ email/password/OTP อีเมลได้ แต่ Google OAuth และ reset deep link ให้ใช้เว็บหรือ development build [Google provider](https://supabase.com/docs/guides/auth/social-login/auth-google), [Expo native auth](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth)

## 4. บัญชีเดียวกันหมายถึงอะไร

- รหัสผ่านและ OTP ของอีเมลเดียวกันเข้าสู่ Auth user เดียวกัน
- Supabase เชื่อม Google กับอีเมลตรงกันที่ยืนยันแล้วโดยอัตโนมัติ ปุ่มเชื่อม Google ใช้ `linkIdentity` จากบัญชีที่เข้าสู่ระบบอยู่และตรวจว่า Auth UUID หลัง callback ยังเดิม
- เบอร์ที่เข้าสู่ระบบแล้วเพิ่มในหน้า บัญชีผู้ใช้ ใช้ `updateUser({phone})` และ OTP `phone_change` เพื่อผูกกับ Auth UUID เดิม เมื่อเปิด SMS จึงใช้เบอร์นั้นเข้าบัญชีเดิมได้
- ข้อมูลการเงิน/RLS ยึด `auth.users.id` เป็น `owner_id` ไม่ยึดข้อความ email, phone หรือ user_metadata
- การพิมพ์ email/phone ให้เหมือนกันไม่ได้ยืนยันตัวตน ไม่รวมข้อมูลจากสอง Auth users ที่สร้างแยกกันอยู่แล้วอัตโนมัติ หากขึ้นว่าช่องทางอยู่ในบัญชีอื่น ให้เข้าสู่บัญชีเดิมก่อน ไม่แก้ owner_id ใน SQL เพื่อข้ามข้อขัดแย้ง
- ไม่รองรับ public signup/การ merge สองบัญชีที่มีประวัติการเงินแยกกันใน v1

[Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)

## 5. เบอร์โทรที่เตรียมไว้

`EXPO_PUBLIC_SMS_AUTH_ENABLED=false` เป็นค่าเริ่มต้น ทั้ง UI และ service ปิดส่ง/ยืนยัน SMS ไม่ส่งรหัสปลอมหรือสร้างบัญชีใหม่ หากภายหลังมี SMS provider ให้เปิด Phone provider ใน Supabase ตั้งค่า provider และ country/rate limits ก่อนเปลี่ยน flag เป็น true แล้ว rebuild

SMS ต้องมีผู้ให้บริการส่งข้อความ ไม่รับประกันว่าฟรี การตั้ง flag ไม่ทำให้การส่ง SMS ฟรี ส่วนรอบนี้ใช้ OTP อีเมลตามที่เลือก [Phone auth](https://supabase.com/docs/guides/auth/phone-login)

## 6. จดจำรหัสผ่านและ session

- ปุ่มรูปตาแสดง/ซ่อนรหัสผ่าน ช่องกรอกมี autocomplete ให้ password manager ของเบราว์เซอร์/iOS/Android จัดการ จำรหัสผ่านขึ้นกับเครื่องและ password manager; แอปไม่เก็บ raw password
- ไม่เลือกจดจำ: เว็บใช้ sessionStorage ของแท็บ; native เก็บ session ใน memory ปิดแอปต้องเข้าสู่ระบบใหม่
- เลือกจดจำ: เว็บใช้ localStorage; native ใช้ Expo SecureStore; session/PKCE keys ย้ายตามตัวเลือก ไม่ทิ้งสำเนาใน storage อีกชนิด
- SDK refresh session ให้เมื่อหมดอายุ ข้อมูลส่วนตัวล้างจากหน้าจอเมื่อเปลี่ยนเจ้าของหรือออกจากระบบ ผลโหลดเก่าถูกทิ้ง
- เปลี่ยนรหัสผ่านสำเร็จแล้วขอยกเลิก refresh sessions ของเครื่องอื่น และออกจากเครื่องนี้ด้วย Access JWT ที่ออกไปแล้วอาจใช้ได้จนหมดอายุ ไม่อ้างว่าลบ JWT ทุกเครื่องทันที
- ค่า token storage key ใหม่ทำให้ผู้ใช้เวอร์ชันก่อนต้องเข้าสู่ระบบใหม่ ไม่เปลี่ยน owner_id หรือข้อมูลในฐานข้อมูล

## 7. ตรวจงานก่อนเปิดใช้จริง

1. อีเมล/รหัสผ่านผิดเข้าสู่ระบบไม่ได้ รหัสถูกเข้า Dashboard ของเจ้าของเดิม
2. OTP อีเมลหมดอายุ/ผิดถูกปฏิเสธ ส่งซ้ำถูก rate limit และ Google cancel กลับได้
3. Login password, OTP และ Google ของเจ้าของเดียวกัน ตรวจ `/api/me` ว่า `id` เดิม และรายการเงินไม่เพิ่มซ้ำ
4. Reset ลิงก์บนเครื่องเดิม → ตั้งรหัสใหม่ → เข้าใหม่ด้วยรหัสใหม่ ลิงก์เก่าหรือคนละเครื่องถูกปฏิเสธ
5. Remember เปิด/ปิด, reload, ปิดแท็บ/แอป, sign out ทำงานตรงตามข้อ 6
6. ผู้ใช้จำลองอีกคนยังถูก RLS แยกข้อมูล ผู้ใช้ไม่มี email/phone confirmed หรือ anonymous ถูก API ปฏิเสธ
7. OAuth/secure session/deep link บน iPhone และ Android ต้องตรวจด้วย development build จริงก่อน native distribution

ทดสอบใน repo ใช้ mock ที่ boundary ของ Supabase Auth และทดสอบ RLS ด้วยฐานข้อมูล local การส่งอีเมล/OAuth จริงต้องตรวจหลังตั้งค่า credentials ไม่ใช้ mock เป็นหลักฐานว่า provider พร้อมแล้ว
