# Loading, animation และ LINE Flex preview

เปิดแอปที่ `http://localhost:8081/` แล้วเลือก **ลองข้อมูลตัวอย่าง** หากยังไม่ได้เชื่อม Supabase

## Animation

- หน้ารอโหลด Expense Tracker ระหว่างเปิดแอปและโหลด session
- Skeleton ระหว่างโหลดข้อมูลจริงครั้งแรก
- หน้า fade/slide, การ์ด Dashboard ทยอยปรากฏ, กราฟไล่ขึ้น และยอดหลัก fade เมื่อเปลี่ยน
- ปุ่มและตัวเลือกยุบ/เด้งตอนกด และยกเบา ๆ เมื่อชี้เมาส์
- Spinner สำหรับ login, บันทึกรายการ, บันทึกแหล่งสลิป, รีเฟรช และโหลดภาพสลิป
- ตั้งค่า → การแสดงผล → **ลดการเคลื่อนไหว** จำค่าเฉพาะอุปกรณ์นี้ และเคารพ Reduce Motion ของระบบ
- ไม่มีการหน่วงโหลดจำลอง ไม่เพิ่ม animation library; native ใช้ Animated กับ opacity/transform ส่วน animation ที่วนซ้ำหยุดเมื่อซ่อนแอป/แท็บหรือเปิด Reduce Motion

## ตัวอย่าง LINE Flex

ตั้งค่า → แจ้งเตือน LINE → **ดูตัวอย่าง LINE Flex** หรือเปิด `http://localhost:8081/line-preview`

มีรายวัน รายสัปดาห์ และรายเดือน ใช้ข้อมูลสมมติ ตัวสร้าง JSON เดียวกับ Backend ตัวอย่างนี้ไม่ส่งข้อความเข้า LINE ปุ่มในพรีวิวเปิด Dashboard/สลิปภายในแอป

กด **จำลอง Noti เด้ง** เพื่อดูแบนเนอร์เลื่อนลงจากด้านบน ใช้ `altText` ของข้อความในช่วงที่เลือก ปิดด้วย ×, แตะแบนเนอร์ หรือแตะด้านนอก แล้วเล่นซ้ำได้ ตัวอย่างแสดงค้างเพื่อให้ตรวจรายละเอียด ไม่ใช่การแจ้งเตือนของระบบปฏิบัติการ และไม่ขอสิทธิ์แจ้งเตือนหรือส่งข้อความ LINE

กด **ดู JSON ของข้อความ** เพื่อดู payload ทั้งข้อความ ตัวอย่างไฟล์อยู่ใน repo ที่ `examples/line-flex/day.json`, `week.json`, `month.json`

สร้างไฟล์ตัวอย่างใหม่ด้วย `node --experimental-strip-types scripts/line-examples.mjs` บน Node.js 22

สำหรับ [LINE Flex Message Simulator](https://developers.line.biz/flex-simulator/) ให้ใช้ object `contents` ของไฟล์ JSON หน้า simulator รับ bubble/carousel; ส่วน Messaging API ใช้ทั้ง object ที่มี `type: "flex"`, `altText`, `contents`

พรีวิวในแอปแสดงองค์ประกอบที่แม่แบบปัจจุบันใช้ ไม่ใช่ LINE renderer ทุกชนิด ขนาดตัวอักษรและการตัดบรรทัดใน LINE จริงอาจต่างกันตามเครื่อง ดู [เอกสาร LINE](https://developers.line.biz/en/docs/messaging-api/using-flex-messages/)

ยังไม่มีการเชื่อมบัญชี Cloud หรือส่งข้อความจริงในรอบนี้

## ตรวจงานรอบนี้

- TypeScript และ Backend build ผ่าน
- Web export และ Hermes bundle สำหรับ iOS/Android ผ่าน
- Vitest 22 ข้อผ่าน รวมตัวอย่าง Flex ทั้งสามช่วง
- ตรวจเว็บที่ 1440×1000 และ 390×844: Dashboard, ตั้งค่า, เปิด/ปิด Reduce Motion และจำค่าหลัง reload, สลับ Flex สามช่วง, ดู JSON, ปุ่มไปหน้าสลิป และเปิด/ปิด modal สลิปตัวอย่าง
- ไม่พบ runtime error/warning ใน console ระหว่างตรวจเว็บ
- ยังไม่ได้ทดสอบบนเครื่อง iOS/Android จริง และยังไม่ได้ส่ง Flex ผ่าน LINE จริง
