import {beforeAll,afterAll,beforeEach,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
let db:PGlite;const owner=randomUUID(),other=randomUUID();let cash:string,foreignCash:string,source:string;
beforeAll(async()=>{
  db=new PGlite();await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role bypassrls;
    create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  await db.exec(await readFile(new URL('../supabase/migrations/001_initial.sql',import.meta.url),'utf8'));
  await db.query('insert into auth.users(id) values($1),($2)',[owner,other]);
  cash=(await db.query<any>("select id from accounts where owner_id=$1 and kind='cash'",[owner])).rows[0].id;
  foreignCash=(await db.query<any>("select id from accounts where owner_id=$1 and kind='cash'",[other])).rows[0].id;
  source=(await db.query<any>("insert into drive_sources(owner_id,source_code,folder_id,account_id) values($1,'ttb','folder123456789',$2) returning id",[owner,cash])).rows[0].id;
});
afterAll(async()=>{await db.close();});
beforeEach(async()=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);});
const input=(changes:Record<string,unknown>={})=>({kind:'expense',amount_satang:12550,account_id:cash,to_account_id:null,category_id:null,occurred_at:'2026-10-05T12:00:00+07:00',note:'อาหาร',counterparty:'',...changes});
async function save(id:string,body:any,slip:string|null=null){return (await db.query<any>('select save_transaction($1,$2::jsonb,$3) as id',[id,JSON.stringify(body),slip])).rows[0].id;}
async function slip(file=randomUUID()){return (await db.query<any>("insert into slips(owner_id,source_id,source_code,drive_file_id,name,uploaded_at,status,qr_payload) values($1,$2,'ttb',$3,'slip.jpg',now(),'needs_details','reference') returning id",[owner,source,file])).rows[0].id;}
it('seeds accounts and enforces RLS reads, references, and writes across owners',async()=>{
  await db.exec('set role authenticated');
  expect((await db.query('select * from accounts')).rows).toHaveLength(5);
  expect((await db.query('select * from accounts where id=$1',[foreignCash])).rows).toHaveLength(0);
  const id=randomUUID();await save(id,input());
  await expect(save(randomUUID(),input({account_id:foreignCash}))).rejects.toThrow();
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
  expect((await db.query('select * from transactions where id=$1',[id])).rows).toHaveLength(0);
  await expect(save(id,input({account_id:foreignCash}))).rejects.toThrow('Not found');
  await expect(db.query('select delete_transaction($1)',[id])).rejects.toThrow('Not found');
  await expect(db.query('select claim_job()')).rejects.toThrow();
});
it('fills a slip atomically and retries without a second transaction; delete restores pending',async()=>{
  const s=await slip(),id=randomUUID();await db.exec('set role authenticated');
  expect(await save(id,input(),s)).toBe(id);expect(await save(randomUUID(),input(),s)).toBe(id);
  expect((await db.query('select * from transactions where id=$1',[id])).rows).toHaveLength(1);
  expect((await db.query<any>('select transaction_id,status from slips where id=$1',[s])).rows[0]).toEqual({transaction_id:id,status:'linked'});
  await save(id,input({amount_satang:999}));expect((await db.query<any>('select amount_satang from transactions where id=$1',[id])).rows[0].amount_satang).toBe(999);
  await db.query('select delete_transaction($1)',[id]);expect((await db.query<any>('select transaction_id,status from slips where id=$1',[s])).rows[0]).toEqual({transaction_id:null,status:'needs_details'});
});
it('links an existing manual entry without another total and rejects a foreign slip',async()=>{
  const s=await slip(),id=randomUUID();await db.exec('set role authenticated');await save(id,input());
  await db.query('select link_slip($1,$2)',[s,id]);await db.query('select link_slip($1,$2)',[s,id]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);await expect(save(randomUUID(),input({account_id:foreignCash}),s)).rejects.toThrow('Not found');
});
it('deduplicates image hashes or reliable QR refs, preserving different unrecognized QR images',async()=>{
  const a=await slip(),b=await slip(),c=await slip(),d=await slip();
  await db.query('select finish_qr($1,$2,$3,$4,null)',[a,'hash-a','mini','011:REF']);
  await db.query('select finish_qr($1,$2,$3,$4,null)',[b,'hash-b','mini','011:REF']);
  await db.query('select finish_qr($1,$2,$3,null,null)',[c,'hash-c','unknown']);
  await db.query('select finish_qr($1,$2,$3,null,null)',[d,'hash-d','unknown']);
  expect((await db.query<any>('select duplicate_of,status from slips where id=$1',[b])).rows[0]).toEqual({duplicate_of:a,status:'duplicate'});
  expect((await db.query<any>('select status from slips where id in ($1,$2)',[c,d])).rows.map(s=>s.status)).toEqual(['needs_details','needs_details']);
  await expect(slip((await db.query<any>('select drive_file_id from slips where id=$1',[a])).rows[0].drive_file_id)).rejects.toThrow();
});
it('recovers expired leases, marks exhausted jobs, and serializes dispatcher calls',async()=>{
  const a=(await db.query<any>('select acquire_tick() as token')).rows[0].token;expect(a).toBeTruthy();expect((await db.query<any>('select acquire_tick() as token')).rows[0].token).toBeNull();
  await db.query('select release_tick($1)',[randomUUID()]);expect((await db.query<any>('select acquire_tick() as token')).rows[0].token).toBeNull();
  await db.query('select release_tick($1)',[a]);expect((await db.query<any>('select acquire_tick() as token')).rows[0].token).toBeTruthy();
  const s=await slip();await db.query("insert into jobs(owner_id,job_key,kind,payload,status,attempts,lease_until) values($1,'expired','qr',$2,'running',5,now()-interval '1 minute')",[owner,JSON.stringify({slip_id:s})]);
  await db.query("insert into jobs(owner_id,job_key,kind,payload) values($1,'pending','scan','{}')",[owner]);
  const job=(await db.query<any>('select * from claim_job()')).rows[0];expect(job.status).toBe('running');expect(job.lease_token).toBeTruthy();
  expect((await db.query('select * from claim_job()')).rows).toHaveLength(0);
  await db.query("update jobs set lease_until=now()-interval '1 minute' where id=$1",[job.id]);
  const resumed=(await db.query<any>('select * from claim_job()')).rows[0];expect(resumed.id).toBe(job.id);expect(resumed.lease_token).not.toBe(job.lease_token);
  expect((await db.query<any>("select status from jobs where job_key='expired'")).rows[0].status).toBe('failed');
  expect((await db.query<any>('select status from slips where id=$1',[s])).rows[0].status).toBe('failed');
});
it('preserves a manual link when an in-flight QR decode finishes later',async()=>{
  const s=await slip(),id=randomUUID();await save(id,input(),s);
  await db.query('select finish_qr($1,$2,$3,$4,null)',[s,'late-hash','late-payload','011:LATE']);
  expect((await db.query<any>('select transaction_id,status from slips where id=$1',[s])).rows[0]).toEqual({transaction_id:id,status:'linked'});
});
it('consumes LINE pairing codes exactly once',async()=>{
  await db.query("insert into line_link_codes(code_hash,owner_id,expires_at) values('hash',$1,now()+interval '5 minutes')",[owner]);
  expect((await db.query<any>("select consume_line_code('hash','user-test') as ok")).rows[0].ok).toBe(true);
  expect((await db.query<any>("select consume_line_code('hash','user-test') as ok")).rows[0].ok).toBe(false);
});
