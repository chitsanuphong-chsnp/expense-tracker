import {ocrEnabled,slipOcrDraft} from './ocr.ts';
import { admin,checked,dataset } from './db.ts';
import { listFolder,downloadFile,assertDriveOwner } from './drive.ts';
import { decodeQr } from './qr.ts';
import { flexReport,pushReport } from './line.ts';
import { shouldScan,dueReportPeriods,summarize,bangkokParts,dailyPendingWindow,thaiDate } from '@expense/core';

export type ScanRange={from:string;to:string};
export async function enqueueScan(owner:string,source:any,key:string,range:ScanRange) {
  const db=admin();checked(await db.from('jobs').upsert({owner_id:owner,job_key:key,kind:'scan',payload:{source_id:source.id,...range}},{onConflict:'owner_id,job_key',ignoreDuplicates:true}));
}
const dateFolder=/^\d{4}-\d{2}-\d{2}$/;
// Imports images whose date is within the range: the YYYY-MM-DD folder name, else the Drive created date.
// Rerunnable after a timeout: known files are skipped by their Drive ID.
export async function scan(owner:string,sourceId:string,range:ScanRange,deadline:number) {
  assertDriveOwner(owner);
  const db=admin();const source=checked(await db.from('drive_sources').select('*').eq('owner_id',owner).eq('id',sourceId).maybeSingle());
  if(!source)return true;
  const inRange=(date:string)=>date>=range.from&&date<=range.to;
  const queue:{id:string;date?:string;depth:number}[]=[{id:source.folder_id,depth:0}];
  checked(await db.from('drive_sources').update({last_scan_status:'scanning',scan_complete:false}).eq('id',source.id).eq('owner_id',owner));
  while(queue.length) {
    const folder=queue.shift()!;let pageToken:string|undefined;
    do {
      if(Date.now()>=deadline-30000)return false;
      const page=await listFolder(folder.id,pageToken);pageToken=page.nextPageToken;
      for(const f of page.files) {
        if(f.mimeType==='application/vnd.google-apps.folder') {
          if(dateFolder.test(f.name)){if(inRange(f.name))queue.push({id:f.id,date:f.name,depth:folder.depth+1});}
          else if(folder.depth<2)queue.push({id:f.id,date:folder.date,depth:folder.depth+1});
        } else if(['image/jpeg','image/png','image/webp'].includes(f.mimeType)&&inRange(folder.date??thaiDate(f.createdTime))) {
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
    } while(pageToken);
  }
  checked(await db.from('drive_sources').update({cursor:null,scan_complete:true,last_scan_status:'success',last_scan_at:new Date().toISOString()}).eq('id',source.id).eq('owner_id',owner));
  return true;
}
async function qr(owner:string,id:string) {
  assertDriveOwner(owner);
  const db=admin();const slip=checked(await db.from('slips').select('*').eq('owner_id',owner).eq('id',id).single());
  if(!slip||slip.transaction_id||slip.status==='duplicate')return;
  checked(await db.from('slips').update({status:'processing',error_code:null}).eq('id',id).eq('owner_id',owner).is('transaction_id',null).neq('status','duplicate'));
  if(!slip.drive_file_id)return; // uploaded in the app: QR/OCR were done at upload, no image is kept
  const bytes=await downloadFile(slip.drive_file_id);const result=await decodeQr(bytes);
  checked(await db.rpc('finish_qr',{p_id:id,p_hash:result.hash,p_payload:result.payload,p_qr_key:result.key,p_error:result.payload?null:'QR_NOT_FOUND'}));
  // Mini QR supplies the reference; OCR proposes text fields but never assumes direction.
  if(ocrEnabled()){
    const latest=checked(await db.from('slips').select('status,transaction_id').eq('id',id).eq('owner_id',owner).single());
    if(latest&&latest.status!=='duplicate'&&!latest.transaction_id){
      const draft=await slipOcrDraft(bytes,slip.source_code,1,new Date(slip.uploaded_at).toISOString());
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
    const data=await dataset(db,owner),pendingWindow=period.kind==='day'?dailyPendingWindow(period.key.slice(4)):{start:period.start,end:period.end};
    const uploaded=data.slips.filter(s=>new Date(s.uploaded_at).getTime()>=new Date(pendingWindow.start).getTime()&&new Date(s.uploaded_at).getTime()<new Date(pendingWindow.end).getTime()).length;
    const syncStatus=!data.sources.length?'ยังไม่ได้เชื่อม Drive':data.sources.some(s=>s.last_scan_status==='failed')?'ตรวจ Drive ไม่สำเร็จ · ยอดอาจไม่ครบ':data.sources.some(s=>!s.scan_complete)?'กำลังตรวจ Drive · ยอดอาจไม่ครบ':uploaded?'ตรวจ Drive สำเร็จตามรอบล่าสุด':'ตรวจ Drive สำเร็จ · ไม่พบสลิปที่อัปโหลดในช่วงนี้';
    const snapshot={...summarize(data,period.start,period.end,pendingWindow.end,pendingWindow.start),sync_status:syncStatus};
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
async function tickUnlocked(now:Date,budgetMs:number) {
  const db=admin(),deadline=Date.now()+budgetMs;const profiles=checked(await db.from('profiles').select('*'))??[];
  for(const profile of profiles) {
    if(shouldScan(now))for(const source of await (async()=>checked(await db.from('drive_sources').select('*').eq('owner_id',profile.id)))()??[]) {
      // Night scans cover yesterday and today, never before the owner's import start date.
      const p=bangkokParts(now),yesterday=thaiDate(new Date(now.getTime()-86400000)),from=profile.import_from&&profile.import_from>yesterday?profile.import_from:yesterday;
      if(from<=p.date)await enqueueScan(profile.id,source,`scan:${source.id}:${p.date}:${p.hour}:${Math.floor(p.minute/5)}`,{from,to:p.date});
    }
    for(const period of dueReportPeriods(now)) {
      if(new Date(period.end).getTime()<new Date(profile.reporting_started_at).getTime())continue;
      const connection=checked(await db.from('line_connections').select('owner_id,blocked').eq('owner_id',profile.id).maybeSingle());
      if(!connection||connection.blocked)continue;
      checked(await db.from('jobs').upsert({owner_id:profile.id,job_key:`report:${period.key}`,kind:'report',payload:period},{onConflict:'owner_id,job_key',ignoreDuplicates:true}));
    }
  }
  let processed=0;
  // Leave room for the job in hand: Paddle needs up to ~2 min per slip, Tesseract a few seconds.
  const margin=ocrEnabled()&&process.env.OCR_ENGINE==='paddle'&&budgetMs>=180000?120000:30000;
  while(Date.now()<deadline-margin) {
    const job=(checked(await db.rpc('claim_job'))??[])[0];if(!job)break;
    try {
      const done=job.kind==='scan'?await scan(job.owner_id,job.payload.source_id,scanRange(job.payload),deadline):job.kind==='qr'?(await qr(job.owner_id,job.payload.slip_id),true):(await sendReport(job.owner_id,job.payload),true);
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
// Scheduled ticks get the full Vercel budget; a manual run from the app returns sooner and the app calls again while work remains.
export async function tick(now=new Date(),budgetMs=205000) {
  const db=admin(),token=checked(await db.rpc('acquire_tick'));
  if(!token)return {processed:0,busy:true};
  try{return await tickUnlocked(now,budgetMs);}finally{checked(await db.rpc('release_tick',{p_token:token}));}
}
// Older queued jobs (before date ranges) scan only the last two days.
function scanRange(payload:any):ScanRange{
  if(payload.from&&payload.to)return {from:payload.from,to:payload.to};
  const today=thaiDate();return {from:thaiDate(new Date(Date.now()-86400000)),to:today};
}
export async function pendingImportJobs(owner:string) {
  const r=await admin().from('jobs').select('id',{count:'exact',head:true}).eq('owner_id',owner).in('kind',['scan','qr']).in('status',['pending','running']);
  checked(r);return r.count??0;
}
