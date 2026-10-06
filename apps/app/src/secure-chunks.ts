import type {Store} from './auth-storage';
import {utf8Bytes} from './auth-policy';
type Manifest={kind:'expense-secure-chunks';generation:string;count:number};
function manifest(value:string|null):Manifest|null{try{const data=JSON.parse(value??'null');return data?.kind==='expense-secure-chunks'&&/^[a-z0-9]+$/.test(data.generation)&&Number.isInteger(data.count)&&data.count>0&&data.count<=256?data:null;}catch{return null;}}
const partKey=(key:string,m:Manifest,index:number)=>`${key}.${m.generation}.${index}`;
// OAuth sessions can exceed one SecureStore value. Publish the manifest only
// after all chunks exist, preserving the previous session if a write fails.
export function secureChunks(store:Store):Store{
  async function clear(key:string,m:Manifest|null){if(m)for(let i=0;i<m.count;i++)await store.removeItem(partKey(key,m,i));}
  return {
    async getItem(key){const raw=await store.getItem(key),m=manifest(raw);if(!m)return raw;const parts:string[]=[];for(let i=0;i<m.count;i++){const value=await store.getItem(partKey(key,m,i));if(value===null)return null;parts.push(value);}return parts.join('');},
    async setItem(key,value){const old=manifest(await store.getItem(key)),parts:string[]=[];let part='',bytes=0;for(const char of value){const size=utf8Bytes(char);if(bytes+size>1500){parts.push(part);part='';bytes=0;}part+=char;bytes+=size;}parts.push(part);if(parts.length>256)throw new Error('ข้อมูลการเข้าสู่ระบบมีขนาดใหญ่เกินไป');const m:Manifest={kind:'expense-secure-chunks',generation:Date.now().toString(36)+Math.random().toString(36).slice(2),count:parts.length};let written=0;try{for(let i=0;i<parts.length;i++){await store.setItem(partKey(key,m,i),parts[i]);written++;}await store.setItem(key,JSON.stringify(m));}catch(error){for(let i=0;i<written;i++)await store.removeItem(partKey(key,m,i)).catch(()=>{});throw error;}await clear(key,old);},
    async removeItem(key){const old=manifest(await store.getItem(key));await store.removeItem(key);await clear(key,old);}
  };
}
