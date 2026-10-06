import { createHmac,timingSafeEqual } from 'node:crypto';
export { flexReport } from '@expense/core';
export function signatureValid(raw:string,signature:string,secret:string) {
  const expected=createHmac('sha256',secret).update(raw).digest();const actual=Buffer.from(signature,'base64');
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
async function lineFetch(path:string,init?:RequestInit) {
  if(!process.env.LINE_CHANNEL_ACCESS_TOKEN)throw new Error('LINE_NOT_CONFIGURED');
  return fetch(`https://api.line.me/v2/bot/${path}`,{...init,headers:{Authorization:`Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,'Content-Type':'application/json',...init?.headers},signal:AbortSignal.timeout(15000)});
}
export async function pushReport(userId:string,message:unknown,retryKey:string) {
  const [q,c]=await Promise.all([lineFetch('message/quota'),lineFetch('message/quota/consumption')]);
  if(!q.ok||!c.ok)throw new Error('LINE_QUOTA_CHECK_FAILED');
  const quota=await q.json(),consumption=await c.json();
  if(quota.type==='limited'&&consumption.totalUsage>=quota.value)throw new Error('LINE_QUOTA_EXCEEDED');
  const res=await lineFetch('message/push',{method:'POST',headers:{'X-Line-Retry-Key':retryKey},body:JSON.stringify({to:userId,messages:[message]})});
  if(res.status===409&&res.headers.get('x-line-accepted-request-id'))return;
  if(!res.ok)throw new Error(`LINE_${res.status}`);
}

