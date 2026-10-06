import {ocrEnabled} from './ocr.ts';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { randomBytes,randomUUID,createHash,timingSafeEqual } from 'node:crypto';
import sharp from 'sharp';
import { transactionInput,summarize,transactionsCsv,sourceCodes } from '@expense/core';
import { admin,configured,checked,dataset,userDb,rows } from './db.ts';
import { signatureValid } from './line.ts';
import { tick,enqueueScan } from './worker.ts';
import { downloadFile,assertDriveOwner } from './drive.ts';
import type {User} from '@supabase/supabase-js';
import {verifiedUser,accountInfo} from './auth-user.ts';

type Env={Variables:{owner:string;token:string;user:User}};
const uuid=z.string().uuid();
function secureEqual(a:string,b:string) { const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb); }
export function createApp() {
  const app=new Hono<Env>();
  app.use('/api/*',async(c,next)=>{c.header('Cache-Control','no-store');await next();});
  app.use('*',cors({origin:(origin)=>origin===process.env.APP_ORIGIN?origin:'',allowHeaders:['Authorization','Content-Type'],allowMethods:['GET','POST','PUT','PATCH','DELETE','OPTIONS']}));
  app.onError((err,c)=>c.json({error:err instanceof z.ZodError?'INVALID_INPUT':err.message==='NOT_CONFIGURED'?'NOT_CONFIGURED':'REQUEST_FAILED'},err instanceof z.ZodError?400:503));
  app.get('/api/health',c=>c.json({ok:true,configured:configured(),timezone:'Asia/Bangkok'}));
  app.post('/api/internal/tick',async c=>{
    const expected=process.env.CRON_SECRET;
    if(!expected||!secureEqual(c.req.header('authorization')??'',`Bearer ${expected}`))return c.json({error:'UNAUTHORIZED'},401);
    return c.json(await tick());
  });
  app.post('/api/line/webhook',async c=>{
    const secret=process.env.LINE_CHANNEL_SECRET;
    if(!secret)return c.json({error:'NOT_CONFIGURED'},503);
    const raw=await c.req.text();
    if(!signatureValid(raw,c.req.header('x-line-signature')??'',secret))return c.json({error:'INVALID_SIGNATURE'},401);
    const body=z.object({events:z.array(z.any())}).parse(JSON.parse(raw)),db=admin();
    for(const event of body.events) {
      const lineId=event.source?.userId;
      if(typeof lineId!=='string')continue;
      if(event.type==='unfollow')checked(await db.from('line_connections').update({blocked:true}).eq('line_user_id',lineId));
      if(event.type==='follow')checked(await db.from('line_connections').update({blocked:false}).eq('line_user_id',lineId));
      if(event.type==='message'&&event.message?.type==='text') {
        const match=/^LINK ([A-F0-9]{20})$/.exec(event.message.text.trim());
        if(match)checked(await db.rpc('consume_line_code',{p_hash:createHash('sha256').update(match[1]).digest('hex'),p_line_user:lineId}));
      }
    }
    return c.json({ok:true});
  });
  app.use('/api/*',async(c,next)=>{
    if(!configured())return c.json({error:'NOT_CONFIGURED'},503);
    const match=/^Bearer (.+)$/.exec(c.req.header('authorization')??'');
    if(!match)return c.json({error:'UNAUTHORIZED'},401);
    const {data,error}=await admin().auth.getUser(match[1]);
    if(error||!data.user)return c.json({error:'UNAUTHORIZED'},401);
    if(!verifiedUser(data.user))return c.json({error:'IDENTITY_NOT_VERIFIED'},403);
    c.set('owner',data.user.id);c.set('token',match[1]);c.set('user',data.user);await next();
  });
  app.get('/api/me',c=>c.json(accountInfo(c.get('user'))));
  app.get('/api/data',async c=>c.json(await dataset(admin(),c.get('owner'))));
  app.get('/api/transactions',async c=>{
    const q=z.object({start:z.string().datetime({offset:true}).optional(),end:z.string().datetime({offset:true}).optional(),account:uuid.optional(),category:uuid.optional(),page:z.coerce.number().int().min(0).default(0),size:z.coerce.number().int().min(1).max(100).default(50)}).parse(c.req.query());
    let query=admin().from('transactions').select('*',{count:'exact'}).eq('owner_id',c.get('owner')).order('occurred_at',{ascending:false}).order('id');
    if(q.start)query=query.gte('occurred_at',q.start);if(q.end)query=query.lt('occurred_at',q.end);if(q.account)query=query.eq('account_id',q.account);if(q.category)query=query.eq('category_id',q.category);
    const r=await query.range(q.page*q.size,q.page*q.size+q.size-1);checked(r);return c.json({items:r.data,total:r.count,page:q.page});
  });
  app.get('/api/dashboard',async c=>{
    const q=z.object({start:z.string().datetime({offset:true}),end:z.string().datetime({offset:true})}).parse(c.req.query());
    return c.json(summarize(await dataset(admin(),c.get('owner')),new Date(q.start).toISOString(),new Date(q.end).toISOString()));
  });
  app.put('/api/transactions/:id',async c=>{
    const id=uuid.parse(c.req.param('id')),body=await c.req.json();const input=transactionInput.parse(body);const slipId=body.slip_id?uuid.parse(body.slip_id):null;
    if(!input.category_id&&input.kind!=='transfer'&&input.counterparty.trim()) {
      const rule=checked(await admin().from('category_rules').select('category_id').eq('owner_id',c.get('owner')).eq('counterparty',input.counterparty.trim()).maybeSingle());
      if(rule)input.category_id=rule.category_id;
    }
    const result=await userDb(c.get('token')).rpc('save_transaction',{p_id:id,p_data:input,p_slip_id:slipId});
    if(result.error)return c.json({error:'INVALID_TRANSACTION_OR_LINK'},400);return c.json({id:result.data});
  });
  app.delete('/api/transactions/:id',async c=>{
    const r=await userDb(c.get('token')).rpc('delete_transaction',{p_id:uuid.parse(c.req.param('id'))});
    if(r.error)return c.json({error:'NOT_FOUND'},404);return c.json({ok:true});
  });
  app.delete('/api/slips',async c=>{
    const r=await userDb(c.get('token')).rpc('delete_unrecorded_slips',{p_id:null});
    if(r.error)return c.json({error:r.error.message.includes('IMPORT_RUNNING')?'IMPORT_RUNNING':'DELETE_SLIPS_FAILED'},409);
    return c.json({deleted:r.data});
  });
  app.delete('/api/slips/:id',async c=>{
    const r=await userDb(c.get('token')).rpc('delete_unrecorded_slips',{p_id:uuid.parse(c.req.param('id'))});
    if(r.error)return c.json({error:r.error.message.includes('IMPORT_RUNNING')?'IMPORT_RUNNING':'SLIP_NOT_DELETABLE'},409);
    return c.json({deleted:r.data});
  });
  app.post('/api/slips/:id/link',async c=>{
    const id=uuid.parse(c.req.param('id')),body=z.object({transaction_id:uuid}).parse(await c.req.json());
    const r=await userDb(c.get('token')).rpc('link_slip',{p_slip_id:id,p_transaction_id:body.transaction_id});
    if(r.error)return c.json({error:'INVALID_LINK'},400);return c.json({id:r.data});
  });
  app.post('/api/slips/:id/retry',async c=>{
    const id=uuid.parse(c.req.param('id')),owner=c.get('owner'),db=admin();const slip=checked(await db.from('slips').select('*').eq('id',id).eq('owner_id',owner).maybeSingle());
    if(!slip)return c.json({error:'NOT_FOUND'},404);
    if(['linked','duplicate','processing'].includes(slip.status))return c.json({error:'CANNOT_RETRY'},409);
    checked(await db.from('jobs').upsert({owner_id:owner,job_key:`qr:${id}`,kind:'qr',payload:{slip_id:id},status:'pending',attempts:0,lease_token:null,lease_until:null,error_code:null,next_run_at:new Date().toISOString()},{onConflict:'owner_id,job_key'}));
    checked(await db.from('slips').update({status:'queued',error_code:null}).eq('id',id).eq('owner_id',owner).is('transaction_id',null).neq('status','duplicate'));return c.json({ok:true});
  });
    app.post('/api/slips/ocr-backfill',async c=>{
    if(!ocrEnabled())return c.json({error:'OCR_NOT_CONFIGURED'},503);
    const owner=c.get('owner');assertDriveOwner(owner);const db=admin();
    const slips=await rows(db,'slips',owner);
    const pending=slips.filter(s=>!s.transaction_id&&s.status!=='duplicate'&&(!s.ocr_details||s.ocr_details.error));
    const key=Math.floor(Date.now()/60000);
    for(let start=0;start<pending.length;start+=100){
      checked(await db.from('jobs').upsert(pending.slice(start,start+100).map(s=>({owner_id:owner,job_key:`ocr-backfill:${s.id}:${key}`,kind:'qr',payload:{slip_id:s.id}})),{onConflict:'owner_id,job_key',ignoreDuplicates:true}));
    }
    return c.json({queued:pending.length});
  });
app.get('/api/slips/:id/image',async c=>{
    assertDriveOwner(c.get('owner'));
    const slip=checked(await admin().from('slips').select('drive_file_id').eq('id',uuid.parse(c.req.param('id'))).eq('owner_id',c.get('owner')).maybeSingle());
    if(!slip)return c.json({error:'NOT_FOUND'},404);
    const image=await sharp(await downloadFile(slip.drive_file_id),{limitInputPixels:24000000}).rotate().resize({width:1400,height:2000,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();
    c.header('Cache-Control','private, no-store');c.header('Content-Type','image/jpeg');return c.body(new Uint8Array(image));
  });
  app.post('/api/sync',async c=>{
    const db=admin(),owner=c.get('owner');const sources=checked(await db.from('drive_sources').select('*').eq('owner_id',owner))??[];
    for(const source of sources)await enqueueScan(owner,source,`manual:${source.id}:${Math.floor(Date.now()/300000)}`);
    return c.json({queued:sources.length});
  });
  app.put('/api/sources/:code',async c=>{
    if(!process.env.DRIVE_OWNER_ID||c.get('owner')!==process.env.DRIVE_OWNER_ID)return c.json({error:'DRIVE_NOT_ENABLED_FOR_ACCOUNT'},403);
    const code=z.enum(sourceCodes).parse(c.req.param('code')),body=z.object({folder_id:z.string().regex(/^[A-Za-z0-9_-]{10,200}$/),account_id:uuid.nullable()}).parse(await c.req.json());
    checked(await admin().from('drive_sources').upsert({...body,owner_id:c.get('owner'),source_code:code,cursor:null,scan_complete:false,last_scan_status:null,last_scan_at:null},{onConflict:'owner_id,source_code'}));return c.json({ok:true});
  });
  app.patch('/api/settings',async c=>{
    const body=z.object({budget_satang:z.number().int().min(0).max(999999999999)}).parse(await c.req.json());checked(await admin().from('profiles').update(body).eq('id',c.get('owner')));return c.json({ok:true});
  });
  app.post('/api/accounts',async c=>{
    const body=z.object({name:z.string().trim().min(1).max(100),kind:z.enum(['bank','cash']),bank_code:z.string().max(20).nullable(),color:z.string().regex(/^#[a-fA-F0-9]{6}$/)}).parse(await c.req.json());
    return c.json(checked(await admin().from('accounts').insert({...body,owner_id:c.get('owner')}).select('id').single()),201);
  });
  app.post('/api/categories',async c=>{
    const body=z.object({name:z.string().trim().min(1).max(100),color:z.string().regex(/^#[a-fA-F0-9]{6}$/)}).parse(await c.req.json());
    return c.json(checked(await admin().from('categories').insert({...body,owner_id:c.get('owner')}).select('id').single()),201);
  });
  app.post('/api/rules',async c=>{
    const body=z.object({counterparty:z.string().trim().min(1).max(200),category_id:uuid}).parse(await c.req.json());
    checked(await admin().from('category_rules').upsert({...body,owner_id:c.get('owner')},{onConflict:'owner_id,counterparty'}));return c.json({ok:true});
  });
  app.post('/api/line/link-code',async c=>{
    const db=admin(),owner=c.get('owner'),code=randomBytes(10).toString('hex').toUpperCase();
    checked(await db.from('line_link_codes').delete().eq('owner_id',owner));
    checked(await db.from('line_link_codes').insert({owner_id:owner,code_hash:createHash('sha256').update(code).digest('hex'),expires_at:new Date(Date.now()+5*60000).toISOString()}));
    return c.json({command:`LINK ${code}`,expires_in:300});
  });
  app.delete('/api/line/connection',async c=>{checked(await admin().from('line_connections').delete().eq('owner_id',c.get('owner')));return c.json({ok:true});});
  app.get('/api/export',async c=>{
    const q=z.object({start:z.string().datetime({offset:true}),end:z.string().datetime({offset:true})}).parse(c.req.query()),data=await dataset(admin(),c.get('owner'));
    const start=new Date(q.start).toISOString(),end=new Date(q.end).toISOString();
    c.header('Content-Type','text/csv; charset=utf-8');c.header('Content-Disposition','attachment; filename="expense.csv"');c.header('Cache-Control','no-store');
    return c.body(transactionsCsv(data.transactions.filter(t=>t.occurred_at>=start&&t.occurred_at<end),data.accounts,data.categories));
  });
  return app;
}
export default createApp();
