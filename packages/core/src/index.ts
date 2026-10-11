import { z } from 'zod';

export const sourceCodes = ['ttb', 'kplus', 'krungthai', 'make'] as const;
export type SourceCode = typeof sourceCodes[number];
export type Account = { id: string; name: string; kind: 'bank' | 'cash'; bank_code: string | null; color: string; numbers?: string[] };
export type Category = { id: string; name: string; color: string };
export type Transaction = { id: string; kind: 'income' | 'expense' | 'transfer'; amount_satang: number; account_id: string; to_account_id: string | null; category_id: string | null; occurred_at: string; note: string; counterparty: string; source: 'manual' | 'qr'; created_at?: string };
export type OcrDraft = {engine:string;amount_satang:number|null;date:string|null;time:string|null;sender:string|null;recipient:string|null;requires_review:true;error?:string;attempts?:number;sender_account?:string|null;recipient_account?:string|null;date_source?:'upload'};
export type SlipQrDetails = {format:'mini_qr'|'unrecognized';sending_bank_code:string|null;sending_bank_name:string|null;transaction_reference:string|null;country_code:string|null;checksum:string|null;tags:{path:string;value:string}[];missing:string[]};
export type Slip = { id: string; source_code: SourceCode; status: 'queued' | 'processing' | 'needs_details' | 'qr_unreadable' | 'duplicate' | 'linked' | 'failed'; uploaded_at: string; transaction_id: string | null; qr_payload: string | null; qr_details?: SlipQrDetails | null; ocr_details?: OcrDraft | null; duplicate_of: string | null; error_code: string | null; drive_file_id: string | null; origin?: 'drive' | 'upload'; name?: string };
export type Source = { id: string; source_code: SourceCode; folder_id: string; account_id: string | null; last_scan_at: string | null; last_scan_status: string | null; scan_complete: boolean };
export type Settings = { budget_satang: number; line_connected: boolean; line_blocked: boolean; own_names?: string[]; import_from?: string | null };
export type Dataset = { accounts: Account[]; categories: Category[]; transactions: Transaction[]; slips: Slip[]; sources: Source[]; settings: Settings; reports: Report[]; rules: Rule[] };
export type Rule = { id: string; counterparty: string; category_id: string };
export type Report = { id: string; report_key: string; status: string; period_start: string; period_end: string; snapshot: Summary; sent_at: string | null; error_code: string | null };
export type Summary = { income: number; expense: number; net: number; count: number; byAccount: { id: string; name: string; expense: number; income: number; color: string }[]; byCategory: { id: string; name: string; expense: number; color: string }[]; pending: number; ocr_draft?: { amount_satang: number; slips: number; own_transfers?: number } };

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
function normalizeName(name: string) {
  return name.normalize('NFKC').toLowerCase().trim().replace(/^(?:นาย|นางสาว|นาง|น\.ส\.|mr\.?|mrs\.?|ms\.?|miss)\s*/, '').replace(/[\s.]/g, '');
}
// A masked slip number (xxx-x-x8536-x) matches a full number when every visible digit lines up.
export function maskMatches(mask: string, number: string) {
  const m = mask.toUpperCase().replace(/[^0-9X]/g, ''), n = number.replace(/\D/g, '');
  if (!m || m.length !== n.length) return false;
  let visible = 0;
  for (let i = 0; i < m.length; i++) { if (m[i] === 'X') continue; if (m[i] !== n[i]) return false; visible++; }
  return visible >= 3;
}
export function accountForMask(mask: string | null | undefined, accounts: Account[] = []) {
  return mask ? accounts.find(a => a.numbers?.some(n => maskMatches(mask, n))) : undefined;
}
// Account numbers are checked first; names are a fallback because slips mask surnames. Only a hint: the owner confirms.
export function likelyOwnTransfer(draft: OcrDraft | null | undefined, ownNames: string[] = [], accounts: Account[] = []) {
  if (accountForMask(draft?.recipient_account, accounts)) return true;
  const recipient = draft?.recipient ? normalizeName(draft.recipient) : '';
  if (!recipient) return false;
  return ownNames.some(name => [name, name.trim().split(/\s+/)[0]].map(normalizeName).some(key => key.length >= 3 && recipient.includes(key)));
}
// Daily reports go out at 08:00 for the previous day; slips uploaded until that morning belong to it.
export function dailyPendingWindow(date: string) {
  const start = new Date(`${date}T08:00:00+07:00`);
  return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() };
}
export function summarize(data: Dataset, start: string, end: string, pendingEnd = end, pendingStart = start): Summary {
  const from = new Date(start).getTime(), until = new Date(end).getTime();
  const pendingFrom = new Date(pendingStart).getTime(), pendingUntil = new Date(pendingEnd).getTime();
  const pending = data.slips.filter(s => ['needs_details','qr_unreadable','queued','processing','failed'].includes(s.status) && new Date(s.uploaded_at).getTime() >= pendingFrom && new Date(s.uploaded_at).getTime() < pendingUntil);
  // Unreviewed OCR amounts are shown beside the totals, never added to them.
  const readable = pending.filter(s => !s.ocr_details?.error && Number.isSafeInteger(s.ocr_details?.amount_satang) && s.ocr_details!.amount_satang! > 0);
  // Own-account transfers count as spending too, so their drafts join the draft total; own_transfers stays as a hint count.
  const own = readable.filter(s => likelyOwnTransfer(s.ocr_details, data.settings.own_names, data.accounts)), drafts = readable;
  const rows = data.transactions.filter(t => new Date(t.occurred_at).getTime() >= from && new Date(t.occurred_at).getTime() < until);
  // Spending ("ใช้ไป") includes transfers between own accounts, counted on the source account.
  const spends = (t: Transaction) => t.kind === 'expense' || t.kind === 'transfer';
  const spent = rows.filter(spends), total = (list: Transaction[]) => list.reduce((n, t) => n + t.amount_satang, 0);
  const income = total(rows.filter(t => t.kind === 'income')), expense = total(spent);
  return { income, expense, net: income - expense, count: spent.length,
    byAccount: data.accounts.map(a => ({ id: a.id, name: a.name, color: a.color, income: total(rows.filter(t => t.account_id === a.id && t.kind === 'income')), expense: total(spent.filter(t => t.account_id === a.id)) })),
    byCategory: [...data.categories, { id: 'uncategorized', name: 'ยังไม่จัดหมวด', color: '#a2abc0' }].map(c => ({ ...c, expense: total(spent.filter(t => (t.category_id ?? 'uncategorized') === c.id)) })).sort((a,b)=>b.expense-a.expense),
    pending: pending.length,
    ocr_draft: { amount_satang: drafts.reduce((n, s) => n + s.ocr_details!.amount_satang!, 0), slips: drafts.length, own_transfers: own.length } };
}
export function dueReportPeriods(now = new Date()) {
  const p = bangkokParts(now); const result: { key: string; kind: 'day' | 'week' | 'month'; start: string; end: string }[] = [];
  // Yesterday's report is due at 08:00; catch up to seven missed days.
  for (let i = 1; i <= 7; i++) {
    if (i === 1 && p.hour < 8) continue;
    const date = thaiDate(new Date(new Date(`${p.date}T12:00:00+07:00`).getTime() - i * 86400000));
    result.push({ key: `day:${date}`, kind: 'day', ...rangeFor(date, 'day') });
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
  // Matches supabase/schedule.sql: 23:35–00:00 every 5 min after the 23:30 upload.
  // Windows run a few minutes past the last call so a late cron delivery still scans.
  const p = bangkokParts(now), m = p.hour * 60 + p.minute;
  return m >= 23 * 60 + 35 || m < 5;
}
export function transactionsCsv(rows: Transaction[], accounts: Account[], categories: Category[]) {
  const field = (s: string) => `"${(/^[=+\-@\t\r\n]|^\s+[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g,'""')}"`;
  return '\ufeff' + ['วันที่,ประเภท,จำนวนบาท,บัญชี,หมวด,ผู้เกี่ยวข้อง,หมายเหตุ', ...rows.map(t => [t.occurred_at, t.kind, (t.amount_satang/100).toFixed(2), accounts.find(a=>a.id===t.account_id)?.name ?? '', categories.find(c=>c.id===t.category_id)?.name ?? 'ยังไม่จัดหมวด', t.counterparty, t.note].map(field).join(','))].join('\r\n');
}


// Shared by the delivery worker and the in-app preview. No tokens or network calls.
export type FlexGradient={type:'linearGradient';angle:string;startColor:string;endColor:string};
export type FlexNode =
  | {type:'text';text:string;size?:string;color?:string;weight?:'bold';align?:'end'|'center';flex?:number;wrap?:boolean;margin?:string}
  | {type:'box';layout:'vertical'|'horizontal';contents:FlexNode[];backgroundColor?:string;background?:FlexGradient;spacing?:string;flex?:number;alignItems?:'center';justifyContent?:'center';cornerRadius?:string;paddingAll?:string;width?:string;height?:string;margin?:string}
  | {type:'image';url:string;size:string;aspectRatio:string;aspectMode:'fit';flex:number}
  | {type:'separator';margin?:string;color?:string}
  | {type:'button';style?:'primary'|'secondary';color?:string;height?:'sm'|'md';flex?:number;adjustMode?:'shrink-to-fit';action:{type:'uri';label:string;uri:string}};
export type FlexBox=Extract<FlexNode,{type:'box'}>;
export type FlexMessage={type:'flex';altText:string;contents:{type:'bubble';size?:'mega';header:FlexBox;body:FlexBox;footer:FlexBox}};
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
  const months=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const title=key.startsWith('day:')?`สรุปวันที่ ${Number(key.slice(12,14))} ${months[Number(key.slice(9,11))-1]}`:key.startsWith('week:')?'สรุปสัปดาห์':'สรุปเดือน';
  const text=(value:string,extra:Partial<Extract<FlexNode,{type:'text'}>>={}):FlexNode=>({type:'text',text:value,size:'sm',color:'#253044',wrap:true,...extra});
  const dot=(color:string):FlexNode=>({type:'box',layout:'vertical',contents:[],width:'8px',height:'8px',cornerRadius:'4px',backgroundColor:color});
  const line=(color:string,label:string,value:string):FlexNode=>({type:'box',layout:'horizontal',spacing:'sm',alignItems:'center',contents:[dot(color),text(label,{flex:3,color:'#4a5468',wrap:false}),text(value,{flex:2,weight:'bold',align:'end',wrap:false})]});
  const heading=(value:string):FlexNode=>text(value,{size:'xs',color:'#8a94a8',weight:'bold'});
  // Most spending has no category, so the Flex lists accounts only. Spending only.
  const accounts=summary.byAccount.filter(a=>a.expense).map(a=>line(a.color,a.name,money(a.expense)));
  // Status notes appear only when there is something to report (no "0 slips" lines).
  const notes:FlexNode[]=[];
  if(summary.pending)notes.push(text(`รอข้อมูล ${summary.pending} สลิป · ไม่รวมในยอด`,{size:'xs',color:'#94703a'}));
  if(summary.ocr_draft?.slips)notes.push(text(`ร่าง OCR ยังไม่ตรวจ ${money(summary.ocr_draft.amount_satang)} (${summary.ocr_draft.slips} สลิป) · ไม่รวมในยอด`,{size:'xs',color:'#94703a'}));
  const mascotUrl=flexMascotUrl(key,origin);
  // Compact header: title, amount and one line of detail; small mascot.
  const header:FlexBox={type:'box',layout:'horizontal',alignItems:'center',spacing:'sm',paddingAll:'16px',backgroundColor:'#5564dc',background:{type:'linearGradient',angle:'135deg',startColor:'#4876e2',endColor:'#7756ca'},contents:[
    {type:'box',layout:'vertical',flex:1,contents:[
      text(title,{size:'sm',weight:'bold',color:'#e8ebff'}),
      text(money(summary.expense),{size:'xxl',weight:'bold',color:'#ffffff'}),
      text(`ใช้ไป · ${summary.count} รายการ`,{size:'xxs',color:'#dfe3ff'})]},
    ...(mascotUrl?[{type:'image' as const,url:mascotUrl,size:'60px',aspectRatio:'1:1',aspectMode:'fit' as const,flex:0}]:[])]};
  const body:FlexBox={type:'box',layout:'vertical',spacing:'md',paddingAll:'18px',contents:[
    heading('แยกตามบัญชี'),
    ...(accounts.length?accounts:[text('ไม่มียอดใช้ไปในช่วงนี้',{size:'xs',color:'#8a94a8'})]),
    ...(notes.length?[{type:'box' as const,layout:'vertical' as const,spacing:'xs',margin:'md',paddingAll:'12px',cornerRadius:'12px',backgroundColor:'#fff7e8',contents:notes}]:[]),
    text(syncStatus,{size:'xxs',color:'#8a94a8'})]};
  // The pending-slips button only shows when there are pending slips.
  const footer:FlexBox={type:'box',layout:'horizontal',spacing:'sm',paddingAll:'14px',contents:[
    ...(summary.pending?[{type:'button' as const,style:'secondary' as const,height:'sm' as const,flex:1,adjustMode:'shrink-to-fit' as const,action:{type:'uri' as const,label:'ดูสลิปรอข้อมูล',uri:`${origin}/slips`}}]:[]),
    {type:'button',style:'primary',height:'sm',flex:1,adjustMode:'shrink-to-fit',color:'#5564dc',action:{type:'uri',label:'ดู Dashboard',uri:origin}}]};
  return {type:'flex',altText:`${title} ใช้ไป ${money(summary.expense)}${summary.pending?` · รอข้อมูล ${summary.pending} สลิป`:''}`,contents:{type:'bubble',size:'mega',header,body,footer}};
}
