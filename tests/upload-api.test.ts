import {it,expect,vi,beforeEach} from 'vitest';
import QRCode from 'qrcode';
import {slipVerify} from 'promptparse/generate';
const {getUser,state,pushReport}=vi.hoisted(()=>({getUser:vi.fn(),state:{existing:null as any,inserted:null as any,filters:'',line:null as any},pushReport:vi.fn()}));
vi.mock('../apps/api/src/db.ts',async importOriginal=>({...await importOriginal<typeof import('../apps/api/src/db.ts')>(),configured:()=>true,admin:()=>({auth:{getUser},from:(table:string)=>{
  let op='select';
  const chain:any=new Proxy({},{get:(_,key)=>key==='then'?(resolve:any)=>resolve(
    table==='line_connections'?{data:state.line,error:null}:
    op==='insert'?{data:{id:'new-slip'},error:null}:{data:state.existing,error:null})
    :(...args:any[])=>{if(key==='insert'){op='insert';state.inserted=args[0];}if(key==='or')state.filters=args[0];return chain;}});
  return chain;}})}));
vi.mock('../apps/api/src/line.ts',async importOriginal=>({...await importOriginal<typeof import('../apps/api/src/line.ts')>(),pushReport}));
import {createApp} from '../apps/api/src/app';
const post=(path:string,body:unknown)=>createApp().request(path,{method:'POST',headers:{Authorization:'Bearer token','Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{state.existing=null;state.inserted=null;state.line=null;pushReport.mockReset();getUser.mockResolvedValue({data:{user:{id:'owner-a',email:'o@example.com',email_confirmed_at:'2026-10-01T00:00:00Z',phone:'',is_anonymous:false,identities:[{provider:'email'}],user_metadata:{}}},error:null});});
const slipImage=async()=>(await QRCode.toBuffer(slipVerify({sendingBank:'004',transRef:'UPLOAD_REF_1'}),{width:500,margin:4})).toString('base64');
it('creates an upload slip with QR keys and no Drive file or stored image',async()=>{
  const r=await post('/api/slips/upload',{source_code:'kplus',image:await slipImage()});
  expect(r.status).toBe(201);expect(await r.json()).toEqual({duplicate:false,slip_id:'new-slip'});
  expect(state.inserted).toMatchObject({owner_id:'owner-a',source_code:'kplus',origin:'upload',status:'needs_details',qr_key:'004:UPLOAD_REF_1'});
  expect(state.inserted).not.toHaveProperty('drive_file_id');
  expect(state.filters).toContain('qr_key.eq.004:UPLOAD_REF_1');
});
it('returns the existing slip instead of adding a duplicate',async()=>{
  state.existing={id:'old-slip',transaction_id:'tx-1'};
  expect(await (await post('/api/slips/upload',{source_code:'kplus',image:await slipImage()})).json()).toEqual({duplicate:true,slip_id:'old-slip',transaction_id:'tx-1'});
  expect(state.inserted).toBeNull();
});
it('sends a LINE test only when LINE is connected',async()=>{
  expect((await post('/api/line/test',{})).status).toBe(409);expect(pushReport).not.toHaveBeenCalled();
});
