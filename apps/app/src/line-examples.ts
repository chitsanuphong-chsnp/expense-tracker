import {type Summary} from '@expense/core';
const C={primary:'#5668df'};
export const periods={day:{name:'รายวัน',key:'day:2026-10-06',label:'6 ตุลาคม 2569',scale:1,pending:2,count:5},week:{name:'รายสัปดาห์',key:'week:2026-09-28',label:'28 กันยายน – 4 ตุลาคม 2569',scale:6,pending:3,count:28},month:{name:'รายเดือน',key:'month:2026-09',label:'กันยายน 2569',scale:20,pending:5,count:100}};
export function example(period:keyof typeof periods):Summary{
  const p=periods[period],income=period==='month'?2850000:0,expense=84500*p.scale;
  return {income,expense,net:income-expense,count:p.count,pending:p.pending,
    byAccount:[['ttb',24500],['K-PLUS',18000],['Krungthai',12000],['MAKE',20000],['เงินสด',10000]].map(([name,amount],i)=>({id:String(i),name:String(name),color:C.primary,expense:Number(amount)*p.scale,income:i===0?income:0})),
    byCategory:[['อาหาร',36500],['Shopping',20000],['เครื่องดื่ม',18000],['เดินทาง',10000]].map(([name,amount],i)=>({id:String(i),name:String(name),color:C.primary,expense:Number(amount)*p.scale}))};
}
