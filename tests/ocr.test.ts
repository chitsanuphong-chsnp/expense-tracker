import {it,expect} from 'vitest';
import {extractFields} from '../apps/api/src/ocr-parser.ts';
it.each([
 ['kplus','โอนเงินสำเร็จ\n5 ต.ุค. 69 21:40 น.\nจำนวน:\n2.00 บาท\nค่าธรรมเนียม:\n0.00 บาท',200,'21:40'],
 ['krungthai','จำนวนเงิน 2.00 บาท\nค่าธรรมเนียม 0.00 บาท\nวันที่ทำรายการ 05 ต.ค. 2569 - 21:40',200,'21:40'],
 ['make','05 ต.ค. 2569 21:41\nจำนวน\n0.63 บาท\nค่าธรรมเนียม\n0.00 บาท',63,'21:41'],
 ['ttb','โอนเงินสำเร็จ\n5 ต.ค. 69, 10:55 น.\n40.00\nค่าธรรมเนียม 0.00\nรหัสอ้างอิง 261005105458116191',4000,'10:55']
] as const)('extracts %s amount and Buddhist date while excluding fees',(bank,text,amount,time)=>{
 expect(extractFields(text,bank)).toMatchObject({amount_satang:amount,date:'2026-10-05',time,requires_review:true});
});
it('rejects unsupported dates, ambiguous ttb amounts, and fee-only slips',()=>{
 expect(extractFields('ค่าธรรมเนียม\n0.00 บาท','kplus').amount_satang).toBeNull();
 expect(extractFields('1.00\n40.00\nค่าธรรมเนียม 0.00','ttb').amount_satang).toBeNull();
 expect(extractFields('จำนวน\nค่าธรรมเนียม 10.00','make').amount_satang).toBeNull();
 expect(extractFields('31 ก.พ. 2569 12:00','make').date).toBeNull();
 expect(extractFields('5 ต.ค. 2569 29:40','make').date).toBeNull();
});
it('does not infer transaction direction or date from QR references',()=>{
 const result=extractFields('รหัสอ้างอิง: 261005105458116191','ttb');
 expect(result.date).toBeNull();expect(result.amount_satang).toBeNull();expect(result).not.toHaveProperty('kind');
});it('finds amounts a few noisy lines below the label and masked MAKE sender names',()=>{
 expect(extractFields('จำนวน:\nug\ndy\n25.00 บาท\nค่าธรรมเนียม:\n0.00 บาท','kplus').amount_satang).toBe(2500);
 const make=extractFields('โอนเงินสำเร็จ\n05 ต.ค. 2569 21:41\nสมชายดีเ\nXXX=X=X2762-X\nสมชายดี ใจงาม\nจำนวน\n0.63 บาท\nค่าธรรมเนียม\n0.00 บาท\nสแกนเพื่อตรวจสอบ','make');
 expect(make).toMatchObject({amount_satang:63,sender:'สมชายดีเ',recipient:'สมชายดี ใจงาม'});
});
it('reads masked sender/recipient numbers in order',()=>{
 const r=extractFields('นาย สมชาย ใ\nธ.กสิกรไทย\nxxx-x-x8536-x\nนาย สมชาย ใจดี\nธ.กรุงไทย\nxxx-x-x5851-x\nจำนวน:\n2.00 บาท','kplus');
 expect(r).toMatchObject({sender_account:'xxx-x-x8536-x',recipient_account:'xxx-x-x5851-x'});
 expect(extractFields('XXX=X=X2762-X\n(010753700088205)\n261005105458116191','make')).toMatchObject({sender_account:'XXX-X-X2762-X',recipient_account:null});
});
it('fills month/year from the upload day only when an unreadable month still has a matching day',()=>{
 const upload='2026-10-06T16:30:00.000Z'; // 23:30 on 6 Oct in Bangkok
 expect(extractFields('6 M.A. 69 20:36 น.','kplus',upload)).toMatchObject({date:'2026-10-06',time:'20:36',date_source:'upload'});
 expect(extractFields('5mm 69 21:45 น','kplus',upload)).toMatchObject({date:'2026-10-05',time:'21:45',date_source:'upload'});
 expect(extractFields('9 M.A. 69 20:36 น.','kplus',upload).date).toBeNull();
 expect(extractFields('6 M.A. 68 20:36 น.','kplus',upload).date).toBeNull();
 expect(extractFields('6 M.A. 69 20:36 น.','kplus').date).toBeNull();
 expect(extractFields('6 ต.ค. 69 20:36 น.','kplus',upload)).not.toHaveProperty('date_source');
});
