import {type Summary} from '@expense/core';
const C={primary:'#5668df'};
export const periods={day:{name:'รายวัน',key:'day:2026-10-06',label:'6 ตุลาคม 2569',scale:1,pending:2,count:5},week:{name:'รายสัปดาห์',key:'week:2026-09-28',label:'28 กันยายน – 4 ตุลาคม 2569',scale:6,pending:3,count:28},month:{name:'รายเดือน',key:'month:2026-09',label:'กันยายน 2569',scale:20,pending:5,count:100}};
export function example(period:keyof typeof periods):Summary{
  const p=periods[period],income=0,expense=84500*p.scale;
  return {income,expense,net:income-expense,count:p.count,pending:p.pending,ocr_draft:{amount_satang:31500*p.pending,slips:p.pending},
    byAccount:[['ttb',24500,'#5575e7'],['K-PLUS',18000,'#34ac95'],['Krungthai',12000,'#5ba7dc'],['MAKE',20000,'#9d7ae5'],['เงินสด',10000,'#e6ad4b']].map(([name,amount,color],i)=>({id:String(i),name:String(name),color:String(color),expense:Number(amount)*p.scale,income:i===0?income:0})),
    byCategory:[['อาหาร',36500,'#e4a055'],['Shopping',20000,'#df81a5'],['เครื่องดื่ม',18000,'#b488de'],['เดินทาง',10000,'#6b99e2']].map(([name,amount,color],i)=>({id:String(i),name:String(name),color:String(color),expense:Number(amount)*p.scale}))};
}
