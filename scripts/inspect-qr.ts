import {readFile} from 'node:fs/promises';
import {decodeQr} from '../apps/api/src/qr.ts';
const path=process.argv[2];
if(!path){console.error('Usage: npx tsx scripts/inspect-qr.ts <local-slip-image>');process.exit(1);}
const result=await decodeQr(await readFile(path));
// Local stdout only. Payload can contain private references; do not publish it.
console.log(JSON.stringify({payload:result.payload,reference:result.key,hash:result.hash,amount_satang:null,status:result.payload?'needs_details':'qr_unreadable'},null,2));
