import {ocrEnabled,readSlipOcr} from './ocr.ts';
import { admin,checked,dataset } from './db.ts';
import { listFolder,downloadFile,assertDriveOwner } from './drive.ts';
import { decodeQr } from './qr.ts';
import { flexReport,pushReport } from './line.ts';
import { shouldScan,dueReportPeriods,summarize,bangkokParts,rangeFor } from '@expense/core';

export async function enqueueScan(owner:string,source:any,key:string) {
  const db=admin();checked(await db.from('jobs').upsert({owner_id:owner,job_key:key,kind:'scan',payload:{source_id:source.id}},{onConflict:'owner_id,job_key',ignoreDuplicates:true}));
}
async function scan(owner:string,sourceId:string,deadline:number) {
  assertDriveOwner(owner);
  const db=admin();const source=checked(await db.from('drive_sources').select('*').eq('owner_id',owner).eq('id',sourceId).single());
  if(!source)return true;
  let cursor=source.cursor??{folders:[{id:source.folder_id}],seen:[]};
  while(cursor.folders.length&&Date.now()<deadline-30000) {
    const current=cursor.folders[0];const page=await listFolder(current.id,current.pageToken);
    for(const f of page.files) {
      // Resume the same page after timeout; file/job upserts make repeating its prefix harmless.
      if(Date.now()>=deadline-30000){checked(await db.from('drive_sources').update({cursor,last_scan_status:'scanning',scan_complete:false}).eq('id',source.id).eq('owner_id',owner));return false;}
      if(f.mimeType==='application/vnd.google-apps.folder') {
        if(!cursor.seen.includes(f.id)&&!cursor.folders.some((x:any)=>x.id===f.id))cursor.folders.push({id:f.id});
      } else if(['image/jpeg','image/png','image/webp'].includes(f.mimeType)) {
        const existing=checked(await db.from('slips').select('id').eq('owner_id',owner).eq('drive_file_id',f.id).maybeSingle());
        let slipId=existing?.id;
        if(!slipId) {
          const inserted=await db.from('slips').upsert({owner_id:owner,source_id:source.id,source_code:source.source_code,drive_file_id:f.id,name:f.name,uploaded_at:f.createdTime},{onConflict:'owner_id,drive_file_id',ignoreDuplicates:true}).select('id');
          checked(inserted);slipId=inserted.data?.[0]?.id;
          if(!slipId)slipId=checked(await db.from('slips').select('id').eq('owner_id',owner).eq('drive_file_id',f.id).single())?.id;
        }
        // Enqueue also for existing rows: safe recovery if insert succeeded before a crash.
        if(slipId)checked(await db.from('jobs').upsert({owner_id:owner,job_key:`qr:${slipId}`,kind:'qr',payload:{slip_id:slipId}},{onConflict:'owner_id,job_key',ignoreDuplicates:true}));
      }
    }
    if(page.nextPageToken)current.pageToken=page.nextPageToken;
    else{cursor.seen.push(current.id);cursor.folders.shift();}
    checked(await db.from('drive_sources').update({cursor,last_scan_status:'scanning',scan_complete:false}).eq('id',source.id).eq('owner_id',owner));
  }
  const complete=cursor.folders.length===0;
  checked(await db.from('drive_sources').update({cursor:complete?null:cursor,scan_complete:complete,last_scan_status:complete?'success':'scanning',...(complete?{last_scan_at:new Date().toISOString()}:{})}).eq('id',source.id).eq('owner_id',owner));
  return complete;
}
async function qr(owner:string,id:string) {
  assertDriveOwner(owner);
  const db=admin();const slip=checked(await db.from('slips').select('*').eq('owner_id',owner).eq('id',id).single());
  if(!slip||slip.transaction_id||slip.status==='duplicate')return;
  checked(await db.from('slips').update({status:'processing',error_code:null}).eq('id',id).eq('owner_id',owner).is('transaction_id',null).neq('status','duplicate'));
  const bytes=await downloadFile(slip.drive_file_id);const result=await decodeQr(bytes);
  checked(await db.rpc('finish_qr',{p_id:id,p_hash:result.hash,p_payload:result.payload,p_qr_key:result.key,p_error:result.payload?null:'QR_NOT_FOUND'}));
  // Mini QR supplies the reference; OCR proposes text fields but never assumes direction.
  if(ocrEnabled()){
    const latest=checked(await db.from('slips').select('status,transaction_id').eq('id',id).eq('owner_id',owner).single());
    if(latest&&latest.status!=='duplicate'&&!latest.transaction_id){
      let draft;try{draft=await readSlipOcr(bytes,slip.source_code);}catch{draft={engine:process.env.OCR_ENGINE??'tesseract',amount_satang:null,date:null,time:null,sender:null,recipient:null,requires_review:true,error:'OCR_FAILED'};}
      checked(await db.from('slips').update({ocr_details:draft}).eq('id',id).eq('owner_id',owner).is('transaction_id',null).neq('status','duplicate'));
    }
  }
}
async function sendReport(owner:string,period:any) {
  const db=admin();const connection=checked(await db.from('line_connections').select('*').eq('owner_id',owner).maybeSingle());
  if(!connection||connection.blocked)throw new Error('LINE_NOT_CONNECTED');
  let report=checked(await db.from('reports').select('*').eq('owner_id',owner).eq('report_key',period.key).maybeSingle());
  if(report?.status==='sent')return;
  if(!report) {
    const data=await dataset(db,owner),pendingEnd=period.kind==='day'?rangeFor(period.key.slice(4),'day').end:period.end;
    const uploaded=data.slips.filter(s=>new Date(s.uploaded_at).getTime()>=new Date(period.start).getTime()&&new Date(s.uploaded_at).getTime()<new Date(pendingEnd).getTime()).length;
    const syncStatus=!data.sources.length?'ยังไม่ได้เชื่อม Drive':data.sources.some(s=>s.last_scan_status==='failed')?'ตรวจ Drive ไม่สำเร็จ · ยอดอาจไม่ครบ':data.sources.some(s=>!s.scan_complete)?'กำลังตรวจ Drive · ยอดอาจไม่ครบ':uploaded?'ตรวจ Drive สำเร็จตามรอบล่าสุด':'ตรวจ Drive สำเร็จ · ไม่พบสลิปที่อัปโหลดในช่วงนี้';
    const snapshot={...summarize(data,period.start,period.end,pendingEnd),sync_status:syncStatus};
    report=checked(await db.from('reports').insert({owner_id:owner,report_key:period.key,period_start:period.start,period_end:period.end,snapshot}).select('*').single());
  }
  const status=report.snapshot.sync_status??'สถานะการตรวจ Drive ไม่พร้อม';
  try {
    // LINE retry keys are retained for 24h. Never automatically risk a second delivery after that window.
    if(report.first_attempt_at&&Date.now()-new Date(report.first_attempt_at).getTime()>=23*3600000)throw new Error('LINE_DELIVERY_UNKNOWN');
    if(!report.first_attempt_at)checked(await db.from('reports').update({first_attempt_at:new Date().toISOString()}).eq('id',report.id).eq('owner_id',owner));
    await pushReport(connection.line_user_id,flexReport(report.snapshot,period.key,process.env.APP_ORIGIN!,status),report.id);
    checked(await db.from('reports').update({status:'sent',sent_at:new Date().toISOString(),error_code:null}).eq('id',report.id).eq('owner_id',owner));
  }catch(e){await db.from('reports').update({status:'retry',error_code:safeCode(e)}).eq('id',report.id).eq('owner_id',owner);throw e;}
}
export function safeCode(e:unknown) { const m=e instanceof Error?e.message:'';return /^[A-Z][A-Z0-9_]{1,60}$/.test(m)?m:'PROCESSING_FAILED'; }
async function tickUnlocked(now:Date) {
  const db=admin(),deadline=Date.now()+205000;const profiles=checked(await db.from('profiles').select('id,reporting_started_at'))??[];
  for(const profile of profiles) {
    if(shouldScan(now))for(const source of await (async()=>checked(await db.from('drive_sources').select('*').eq('owner_id',profile.id)))()??[]) {
      const p=bangkokParts(now);await enqueueScan(profile.id,source,`scan:${source.id}:${p.date}:${p.hour}:${Math.floor(p.minute/5)}`);
    }
    for(const period of dueReportPeriods(now)) {
      if(new Date(period.end).getTime()<new Date(profile.reporting_started_at).getTime())continue;
      const connection=checked(await db.from('line_connections').select('owner_id,blocked').eq('owner_id',profile.id).maybeSingle());
      if(!connection||connection.blocked)continue;
      checked(await db.from('jobs').upsert({owner_id:profile.id,job_key:`report:${period.key}`,kind:'report',payload:period},{onConflict:'owner_id,job_key',ignoreDuplicates:true}));
    }
  }
  let processed=0;
  while(Date.now()<deadline-(ocrEnabled()?120000:30000)) {
    const job=(checked(await db.rpc('claim_job'))??[])[0];if(!job)break;
    try {
      const done=job.kind==='scan'?await scan(job.owner_id,job.payload.source_id,deadline):job.kind==='qr'?(await qr(job.owner_id,job.payload.slip_id),true):(await sendReport(job.owner_id,job.payload),true);
      checked(await db.from('jobs').update({status:done?'done':'pending',lease_until:null,lease_token:null,...(!done?{attempts:Math.max(0,job.attempts-1),next_run_at:new Date(Date.now()+60000).toISOString()}:{})}).eq('id',job.id).eq('lease_token',job.lease_token));processed++;
    } catch(e) {
      const code=safeCode(e);const failed=job.attempts>=5;
      checked(await db.from('jobs').update({status:failed?'failed':'pending',error_code:code,lease_until:null,lease_token:null,next_run_at:new Date(Date.now()+Math.min(60,2**job.attempts)*60000).toISOString()}).eq('id',job.id).eq('lease_token',job.lease_token));
      if(job.kind==='scan')await db.from('drive_sources').update({last_scan_status:'failed',scan_complete:false}).eq('owner_id',job.owner_id).eq('id',job.payload.source_id);
      if(job.kind==='qr')await db.from('slips').update({status:failed?'failed':'queued',error_code:code}).eq('owner_id',job.owner_id).eq('id',job.payload.slip_id).is('transaction_id',null).neq('status','duplicate');
    }
  }
  return {processed};
}
export async function tick(now=new Date()) {
  const db=admin(),token=checked(await db.rpc('acquire_tick'));
  if(!token)return {processed:0,busy:true};
  try{return await tickUnlocked(now);}finally{checked(await db.rpc('release_tick',{p_token:token}));}
}
