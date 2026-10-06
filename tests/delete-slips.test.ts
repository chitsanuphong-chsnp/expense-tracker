import {beforeAll,afterAll,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
let db:PGlite;const owner=randomUUID(),other=randomUUID();
beforeAll(async()=>{
 db=new PGlite();await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role bypassrls;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 await db.exec(await readFile(new URL('../supabase/migrations/001_initial.sql',import.meta.url),'utf8'));
 await db.query('insert into auth.users(id) values($1),($2)',[owner,other]);
 const migration=await readFile(new URL('../supabase/migrations/002_realtime.sql',import.meta.url),'utf8');
 await db.exec(migration);await db.exec(migration);
 await db.exec(await readFile(new URL('../supabase/migrations/004_delete_slips.sql',import.meta.url),'utf8'));
 const ocrMigration=await readFile(new URL('../supabase/migrations/003_ocr.sql',import.meta.url),'utf8');await db.exec(ocrMigration);await db.exec(ocrMigration);
},30000);
afterAll(async()=>{await db.close();});

it('deletes only unrecorded owner slips and their jobs, including duplicates',async()=>{
 const source=randomUUID(),foreignSource=randomUUID(),a=randomUUID(),dup=randomUUID(),foreign=randomUUID(),linked=randomUUID(),tx=randomUUID();
 for(const [id,o] of [[source,owner],[foreignSource,other]])await db.query("insert into drive_sources(id,owner_id,source_code,folder_id) values($1,$2,'ttb','folder_test_123456')",[id,o]);
 const account=(await db.query<{id:string}>("select id from accounts where owner_id=$1 limit 1",[owner])).rows[0].id;
 await db.query("insert into transactions(id,owner_id,kind,amount_satang,account_id,occurred_at) values($1,$2,'expense',100,$3,now())",[tx,owner,account]);
 for(const [id,o,src] of [[a,owner,source],[dup,owner,source],[linked,owner,source],[foreign,other,foreignSource]])await db.query("insert into slips(id,owner_id,source_code,source_id,drive_file_id,name,uploaded_at) values($1::uuid,$2,'ttb',$3,($1::uuid)::text,'test',now())",[id,o,src]);
 await db.query("update slips set duplicate_of=$1,status='duplicate' where id=$2",[a,dup]);
 await db.query("update slips set transaction_id=$1,status='linked' where id=$2",[tx,linked]);
 await db.query("insert into jobs(owner_id,job_key,kind,payload) values($1,'qr-test','qr',$2)",[owner,JSON.stringify({slip_id:a})]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated');
 try{
  await expect(db.query('select delete_unrecorded_slips($1)',[foreign])).rejects.toThrow();
  await expect(db.query('select delete_unrecorded_slips($1)',[linked])).rejects.toThrow();
  expect((await db.query<{n:number}>('select delete_unrecorded_slips($1) n',[a])).rows[0].n).toBe(2);
  expect((await db.query<{n:number}>('select delete_unrecorded_slips(null) n')).rows[0].n).toBe(0);
 }finally{await db.exec('reset role');}
 expect((await db.query('select id from slips order by id')).rows.map(v=>v.id).sort()).toEqual([foreign,linked].sort());
 expect((await db.query("select id from jobs where job_key='qr-test'")).rows).toHaveLength(0);
 expect((await db.query('select id from transactions where id=$1',[tx])).rows).toHaveLength(1);
});
it('blocks deletion during an active import and rejects anonymous calls',async()=>{
 await db.query("insert into jobs(owner_id,job_key,kind,payload,status,lease_until) values($1,'scan-active','scan','{}','running',now()+interval '1 minute')",[owner]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated');
 try{await expect(db.query('select delete_unrecorded_slips(null)')).rejects.toThrow('IMPORT_RUNNING');}finally{await db.exec('reset role');}
 await db.exec('set role anon');try{await expect(db.query('select delete_unrecorded_slips(null)')).rejects.toThrow();}finally{await db.exec('reset role');}
});



