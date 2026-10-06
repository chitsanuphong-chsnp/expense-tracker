# ตรวจระบบเข้าสู่ระบบ — 2026-10-06

## ผ่านแล้ว

- TypeScript: app, API และ core
- Vitest: 61 tests / 7 files ผ่านทั้งหมด รวม Auth contract, redirect allowlist, OTP/SMS guard, Google linking owner check, verified user API, session persistence, native secure chunks และ RLS เดิม
- Expo export: เว็บ, iOS Hermes bundle และ Android Hermes bundle โดยรวมภาพพื้นหลังรุ่นล่าสุด ตรวจได้จาก `.expo/auth-build-check/metadata.json` (ไฟล์ตรวจ build ไม่ใช่ native distribution)
- เว็บ/PWA ล่าสุดที่ `http://localhost:8081/login`
- Browser QA: จอ 320, 390, 1000 และ 1440px ไม่มี horizontal overflow; ภาพพื้นหลังย่อพอดีมือถือ; ช่อง email/password มี autocomplete; รูปตาและ remember checkbox ทำงาน; ลืมรหัสผ่านปุ่มซ้าย–ขวา; SMS ปิดพร้อมทางไป OTP อีเมล; callback ผิดไม่เผย error_description และล้าง query; หน้า reset ที่ไม่ยืนยันตัวตนไม่ให้ตั้งรหัส; หน้า private ส่งกลับ login; เข้าโหมดตัวอย่างและออกจากหน้าบัญชีได้ ข้อมูลเดิมยังอยู่
- Console errors ที่ตรวจในหน้าล็อกอิน: ไม่พบ
- ภาพพื้นหลัง JPEG 1536×1024 / 78,722 bytes (~79 KB) ต้นฉบับ PNG เก็บใน repo

## ต้องตรวจหลังตั้งค่าบริการ

ยังไม่มี Supabase/SMTP/Google credentials จึงยังไม่ทดสอบการส่ง OTP อีเมลจริง, Google consent/redirect จริง, การรีเซ็ตและเชื่อม identity จริง ใช้ test double ที่ Auth boundary สำหรับ contract tests ไม่อ้างว่า provider พร้อมใช้แล้ว

ยังไม่ทดสอบบนเครื่อง iPhone/Android จริง Native export ยืนยันการ bundle เท่านั้น ต้องทดสอบ secure storage, OAuth และ deep link ด้วย development build ก่อนแจก native app SMS ยังปิดไว้ตามที่ผู้ใช้เลือก

ตั้งค่าตาม [AUTH.md](AUTH.md) และดูที่มา/Prompt ภาพที่ [LOGIN-DESIGN.md](LOGIN-DESIGN.md)
