import sharp from 'sharp';
import {createRequire} from 'node:module';
import type {QRCode,Options} from 'jsqr';
// jsqr is CommonJS; load its callable export consistently in Node and Vercel.
const jsQR=createRequire(import.meta.url)('jsqr') as (data:Uint8ClampedArray,width:number,height:number,options?:Options)=>QRCode|null;
import { createHash } from 'node:crypto';
import { slipVerify } from 'promptparse/validate';

export type QrResult={hash:string;payload:string|null;key:string|null};
// Mini-QR TLV only. Payment QR is not evidence of a completed transaction.
export function miniQrReference(payload:string):string|null {
  try { const parsed=slipVerify(payload);return parsed?`${parsed.sendingBank}:${parsed.transRef}`:null; }catch{return null;}
}
export async function decodeQr(bytes:Buffer):Promise<QrResult> {
  const hash=createHash('sha256').update(bytes).digest('hex');
  const metadata=await sharp(bytes,{limitInputPixels:24000000}).metadata();
  if(!['jpeg','png','webp'].includes(metadata.format??''))throw new Error('UNSUPPORTED_IMAGE');
  // Two bounded scales help small Mini-QRs without external OCR.
  for(const size of [1800,3200]) {
    const {data,info}=await sharp(bytes,{limitInputPixels:24000000}).rotate().resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const result=jsQR(new Uint8ClampedArray(data),info.width,info.height,{inversionAttempts:'attemptBoth'});
    if(result)return {hash,payload:result.data,key:miniQrReference(result.data)};
  }
  return {hash,payload:null,key:null};
}
