import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const {listFolder,inserted}=vi.hoisted(()=>({listFolder:vi.fn(),inserted:[] as any[]}));
// Minimal Supabase stand-in: every chain resolves by table and the last write.
vi.mock('../apps/api/src/db.ts',async importOriginal=>({...await importOriginal<typeof import('../apps/api/src/db.ts')>(),admin:()=>({from:(table:string)=>{
  let op='select',row:any=null;
  const chain:any=new Proxy({},{get:(_,key)=>key==='then'?(resolve:any)=>resolve(
    table==='drive_sources'&&op==='select'?{data:{id:'src',source_code:'kplus',folder_id:'bank-folder'},error:null}:
    table==='slips'&&op==='upsert'?(inserted.push(row),{data:[{id:`slip-${row.drive_file_id}`}],error:null}):{data:null,error:null})
    :(...args:any[])=>{if(key==='upsert'||key==='update'){op=String(key);row=args[0];}return chain;}});
  return chain;}})}));
vi.mock('../apps/api/src/drive.ts',()=>({listFolder,downloadFile:vi.fn(),assertDriveOwner:()=>{}}));
import {scan} from '../apps/api/src/worker.ts';
const folder=(id:string,name:string)=>({id,name,mimeType:'application/vnd.google-apps.folder',createdTime:'2026-10-01T00:00:00Z'});
const image=(id:string,createdTime='2026-10-10T16:30:00Z')=>({id,name:`${id}.jpg`,mimeType:'image/jpeg',createdTime});
beforeEach(()=>{inserted.length=0;listFolder.mockReset();});
afterEach(()=>vi.unstubAllEnvs());
it('imports only date folders inside the range, and loose files by their Drive date',async()=>{
  listFolder.mockImplementation(async(id:string)=>({files:{
    'bank-folder':[folder('f9','2026-10-09'),folder('f10','2026-10-10'),folder('f11','2026-10-11'),image('loose-in','2026-10-10T05:00:00Z'),image('loose-out','2026-10-08T05:00:00Z')],
    f9:[image('old')],f10:[image('a'),image('b')],f11:[image('late')]}[id]??[]}));
  expect(await scan('owner','src',{from:'2026-10-10',to:'2026-10-10'},Date.now()+60000)).toBe(true);
  expect(inserted.map(r=>r.drive_file_id).sort()).toEqual(['a','b','loose-in']);
  expect(listFolder).not.toHaveBeenCalledWith('f9',undefined);expect(listFolder).not.toHaveBeenCalledWith('f11',undefined);
});
it('stops before the deadline so the job can run again',async()=>{
  listFolder.mockResolvedValue({files:[]});
  expect(await scan('owner','src',{from:'2026-10-10',to:'2026-10-10'},Date.now()+1000)).toBe(false);
  expect(listFolder).not.toHaveBeenCalled();
});
