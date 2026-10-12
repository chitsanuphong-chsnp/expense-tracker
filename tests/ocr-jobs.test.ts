import {it,expect} from 'vitest';
import {needsOcr,MAX_OCR_ATTEMPTS} from '../apps/api/src/ocr-jobs.ts';
import {OCR_PARSER} from '../apps/api/src/ocr-parser.ts';
const draft=(changes={})=>({engine:'paddle',amount_satang:200,date:null,time:null,sender:null,recipient:null,requires_review:true as const,...changes});
it('drafts new slips, retries failures a limited number of times, and keeps good drafts',()=>{
  expect(needsOcr({ocr_details:null})).toBe(true);
  expect(needsOcr({ocr_details:draft()})).toBe(false);
  expect(needsOcr({ocr_details:draft({error:'OCR_FAILED'})})).toBe(true);
  expect(needsOcr({ocr_details:draft({error:'OCR_FAILED',attempts:MAX_OCR_ATTEMPTS-1})})).toBe(true);
  expect(needsOcr({ocr_details:draft({error:'OCR_FAILED',attempts:MAX_OCR_ATTEMPTS})})).toBe(false);
});
it('reads a draft without an amount once more after a parser update, then leaves it',()=>{
  expect(needsOcr({ocr_details:draft({amount_satang:0})})).toBe(true);
  expect(needsOcr({ocr_details:draft({amount_satang:null})})).toBe(true);
  expect(needsOcr({ocr_details:draft({amount_satang:0,parser:OCR_PARSER})})).toBe(false);
  expect(needsOcr({ocr_details:draft({parser:1})})).toBe(false);
});
