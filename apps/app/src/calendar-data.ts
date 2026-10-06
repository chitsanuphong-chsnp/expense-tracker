// Calendar values are date-only strings. UTC arithmetic avoids device timezone/DST shifts.
export function validDate(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function moveMonth(month:string,offset:number){
  const date=new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth()+offset);
  return date.toISOString().slice(0,7);
}
export function calendarDays(month:string){
  const first=new Date(`${month}-01T12:00:00Z`),offset=(first.getUTCDay()+6)%7;
  const count=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  const cells=Math.ceil((offset+count)/7)*7;
  return Array.from({length:cells},(_,i)=>{
    const date=new Date(first);date.setUTCDate(i-offset+1);
    const value=date.toISOString().slice(0,10);
    return {value,day:date.getUTCDate(),inMonth:value.startsWith(month)};
  });
}
