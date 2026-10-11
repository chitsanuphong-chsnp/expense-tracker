import {beforeAll,afterAll,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
let db:PGlite;
const sql=(path:string)=>readFile(new URL(`../supabase/${path}`,import.meta.url),'utf8');
const check=async()=>(await db.query<{migration:string;ok:boolean}>(await sql('check-migrations.sql'))).rows;
beforeAll(async()=>{
 db=new PGlite();await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role bypassrls;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 await db.exec(await sql('migrations/001_initial.sql'));
},30000);
afterAll(async()=>{await db.close();});
it('reports pending migrations, then all applied',async()=>{
 const pending=(await check()).filter(r=>!r.ok).map(r=>r.migration);
 expect(new Set(pending)).toEqual(new Set(['002_realtime','003_ocr','004_delete_slips']));
 for(const file of ['002_realtime','003_ocr','004_delete_slips'])await db.exec(await sql(`migrations/${file}.sql`));
 const rows=await check();expect(rows).toHaveLength(7);expect(rows.every(r=>r.ok)).toBe(true);
});
