import {it,expect,vi} from 'vitest';
// Supabase stand-in before migration 007: the auto_save_slip function does not exist yet (PostgREST PGRST202).
vi.mock('../apps/api/src/db.ts',async importOriginal=>({...await importOriginal<typeof import('../apps/api/src/db.ts')>(),
  rows:async(_db:any,table:string)=>table==='accounts'?[{id:'11111111-1111-4111-8111-111111111111',name:'ttb',kind:'bank',bank_code:null,color:'#000',numbers:[]}]:[],
  admin:()=>({rpc:async()=>({data:null,error:{code:'PGRST202'}}),from:(table:string)=>{const chain:any=new Proxy({},{get:(_,key)=>key==='then'?(resolve:any)=>resolve(
    table==='slips'?{data:{id:'s1',source_id:'src',source_code:'ttb',uploaded_at:'2026-10-10T16:00:00Z',transaction_id:null,status:'needs_details',ocr_details:{engine:'tesseract',amount_satang:5000,date:null,time:null,sender:null,recipient:null,requires_review:true}},error:null}
    :{data:{account_id:'11111111-1111-4111-8111-111111111111'},error:null}):()=>chain});return chain;}})}));
import {autoSaveSlip} from '../apps/api/src/worker.ts';
it('keeps the slip pending instead of failing when migration 007 is not run yet',async()=>{
  expect(await autoSaveSlip('owner','s1')).toBeNull();
});
