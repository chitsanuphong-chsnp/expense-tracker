import type {SupabaseClient} from '@supabase/supabase-js';
import {emailAddress,phoneNumber,otpCode,newPassword,assertCallbackUrl,authMessage} from './auth-policy';
import type {RememberedAuthStorage} from './auth-storage';
type CallbackResult={recovery:boolean;linked:boolean};
type Options={redirect:()=>string;sms:boolean;google:boolean;launch:(url:string,redirect:string)=>Promise<string|null|undefined>;storage:RememberedAuthStorage};
const ownerKey='expense.oauth.owner';
export function createAuthService(client:SupabaseClient|null,options:Options){
  let completed:{code:string;promise:Promise<{recovery:boolean;linked:boolean}>}|null=null;
  function auth(){if(!client)throw new Error('ยังไม่ได้เชื่อมระบบเข้าสู่ระบบ สามารถลองข้อมูลตัวอย่างก่อนได้');return client.auth;}
  function check(error:unknown,fallback?:string){if(error)throw new Error(authMessage(error,fallback));}
  function sms(){if(!options.sms)throw new Error('ยังไม่เปิดส่ง SMS ใช้ OTP อีเมลหรือ Google ได้ฟรีก่อน');}
  const service={
    async password(email:string,password:string,remember:boolean){const value=emailAddress(email);if(!password)throw new Error('กรอกรหัสผ่าน');const a=auth();await options.storage.setRemember(remember);const {error}=await a.signInWithPassword({email:value,password});check(error,'อีเมลหรือรหัสผ่านไม่ถูกต้อง');},
    async requestOtp(kind:'email'|'phone',value:string,remember:boolean){if(kind==='phone')sms();const target=kind==='email'?emailAddress(value):phoneNumber(value),a=auth();await options.storage.setRemember(remember);const {error}=await a.signInWithOtp(kind==='email'?{email:target,options:{shouldCreateUser:false}}:{phone:target,options:{shouldCreateUser:false}});check(error,'ส่งรหัสไม่สำเร็จ กรุณารอสักครู่แล้วลองใหม่');return target;},
    async verifyOtp(kind:'email'|'phone',value:string,token:string){if(kind==='phone')sms();const code=otpCode(token);const {error}=await auth().verifyOtp(kind==='email'?{email:emailAddress(value),token:code,type:'email'}:{phone:phoneNumber(value),token:code,type:'sms'});check(error,'รหัสไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่');},
    async forgot(email:string){const {error}=await auth().resetPasswordForEmail(emailAddress(email),{redirectTo:options.redirect()});check(error,'ส่งอีเมลไม่สำเร็จ กรุณารอสักครู่แล้วลองใหม่');},
    async updatePassword(password:string,confirm:string){const value=newPassword(password,confirm),a=auth();const {data,error}=await a.getUser();check(error,'กรุณายืนยันตัวตนอีกครั้ง');if(!data.user)throw new Error('กรุณายืนยันตัวตนอีกครั้ง');const result=await a.updateUser({password:value});check(result.error);},
    async revokeOtherSessions(){const {error}=await auth().signOut({scope:'others'});check(error,'เปลี่ยนรหัสผ่านแล้ว แต่ยกเลิกการเข้าสู่ระบบเครื่องอื่นไม่สำเร็จ กรุณาลองอีกครั้ง');},
    async linkPhone(phone:string){sms();const a=auth(),{data,error}=await a.getUser();check(error);if(!data.user)throw new Error('กรุณาเข้าสู่ระบบก่อนเชื่อมเบอร์');const target=phoneNumber(phone),result=await a.updateUser({phone:target});check(result.error);return target;},
    async verifyPhone(phone:string,token:string){sms();const {error}=await auth().verifyOtp({phone:phoneNumber(phone),token:otpCode(token),type:'phone_change'});check(error,'รหัสไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่');},
    async google(remember:boolean,link=false):Promise<CallbackResult|null>{if(!options.google)throw new Error('ยังไม่ได้เปิด Google Login');const a=auth();await options.storage.setRemember(remember);if(link){const {data,error}=await a.getUser();check(error);if(!data.user)throw new Error('กรุณาเข้าสู่ระบบก่อนเชื่อม Google');await options.storage.setItem(ownerKey,data.user.id);}else await options.storage.removeItem(ownerKey);
      const redirect=options.redirect(),input={provider:'google' as const,options:{redirectTo:redirect,skipBrowserRedirect:true,queryParams:{prompt:'select_account'}}};
      try{const {data,error}=link?await a.linkIdentity(input):await a.signInWithOAuth(input);check(error);if(!data.url)throw new Error('เปิด Google ไม่สำเร็จ');const callback=await options.launch(data.url,redirect);if(callback)return await service.callback(callback);if(callback===null&&link)await options.storage.removeItem(ownerKey);return null;}catch(error){if(link)await options.storage.removeItem(ownerKey);throw error;}
    },
    async callback(url:string):Promise<CallbackResult>{const code=assertCallbackUrl(url,options.redirect());if(completed?.code===code)return completed.promise;const promise=(async()=>{const a=auth(),owner=await options.storage.getItem(ownerKey);const {data,error}=await a.exchangeCodeForSession(code);check(error,'ลิงก์หมดอายุหรือเปิดจากคนละเครื่อง กรุณาขอลิงก์ใหม่');if(!data.session)throw new Error('ยืนยันการเข้าสู่ระบบไม่สำเร็จ');if(owner&&data.session.user.id!==owner){await a.signOut({scope:'local'});await options.storage.removeItem(ownerKey);throw new Error('การเชื่อมบัญชีไม่ตรงกับบัญชีเดิม กรุณาเข้าสู่ระบบใหม่');}await options.storage.removeItem(ownerKey);return {recovery:(data as typeof data&{redirectType?:string|null}).redirectType==='recovery',linked:!!owner};})();completed={code,promise};return promise;},
    async user(){const {data,error}=await auth().getUser();check(error);return data.user;}
  };return service;
}
