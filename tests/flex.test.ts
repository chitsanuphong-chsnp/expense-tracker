import {it,expect} from 'vitest';
import {flexReport,flexMascotUrl,type FlexNode} from '@expense/core';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {periods,example} from '../apps/app/src/line-examples.ts';
const texts=(nodes:FlexNode[]):string[]=>nodes.flatMap(node=>node.type==='text'?[node.text]:node.type==='box'?texts(node.contents):[]);
it.each(['day','week','month'] as const)('uses a consistent %s summary for the worker and preview',kind=>{
  const summary=example(kind),message=flexReport(summary,periods[kind].key,'https://app.example','ตรวจ Drive ไม่สำเร็จ');
  expect(summary.byAccount.reduce((sum,a)=>sum+a.expense,0)).toBe(summary.expense);
  expect(summary.byAccount.reduce((sum,a)=>sum+a.income,0)).toBe(summary.income);
  expect(summary.net).toBe(summary.income-summary.expense);
  expect(texts(message.contents.body.contents)).toContain(`รอข้อมูล ${summary.pending} สลิป · ไม่รวมในยอด`);
  expect(texts(message.contents.body.contents)).toContain('ตรวจ Drive ไม่สำเร็จ');
  // Spending only: no income, net or per-account income in LINE.
  expect(texts(message.contents.body.contents).some(t=>/รายรับ|เงินสุทธิ|รับ ฿/.test(t))).toBe(false);
  expect(message.contents.footer.contents).toEqual(expect.arrayContaining([expect.objectContaining({action:{type:'uri',label:'ดูสลิปรอข้อมูล',uri:'https://app.example/slips'}})]));
  expect(new TextEncoder().encode(JSON.stringify(message.contents)).byteLength).toBeLessThan(30000);
});
it.each([['day','reading'],['week','thinking'],['month','celebrate']] as const)('includes deployable public artwork in %s reports',async(kind,pose)=>{
  const message=flexReport(example(kind),periods[kind].key,'https://app.example','ตรวจสำเร็จ');
  const image=message.contents.header.contents.find(node=>node.type==='image');
  expect(image).toMatchObject({type:'image',url:`https://app.example/line/mascot-${pose}-v2.png`,aspectMode:'fit'});
  const bytes=await readFile(new URL(`../apps/app/public/line/mascot-${pose}-v2.png`,import.meta.url));
  const metadata=await sharp(bytes).metadata();
  expect(metadata.format).toBe('png');expect(metadata.width).toBeLessThanOrEqual(1024);expect(metadata.height).toBeLessThanOrEqual(1024);expect(bytes.length).toBeLessThan(100000);
});
it.each(['http://localhost:8081','https://localhost','https://127.0.0.1','https://[::1]','https://name:secret@app.example','not a URL'])('omits artwork for a non-public or invalid origin: %s',origin=>{
  expect(flexMascotUrl(periods.day.key,origin)).toBeNull();
  const message=flexReport(example('day'),periods.day.key,origin,'ตรวจสำเร็จ');
  expect(message.contents.header.contents.some(node=>node.type==='image')).toBe(false);
  expect(texts(message.contents.header.contents).some(t=>t.startsWith('ใช้ไป'))).toBe(true);
});
it('uses a stable public artwork path without forwarding URL credentials or query data',()=>{
  expect(flexMascotUrl(periods.day.key,'https://app.example/nested/?token=private#section')).toBe('https://app.example/line/mascot-reading-v2.png');
});
it('titles daily reports by date and shows unreviewed OCR drafts apart from totals',()=>{
  const summary={...example('day'),ocr_draft:{amount_satang:125000,slips:5}};
  const message=flexReport(summary,'day:2026-10-10','https://app.example','ตรวจสำเร็จ');
  expect(texts(message.contents.header.contents)).toContain('สรุปวันที่ 10 ต.ค.');
  expect(texts(message.contents.body.contents).find(t=>t.startsWith('ร่าง OCR'))).toMatch(/^ร่าง OCR ยังไม่ตรวจ .*1,250.* \(5 สลิป\) · ไม่รวมในยอด$/);
  // Own-account transfers are spending too: no separate line in LINE.
  const own=flexReport({...summary,ocr_draft:{amount_satang:125000,slips:5,own_transfers:2}},'day:2026-10-10','https://app.example','ตรวจสำเร็จ');
  expect(texts(own.contents.body.contents).some(t=>t.startsWith('โอนเข้าบัญชีตัวเอง'))).toBe(false);
  const none=flexReport({...summary,ocr_draft:{amount_satang:0,slips:0}},'day:2026-10-10','https://app.example','ตรวจสำเร็จ');
  expect(texts(none.contents.body.contents).some(t=>t.startsWith('ร่าง OCR'))).toBe(false);
});
it('leaves out the pending-slip note, note box and button when nothing is pending',()=>{
  const message=flexReport({...example('day'),pending:0,ocr_draft:{amount_satang:0,slips:0}},'day:2026-10-10','https://app.example','ตรวจสำเร็จ');
  expect(texts(message.contents.body.contents).some(t=>t.startsWith('รอข้อมูล'))).toBe(false);
  expect(message.contents.body.contents.some(node=>node.type==='box'&&node.backgroundColor==='#fff7e8')).toBe(false);
  expect(message.altText).not.toContain('รอข้อมูล');
  expect(message.contents.footer.contents.map(node=>node.type==='button'?node.action.label:'')).toEqual(['ดู Dashboard']);
});
