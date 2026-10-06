import {it,expect,afterEach,vi} from 'vitest';
import QRCode from 'qrcode';
import sharp from 'sharp';
import {slipVerify as generateSlip,anyId} from 'promptparse/generate';
import {createHmac} from 'node:crypto';
import {decodeQr,miniQrReference} from '../apps/api/src/qr.ts';
import {signatureValid,pushReport} from '../apps/api/src/line.ts';
import {createApp} from '../apps/api/src/app.ts';
import {assertDriveOwner} from '../apps/api/src/drive.ts';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('does not let a second owner borrow the primary Drive service account',()=>{
  vi.stubEnv('DRIVE_OWNER_ID','primary-owner');expect(()=>assertDriveOwner('primary-owner')).not.toThrow();expect(()=>assertDriveOwner('other-owner')).toThrow('DRIVE_NOT_ENABLED_FOR_ACCOUNT');
  vi.stubEnv('DRIVE_OWNER_ID','');expect(()=>assertDriveOwner('primary-owner')).toThrow('DRIVE_NOT_ENABLED_FOR_ACCOUNT');
});
it('decodes QR locally and recognizes only a CRC-valid Mini-QR reference',async()=>{
  const payload=generateSlip({sendingBank:'011',transRef:'TEST_REFERENCE_123'}),bytes=await QRCode.toBuffer(payload,{width:500,margin:4});
  const r=await decodeQr(bytes);expect(r.payload).toBe(payload);expect(r.key).toBe('011:TEST_REFERENCE_123');expect(r.hash).toHaveLength(64);
  expect(miniQrReference(payload.slice(0,-1)+(payload.endsWith('0')?'1':'0'))).toBeNull();
  expect(miniQrReference(anyId({type:'MSISDN',target:'0812345678',amount:50}))).toBeNull();
  const blank=await sharp({create:{width:64,height:64,channels:3,background:'white'}}).png().toBuffer();expect((await decodeQr(blank)).payload).toBeNull();
});
it('verifies signatures against the untouched webhook body',()=>{
  const raw='{"events":[]}',sig=createHmac('sha256','secret').update(raw).digest('base64');
  expect(signatureValid(raw,sig,'secret')).toBe(true);expect(signatureValid(raw+' ',sig,'secret')).toBe(false);expect(signatureValid(raw,'bad','secret')).toBe(false);
});
it('rejects unauthenticated internal calls and invalid webhooks before integrations run',async()=>{
  vi.stubEnv('CRON_SECRET','a-long-test-secret');vi.stubEnv('LINE_CHANNEL_SECRET','line-secret');vi.stubEnv('SUPABASE_URL','https://example.supabase.co');vi.stubEnv('SUPABASE_ANON_KEY','test');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test');
  const app=createApp();expect((await app.request('/api/internal/tick',{method:'POST'})).status).toBe(401);
  expect((await app.request('/api/line/webhook',{method:'POST',body:'{"events":[]}'})).status).toBe(401);
  expect((await app.request('/api/data')).status).toBe(401);
  const h=await app.request('/api/health');expect(await h.json()).toMatchObject({ok:true,timezone:'Asia/Bangkok'});
});
it('retains the same LINE retry key and accepts an already accepted request',async()=>{
  vi.stubEnv('LINE_CHANNEL_ACCESS_TOKEN','test');let attempts=0;const headers:string[]=[];
  vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
    if(url.endsWith('/quota'))return Response.json({type:'limited',value:200});
    if(url.endsWith('/consumption'))return Response.json({totalUsage:1});
    attempts++;headers.push((init!.headers as Record<string,string>)['X-Line-Retry-Key']);
    return new Response('',{status:attempts===1?500:409,headers:attempts===2?{'x-line-accepted-request-id':'accepted'}:{}});
  }));
  const key='11111111-1111-4111-8111-111111111111';await expect(pushReport('user',{},key)).rejects.toThrow('LINE_500');await expect(pushReport('user',{},key)).resolves.toBeUndefined();expect(headers).toEqual([key,key]);
});
it('stops before pushing when the free LINE quota is exhausted',async()=>{
  vi.stubEnv('LINE_CHANNEL_ACCESS_TOKEN','test');const f=vi.fn(async(url:string)=>Response.json(url.endsWith('/quota')?{type:'limited',value:1}:{totalUsage:1}));vi.stubGlobal('fetch',f);
  await expect(pushReport('user',{},'key')).rejects.toThrow('LINE_QUOTA_EXCEEDED');expect(f).toHaveBeenCalledTimes(2);
});
