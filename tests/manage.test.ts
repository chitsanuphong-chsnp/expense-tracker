import {beforeAll,afterAll,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
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
 for(const f of ['002_realtime.sql','003_ocr.sql','004_delete_slips.sql','005_own_identity.sql','006_import_reset_manage.sql','006_import_reset_manage.sql'])await db.exec(await sql(f));
},30000);
afterAll(async()=>{await db.close();});
const account=(uid:string,name:string)=>one<{id:string}>('select id from accounts where owner_id=$1 and name=$2',[uid,name]).then(r=>r.id);
const tx=async(uid:string,acc:string,extra:Record<string,unknown>={})=>{const id=randomUUID();await db.query("insert into transactions(id,owner_id,kind,amount_satang,account_id,category_id,occurred_at) values($1,$2,'expense',100,$3,$4,now())",[id,uid,acc,extra.category??null]);return id;};

it('stores app-uploaded slips without a Drive file and still deduplicates a later Drive copy',async()=>{
 const src=randomUUID();await db.query("insert into drive_sources(id,owner_id,source_code,folder_id) values($1,$2,'ttb','folder_test_123456')",[src,owner]);
 const up=(await one<{id:string}>("insert into slips(owner_id,source_code,origin,name,uploaded_at,status,qr_key) values($1,'ttb','upload','app',now(),'needs_details','011:REF1') returning id",[owner])).id;
 await expect(db.query("insert into slips(owner_id,source_code,origin,name,uploaded_at) values($1,'ttb','drive','x',now())",[owner])).rejects.toThrow();
 await expect(db.query("insert into slips(owner_id,source_code,origin,drive_file_id,name,uploaded_at) values($1,'ttb','upload','file123456789','x',now())",[owner])).rejects.toThrow();
 const drive=(await one<{id:string}>("insert into slips(owner_id,source_code,source_id,drive_file_id,name,uploaded_at) values($1,'ttb',$2,'drive-copy-1234','x',now()) returning id",[owner,src])).id;
 expect((await one<{r:string}>("select finish_qr($1,'h1','payload','011:REF1',null) r",[drive])).r).toBe(up);
 expect(await one('select status,duplicate_of from slips where id=$1',[drive])).toEqual({status:'duplicate',duplicate_of:up});
});
it('resets only the caller’s transactions and slips, keeps setup, and sets the import start date',async()=>{
 const acc=await account(owner,'ttb'),t=await tx(owner,acc),foreign=await tx(other,await account(other,'ttb'));
 await db.query("update slips set transaction_id=$1,status='linked' where owner_id=$2 and origin='upload'",[t,owner]);
 await db.query("insert into jobs(owner_id,job_key,kind,payload) values($1,'qr-x','qr','{}'),($1,'report-x','report','{}')",[owner]);
 await as(owner,()=>db.query("select reset_transactions_and_slips('2026-10-11')"));
 expect((await db.query('select id from transactions where owner_id=$1',[owner])).rows).toHaveLength(0);
 expect((await db.query('select id from slips where owner_id=$1',[owner])).rows).toHaveLength(0);
 expect((await db.query("select job_key from jobs where owner_id=$1",[owner])).rows).toEqual([{job_key:'report-x'}]);
 expect((await db.query('select id from transactions where id=$1',[foreign])).rows).toHaveLength(1);
 expect((await db.query('select id from accounts where owner_id=$1',[owner])).rows.length).toBe(5);
 expect((await one<{d:string}>('select import_from::text d from profiles where id=$1',[owner])).d).toBe('2026-10-11');
 await db.query("insert into jobs(owner_id,job_key,kind,payload,status,lease_until) values($1,'scan-live','scan','{}','running',now()+interval '1 minute')",[owner]);
 await expect(as(owner,()=>db.query("select reset_transactions_and_slips(null)"))).rejects.toThrow('IMPORT_RUNNING');
 await db.query("delete from jobs where job_key='scan-live'");
 await db.query("select set_config('request.jwt.claim.sub','',false)");
 await expect(db.query("select reset_transactions_and_slips(null)")).rejects.toThrow('Unauthorized');
});
it('deletes unused accounts, refuses accounts in use, and uncategorizes on category delete',async()=>{
 const make=await account(owner,'MAKE'),cash=await account(owner,'เงินสด');
 await db.query("insert into drive_sources(owner_id,source_code,folder_id,account_id) values($1,'make','folder_make_123456',$2)",[owner,make]);
 await as(owner,()=>db.query('select delete_account($1)',[make]));
 expect((await db.query('select id from accounts where id=$1',[make])).rows).toHaveLength(0);
 expect((await one("select account_id from drive_sources where owner_id=$1 and source_code='make'",[owner])).account_id).toBeNull();
 await tx(owner,cash);await expect(as(owner,()=>db.query('select delete_account($1)',[cash]))).rejects.toThrow('ACCOUNT_IN_USE');
 await expect(as(other,()=>db.query('select delete_account($1)',[cash]))).rejects.toThrow('Not found');
 const food=(await one<{id:string}>("select id from categories where owner_id=$1 and name='อาหาร'",[owner])).id,t=await tx(owner,cash,{category:food});
 await db.query("insert into category_rules(owner_id,counterparty,category_id) values($1,'ร้านข้าว',$2)",[owner,food]);
 await expect(as(other,()=>db.query('select delete_category($1)',[food]))).rejects.toThrow('Not found');
 await as(owner,()=>db.query('select delete_category($1)',[food]));
 expect((await one('select category_id from transactions where id=$1',[t])).category_id).toBeNull();
 expect((await db.query('select id from category_rules where category_id=$1',[food])).rows).toHaveLength(0);
});
it('reports a missing migration instead of a generic database error',async()=>{
 const {checked}=await import('../apps/api/src/db.ts');
 for(const code of ['PGRST204','PGRST202','42703','42883'])expect(()=>checked({data:null,error:{code}})).toThrow('MIGRATION_REQUIRED');
 expect(()=>checked({data:null,error:{code:'23505'}})).toThrow('CONFLICT');
 expect(()=>checked({data:null,error:{code:'XX000'}})).toThrow('DATABASE_ERROR');
});
