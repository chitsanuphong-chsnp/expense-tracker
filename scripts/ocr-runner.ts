import {appendFile} from 'node:fs/promises';
import {pendingOcrSlips,draftPendingSlips} from '../apps/api/src/ocr-jobs.ts';
// Usage: npx tsx scripts/ocr-runner.ts check|run. Prints counts only; never slip text, amounts or IDs.
const mode=process.argv[2];
try {
  if(mode==='check') {
    const pending=(await pendingOcrSlips()).length;
    console.log(`OCR pending: ${pending}`);
    if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`pending=${pending}\n`);
  } else if(mode==='run') {
    const {drafted,failed}=await draftPendingSlips();
    console.log(`OCR drafted: ${drafted}, failed: ${failed}`);
  } else {console.error('Usage: npx tsx scripts/ocr-runner.ts check|run');process.exitCode=1;}
} catch(e) {
  // Error messages may echo request details; print only a safe code.
  const m=e instanceof Error?e.message:'';
  console.error(`OCR runner failed: ${/^[A-Z][A-Z0-9_]{1,60}$/.test(m)?m:'PROCESSING_FAILED'}`);process.exitCode=1;
}
