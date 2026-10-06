import {extractSlipQr} from './qr-details.ts';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Dataset } from '@expense/core';
export function configured() { return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY); }
const boundedFetch:typeof fetch=(input,init)=>fetch(input,{...init,signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
export function admin() {
  if (!configured()) throw new Error('NOT_CONFIGURED');
  return createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{global:{fetch:boundedFetch},auth:{persistSession:false,autoRefreshToken:false}});
}
export function userDb(token:string) { return createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_ANON_KEY!,{global:{fetch:boundedFetch,headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}}); }
export function checked<T>(r:{data:T;error:any}):T { if(r.error) throw new Error(r.error.code==='23505'?'CONFLICT':'DATABASE_ERROR'); return r.data; }
export async function rows(db:SupabaseClient,table:string,owner:string) {
  const all:any[]=[];
  for(let page=0;;page++) { const r=await db.from(table).select('*').eq('owner_id',owner).order('id').range(page*500,page*500+499); const data=checked(r)??[]; all.push(...data); if(data.length<500)break; }
  return all;
}
export async function dataset(db:SupabaseClient,owner:string):Promise<Dataset> {
  const [accounts,categories,transactions,slips,sources,reports,rules,profile,line]=await Promise.all([
    rows(db,'accounts',owner),rows(db,'categories',owner),rows(db,'transactions',owner),rows(db,'slips',owner),rows(db,'drive_sources',owner),rows(db,'reports',owner),rows(db,'category_rules',owner),
    db.from('profiles').select('budget_satang').eq('id',owner).single(),db.from('line_connections').select('blocked').eq('owner_id',owner).maybeSingle()
  ]);
  checked(profile);checked(line);
  return {accounts,categories,transactions:transactions.map(t=>({...t,amount_satang:Number(t.amount_satang),occurred_at:new Date(t.occurred_at).toISOString()})),slips:slips.map(s=>({...s,qr_details:extractSlipQr(s.qr_payload),uploaded_at:new Date(s.uploaded_at).toISOString()})),sources,reports:reports.map(r=>({...r,period_start:new Date(r.period_start).toISOString(),period_end:new Date(r.period_end).toISOString()})),rules,settings:{budget_satang:Number(profile.data?.budget_satang??0),line_connected:!!line.data,line_blocked:!!line.data?.blocked}};
}
