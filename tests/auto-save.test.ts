import {beforeAll,afterAll,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {autoTransaction,accountBank,accountForBank,defaultQuickShops,quickShop,suggestedCategories,type Account} from '../packages/core/src/index.ts';
let db:PGlite;const owner=randomUUID(),other=randomUUID();
const sql=(f:string)=>readFile(new URL(`../supabase/migrations/${f}`,import.meta.url),'utf8');
const as=async<T>(uid:string,fn:()=>Promise<T>)=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated');try{return await fn();}finally{await db.exec('reset role');}};
const one=async<T=any>(q:string,p:unknown[]=[])=>(await db.query<T>(q,p)).rows[0];
beforeAll(async()=>{
 db=new PGlite();await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role bypassrls;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 await db.exec(await sql('001_initial.sql'));
 await db.query('insert into auth.users(id) values($1),($2)',[owner,other]);
 for(const f of ['002_realtime.sql','003_ocr.sql','004_delete_slips.sql','005_own_identity.sql','006_import_reset_manage.sql','007_auto_save.sql','007_auto_save.sql'])await db.exec(await sql(f));
},30000);
afterAll(async()=>{await db.close();});

const acc=(id:string,name:string,numbers:string[]=[]):Account=>({id,name,kind:'bank',bank_code:null,color:'#000',numbers});
const ttb=acc(randomUUID(),'ttb',['1234558510']),kplus=acc(randomUUID(),'K-PLUS',['0987654321']),cash:Account={...acc(randomUUID(),'เงินสด'),kind:'cash'};
const draft=(changes={})=>({engine:'tesseract',amount_satang:12550,date:'2026-10-10',time:'18:45',sender:null,recipient:'ร้านกาแฟ',requires_review:true as const,...changes});
const slip=(changes={})=>({uploaded_at:'2026-10-10T16:00:00.000Z',ocr_details:draft(changes)});

it('saves a read amount as spending on the source account, at the slip time',()=>{
  expect(autoTransaction(slip(),ttb.id,[ttb,kplus,cash])).toMatchObject({kind:'expense',amount_satang:12550,account_id:ttb.id,to_account_id:null,occurred_at:'2026-10-10T11:45:00.000Z',counterparty:'ร้านกาแฟ'});
});
it('takes the account from the sender number, and a matching recipient number makes a transfer',()=>{
  expect(autoTransaction(slip({sender_account:'xxx-x-x5851-x'}),kplus.id,[ttb,kplus])?.account_id).toBe(ttb.id);
  expect(autoTransaction(slip({sender_account:'xxx-x-x5851-x',recipient_account:'xxx-x-x5432-1'}),null,[ttb,kplus])).toMatchObject({kind:'transfer',account_id:ttb.id,to_account_id:kplus.id,category_id:null});
  // A recipient that is the same account is not a transfer.
  expect(autoTransaction(slip({sender_account:'xxx-x-x5851-x',recipient_account:'xxx-x-x5851-x'}),null,[ttb])?.kind).toBe('expense');
});
it('uses the category rule for the recipient, and the upload time when the date was not read',()=>{
  const food=randomUUID();
  expect(autoTransaction(slip(),ttb.id,[ttb],[{id:'r',counterparty:'ร้านกาแฟ',category_id:food}])?.category_id).toBe(food);
  expect(autoTransaction(slip({date:null,time:null}),ttb.id,[ttb])?.occurred_at).toBe('2026-10-10T16:00:00.000Z');
  expect(autoTransaction(slip({date:'2026-13-45',time:'99:99'}),ttb.id,[ttb])?.occurred_at).toBe('2026-10-10T16:00:00.000Z');
});
it('leaves the slip waiting when the amount was not read or no bank account is known',()=>{
  for(const d of [{amount_satang:null},{amount_satang:0},{error:'OCR_FAILED'}])expect(autoTransaction(slip(d),ttb.id,[ttb])).toBeNull();
  expect(autoTransaction({uploaded_at:'2026-10-10T16:00:00.000Z',ocr_details:null},ttb.id,[ttb])).toBeNull();
  expect(autoTransaction(slip(),null,[ttb])).toBeNull();
  expect(autoTransaction(slip(),cash.id,[ttb,cash])).toBeNull();
});

it('auto_save_slip links once, marks the row for review, and only the worker may call it',async()=>{
  const account=(await one<{id:string}>("select id from accounts where owner_id=$1 and name='ttb'",[owner])).id;
  const s=(await one<{id:string}>("insert into slips(owner_id,source_code,origin,name,uploaded_at,status) values($1,'ttb','upload','app',now(),'needs_details') returning id",[owner])).id;
  const data={kind:'expense',amount_satang:12550,account_id:account,to_account_id:null,category_id:null,occurred_at:'2026-10-10T11:45:00Z',counterparty:'ร้านกาแฟ'};
  const id=randomUUID();
  await expect(as(owner,()=>db.query('select auto_save_slip($1,$2,$3,$4)',[owner,s,id,data]))).rejects.toThrow();
  expect((await one<{r:string}>('select auto_save_slip($1,$2,$3,$4) r',[owner,s,id,data])).r).toBe(id);
  expect((await one<{r:string|null}>('select auto_save_slip($1,$2,$3,$4) r',[owner,s,randomUUID(),data])).r).toBeNull();
  expect(await one('select source,needs_review,amount_satang::int amount from transactions where id=$1',[id])).toEqual({source:'auto',needs_review:true,amount:12550});
  expect(await one('select status,transaction_id from slips where id=$1',[s])).toEqual({status:'linked',transaction_id:id});
  // Another user cannot mark it; the owner's "ตรวจแล้ว" clears it; editing in the form also counts as checked.
  await expect(as(other,()=>db.query('select mark_reviewed($1)',[id]))).rejects.toThrow();
  await as(owner,()=>db.query('select mark_reviewed($1)',[id]));
  expect((await one('select needs_review from transactions where id=$1',[id])).needs_review).toBe(false);
  await db.query('update transactions set needs_review=true where id=$1',[id]);
  await as(owner,()=>db.query('select save_transaction($1,$2,null)',[id,{...data,amount_satang:13000}]));
  expect(await one('select needs_review,amount_satang::int amount from transactions where id=$1',[id])).toEqual({needs_review:false,amount:13000});
});
it('finds a slip bank\'s account from the linked Drive source, else from the account name',()=>{
  const make=acc(randomUUID(),'MAKE by KBank'),ktb=acc(randomUUID(),'กรุงไทย');
  const accounts=[ttb,kplus,make,ktb,cash];
  expect(accountForBank('make',accounts)).toBe(make.id);
  expect(accountForBank('krungthai',accounts)).toBe(ktb.id);
  expect(accountForBank('kplus',accounts,[{source_code:'kplus',account_id:ttb.id}])).toBe(ttb.id);
  expect(accountForBank('kplus',[ttb,cash])).toBeNull();
  expect(accountBank(cash)).toBeNull();expect(accountBank(make)).toBe('make');
});
it('starts quick entry with 7-Eleven paid by ttb first, then cash, and validates shops',()=>{
  expect(defaultQuickShops([ttb,kplus,cash])).toEqual([{id:'7eleven',name:'7-Eleven',icon:'7eleven',account_ids:[ttb.id,cash.id],category_id:null}]);
  expect(quickShop.safeParse({id:'x',name:'ร้านข้าว',icon:'food',account_ids:[cash.id],category_id:null}).success).toBe(true);
  expect(quickShop.safeParse({id:'x',name:' ',icon:'food',account_ids:[],category_id:null}).success).toBe(false);
  expect(new Set(suggestedCategories.map(([n])=>n)).size).toBe(suggestedCategories.length);
});
