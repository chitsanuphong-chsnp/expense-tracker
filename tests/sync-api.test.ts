import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const {getUser,tick,enqueueScan,pendingImportJobs,importProgress,cancelImport,autoSavePending}=vi.hoisted(()=>({getUser:vi.fn(),tick:vi.fn(),enqueueScan:vi.fn(),pendingImportJobs:vi.fn(),importProgress:vi.fn(),cancelImport:vi.fn(),autoSavePending:vi.fn()}));
const sources=[{id:'source-1',source_code:'ttb'},{id:'source-2',source_code:'kplus'}];
vi.mock('../apps/api/src/db.ts',async importOriginal=>({...await importOriginal<typeof import('../apps/api/src/db.ts')>(),configured:()=>true,
  admin:()=>({auth:{getUser},from:()=>({select:()=>({eq:async()=>({data:sources,error:null})})})})}));
vi.mock('../apps/api/src/worker.ts',()=>({tick,enqueueScan,pendingImportJobs,importProgress,cancelImport,autoSavePending,autoSaveSlip:vi.fn()}));
import {createApp} from '../apps/api/src/app';
const user=(id:string)=>({id,email:'owner@example.com',email_confirmed_at:'2026-10-01T00:00:00Z',phone:'',is_anonymous:false,identities:[{provider:'email'}],user_metadata:{}});
const post=(path:string,body?:unknown)=>createApp().request(path,{method:'POST',headers:{Authorization:'Bearer token','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
beforeEach(()=>{vi.stubEnv('DRIVE_OWNER_ID','owner-a');for(const f of [getUser,tick,enqueueScan,pendingImportJobs,importProgress,cancelImport,autoSavePending])f.mockReset();pendingImportJobs.mockResolvedValue(3);autoSavePending.mockResolvedValue(2);});
afterEach(()=>vi.unstubAllEnvs());
it('starts the import immediately with a short budget under the shared tick lease',async()=>{
  getUser.mockResolvedValue({data:{user:user('owner-a')},error:null});tick.mockResolvedValue({processed:4});
  const r=await post('/api/sync');expect(r.status).toBe(200);
  expect(await r.json()).toEqual({queued:2,auto_saved:2,processed:4,pending:3});
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok'}).format(new Date());
  expect(enqueueScan).toHaveBeenCalledWith('owner-a',sources[0],expect.stringMatching(new RegExp(`^manual:source-1:${today}:${today}:\\d+$`)),{from:today,to:today});
  expect(tick).toHaveBeenCalledWith(expect.any(Date),60000,true);
  tick.mockResolvedValue({processed:0,busy:true});
  expect(await (await post('/api/sync/run')).json()).toEqual({processed:0,busy:true,pending:3});
});
it('refuses manual imports for accounts other than the Drive owner',async()=>{
  getUser.mockResolvedValue({data:{user:user('owner-b')},error:null});
  expect((await post('/api/sync')).status).toBe(403);expect((await post('/api/sync/run')).status).toBe(403);
  expect(tick).not.toHaveBeenCalled();expect(enqueueScan).not.toHaveBeenCalled();
});
it('imports a chosen date range and source, and rejects a reversed range',async()=>{
  getUser.mockResolvedValue({data:{user:user('owner-a')},error:null});tick.mockResolvedValue({processed:0});
  const r=await post('/api/sync',{from:'2026-10-01',to:'2026-10-05',source:'kplus'});
  expect(await r.json()).toMatchObject({queued:1});
  expect(enqueueScan).toHaveBeenCalledTimes(1);
  expect(enqueueScan).toHaveBeenCalledWith('owner-a',sources[1],expect.stringMatching(/^manual:source-2:2026-10-01:2026-10-05:\d+$/),{from:'2026-10-01',to:'2026-10-05'});
  expect((await post('/api/sync',{from:'2026-10-05',to:'2026-10-01'})).status).toBe(400);
});

it('reports import progress for the progress bar and rejects a bad start time',async()=>{
  getUser.mockResolvedValue({data:{user:user('owner-a')},error:null});importProgress.mockResolvedValue({pending:3,done:5,slips:4,saved:2});
  const get=(q:string)=>createApp().request(`/api/sync/status${q}`,{headers:{Authorization:'Bearer token'}});
  const r=await get('?since=2026-10-11T03:00:00.000Z');expect(await r.json()).toEqual({pending:3,done:5,slips:4,saved:2});
  expect(importProgress).toHaveBeenCalledWith('owner-a','2026-10-11T03:00:00.000Z');
  expect((await get('?since=yesterday')).status).toBe(400);
});
it('cancels the caller\'s queued import jobs',async()=>{
  getUser.mockResolvedValue({data:{user:user('owner-a')},error:null});cancelImport.mockResolvedValue(4);
  expect(await (await post('/api/sync/cancel')).json()).toEqual({cancelled:4});
  expect(cancelImport).toHaveBeenCalledWith('owner-a');
});
it('queues a fresh scan on every press, even a minute after a finished one',async()=>{
  getUser.mockResolvedValue({data:{user:user('owner-a')},error:null});tick.mockResolvedValue({processed:0});
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-11T10:00:00Z'));
  await post('/api/sync');vi.setSystemTime(new Date('2026-10-11T10:01:00Z'));await post('/api/sync');vi.useRealTimers();
  const keys=enqueueScan.mock.calls.filter(c=>c[1].id==='source-1').map(c=>c[2]);
  expect(keys).toHaveLength(2);expect(keys[0]).not.toBe(keys[1]);
});
