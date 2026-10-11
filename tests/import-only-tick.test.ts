import {it,expect,vi} from 'vitest';
const {calls}=vi.hoisted(()=>({calls:[] as string[]}));
// Supabase stand-in: only a LINE report job is queued; no scan/QR job is claimable.
vi.mock('../apps/api/src/db.ts',async importOriginal=>({...await importOriginal<typeof import('../apps/api/src/db.ts')>(),admin:()=>({
  rpc:async(name:string)=>{calls.push(`rpc:${name}`);return {data:name==='acquire_tick'?'token':name==='claim_job'?[{id:'j1',kind:'report',owner_id:'o',payload:{}}]:null,error:null};},
  from:(table:string)=>{calls.push(`from:${table}`);const chain:any=new Proxy({},{get:(_,key)=>key==='then'?(resolve:any)=>resolve({data:[],count:0,error:null}):()=>chain});return chain;}})}));
import {tick} from '../apps/api/src/worker.ts';
it('a manual import neither queues nor sends LINE reports',async()=>{
  expect(await tick(new Date('2026-10-11T03:00:00Z'),60000,true)).toEqual({processed:0});
  expect(calls).not.toContain('rpc:claim_job');
  expect(calls).not.toContain('from:profiles');
  expect(calls).toContain('rpc:release_tick');
});
