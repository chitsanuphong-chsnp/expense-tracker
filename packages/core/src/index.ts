import { z } from 'zod';

export const sourceCodes = ['ttb', 'kplus', 'krungthai', 'make'] as const;
export type SourceCode = typeof sourceCodes[number];
export type Account = { id: string; name: string; kind: 'bank' | 'cash'; bank_code: string | null; color: string; numbers?: string[] };
export type Category = { id: string; name: string; color: string };
export type Transaction = { id: string; kind: 'income' | 'expense' | 'transfer'; amount_satang: number; account_id: string; to_account_id: string | null; category_id: string | null; occurred_at: string; note: string; counterparty: string; source: 'manual' | 'qr' | 'auto'; needs_review?: boolean; created_at?: string };
export type OcrDraft = {engine:string;amount_satang:number|null;date:string|null;time:string|null;sender:string|null;recipient:string|null;requires_review:true;error?:string;attempts?:number;sender_account?:string|null;recipient_account?:string|null;date_source?:'upload';parser?:number};
export type SlipQrDetails = {format:'mini_qr'|'unrecognized';sending_bank_code:string|null;sending_bank_name:string|null;transaction_reference:string|null;country_code:string|null;checksum:string|null;tags:{path:string;value:string}[];missing:string[]};
export type Slip = { id: string; source_code: SourceCode; status: 'queued' | 'processing' | 'needs_details' | 'qr_unreadable' | 'duplicate' | 'linked' | 'failed'; uploaded_at: string; transaction_id: string | null; qr_payload: string | null; qr_details?: SlipQrDetails | null; ocr_details?: OcrDraft | null; duplicate_of: string | null; error_code: string | null; drive_file_id: string | null; origin?: 'drive' | 'upload'; name?: string };
export type Source = { id: string; source_code: SourceCode; folder_id: string; account_id: string | null; last_scan_at: string | null; last_scan_status: string | null; scan_complete: boolean };
// A favourite shop for quick entry: allowed accounts (first = default) and an optional default category.
export type QuickShop = { id: string; name: string; icon: string; account_ids: string[]; category_id: string | null };
export const quickShop = z.object({ id: z.string().min(1).max(40), name: z.string().trim().min(1).max(40), icon: z.string().max(20), account_ids: z.array(z.string().uuid()).max(6), category_id: z.string().uuid().nullable() });
export type Settings = { budget_satang: number; line_connected: boolean; line_blocked: boolean; own_names?: string[]; import_from?: string | null; quick_shops?: QuickShop[] | null };
export type Dataset = { accounts: Account[]; categories: Category[]; transactions: Transaction[]; slips: Slip[]; sources: Source[]; settings: Settings; reports: Report[]; rules: Rule[] };
export type Rule = { id: string; counterparty: string; category_id: string };
export type Report = { id: string; report_key: string; status: string; period_start: string; period_end: string; snapshot: Summary; sent_at: string | null; error_code: string | null };
export type Summary = { income: number; expense: number; net: number; count: number; byAccount: { id: string; name: string; expense: number; income: number; color: string; bank?: SourceCode | 'cash' | null }[]; byCategory: { id: string; name: string; expense: number; color: string }[]; pending: number; ocr_draft?: { amount_satang: number; slips: number; own_transfers?: number }; transfers?: { amount_satang: number; count: number } };

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
// Turns a slip's OCR draft into a transaction to save automatically, or null when it cannot be saved safely
// (no amount, or no account to book it on). The source account comes from the sender's masked number, else the
// account linked to the Drive source; a recipient number matching another own account makes it a transfer.
export function autoTransaction(slip: Pick<Slip, 'uploaded_at' | 'ocr_details'>, sourceAccountId: string | null, accounts: Account[], rules: Rule[] = []): TransactionInput | null {
  const d = slip.ocr_details;
  if (!d || d.error || !Number.isSafeInteger(d.amount_satang) || !(d.amount_satang! > 0)) return null;
  const banks = accounts.filter(a => a.kind === 'bank');
  const account = accountForMask(d.sender_account, banks)?.id ?? (banks.some(a => a.id === sourceAccountId) ? sourceAccountId : null);
  if (!account) return null;
  const target = accountForMask(d.recipient_account, banks);
  const to = target && target.id !== account ? target.id : null;
  const counterparty = (d.recipient ?? '').trim().slice(0, 200);
  const read = d.date && d.time ? new Date(`${d.date}T${d.time}:00+07:00`) : null;
  const occurred = read && !Number.isNaN(read.getTime()) ? read : new Date(slip.uploaded_at);
  const input = transactionInput.safeParse({ kind: to ? 'transfer' : 'expense', amount_satang: d.amount_satang, account_id: account, to_account_id: to,
    category_id: to ? null : rules.find(r => r.counterparty === counterparty)?.category_id ?? null, occurred_at: occurred.toISOString(), note: '', counterparty });
  return input.success ? input.data : null;
}
// Which bank (slip source) an account belongs to: the Drive source linked to it, else its name. Cash has none.
export function accountBank(account: Pick<Account, 'id' | 'name' | 'kind'> | null | undefined, sources: Pick<Source, 'account_id' | 'source_code'>[] = []): SourceCode | null {
  if (!account || account.kind === 'cash') return null;
  const linked = sources.find(s => s.account_id === account.id); if (linked) return linked.source_code;
  const n = account.name.toLowerCase().replace(/[\s_-]/g, '');
  if (n.includes('make')) return 'make';
  if (n.includes('ttb') || n.includes('ทีทีบี') || n.includes('ทหารไทย')) return 'ttb';
  if (n.includes('kplus') || n.includes('kbank') || n.includes('กสิกร')) return 'kplus';
  if (n.includes('krungthai') || n.includes('ktb') || n.includes('กรุงไทย')) return 'krungthai';
  return null;
}
// The account a slip from this bank is booked on: the one linked to the Drive source, else the one named after the bank.
export function accountForBank(code: SourceCode | null | undefined, accounts: Account[], sources: Pick<Source, 'account_id' | 'source_code'>[] = []): string | null {
  if (!code) return null;
  const linked = sources.find(s => s.source_code === code)?.account_id;
  if (linked && accounts.some(a => a.id === linked)) return linked;
  return accounts.find(a => accountBank(a, sources) === code)?.id ?? null;
}
// Categories offered while recording; one that does not exist yet is created when chosen.
export const suggestedCategories: [string, string][] = [
  ['อาหาร', '#e4a055'], ['เครื่องดื่ม/กาแฟ', '#b488de'], ['ของใช้/ซุปเปอร์มาร์เก็ต', '#5fae8a'], ['เดินทาง', '#6b99e2'], ['น้ำมัน', '#d27a5a'],
  ['ช้อปปิ้ง', '#df81a5'], ['ค่าน้ำ/ค่าไฟ', '#4fa3c7'], ['โทรศัพท์/อินเทอร์เน็ต', '#7b8fd8'], ['ค่าที่พัก', '#a58b6f'], ['สุขภาพ/ยา', '#e06a7a'],
  ['บันเทิง', '#9b6fd1'], ['การศึกษา', '#4d9e9e'], ['ของขวัญ/ทำบุญ', '#e2a33d'], ['สัตว์เลี้ยง', '#c28a5c'], ['ท่องเที่ยว', '#3fa2b8'],
  ['ประกัน/ภาษี', '#8a94a8'], ['ครอบครัว', '#d9879b'], ['ความงาม', '#ef8fb0'], ['ทั่วไป', '#8ca3b5'],
];
// Starter list before the owner edits it: 7-Eleven, paid by the ttb account (TrueMoney) by default, or cash.
export function defaultQuickShops(accounts: Account[], sources: Pick<Source, 'account_id' | 'source_code'>[] = []): QuickShop[] {
  const cash = accounts.filter(a => a.kind === 'cash').map(a => a.id), ttb = accounts.filter(a => accountBank(a, sources) === 'ttb').map(a => a.id);
  return [{ id: '7eleven', name: '7-Eleven', icon: '7eleven', account_ids: [...ttb, ...cash].slice(0, 6), category_id: null }];
}
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
  const own = readable.filter(s => likelyOwnTransfer(s.ocr_details, data.settings.own_names, data.accounts)), drafts = readable.filter(s => !own.includes(s));
  const rows = data.transactions.filter(t => new Date(t.occurred_at).getTime() >= from && new Date(t.occurred_at).getTime() < until);
  // Spending ("ใช้ไป") is expenses only; transfers between own accounts are reported apart.
  const spent = rows.filter(t => t.kind === 'expense'), moved = rows.filter(t => t.kind === 'transfer'), total = (list: Transaction[]) => list.reduce((n, t) => n + t.amount_satang, 0);
  const income = total(rows.filter(t => t.kind === 'income')), expense = total(spent);
  return { income, expense, net: income - expense, count: spent.length,
    byAccount: data.accounts.map(a => ({ id: a.id, name: a.name, color: a.color, bank: a.kind === 'cash' ? 'cash' as const : accountBank(a, data.sources), income: total(rows.filter(t => t.account_id === a.id && t.kind === 'income')), expense: total(spent.filter(t => t.account_id === a.id)) })),
    byCategory: [...data.categories, { id: 'uncategorized', name: 'ยังไม่จัดหมวด', color: '#a2abc0' }].map(c => ({ ...c, expense: total(spent.filter(t => (t.category_id ?? 'uncategorized') === c.id)) })).sort((a,b)=>b.expense-a.expense),
    pending: pending.length,
    ocr_draft: { amount_satang: drafts.reduce((n, s) => n + s.ocr_details!.amount_satang!, 0), slips: drafts.length, own_transfers: own.length },
    transfers: { amount_satang: total(moved), count: moved.length } };
}
export function dueReportPeriods(now = new Date()) {
  const p = bangkokParts(now); const result: { key: string; kind: 'day' | 'week' | 'month'; start: string; end: string }[] = [];
  // From 08:00: yesterday only, last week on Mondays, last month on the 1st. Missed days are not sent later;
  // a report already queued still retries (08:05, night ticks) within its 23-hour window.
  if (p.hour < 8) return result;
  const today = new Date(`${p.date}T12:00:00+07:00`);
  const yesterday = thaiDate(new Date(today.getTime() - 86400000));
  result.push({ key: `day:${yesterday}`, kind: 'day', ...rangeFor(yesterday, 'day') });
  if (today.getUTCDay() === 1) {
    const lastMonday = thaiDate(new Date(today.getTime() - 7 * 86400000));
    result.push({ key: `week:${lastMonday}`, kind: 'week', ...rangeFor(lastMonday, 'week') });
  }
  if (p.date.endsWith('-01')) result.push({ key: `month:${yesterday.slice(0,7)}`, kind: 'month', ...rangeFor(yesterday, 'month') });
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
// LINE downloads public HTTPS artwork; never send localhost or authenticated URLs.
function flexAssetUrl(path:string,origin:string):string|null {
  try {
    const base=new URL(origin);
    if(base.protocol!=='https:'||base.username||base.password||['localhost','127.0.0.1','[::1]'].includes(base.hostname))return null;
    return new URL(path,base.origin).href;
  }catch{return null;}
}
export function flexMascotUrl(key:string,origin:string):string|null {
  const pose=key.startsWith('month:')?'celebrate':key.startsWith('week:')?'thinking':'reading';
  return flexAssetUrl(`/line/mascot-${pose}-v2.png`,origin);
}
export function flexReport(summary:Summary,key:string,origin:string,syncStatus:string):FlexMessage {
  const months=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const dayLabel=(date:string)=>`${Number(date.slice(8,10))} ${months[Number(date.slice(5,7))-1]}`;
  // range:FROM:TO is the summary sent after a Drive import from the app.
  const title=key.startsWith('day:')?`สรุปวันที่ ${dayLabel(key.slice(4))}`:key.startsWith('range:')?`สรุป ${dayLabel(key.slice(6,16))} – ${dayLabel(key.slice(17,27))}`:key.startsWith('week:')?'สรุปสัปดาห์':'สรุปเดือน';
  const text=(value:string,extra:Partial<Extract<FlexNode,{type:'text'}>>={}):FlexNode=>({type:'text',text:value,size:'sm',color:'#253044',wrap:true,...extra});
  const dot=(color:string):FlexNode=>({type:'box',layout:'vertical',contents:[],width:'8px',height:'8px',cornerRadius:'4px',backgroundColor:color});
  // Round bank logo (or the green ฿ for cash) before each account, like in the app; a colour dot when there is none.
  const mark=(color:string,bank?:string|null):FlexNode=>{const url=bank?flexAssetUrl(`/line/banks/${bank}.png`,origin):null;return url?{type:'image',url,size:'20px',aspectRatio:'1:1',aspectMode:'fit',flex:0}:dot(color);};
  const line=(color:string,label:string,value:string,bank?:string|null):FlexNode=>({type:'box',layout:'horizontal',spacing:'sm',alignItems:'center',contents:[mark(color,bank),text(label,{flex:3,color:'#4a5468',wrap:false}),text(value,{flex:2,weight:'bold',align:'end',wrap:false})]});
  const heading=(value:string):FlexNode=>text(value,{size:'xs',color:'#8a94a8',weight:'bold'});
  // Most spending has no category, so the Flex lists accounts only. Spending only.
  const accounts=summary.byAccount.filter(a=>a.expense).map(a=>line(a.color,a.name,money(a.expense),a.bank));
  // Status notes appear only when there is something to report (no "0 slips" lines).
  const notes:FlexNode[]=[];
  if(summary.pending)notes.push(text(`รอข้อมูล ${summary.pending} สลิป · ไม่รวมในยอด`,{size:'xs',color:'#94703a'}));
  if(summary.transfers?.count)notes.push(text(`โอนเข้าบัญชีตัวเอง ${money(summary.transfers.amount_satang)} (${summary.transfers.count} รายการ) · ไม่รวมในยอด`,{size:'xs',color:'#94703a'}));
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
