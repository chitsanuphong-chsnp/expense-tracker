import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const {getUser,tick,enqueueScan,pendingImportJobs}=vi.hoisted(()=>({getUser:vi.fn(),tick:vi.fn(),enqueueScan:vi.fn(),pendingImportJobs:vi.fn()}));
const sources=[{id:'source-1',source_code:'ttb'},{id:'source-2',source_code:'kplus'}];
vi.mock('../apps/api/src/db.ts',async importOriginal=>({...await importOriginal<typeof import('../apps/api/src/db.ts')>(),configured:()=>true,
  admin:()=>({auth:{getUser},from:()=>({select:()=>({eq:async()=>({data:sources,error:null})})})})}));
vi.mock('../apps/api/src/worker.ts',()=>({tick,enqueueScan,pendingImportJobs}));
import {createApp} from '../apps/api/src/app';
const user=(id:string)=>({id,email:'owner@example.com',email_confirmed_at:'2026-10-01T00:00:00Z',phone:'',is_anonymous:false,identities:[{provider:'email'}],user_metadata:{}});
const post=(path:string,body?:unknown)=>createApp().request(path,{method:'POST',headers:{Authorization:'Bearer token','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
beforeEach(()=>{vi.stubEnv('DRIVE_OWNER_ID','owner-a');for(const f of [getUser,tick,enqueueScan,pendingImportJobs])f.mockReset();pendingImportJobs.mockResolvedValue(3);});
afterEach(()=>vi.unstubAllEnvs());
it('starts the import immediately with a short budget under the shared tick lease',async()=>{
  getUser.mockResolvedValue({data:{user:user('owner-a')},error:null});tick.mockResolvedValue({processed:4});
  const r=await post('/api/sync');expect(r.status).toBe(200);
  expect(await r.json()).toEqual({queued:2,processed:4,pending:3});
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok'}).format(new Date());
  expect(enqueueScan).toHaveBeenCalledWith('owner-a',sources[0],expect.stringMatching(new RegExp(`^manual:source-1:${today}:${today}:\\d+$`)),{from:today,to:today});
  expect(tick).toHaveBeenCalledWith(expect.any(Date),60000);
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

