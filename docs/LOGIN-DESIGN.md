# หน้าเข้าสู่ระบบและภาพพื้นหลัง

ดีไซน์ตามภาพอ้างอิงผู้ใช้: ด้านบนเข้มพร้อมแบรนด์/ข้อความ/ตัวละคร ส่วนฟอร์มสีขาวมุมโค้งด้านล่างบนมือถือ เดสก์ท็อปแบ่ง hero และฟอร์มสองด้าน ใช้ Noto Sans Thai + Noto Sans เดิม

ภาพฉากโต๊ะจดรายรับ–รายจ่ายโทนฟ้า–ม่วงเข้ากับสมุดและน้องในแอป สร้างด้วย built-in imagegen วันที่ 2026-10-06 ไม่มีข้อความหรือ UI ฝังในภาพ:

- ต้นฉบับ: `apps/app/assets/auth/login-budget-desk-v2.png`
- ไฟล์ใช้งาน: `apps/app/assets/auth/login-budget-desk-v2.jpg` 1536×1024 แปลง encoding เป็น JPEG 78 โดยคงองค์ประกอบภาพเดิม แอปโหลด JPEG เท่านั้น
- เก็บ PNG เป็นต้นฉบับใน repo
- พื้นหลังภาพนิ่ง ไม่มี canvas/WebGL/เอฟเฟกต์กะพริบ Desktop จัดภาพสะท้อนใน layout ให้โต๊ะอยู่ฝั่ง hero มือถือจัดความสูงภาพ 300px ให้เห็นฉากก่อนฟอร์ม
- ตัวละครใช้ภาพชุดเดิม ไม่มีการต่อแขน/หัวซ้อนเพิ่ม

## Prompt ที่ใช้

Use case: stylized-concept. Asset type: background illustration for a personal Expense Tracker login screen, landscape 1536x1024. Create a cozy, refined anime-inspired painted scene of a personal budgeting desk at evening. A lavender notebook for recording daily expenses with a simple unlettered cover, a small mint-green wallet, a few neatly stacked ordinary coins, a pen, a soft blue-violet desk lamp, a small plant, and a quiet window with soft city bokeh. No people; an existing anime girl mascot will be layered by the app. Deep indigo, muted lavender and soft mint accents to match a friendly rounded finance dashboard. Soft painterly anime background quality, natural warm details, calm and welcoming, restrained texture. Place a tasteful cluster of the budgeting objects near the upper-middle/right so some can remain visible in a portrait crop; maintain generous uncluttered dark negative space in the upper-left and center for white heading text. Lower half mostly softly shaded desk/gradient so a white login panel can cover it. Mostly dark enough for white UI text but with clearly visible lavender/mint budgeting objects. The whole canvas is the illustration only, no UI mockup, no phone, no screens or buttons, no characters, no text or numbers, no logos or watermark. No lightning, no storms, no electric streaks, no sci-fi grid, no crypto symbols or banknotes.

## ตั้งค่าระบบจริง

ดู [AUTH.md](AUTH.md) สำหรับ OTP อีเมลฟรี, SMTP, Google, ลืมรหัสผ่าน และการเชื่อมบัญชี SMS ยังปิดตามค่าเริ่มต้น

