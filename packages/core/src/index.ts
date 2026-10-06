import { z } from 'zod';

export const sourceCodes = ['ttb', 'kplus', 'krungthai', 'make'] as const;
export type SourceCode = typeof sourceCodes[number];
export type Account = { id: string; name: string; kind: 'bank' | 'cash'; bank_code: string | null; color: string };
export type Category = { id: string; name: string; color: string };
export type Transaction = { id: string; kind: 'income' | 'expense' | 'transfer'; amount_satang: number; account_id: string; to_account_id: string | null; category_id: string | null; occurred_at: string; note: string; counterparty: string; source: 'manual' | 'qr'; created_at?: string };
export type OcrDraft = {engine:string;amount_satang:number|null;date:string|null;time:string|null;sender:string|null;recipient:string|null;requires_review:true;error?:string};
export type SlipQrDetails = {format:'mini_qr'|'unrecognized';sending_bank_code:string|null;sending_bank_name:string|null;transaction_reference:string|null;country_code:string|null;checksum:string|null;tags:{path:string;value:string}[];missing:string[]};
export type Slip = { id: string; source_code: SourceCode; status: 'queued' | 'processing' | 'needs_details' | 'qr_unreadable' | 'duplicate' | 'linked' | 'failed'; uploaded_at: string; transaction_id: string | null; qr_payload: string | null; qr_details?: SlipQrDetails | null; ocr_details?: OcrDraft | null; duplicate_of: string | null; error_code: string | null; drive_file_id: string; name?: string };
export type Source = { id: string; source_code: SourceCode; folder_id: string; account_id: string | null; last_scan_at: string | null; last_scan_status: string | null; scan_complete: boolean };
export type Settings = { budget_satang: number; line_connected: boolean; line_blocked: boolean };
export type Dataset = { accounts: Account[]; categories: Category[]; transactions: Transaction[]; slips: Slip[]; sources: Source[]; settings: Settings; reports: Report[]; rules: Rule[] };
export type Rule = { id: string; counterparty: string; category_id: string };
export type Report = { id: string; report_key: string; status: string; period_start: string; period_end: string; snapshot: Summary; sent_at: string | null; error_code: string | null };
export type Summary = { income: number; expense: number; net: number; count: number; byAccount: { id: string; name: string; expense: number; income: number; color: string }[]; byCategory: { id: string; name: string; expense: number; color: string }[]; pending: number };

export const transactionInput = z.object({
  kind: z.enum(['income', 'expense', 'transfer']),
  amount_satang: z.number().int().positive().max(999999999999),
  account_id: z.string().uuid(), to_account_id: z.string().uuid().nullable().default(null),
  category_id: z.string().uuid().nullable().default(null),
  occurred_at: z.string().datetime({ offset: true }), note: z.string().max(500).default(''),
  counterparty: z.string().max(200).default('')
}).superRefine((v, ctx) => {
  if (v.kind === 'transfer' && (!v.to_account_id || v.to_account_id === v.account_id)) ctx.addIssue({ code: 'custom', message: 'Choose a different destination account', path: ['to_account_id'] });
  if (v.kind !== 'transfer' && v.to_account_id) ctx.addIssue({ code: 'custom', message: 'Destination is only valid for transfers', path: ['to_account_id'] });
});
export type TransactionInput = z.infer<typeof transactionInput>;
export const money = (satang: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2 }).format(satang / 100);
export function parseMoney(value: string): number | null {
  const s = value.trim().replace(/,/g, '');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, decimals = ''] = s.split('.');
  const n = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  return Number.isSafeInteger(n) && n > 0 && n <= 999999999999 ? n : null;
}
export function thaiDate(date: Date | string = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
}
export function bangkokParts(date = new Date()) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (key: string) => p.find(x => x.type === key)!.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')), minute: Number(get('minute')) };
}
export function rangeFor(date: string, period: 'day' | 'week' | 'month', cutoff = false) {
  const d = new Date(`${date}T00:00:00+07:00`);
  let start = date; let end: string;
  if (period === 'day') end = cutoff ? `${date}T23:00:00+07:00` : new Date(d.getTime() + 86400000).toISOString();
  else if (period === 'week') {
    const dow = new Date(`${date}T12:00:00+07:00`).getUTCDay();
    start = thaiDate(new Date(d.getTime() - ((dow + 6) % 7) * 86400000));
    end = new Date(new Date(`${start}T00:00:00+07:00`).getTime() + 7 * 86400000).toISOString();
  } else {
    start = `${date.slice(0, 7)}-01`;
    const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7));
    end = new Date(Date.UTC(year, month, 1) - 7 * 3600000).toISOString();
  }
  return { start: new Date(`${start}T00:00:00+07:00`).toISOString(), end: new Date(end).toISOString() };
}
export function summarize(data: Dataset, start: string, end: string, pendingEnd = end): Summary {
  const from = new Date(start).getTime(), until = new Date(end).getTime();
  const rows = data.transactions.filter(t => new Date(t.occurred_at).getTime() >= from && new Date(t.occurred_at).getTime() < until);
  const sum = (kind: string) => rows.filter(t => t.kind === kind).reduce((n, t) => n + t.amount_satang, 0);
  const income = sum('income'), expense = sum('expense');
  return { income, expense, net: income - expense, count: rows.filter(t => t.kind !== 'transfer').length,
    byAccount: data.accounts.map(a => ({ id: a.id, name: a.name, color: a.color, income: rows.filter(t => t.account_id === a.id && t.kind === 'income').reduce((n,t)=>n+t.amount_satang,0), expense: rows.filter(t=>t.account_id===a.id&&t.kind==='expense').reduce((n,t)=>n+t.amount_satang,0) })),
    byCategory: [...data.categories, { id: 'uncategorized', name: 'ยังไม่จัดหมวด', color: '#a2abc0' }].map(c => ({ ...c, expense: rows.filter(t => (t.category_id ?? 'uncategorized') === c.id && t.kind === 'expense').reduce((n,t)=>n+t.amount_satang,0) })).sort((a,b)=>b.expense-a.expense),
    pending: data.slips.filter(s => ['needs_details','qr_unreadable','queued','processing','failed'].includes(s.status) && new Date(s.uploaded_at).getTime() >= from && new Date(s.uploaded_at).getTime() < new Date(pendingEnd).getTime()).length };
}
export function dueReportPeriods(now = new Date()) {
  const p = bangkokParts(now); const result: { key: string; kind: 'day' | 'week' | 'month'; start: string; end: string }[] = [];
  // Catch up to seven missed daily reports, retaining the original cutoff.
  for (let i = 0; i < 7; i++) {
    if (i === 0 && p.hour * 60 + p.minute < 23 * 60 + 15) continue;
    const date = thaiDate(new Date(new Date(`${p.date}T12:00:00+07:00`).getTime() - i * 86400000));
    result.push({ key: `day:${date}`, kind: 'day', ...rangeFor(date, 'day', true) });
  }
  if (p.hour >= 8) {
    const today = new Date(`${p.date}T00:00:00+07:00`); const dow = new Date(`${p.date}T12:00:00+07:00`).getUTCDay();
    const previousMonday = new Date(today.getTime() - (((dow+6)%7)+7)*86400000);
    const week = rangeFor(thaiDate(previousMonday), 'week');
    result.push({ key: `week:${thaiDate(previousMonday)}`, kind: 'week', ...week });
    const first = new Date(`${p.date.slice(0,7)}-01T00:00:00+07:00`);
    const prev = thaiDate(new Date(first.getTime()-86400000));
    result.push({ key: `month:${prev.slice(0,7)}`, kind: 'month', ...rangeFor(prev,'month') });
  }
  return result;
}
export function shouldScan(now = new Date()) {
  const p = bangkokParts(now); return (p.hour === 23 && p.minute >= 5 && p.minute <= 55) || (p.hour === 7 && p.minute >= 5 && p.minute < 10);
}
export function transactionsCsv(rows: Transaction[], accounts: Account[], categories: Category[]) {
  const field = (s: string) => `"${(/^[=+\-@\t\r\n]|^\s+[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g,'""')}"`;
  return '\ufeff' + ['วันที่,ประเภท,จำนวนบาท,บัญชี,หมวด,ผู้เกี่ยวข้อง,หมายเหตุ', ...rows.map(t => [t.occurred_at, t.kind, (t.amount_satang/100).toFixed(2), accounts.find(a=>a.id===t.account_id)?.name ?? '', categories.find(c=>c.id===t.category_id)?.name ?? 'ยังไม่จัดหมวด', t.counterparty, t.note].map(field).join(','))].join('\r\n');
}


// Shared by the delivery worker and the in-app preview. No tokens or network calls.
export type FlexNode =
  | {type:'text';text:string;size?:string;color?:string;weight?:'bold';align?:'end'|'center';flex?:number;wrap?:boolean}
  | {type:'box';layout:'vertical'|'horizontal';contents:FlexNode[];backgroundColor?:string;spacing?:string;flex?:number;alignItems?:'center'}
  | {type:'image';url:string;size:string;aspectRatio:string;aspectMode:'fit';flex:number}
  | {type:'separator'}
  | {type:'button';style?:'primary';color?:string;flex?:number;adjustMode?:'shrink-to-fit';action:{type:'uri';label:string;uri:string}};
export type FlexBox=Extract<FlexNode,{type:'box'}>;
export type FlexMessage={type:'flex';altText:string;contents:{type:'bubble';header:FlexBox;body:FlexBox;footer:FlexBox}};
export function flexMascotUrl(key:string,origin:string):string|null {
  try {
    const base=new URL(origin);
    // LINE downloads public HTTPS artwork; never send localhost or authenticated URLs.
    if(base.protocol!=='https:'||base.username||base.password||['localhost','127.0.0.1','[::1]'].includes(base.hostname))return null;
    const pose=key.startsWith('month:')?'celebrate':key.startsWith('week:')?'thinking':'reading';
    return new URL(`/line/mascot-${pose}-v2.png`,base.origin).href;
  }catch{return null;}
}
export function flexReport(summary:Summary,key:string,origin:string,syncStatus:string):FlexMessage {
  const title=key.startsWith('day:')?'สรุปวันนี้':key.startsWith('week:')?'สรุปสัปดาห์':'สรุปเดือน';
  const row=(label:string,value:string):FlexNode=>({type:'box',layout:'horizontal',contents:[{type:'text',text:label,size:'sm',color:'#667085',flex:2},{type:'text',text:value,size:'sm',weight:'bold',align:'end',flex:3,wrap:true}]});
  const mascotUrl=flexMascotUrl(key,origin),heading:FlexBox={type:'box',layout:'vertical',flex:1,spacing:'xs',contents:[{type:'text',text:'Expense Tracker',color:'#ffffff',size:'xs',wrap:true},{type:'text',text:title,color:'#ffffff',weight:'bold',size:'lg',wrap:true},{type:'text',text:'ใช้ไป',color:'#e0e4ff',size:'sm'},{type:'text',text:money(summary.expense),color:'#ffffff',weight:'bold',size:'xxl',wrap:true}]};
  const header:FlexBox={type:'box',layout:'horizontal',alignItems:'center',spacing:'sm',backgroundColor:'#5564dc',contents:[heading,...(mascotUrl?[{type:'image' as const,url:mascotUrl,size:'88px',aspectRatio:'1:1',aspectMode:'fit' as const,flex:0}]:[])]};
  return {type:'flex',altText:`${title} ใช้ไป ${money(summary.expense)} · รอข้อมูล ${summary.pending} สลิป`,contents:{type:'bubble',header,body:{type:'box',layout:'vertical',spacing:'md',contents:[row('รายรับ',money(summary.income)),row('เงินสุทธิ',money(summary.net)),{type:'separator'},...summary.byAccount.filter(a=>a.expense||a.income).map(a=>row(a.name,`จ่าย ${money(a.expense)} · รับ ${money(a.income)}`)),row('หมวดสูงสุด',summary.byCategory.find(c=>c.expense>0)?.name??'ยังไม่มี'),{type:'text',text:`รอข้อมูล ${summary.pending} สลิป · ไม่รวมในยอด`,wrap:true,size:'xs',color:'#94703a'},{type:'text',text:syncStatus,wrap:true,size:'xs',color:'#667085'}]},footer:{type:'box',layout:'horizontal',spacing:'sm',contents:[{type:'button',flex:1,adjustMode:'shrink-to-fit',action:{type:'uri',label:'ดูสลิปรอข้อมูล',uri:`${origin}/slips`}},{type:'button',flex:1,adjustMode:'shrink-to-fit',style:'primary',color:'#5564dc',action:{type:'uri',label:'ดู Dashboard',uri:origin}}]}}};
}
