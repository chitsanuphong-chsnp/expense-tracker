import {describe,it,expect} from 'vitest';
import {parseMoney,rangeFor,summarize,dueReportPeriods,shouldScan,transactionInput,transactionsCsv,type Dataset,type Transaction} from '../packages/core/src/index.ts';
const account='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const tx=(changes:Partial<Transaction>={}):Transaction=>({id:account,kind:'expense',amount_satang:1050,account_id:account,to_account_id:null,category_id:null,occurred_at:'2026-10-05T22:59:59+07:00',note:'',counterparty:'',source:'manual',...changes});
const data=(transactions:Transaction[]=[]):Dataset=>({accounts:[{id:account,name:'เงินสด',kind:'cash',bank_code:null,color:'#ffffff'}],categories:[],transactions,slips:[],sources:[],settings:{budget_satang:100000,line_connected:false,line_blocked:false},reports:[],rules:[]});
describe('money and reports',()=>{
  it('uses exact integer satang and rejects rounding/invalid inputs',()=>{expect(parseMoney('1,234.56')).toBe(123456);expect(parseMoney('0.01')).toBe(1);for(const s of ['0','-1','1.001','1e3','NaN'])expect(parseMoney(s)).toBeNull();});
  it('cuts daily totals at 23:00 Bangkok, excludes transfers and pending slips',()=>{
    const d=data([tx(),tx({occurred_at:'2026-10-05T23:00:00+07:00',amount_satang:90000}),tx({kind:'income',amount_satang:2000}),tx({kind:'transfer',to_account_id:other,amount_satang:50000})]);
    d.slips=[{id:other,source_code:'ttb',status:'needs_details',uploaded_at:'2026-10-05T22:00:00+07:00',transaction_id:null,qr_payload:'ref only',duplicate_of:null,error_code:null,drive_file_id:'file'}];
    const r=rangeFor('2026-10-05','day',true),s=summarize(d,r.start,r.end);expect(s).toMatchObject({income:2000,expense:1050,net:950,count:2,pending:1});
  });
  it('uses Monday weeks and prior months across year/leap boundaries',()=>{
    expect(rangeFor('2026-01-01','week')).toEqual({start:'2025-12-28T17:00:00.000Z',end:'2026-01-04T17:00:00.000Z'});
    expect(rangeFor('2024-02-29','month')).toEqual({start:'2024-01-31T17:00:00.000Z',end:'2024-02-29T17:00:00.000Z'});
  });
  it('counts nightly uploaded pending slips even after the transaction cutoff',()=>{
    const d=data();d.slips=[{id:other,source_code:'ttb',status:'needs_details',uploaded_at:'2026-10-05T23:03:00+07:00',transaction_id:null,qr_payload:'ref',duplicate_of:null,error_code:null,drive_file_id:'file'}];
    const cut=rangeFor('2026-10-05','day',true),full=rangeFor('2026-10-05','day');expect(summarize(d,cut.start,cut.end,full.end).pending).toBe(1);
  });
  it('does not schedule today before 23:15, and selects previous week/month',()=>{
    expect(dueReportPeriods(new Date('2026-10-05T23:14:00+07:00')).some(p=>p.key==='day:2026-10-05')).toBe(false);
    expect(dueReportPeriods(new Date('2026-10-05T23:15:00+07:00')).find(p=>p.key==='day:2026-10-05')?.end).toBe('2026-10-05T16:00:00.000Z');
    const periods=dueReportPeriods(new Date('2026-10-01T08:00:00+07:00'));expect(periods.some(p=>p.key==='month:2026-09')).toBe(true);
    expect(dueReportPeriods(new Date('2026-10-05T08:00:00+07:00')).some(p=>p.key==='week:2026-09-28')).toBe(true);
    expect(shouldScan(new Date('2026-10-05T23:05:00+07:00'))).toBe(true);expect(shouldScan(new Date('2026-10-05T23:00:00+07:00'))).toBe(false);
  });
  it('validates destination accounts and escapes CSV formulas',()=>{
    expect(transactionInput.safeParse(tx({kind:'transfer',to_account_id:account})).success).toBe(false);
    expect(transactionInput.safeParse(tx({kind:'transfer',to_account_id:other})).success).toBe(true);
    const csv=transactionsCsv([tx({note:'=HYPERLINK("bad")'})],data().accounts,[]);expect(csv).toContain('"\'=HYPERLINK(""bad"")"');expect(csv.charCodeAt(0)).toBe(0xfeff);
  });
});
