# Existing Shortcuts → Apps Script → Drive

ระบบเดิมที่อัปโหลดได้แล้วใช้ต่อโดยไม่ต้องแก้ โครงสร้าง:

```text
Expense/slips/ttb/YYYY-MM-DD/*.jpg
Expense/slips/K-PLUS/YYYY-MM-DD/*.jpg
Expense/slips/Krungthai/YYYY-MM-DD/*.jpg
Expense/slips/MAKE/YYYY-MM-DD/*.jpg
```

Backend ใช้ folder ID ของแต่ละธนาคาร อ่านย้อนหลังและโฟลเดอร์วันที่เอง ไม่ผูกกับ HTTP payload ของ Shortcuts

ไฟล์ `Code.gs` เป็น **ตัวอย่างทดแทนที่เข้ากันกับ single/batch** ไม่ใช่การคัดลอก source ที่ deploy อยู่ เพราะยังไม่ได้รับ source เดิม ไม่จำเป็นต้องแทนที่ระบบที่ใช้งานได้แล้ว หากจะใช้ตัวอย่าง ให้ตั้ง Script Properties และทดสอบสำเนา deployment ก่อน

Script properties: `UPLOAD_TOKEN`, `FOLDER_TTB`, `FOLDER_KPLUS`, `FOLDER_KRUNGTHAI`, `FOLDER_MAKE` ค่า folder เป็น ID ของโฟลเดอร์ธนาคาร token อย่างน้อย 32 ตัวอักษร

รับ JSON `{token,bank,imageBase64,fileName}` หรือ `{token,bank,images:[{imageBase64,fileName}]}` หรือคีย์ `files` แทน `images` ย่อภาพเป็น JPEG อัตโนมัติใน Shortcuts ก่อนเข้ารหัส Base64 ส่งคำขอเดียวต่อธนาคารตามระบบเดิม วันที่โฟลเดอร์คือวันที่อัปโหลดเวลาไทย ไม่ใช่วันที่ธุรกรรม
