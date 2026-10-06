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
 const ocrMigration=await readFile(new URL('../supabase/migrations/003_ocr.sql',import.meta.url),'utf8');await db.exec(ocrMigration);await db.exec(ocrMigration);
},30000);
afterAll(async()=>{await db.close();});
async function revision(id=owner){return (await db.query<{revision:string}>('select revision from data_sync_signals where owner_id=$1',[id])).rows[0]?.revision;}
it('publishes only revision signals and allows an idempotent upgrade with existing users',async()=>{
 expect((await db.query("select tablename from pg_publication_tables where pubname='supabase_realtime'")).rows).toEqual([{tablename:'data_sync_signals'}]);
 expect((await db.query("select column_name from information_schema.columns where table_name='data_sync_signals' order by ordinal_position")).rows).toEqual([{column_name:'owner_id'},{column_name:'revision'},{column_name:'updated_at'}]);
 expect(await revision()).toBeTruthy();
});
it('signals insert, update, delete and rollback without touching another owner',async()=>{
 const foreign=await revision(other);let previous=await revision();const id=randomUUID();
 await db.query("insert into categories(id,owner_id,name) values($1,$2,'test')",[id,owner]);
 expect(await revision()).not.toBe(previous);previous=await revision();
 await db.query("update categories set name='changed' where id=$1",[id]);expect(await revision()).not.toBe(previous);previous=await revision();
 await db.query('delete from categories where id=$1',[id]);expect(await revision()).not.toBe(previous);
 expect(await revision(other)).toBe(foreign);previous=await revision();
 await db.exec('begin');await db.query('update profiles set budget_satang=123 where id=$1',[owner]);await db.exec('rollback');expect(await revision()).toBe(previous);
});
it('restricts reading signals to their owner and denies client writes',async()=>{
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated');
 try{
  expect((await db.query('select owner_id from data_sync_signals')).rows).toEqual([{owner_id:owner}]);
  await expect(db.query('update data_sync_signals set revision=gen_random_uuid() where owner_id=$1',[owner])).rejects.toThrow();
  await expect(db.query('select notify_owner_data_changed()')).rejects.toThrow();
 }finally{await db.exec('reset role');}
});
it('supports seeded new users and cascading deletion without recreating signals',async()=>{
 const id=randomUUID();await db.query('insert into auth.users(id) values($1)',[id]);expect(await revision(id)).toBeTruthy();
 await db.query('delete from auth.users where id=$1',[id]);expect(await revision(id)).toBeUndefined();
});