import {createWorker,PSM} from 'tesseract.js';
import {mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import type {SourceCode,OcrDraft} from '@expense/core';
import {extractFields} from './ocr-parser.ts';
const run=promisify(execFile);
const repo=fileURLToPath(new URL('../../../',import.meta.url));
let tail:Promise<unknown>=Promise.resolve();
let worker:ReturnType<typeof createWorker>|undefined;
export function ocrEnabled(){return process.env.OCR_ENABLED==='true';}
export async function readSlipOcr(bytes:Buffer,bank:SourceCode):Promise<OcrDraft>{
 if(!ocrEnabled())throw Error('OCR_NOT_CONFIGURED');
 const work=async()=>{
  const engine=process.env.OCR_ENGINE??'tesseract';let text:string;
  if(engine==='paddle'){
   if(!process.env.OCR_PYTHON)throw Error('OCR_PYTHON_NOT_CONFIGURED');
   const folder=await mkdtemp(join(tmpdir(),'expense-ocr-'));
   try{
    const path=join(folder,'slip.png');await writeFile(path,bytes);
    const result=await run(process.env.OCR_PYTHON,[resolve(repo,'services/ocr/infer.py'),path],{timeout:90000,maxBuffer:1024*1024,windowsHide:true,env:{...process.env,PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK:'True',PYTHONUTF8:'1'}});
    const output=JSON.parse(result.stdout.trim());text=output.text;
   }finally{if(!resolve(folder).startsWith(resolve(tmpdir())+ (process.platform==='win32'?'\\':'/')))throw Error('INVALID_TEMP_PATH');await rm(folder,{recursive:true,force:true});}
  }else if(engine==='tesseract'){
   const cache=resolve(repo,'.local/ocr-models');await mkdir(cache,{recursive:true});
   worker??=createWorker('tha+eng',1,{cachePath:cache});
   const w=await worker;
   // Sparse mode preserved names better than AUTO on the supplied ttb slip.
   await w.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT});
   const result=await w.recognize(bytes);text=result.data.text;
  }else throw Error('OCR_ENGINE_UNSUPPORTED');
  return {...extractFields(text,bank),engine};
 };
 // Serialize CPU work to avoid parallel worker/model memory spikes.
 const result=tail.then(work,work);tail=result.catch(()=>{});return result;
}