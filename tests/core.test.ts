import {describe,it,expect} from 'vitest';
import {parseMoney,rangeFor,summarize,dueReportPeriods,shouldScan,dailyPendingWindow,likelyOwnTransfer,maskMatches,accountForMask,transactionInput,transactionsCsv,type Dataset,type Transaction} from '../packages/core/src/index.ts';
const account='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const tx=(changes:Partial<Transaction>={}):Transaction=>({id:account,kind:'expense',amount_satang:1050,account_id:account,to_account_id:null,category_id:null,occurred_at:'2026-10-05T22:59:59+07:00',note:'',counterparty:'',source:'manual',...changes});
const data=(transactions:Transaction[]=[]):Dataset=>({accounts:[{id:account,name:'เงินสด',kind:'cash',bank_code:null,color:'#ffffff'}],categories:[],transactions,slips:[],sources:[],settings:{budget_satang:100000,line_connected:false,line_blocked:false},reports:[],rules:[]});
describe('money and reports',()=>{
  it('uses exact integer satang and rejects rounding/invalid inputs',()=>{expect(parseMoney('1,234.56')).toBe(123456);expect(parseMoney('0.01')).toBe(1);for(const s of ['0','-1','1.001','1e3','NaN'])expect(parseMoney(s)).toBeNull();});
  it('cuts daily totals at 23:00 Bangkok, counts own-account transfers as spending, excludes pending slips',()=>{
    const d=data([tx(),tx({occurred_at:'2026-10-05T23:00:00+07:00',amount_satang:90000}),tx({kind:'income',amount_satang:2000}),tx({kind:'transfer',to_account_id:other,amount_satang:50000})]);
    d.slips=[{id:other,source_code:'ttb',status:'needs_details',uploaded_at:'2026-10-05T22:00:00+07:00',transaction_id:null,qr_payload:'ref only',duplicate_of:null,error_code:null,drive_file_id:'file'}];
    const r=rangeFor('2026-10-05','day',true),s=summarize(d,r.start,r.end);expect(s).toMatchObject({income:2000,expense:51050,net:-49050,count:2,pending:1});
  });
  it('uses Monday weeks and prior months across year/leap boundaries',()=>{
    expect(rangeFor('2026-01-01','week')).toEqual({start:'2025-12-28T17:00:00.000Z',end:'2026-01-04T17:00:00.000Z'});
    expect(rangeFor('2024-02-29','month')).toEqual({start:'2024-01-31T17:00:00.000Z',end:'2024-02-29T17:00:00.000Z'});
  });
  it('counts slips uploaded by the next 08:00 for the previous day, never twice',()=>{
    const slip=(uploaded_at:string,changes={})=>({id:other,source_code:'ttb' as const,status:'needs_details' as const,uploaded_at,transaction_id:null,qr_payload:'ref',duplicate_of:null,error_code:null,drive_file_id:'file',...changes});
    const d=data([tx({occurred_at:'2026-10-05T23:45:00+07:00'})]);
    d.slips=[slip('2026-10-05T23:31:00+07:00'),slip('2026-10-06T07:59:00+07:00'),slip('2026-10-06T08:00:00+07:00'),slip('2026-10-05T07:59:00+07:00')];
    const day=rangeFor('2026-10-05','day'),w=dailyPendingWindow('2026-10-05');
    expect(summarize(d,day.start,day.end,w.end,w.start)).toMatchObject({expense:1050,pending:2});
    const next=dailyPendingWindow('2026-10-06');expect(summarize(d,day.start,day.end,next.end,next.start).pending).toBe(1);
  });
  it('shows unreviewed OCR amounts separately from totals',()=>{
    const ocr=(amount_satang:number|null,error?:string)=>({engine:'paddle',amount_satang,date:null,time:null,sender:null,recipient:null,requires_review:true as const,...(error?{error}:{})});
    const base={source_code:'ttb' as const,uploaded_at:'2026-10-05T23:31:00+07:00',transaction_id:null,qr_payload:'ref',duplicate_of:null,error_code:null,drive_file_id:'file'};
    const d=data([tx()]);
    d.slips=[{...base,id:'a',status:'needs_details',ocr_details:ocr(20000)},{...base,id:'b',status:'needs_details',ocr_details:ocr(4000)},{...base,id:'c',status:'needs_details',ocr_details:ocr(null,'OCR_FAILED')},{...base,id:'d',status:'needs_details'},{...base,id:'e',status:'duplicate',ocr_details:ocr(9900)},{...base,id:'f',status:'linked',ocr_details:ocr(7700)}];
    const day=rangeFor('2026-10-05','day'),w=dailyPendingWindow('2026-10-05');
    expect(summarize(d,day.start,day.end,w.end,w.start)).toMatchObject({expense:1050,pending:4,ocr_draft:{amount_satang:24000,slips:2}});
  });
  it('hints own-account transfers from masked recipient names without guessing',()=>{
    const d=(recipient:string|null)=>({engine:'paddle',amount_satang:500000,date:null,time:null,sender:null,recipient,requires_review:true as const});
    const names=['ชิษณุพงศ์ ยอดใจ','Chitsanuphong'];
    expect(likelyOwnTransfer(d('นาย ชิษณุพงศ์ ย.'),names)).toBe(true);
    expect(likelyOwnTransfer(d('MR. CHITSANUPHONG Y'),names)).toBe(true);
    expect(likelyOwnTransfer(d('นาย สมชาย ใจดี'),names)).toBe(false);
    expect(likelyOwnTransfer(d(null),names)).toBe(false);
    expect(likelyOwnTransfer(d('นาย ชิษณุพงศ์ ย.'),[])).toBe(false);
    expect(likelyOwnTransfer(d('นาย อา บี'),['อา'])).toBe(false);
    const base={source_code:'ttb' as const,status:'needs_details' as const,uploaded_at:'2026-10-05T23:31:00+07:00',transaction_id:null,qr_payload:'ref',duplicate_of:null,error_code:null,drive_file_id:'file'};
    const data2=data();data2.settings.own_names=names;data2.slips=[{...base,id:'a',ocr_details:d('นาย ชิษณุพงศ์ ย.')},{...base,id:'b',ocr_details:{...d('ร้านกาแฟ'),amount_satang:6500}}];
    const day=rangeFor('2026-10-05','day'),w=dailyPendingWindow('2026-10-05');
    expect(summarize(data2,day.start,day.end,w.end,w.start)).toMatchObject({pending:2,ocr_draft:{amount_satang:506500,slips:2,own_transfers:1}});
  });
  it('matches masked slip numbers to full account numbers before names',()=>{
    expect(maskMatches('xxx-x-x5851-x','1234558510')).toBe(true);
    expect(maskMatches('XXX-X-XX851-0','1234558510')).toBe(true);
    expect(maskMatches('XXX-X-XX851-1','1234558510')).toBe(false);
    expect(maskMatches('xxx-x-x5851','1234558510')).toBe(false);
    expect(maskMatches('XXX-XXX-XX1-X','1234567810')).toBe(false);
    const accounts=[{id:account,name:'กรุงไทย',kind:'bank' as const,bank_code:null,color:'#fff',numbers:['1234558510']}];
    expect(accountForMask('xxx-x-x5851-x',accounts)?.id).toBe(account);
    const d={engine:'paddle',amount_satang:200,date:null,time:null,sender:null,recipient:'นาย คนอื่น',requires_review:true as const,recipient_account:'xxx-x-x5851-x'};
    expect(likelyOwnTransfer(d,[],accounts)).toBe(true);
    expect(likelyOwnTransfer({...d,recipient_account:'xxx-x-x9999-x'},[],accounts)).toBe(false);
  });
  it('sends yesterday at 08:00 for the full day, and selects previous week/month',()=>{
    expect(dueReportPeriods(new Date('2026-10-06T07:59:00+07:00')).some(p=>p.key==='day:2026-10-05')).toBe(false);
    expect(dueReportPeriods(new Date('2026-10-06T07:59:00+07:00')).some(p=>p.key==='day:2026-10-04')).toBe(true);
    expect(dueReportPeriods(new Date('2026-10-06T08:00:00+07:00')).find(p=>p.key==='day:2026-10-05')).toMatchObject({start:'2026-10-04T17:00:00.000Z',end:'2026-10-05T17:00:00.000Z'});
    expect(dueReportPeriods(new Date('2026-10-05T23:59:00+07:00')).some(p=>p.key==='day:2026-10-05')).toBe(false);
    expect(dueReportPeriods(new Date('2026-10-06T08:00:00+07:00')).filter(p=>p.kind==='day')).toHaveLength(7);
    const periods=dueReportPeriods(new Date('2026-10-01T08:00:00+07:00'));expect(periods.some(p=>p.key==='month:2026-09')).toBe(true);
    expect(dueReportPeriods(new Date('2026-10-05T08:00:00+07:00')).some(p=>p.key==='week:2026-09-28')).toBe(true);
    for(const t of ['23:35','23:55','00:00','00:04'])expect(shouldScan(new Date(`2026-10-05T${t}:00+07:00`))).toBe(true);
    for(const t of ['23:30','00:05','00:30','06:30','07:05','12:00'])expect(shouldScan(new Date(`2026-10-05T${t}:00+07:00`))).toBe(false);
  });
  it('validates destination accounts and escapes CSV formulas',()=>{
    expect(transactionInput.safeParse(tx({kind:'transfer',to_account_id:account})).success).toBe(false);
    expect(transactionInput.safeParse(tx({kind:'transfer',to_account_id:other})).success).toBe(true);
    const csv=transactionsCsv([tx({note:'=HYPERLINK("bad")'})],data().accounts,[]);expect(csv).toContain('"\'=HYPERLINK(""bad"")"');expect(csv.charCodeAt(0)).toBe(0xfeff);
  });
});
