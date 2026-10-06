import type {SourceCode,OcrDraft} from '@expense/core';
export function extractFields(text:string,bank:SourceCode):OcrDraft{
 const clean=text.normalize('NFKC').replace(/\u0e4d\u0e32/g,'ำ');
 const lines=clean.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 let amount:number|null=null;
 const label=lines.findIndex(l=>/จำนวน(?:เงิน)?/.test(l));
 const money=(s:string)=>{const m=s.match(/(?:^|[^\d])([\d,]+\.\d{2})(?!\d)/);return m?Math.round(Number(m[1].replaceAll(',',''))*100):null;};
 if(label>=0){for(const line of lines.slice(label,label+3)){if(/ค่าธรรมเน/.test(line))break;const n=money(line);if(n!==null){amount=n;break;}}}
 if(amount===null&&bank==='ttb'){
   const cutoff=lines.findIndex(l=>/ค่าธรรมเน/.test(l));
   const candidates=lines.slice(0,cutoff<0?0:cutoff).map(money).filter(x=>x!==null);
   if(candidates.length===1)amount=candidates[0];
 }
 const months:Record<string,number>={'มค':1,'กพ':2,'มีค':3,'เมย':4,'พค':5,'มิย':6,'กค':7,'สค':8,'กย':9,'ตค':10,'พย':11,'ธค':12};
 let date:string|null=null,time:string|null=null;
 for(const line of lines){const m=line.match(/(\d{1,2})\s+([ก-๙.]+)\s*(\d{4}|\d{2})\s*[,\-]?\s*(\d{1,2}):(\d{2})/);if(!m)continue;
  const month=months[m[2].replace(/[.\u0e38-\u0e3a]/g,'')];let year=Number(m[3]);if(year<100)year+=2500;if(year>=2400)year-=543;
  const value=`${year}-${String(month).padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  const dt=new Date(value+'T00:00:00Z');if(!month||Number(m[4])>23||Number(m[5])>59||Number.isNaN(dt.getTime())||dt.toISOString().slice(0,10)!==value)continue;
  date=value;time=m[4].padStart(2,'0')+':'+m[5];break;
 }
  const names=bank==='make'?lines.filter(l=>/^[ก-๙]{5,}(?:\s+[ก-๙]+)+$/.test(l)&&!/(โอนเงิน|ค่าธรรมเน|จำนวน|รายการ|ตรวจสอบ)/.test(l)):lines.filter(l=>/^(?:นาย|นาง|น\.ส\.)/.test(l));
 return {engine:'pending',amount_satang:amount,date,time,sender:names[0]??null,recipient:names[1]??null,requires_review:true};
}
