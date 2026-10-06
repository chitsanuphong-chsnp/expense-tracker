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
});