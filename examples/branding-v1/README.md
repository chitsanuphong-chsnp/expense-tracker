# รูปสำหรับ Expense Tracker

- `line-rich-menu.jpg` — Rich Menu 2500 × 1686 พิกเซล, 6 ช่อง (3 × 2), JPEG ต่ำกว่า 1 MB
- `app-icon-1024.png` — ไอคอนแอปแบบสี่เหลี่ยมเต็มภาพ
- `app-icon-512.png` และ `app-icon-192.png` — ไฟล์สำหรับ PWA
- `rich-menu-original.png` และ `app-icon-original.png` — ต้นฉบับจาก imagegen
- `rich-menu.template.json` — พื้นที่กดและ URI ที่ตรงกับภาพ ใช้กับ LINE Messaging API
- `PROMPTS.md` — prompts ที่ใช้กับ built-in imagegen

## วิธีใช้ Rich Menu

เลือกแม่แบบ 6 ช่องขนาดเท่ากัน 3 คอลัมน์ × 2 แถวใน LINE OA แล้วอัปโหลด `line-rich-menu.jpg` หรือใช้ JSON กับ Messaging API หลังตั้งค่าบัญชี LINE แล้ว

แก้ `https://expense-tracker.example` ใน JSON เป็น URL เว็บที่เผยแพร่จริงก่อนใช้งาน ลิงก์ตัวอย่างยังไม่ใช่เว็บไซต์ใช้งานจริง

| ตำแหน่ง | ปุ่ม | หน้า |
|---|---|---|
| บนซ้าย | ภาพรวม | `/` |
| บนกลาง | บันทึกรายการ | `/record` |
| บนขวา | รายการย้อนหลัง | `/transactions` |
| ล่างซ้าย | รายงาน | `/reports` |
| ล่างกลาง | สลิปรอข้อมูล | `/slips` |
| ล่างขวา | ตั้งค่า | `/settings` |

หน้าสลิปเป็นหน้ารวมที่มีรายการรอข้อมูลอยู่ด้วย ปุ่มเมนูไม่ได้เปลี่ยนตัวกรองโดยอัตโนมัติ

ตรวจขนาดและไฟล์ตาม [ข้อกำหนดรูป Rich Menu ของ LINE](https://developers.line.biz/en/reference/messaging-api/nojs/#upload-rich-menu-image) แล้ว ยังไม่ได้อัปโหลดหรือตั้งเมนูใน LINE จริง

ไอคอนใหม่เก็บเป็นไฟล์แยกสำหรับเลือกใช้ ยังไม่ได้แทนไอคอนเดิมใน app config ระบบปฏิบัติการจะครอบมุมให้เองเมื่อแสดงไอคอน
