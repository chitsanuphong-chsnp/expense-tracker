import {mkdir,writeFile} from 'node:fs/promises';
import {bangkokParts} from '@expense/core';
import {admin,checked} from '../apps/api/src/db.ts';
import {listFolder,downloadFile,assertDriveOwner} from '../apps/api/src/drive.ts';
import {slipOcrDraft} from '../apps/api/src/ocr.ts';
// Local, read-only OCR accuracy check over every slip image in the configured Drive folders.
// Usage (apps/api/.env with OCR_ENABLED=true): npx tsx --env-file=apps/api/.env scripts/ocr-eval.ts [limit]
// Writes .local/ocr-eval.csv (gitignored). Never writes to the database. Keep the CSV private: it holds amounts and names.
const owner=process.env.DRIVE_OWNER_ID;if(!owner)throw new Error('DRIVE_OWNER_ID missing');
assertDriveOwner(owner);
const limit=Number(process.argv[2]??Infinity),db=admin();
const sources=checked(await db.from('drive_sources').select('source_code,folder_id').eq('owner_id',owner))??[];
const slips=checked(await db.from('slips').select('drive_file_id,transaction_id').eq('owner_id',owner))??[];
const transactions=checked(await db.from('transactions').select('id,amount_satang,occurred_at').eq('owner_id',owner))??[];
const recorded=new Map(slips.filter((s:any)=>s.transaction_id).map((s:any)=>[s.drive_file_id,transactions.find((t:any)=>t.id===s.transaction_id)]));
const images:{bank:any;folder:string;id:string;name:string;createdTime:string}[]=[];
for(const source of sources) {
  const queue=[{id:source.folder_id,name:''}];
  while(queue.length&&images.length<limit) {
    const folder=queue.shift()!;let pageToken:string|undefined;
    do {
      const page=await listFolder(folder.id,pageToken);pageToken=page.nextPageToken;
      for(const f of page.files) {
        if(f.mimeType==='application/vnd.google-apps.folder')queue.push({id:f.id,name:f.name});
        else if(['image/jpeg','image/png','image/webp'].includes(f.mimeType)&&images.length<limit)images.push({bank:source.source_code,folder:folder.name,id:f.id,name:f.name,createdTime:f.createdTime});
      }
    } while(pageToken);
  }
}
const csv=(v:unknown)=>`"${String(v??'').replace(/"/g,'""')}"`;
const rows=[['bank','folder','file','ocr_amount','ocr_date','ocr_time','sender','recipient','error','seconds','recorded_amount','recorded_date','recorded_time','amount_ok','date_ok','time_ok']];
const score={total:0,amount:0,date:0,time:0,recorded:0,amountOk:0,dateOk:0,timeOk:0,errors:0};
for(const [i,image] of images.entries()) {
  const started=Date.now();
  const draft=await slipOcrDraft(await downloadFile(image.id),image.bank,1,image.createdTime).catch(()=>({amount_satang:null,date:null,time:null,sender:null,recipient:null,error:'DOWNLOAD_FAILED'} as any));
  const t:any=recorded.get(image.id),p=t?bangkokParts(new Date(t.occurred_at)):null;
  const rTime=p?`${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}`:'';
  const ok=(a:unknown,b:unknown)=>t?(a===b?'yes':'NO'):'';
  score.total++;if(draft.error)score.errors++;if(draft.amount_satang!=null)score.amount++;if(draft.date)score.date++;if(draft.time)score.time++;
  if(t){score.recorded++;if(draft.amount_satang===Number(t.amount_satang))score.amountOk++;if(draft.date===p!.date)score.dateOk++;if(draft.time===rTime)score.timeOk++;}
  rows.push([image.bank,image.folder,image.name,draft.amount_satang!=null?(draft.amount_satang/100).toFixed(2):'',draft.date,draft.time,draft.sender,draft.recipient,draft.error,((Date.now()-started)/1000).toFixed(1),t?(Number(t.amount_satang)/100).toFixed(2):'',p?.date??'',rTime,ok(draft.amount_satang,Number(t?.amount_satang)),ok(draft.date,p?.date),ok(draft.time,rTime)]);
  console.log(`${i+1}/${images.length}`);
}
await mkdir('.local',{recursive:true});
await writeFile('.local/ocr-eval.csv','﻿'+rows.map(r=>r.map(csv).join(',')).join('\r\n'));
console.log(`Read: amount ${score.amount}/${score.total}, date ${score.date}/${score.total}, time ${score.time}/${score.total}, failed ${score.errors}`);
console.log(`Matches recorded transactions: amount ${score.amountOk}/${score.recorded}, date ${score.dateOk}/${score.recorded}, time ${score.timeOk}/${score.recorded}`);
console.log('Details: .local/ocr-eval.csv (private, not committed)');
