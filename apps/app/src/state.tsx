import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Session} from '@supabase/supabase-js';
import {AppState,Platform} from 'react-native';
import {supabase,authService} from './auth-client';
export {supabase} from './auth-client';
import {type Dataset,type TransactionInput,thaiDate} from '@expense/core';

export const apiOrigin=(process.env.EXPO_PUBLIC_API_URL??'http://localhost:3001').replace(/\/$/,'');
const empty:Dataset={accounts:[],categories:[],transactions:[],slips:[],sources:[],reports:[],rules:[],settings:{budget_satang:2000000,line_connected:false,line_blocked:false}};
export function newId(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.floor(Math.random()*16);return(c==='x'?n:(n&3)|8).toString(16);});}
function demoData():Dataset {
  const accounts=[['ttb','bank','#5575e7','011'],['K-PLUS','bank','#34ac95','004'],['Krungthai','bank','#5ba7dc','006'],['MAKE','bank','#9d7ae5','004'],['เงินสด','cash','#e6ad4b',null]].map(([name,kind,color,bank_code])=>({id:newId(),name:name!,kind:kind as 'bank'|'cash',color:color!,bank_code}));
  const categories=[['อาหาร','#e4a055'],['เครื่องดื่ม','#b488de'],['เดินทาง','#6b99e2'],['Shopping','#df81a5'],['ค่าใช้จ่ายทั่วไป','#8ca3b5'],['เงินเดือน','#49b097'],['รายได้อื่น ๆ','#65b2c0']].map(([name,color])=>({id:newId(),name,color}));
  const today=thaiDate();const transactions:Dataset['transactions']=[];
  for(let day=6;day>=0;day--){const date=thaiDate(new Date(new Date(`${today}T12:00:00+07:00`).getTime()-day*86400000));
    for(let i=0;i<3;i++)transactions.push({id:newId(),kind:'expense',amount_satang:[8500,6500,12000][i]+day*1200,account_id:accounts[(day+i)%5].id,to_account_id:null,category_id:categories[i].id,occurred_at:new Date(`${date}T${['09','12','18'][i]}:30:00+07:00`).toISOString(),note:['มื้อเช้า','กาแฟและเครื่องดื่ม','เดินทางกลับบ้าน'][i],counterparty:['ร้านอาหาร','ร้านกาแฟ','รถโดยสาร'][i],source:'manual'});
  }
  transactions.push({id:newId(),kind:'income',amount_satang:3500000,account_id:accounts[0].id,to_account_id:null,category_id:categories[5].id,occurred_at:new Date(`${today.slice(0,7)}-01T09:00:00+07:00`).toISOString(),note:'เงินเดือนตัวอย่าง',counterparty:'บริษัทตัวอย่าง',source:'manual'});
  return {...empty,accounts,categories,transactions,slips:[{id:newId(),source_code:'ttb',status:'needs_details',uploaded_at:new Date(`${today}T20:00:00+07:00`).toISOString(),transaction_id:null,qr_payload:'ตัวอย่าง QR · ยังไม่มียอดธุรกรรม',duplicate_of:null,error_code:null,drive_file_id:'demo-slip',name:'สลิปตัวอย่างรอกรอกยอด'},{id:newId(),source_code:'kplus',status:'qr_unreadable',uploaded_at:new Date(`${today}T19:00:00+07:00`).toISOString(),transaction_id:null,qr_payload:null,duplicate_of:null,error_code:'QR_NOT_FOUND',drive_file_id:'demo-slip-2',name:'สลิปตัวอย่าง QR ไม่ชัด'}]};
}
type State={data:Dataset;loading:boolean;error:string;demo:boolean;session:Session|null;recovery:boolean;finishRecovery:()=>void;ready:boolean;configured:boolean;refresh:()=>Promise<void>;startDemo:()=>Promise<void>;signIn:(email:string,password:string)=>Promise<void>;signOut:()=>Promise<void>;save:(id:string,input:TransactionInput,slip?:string)=>Promise<void>;remove:(id:string)=>Promise<void>;link:(slip:string,transaction:string)=>Promise<void>;call:(path:string,method?:string,body?:unknown)=>Promise<any>;updateLocal:(fn:(d:Dataset)=>Dataset)=>void;image:(id:string)=>Promise<string>};
const Context=createContext<State>(null!);
export function DataProvider({children}:{children:React.ReactNode}) {
  const [data,setData]=useState<Dataset>(empty),[loading,setLoading]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[demo,setDemo]=useState(false),[session,setSession]=useState<Session|null>(null);
  const [recovery,setRecovery]=useState(false),currentSession=useRef<Session|null>(null),refreshVersion=useRef(0),authVersion=useRef(0),pendingRefreshes=useRef(0),queuedRefresh=useRef(false);
  function acceptSession(next:Session|null){if(currentSession.current?.user.id!==next?.user.id){refreshVersion.current++;queuedRefresh.current=false;setData(empty);setError('');setLoading(false);}currentSession.current=next;setSession(next);if(next)setDemo(false);}
  useEffect(()=>{let live=true; (async()=>{
    const version=authVersion.current;try{if(supabase){const {data,error}=await supabase.auth.getSession();if(error)throw error;if(live&&version===authVersion.current)acceptSession(data.session);}else if(process.env.EXPO_PUBLIC_DEMO_MODE==='true'){const saved=await AsyncStorage.getItem('shzr.demo');if(live){setData(saved?JSON.parse(saved):demoData());setDemo(true);}}}catch{if(live)setError('คืนสถานะการเข้าสู่ระบบไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่');}finally{if(live)setReady(true);}
  })();const sub=supabase?.auth.onAuthStateChange((event,s)=>{if(!live)return;authVersion.current++;acceptSession(s);if(event==='PASSWORD_RECOVERY')setRecovery(true);if(event==='SIGNED_OUT')setRecovery(false);});
    const appState=Platform.OS==='web'?null:AppState.addEventListener('change',value=>{if(value==='active')supabase?.auth.startAutoRefresh();else supabase?.auth.stopAutoRefresh();});
    return()=>{live=false;refreshVersion.current++;sub?.data.subscription.unsubscribe();appState?.remove();};},[]);
  useEffect(()=>{if(demo&&ready)AsyncStorage.setItem('shzr.demo',JSON.stringify(data)).catch(()=>setError('บันทึกข้อมูลตัวอย่างในเครื่องไม่สำเร็จ'));},[data,demo,ready]);
  async function call(path:string,method='GET',body?:unknown){
    if(!session)throw new Error('กรุณาเข้าสู่ระบบ');
    const response=await fetch(`${apiOrigin}/api${path}`,{method,headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
    const result=await response.json();if(!response.ok)throw new Error(result.error??'เชื่อมต่อไม่สำเร็จ');return result;
  }
    async function refresh(quiet=false){
    if(demo||!currentSession.current)return; if(quiet&&pendingRefreshes.current>0){queuedRefresh.current=true;return;}
    const owner=currentSession.current.user.id,version=++refreshVersion.current;
    pendingRefreshes.current++;
    if(!quiet){setLoading(true);setError('');}
    const current=()=>version===refreshVersion.current&&owner===currentSession.current?.user.id;
    try{const result=await call('/data');if(current()){setData(previous=>JSON.stringify(previous)===JSON.stringify(result)?previous:result);setError('');}}
    catch(e){if(current()&&!quiet)setError(e instanceof Error?e.message:'โหลดข้อมูลไม่สำเร็จ');}
    finally{pendingRefreshes.current--;if(current())setLoading(false);if(pendingRefreshes.current===0&&queuedRefresh.current&&current()){queuedRefresh.current=false;void refresh(true);}}
  }
    useEffect(()=>{
    if(!session||demo||!supabase)return;
    void refresh();
    let disposed=false;let debounce:ReturnType<typeof setTimeout>|undefined;
    const active=()=>Platform.OS==='web'?typeof document!=='undefined'&&document.visibilityState==='visible':AppState.currentState==='active';
    const update=()=>{
      if(disposed||!active())return;
      // Batch a burst of QR jobs into one request without postponing indefinitely.
      if(debounce!==undefined)return;
      debounce=setTimeout(()=>{debounce=undefined;if(!disposed&&active())void refresh(true);},350);
    };
    const client=supabase;
    const channel=client.channel(`owner-data:${session.user.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'data_sync_signals',filter:`owner_id=eq.${session.user.id}`},update)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'data_sync_signals',filter:`owner_id=eq.${session.user.id}`},update)
      .subscribe(status=>{if(status==='SUBSCRIBED')update();});
    // Refresh after reconnect to cover changes missed while offline/backgrounded.
    const cleanup=()=>{disposed=true;if(debounce!==undefined)clearTimeout(debounce);void client.removeChannel(channel);};
    if(Platform.OS==='web'){
      window.addEventListener('focus',update);window.addEventListener('online',update);document.addEventListener('visibilitychange',update);
      return()=>{cleanup();window.removeEventListener('focus',update);window.removeEventListener('online',update);document.removeEventListener('visibilitychange',update);};
    }
    const subscription=AppState.addEventListener('change',update);
    return()=>{cleanup();subscription.remove();};
  },[session?.access_token,demo]);
async function save(id:string,input:TransactionInput,slip?:string){
    if(demo){setData(d=>{
      const existing=slip?d.slips.find(s=>s.id===slip):null;
      if(existing?.transaction_id)return d;
      if(existing?.status==='duplicate')throw new Error('กรุณาใช้สลิปต้นฉบับ');
      const rule=d.rules.find(r=>r.counterparty===input.counterparty);const value={...input,category_id:input.category_id??rule?.category_id??null,occurred_at:new Date(input.occurred_at).toISOString(),id,source:slip?'qr' as const:d.transactions.find(t=>t.id===id)?.source??'manual' as const};
      return {...d,transactions:[...d.transactions.filter(t=>t.id!==id),value],slips:d.slips.map(s=>s.id===slip?{...s,status:'linked',transaction_id:id}:s)};
    });return;}
    await call(`/transactions/${id}`,'PUT',{...input,slip_id:slip});await refresh();
  }
  async function remove(id:string){if(demo){setData(d=>({...d,transactions:d.transactions.filter(t=>t.id!==id),slips:d.slips.map(s=>s.transaction_id===id?{...s,transaction_id:null,status:s.qr_payload?'needs_details':'qr_unreadable'}:s)}));return;}await call(`/transactions/${id}`,'DELETE');await refresh();}
  async function link(slip:string,transaction:string){if(demo){setData(d=>({...d,slips:d.slips.map(s=>s.id===slip?{...s,status:'linked',transaction_id:transaction}:s)}));return;}await call(`/slips/${slip}/link`,'POST',{transaction_id:transaction});await refresh();}
  async function image(id:string){if(demo)throw new Error('ตัวอย่างนี้ไม่มีภาพสลิปจริง');const r=await fetch(`${apiOrigin}/api/slips/${id}/image`,{headers:{Authorization:`Bearer ${session!.access_token}`}});if(!r.ok)throw new Error('โหลดภาพไม่สำเร็จ');const blob=await r.blob();return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=reject;reader.readAsDataURL(blob);});}
  const state:State={data,loading,error,demo,session,recovery,finishRecovery:()=>setRecovery(false),ready,configured:!!supabase,call,refresh,save,remove,link,image,updateLocal:setData,
    startDemo:async()=>{const saved=await AsyncStorage.getItem('shzr.demo');setData(saved?JSON.parse(saved):demoData());setDemo(true);setError('');},
    signIn:async(email,password)=>authService.password(email,password,false),
    signOut:async()=>{if(session){const result=await supabase?.auth.signOut({scope:'local'});if(result?.error)throw new Error('ออกจากระบบไม่สำเร็จ กรุณาลองใหม่');}refreshVersion.current++;acceptSession(null);setRecovery(false);setDemo(false);setData(empty);setError('');}};
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export const useData=()=>useContext(Context);
