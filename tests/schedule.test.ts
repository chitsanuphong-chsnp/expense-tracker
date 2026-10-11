import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {shouldScan,dueReportPeriods,bangkokParts} from '../packages/core/src/index.ts';
// Expands the minute/hour fields used in supabase/schedule.sql ("35-55/5 16 * * *", "0 1 * * *").
const expand=(field:string,max:number)=>{const [range,step='1']=field.split('/');const [a,b]=range==='*'?[0,max]:range.split('-').map(Number);const out:number[]=[];for(let v=a;v<=(b??a);v+=Number(step))out.push(v);return out;};
const calls=async()=>{
  const sql=await readFile(new URL('../supabase/schedule.sql',import.meta.url),'utf8');
  const jobs=[...sql.matchAll(/\('(expense-tick-[a-z-]+)',\s*'([^']+)'\)/g)].map(m=>({name:m[1],cron:m[2]}));
  return jobs.flatMap(j=>{const [min,hour,...rest]=j.cron.split(' ');expect(rest).toEqual(['*','*','*']);
    return expand(hour,23).flatMap(h=>expand(min,59).map(m=>({name:j.name,at:new Date(Date.UTC(2026,9,5,h,m))})));});
};
const hhmm=(d:Date)=>{const p=bangkokParts(d);return `${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}`;};
it('calls the API only at the planned Bangkok times (8 a day)',async()=>{
  const times=(await calls()).map(c=>hhmm(c.at)).sort();
  expect(times).toEqual(['00:00','08:00','08:05','23:35','23:40','23:45','23:50','23:55']);
});
it('every scan call scans, even a few minutes late, and report calls send due reports',async()=>{
  for(const c of await calls()) {
    for(const late of [0,4*60000]) {
      const at=new Date(c.at.getTime()+late);
      if(c.name.includes('scan'))expect(shouldScan(at),`${c.name} ${hhmm(at)}`).toBe(true);
      else {expect(shouldScan(at)).toBe(false);expect(dueReportPeriods(at).some(p=>p.kind==='day')).toBe(true);}
    }
  }
  for(const t of ['06:30','07:00','12:00','23:30','00:05'])expect(shouldScan(new Date(`2026-10-05T${t}:00+07:00`)),t).toBe(false);
});
