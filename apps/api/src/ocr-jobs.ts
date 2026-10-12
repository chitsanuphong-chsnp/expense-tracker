import type {OcrDraft,SourceCode} from '@expense/core';
import {admin,checked} from './db.ts';
import {downloadFile,assertDriveOwner} from './drive.ts';
import {slipOcrDraft} from './ocr.ts';
import {OCR_PARSER} from './ocr-parser.ts';

// Scheduled OCR outside Vercel (GitHub Actions). Callers log counts only: Actions logs of a public repository are public.
type Row={id:string;owner_id:string;drive_file_id:string;source_code:SourceCode;uploaded_at:string;ocr_details:OcrDraft|null};
export const MAX_OCR_ATTEMPTS=3;
export function needsOcr(row:Pick<Row,'ocr_details'>) {
  return !row.ocr_details||staleDraft(row.ocr_details)||(!!row.ocr_details.error&&(row.ocr_details.attempts??1)<MAX_OCR_ATTEMPTS);
}
// A readable draft without an amount (null or 0) from an older parser: worth one more read after a parser fix.
export function staleDraft(d:OcrDraft|null){
  return !!d&&!d.error&&!(Number(d.amount_satang)>0)&&(d.parser??1)<OCR_PARSER;
}
export async function pendingOcrSlips(db=admin()):Promise<Row[]> {
  const owner=process.env.DRIVE_OWNER_ID;if(!owner)throw new Error('DRIVE_NOT_ENABLED_FOR_ACCOUNT');
  const rows:Row[]=checked(await db.from('slips').select('id,owner_id,drive_file_id,source_code,uploaded_at,ocr_details').eq('owner_id',owner).is('transaction_id',null).neq('status','duplicate'))??[];
  return rows.filter(needsOcr);
}
export async function draftPendingSlips(db=admin()) {
  let drafted=0,failed=0;
  for(const slip of await pendingOcrSlips(db)) {
    assertDriveOwner(slip.owner_id);
    const attempts=(slip.ocr_details?.attempts??(slip.ocr_details?1:0))+1;
    let draft:OcrDraft;
    try{draft=await slipOcrDraft(await downloadFile(slip.drive_file_id),slip.source_code,attempts,new Date(slip.uploaded_at).toISOString());}
    catch{draft={engine:process.env.OCR_ENGINE??'tesseract',amount_satang:null,date:null,time:null,sender:null,recipient:null,requires_review:true,error:'DOWNLOAD_FAILED',attempts};}
    // Never touch a slip the owner has meanwhile recorded or that became a duplicate.
    checked(await db.from('slips').update({ocr_details:draft}).eq('id',slip.id).eq('owner_id',slip.owner_id).is('transaction_id',null).neq('status','duplicate'));
    if(draft.error)failed++;else drafted++;
  }
  return {drafted,failed};
}
