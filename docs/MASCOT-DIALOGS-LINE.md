# ตัวละครใน modal และ LINE Flex

## พฤติกรรม

- ใช้ `ModalCompanion` ร่วมกันสำหรับปฏิทิน รายละเอียดสลิป ยืนยันลบ และขยายภาพสลิป ตัวละครอยู่ข้างหัวข้อ ไม่ทับช่องกรอกหรือปุ่ม
- ปฏิทิน/ขยายภาพใช้ท่าอ่านสมุด ยืนยันลบใช้ท่าครุ่นคิด สลิปที่บันทึกแล้วใช้ท่าดีใจ สลิปรอข้อมูล/ผิดพลาด/ซ้ำใช้ท่าครุ่นคิด
- น้องใน modal เป็น PNG ภาพนิ่งตามท่าของ modal ไม่มี animation ไม่เป็นปุ่มและไม่รับ focus จึงไม่มีกรอบโฟกัสหรือพื้นกล่องสีม่วง หน้าหลัก/รายงาน/หน้าตัวละครยังขยับและแตะเปลี่ยนท่าได้
- Modal ยืนยันลบวางปุ่มยกเลิกทางซ้ายและยืนยันลบทางขวา กว้างเท่ากัน
- Mount เฉพาะเมื่อ modal เปิด ปิดแล้วไม่เหลือ loop ของตัวละครใน modal และใช้การตั้งค่าลดการเคลื่อนไหวเดิม
- Noti จำลองใช้ภาพนิ่งของน้อง โดยยังแสดง LINE และป้ายตัวอย่าง ไม่ใช่การเปลี่ยน notification ของระบบปฏิบัติการหรือรูปโปรไฟล์ OA จริง
- Flex รายวันใช้ท่าอ่านสมุด รายสัปดาห์ครุ่นคิด รายเดือนดีใจ ขนาดต่อภาพต่ำกว่า 40 KB เป็น PNG ภาพนิ่ง
- Worker และพรีวิวใช้ `flexReport` เดียวกัน ยอด แหล่งข้อมูล ปุ่ม และ altText เดิมยังอยู่ พรีวิวโหลดรูปที่ฝังในแอป ไม่เรียก LINE

## รูปสำหรับส่ง LINE

`apps/app/public/line/mascot-{reading,thinking,celebrate}-v2.png` ถูกคัดลอกเข้า `dist/line/` ตอน Expo Web export และให้บริการผ่านโดเมนเว็บเดิม

`flexMascotUrl` ใช้เฉพาะ HTTPS ที่ไม่มี username/password โดยตัด path/query/hash ของ APP_ORIGIN ออกจาก URL รูป ไม่แนบภาพเมื่อ config เป็น localhost/loopback/URL ไม่ถูกต้อง ภาพตกแต่งไม่มีข้อมูลส่วนตัว ภาพสลิปไม่ถูกคัดลอกเข้า public

หลัง deploy ตั้ง `APP_ORIGIN=https://YOUR_WEB_DOMAIN` ฝั่ง Backend แล้วตรวจเปิด `/line/mascot-reading-v2.png` ได้โดยไม่ต้องล็อกอิน รายละเอียดใน [SETUP.md](SETUP.md)

อ้างอิง: [LINE Flex image component](https://developers.line.biz/en/reference/messaging-api/#f-image), [Flex image sizing](https://developers.line.biz/en/docs/messaging-api/flex-message-layout/#image-size)

## ตรวจงาน 6 ตุลาคม 2569

- 36 tests ผ่าน รวม HTTPS URL, ขนาด/dimensions ของภาพ public และ fallback ที่ไม่แนบรูปจาก origin ใช้ไม่ได้
- TypeScript: core, API, app ผ่าน
- Expo Web + PWA export ผ่าน และมี PNG ทั้งสามใน dist/line
- Expo iOS + Android export ผ่าน (ยังไม่ได้ทดสอบเครื่องจริง)
- Browser: 390 × 844 และ 1440 × 1000; ปฏิทิน รายละเอียดสลิป ยืนยันลบโดยกดยกเลิก และ Noti จำลองเปิดได้ มีน้องและปุ่มใช้งานได้
- ลดการเคลื่อนไหวแล้ว animation/transform ของน้องใน modal เป็น none ปิด modal แล้วไม่มี ModalCompanion ใน DOM คืน preference เดิมหลังตรวจ
- ยังไม่ได้ส่ง LINE จริง และยังไม่ได้ตรวจ modal ขยายภาพกับ Drive จริง เพราะยังไม่มีบัญชี/คีย์และภาพสลิปจริงในโหมดตัวอย่าง

ไม่มี dependency ใหม่ ไม่มีการแก้ข้อมูลธุรกรรมจากการตรวจ modal
