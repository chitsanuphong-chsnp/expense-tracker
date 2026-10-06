import React,{useEffect,useState} from 'react';
import {View} from 'react-native';
import {useRouter} from 'expo-router';
import type {User} from '@supabase/supabase-js';
import {Mail,Smartphone,UserRound,KeyRound} from 'lucide-react-native';
import {T,Card,C,s,Button,ActionRow,Field,Badge} from './ui';
import {useData} from './state';
import {authService,authStorage,googleEnabled,smsEnabled} from './auth-client';
import {Companion} from './companion';

export function AccountScreen(){
  const state=useData(),router=useRouter(),[user,setUser]=useState<User|null>(null),[phone,setPhone]=useState(''),[target,setTarget]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(!state.demo),[error,setError]=useState(''),[message,setMessage]=useState(''),[resendAt,setResendAt]=useState(0),[now,setNow]=useState(Date.now());
  const cooldown=Math.max(0,Math.ceil((resendAt-now)/1000));
  async function load(){setUser(await authService.user());}
  useEffect(()=>{let live=true;if(!state.demo)authService.user().then(v=>{if(live)setUser(v);}).catch(()=>{if(live)setError('โหลดข้อมูลบัญชีไม่สำเร็จ');}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[state.session?.user.id,state.demo]);
  useEffect(()=>{if(!resendAt)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[resendAt]);
  async function run(fn:()=>Promise<void>,allowDemo=false){if(busy)return;setBusy(true);setError('');setMessage('');try{if(state.demo&&!allowDemo)throw new Error('โหมดตัวอย่างยังไม่เชื่อมบัญชีจริง');await fn();}catch(e){setError(e instanceof Error?e.message:'ดำเนินการไม่สำเร็จ');}finally{setBusy(false);}}
  async function sendPhone(){const value=await authService.linkPhone(target||phone);setTarget(value);setCode('');setResendAt(Date.now()+60000);setNow(Date.now());setMessage('ส่งรหัสไปยังเบอร์แล้ว ยืนยันเพื่อเชื่อมกับบัญชีนี้');}
  const hasGoogle=user?.identities?.some(i=>i.provider==='google')??false;
  return <View style={s.section}><Companion title="บัญชีเดียว ทุกช่องทาง" text="Google ที่ยืนยันอีเมลตรงกัน และเบอร์ที่คุณยืนยันเชื่อมไว้ ใช้สมุดบันทึกเดียวกัน"/>
    {state.demo&&<Card><T style={s.muted}>นี่คือหน้าตัวอย่างบัญชี เข้าสู่ระบบจริงก่อนเชื่อมช่องทาง</T><Button secondary onPress={()=>router.push('/login')}>ดูหน้าเข้าสู่ระบบ</Button></Card>}
    {!!error&&<Card><T accessibilityRole="alert" style={{color:C.red}}>{error}</T></Card>}{!!message&&<Card><T accessibilityRole="alert" style={{color:C.green}}>{message}</T></Card>}
    <Card style={{gap:16}}><View style={s.between}><View style={s.row}><UserRound color={C.primary}/><T style={s.bold}>ข้อมูลการเข้าสู่ระบบ</T></View><Badge text={loading?'กำลังโหลด':state.demo?'ตัวอย่าง':'บัญชีส่วนตัว'}/></View>
      <View style={{gap:5}}><T style={s.label}>อีเมล</T><T selectable>{user?.email??(state.demo?'you@example.com':'—')}</T><T style={s.muted}>{user?.email_confirmed_at?'ยืนยันอีเมลแล้ว':'อีเมลต้องยืนยันก่อนใช้งานจริง'}</T></View>
      <View style={{gap:5}}><T style={s.label}>เบอร์โทรที่เชื่อม</T><T selectable>{user?.phone&&user.phone_confirmed_at?user.phone:'ยังไม่ได้เชื่อม'}</T></View>
      <T style={s.muted}>OTP อีเมลและรหัสผ่านเข้าอีเมลเดียวกันได้ ไม่สร้างสมุดบันทึกเพิ่ม</T>
    </Card>
    <Card style={{gap:14}}><View style={s.between}><T style={s.bold}>Google</T><Badge text={hasGoogle?'เชื่อมแล้ว':'ยังไม่เชื่อม'} color={hasGoogle?C.green:C.muted}/></View><T style={s.muted}>อีเมล Google ที่ยืนยันตรงกับบัญชีนี้จะเชื่อมอัตโนมัติ หรือกดเชื่อมจากบัญชีที่เข้าสู่ระบบอยู่</T>
      <Button secondary loading={busy} disabled={loading||!googleEnabled||hasGoogle||state.demo} onPress={()=>void run(async()=>{const result=await authService.google(await authStorage.getRemember(),true);if(result){await load();setMessage('เชื่อม Google กับบัญชีเดิมแล้ว');}})}>เชื่อม Google กับบัญชีนี้</Button>{!googleEnabled&&<T style={s.muted}>พร้อมเปิดหลังตั้งค่า Google Login</T>}
    </Card>
    <Card style={{gap:14}}><View style={s.row}><Smartphone size={20} color={C.primary}/><T style={s.bold}>เชื่อมเบอร์โทร</T></View>
      {!smsEnabled?<><T style={s.muted}>เตรียมระบบไว้แล้ว แต่ยังปิดส่ง SMS ใช้ OTP อีเมลฟรีก่อน</T><Badge text="ยังไม่เปิด SMS" color='#a8864b'/></>:<>
        {target?<><T>ยืนยันเบอร์ {target}</T><Field label="รหัสยืนยันเบอร์ 6 หลัก" value={code} onChangeText={v=>setCode(v.replace(/\D/g,'').slice(0,6))} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode"/><ActionRow><Button secondary disabled={busy} onPress={()=>{setTarget('');setCode('');}}>ยกเลิก</Button><Button loading={busy} onPress={()=>void run(async()=>{await authService.verifyPhone(target,code);await load();setTarget('');setCode('');setMessage('ยืนยันเบอร์และเชื่อมบัญชีเดิมแล้ว');})}>ยืนยันและเชื่อม</Button></ActionRow><Button secondary disabled={busy||cooldown>0} onPress={()=>void run(sendPhone)}>{cooldown>0?`ส่งใหม่ใน ${cooldown} วินาที`:'ส่งรหัสใหม่'}</Button></>:<><Field label="เบอร์โทรที่จะเชื่อม" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="0812345678"/><Button secondary loading={busy} disabled={loading||state.demo} onPress={()=>void run(sendPhone)}>ส่ง OTP เพื่อเชื่อมเบอร์</Button></>}
      </>}
    </Card>
    <Card style={{gap:14}}><View style={s.row}><KeyRound size={20} color={C.primary}/><T style={s.bold}>ตั้งหรือเปลี่ยนรหัสผ่าน</T></View><T style={s.muted}>รับลิงก์ยืนยันตัวตนทางอีเมล แล้วเปิดจากเครื่องนี้</T><Button secondary loading={busy} disabled={loading||!user?.email_confirmed_at||cooldown>0||state.demo} onPress={()=>void run(async()=>{await authService.forgot(user!.email!);setResendAt(Date.now()+60000);setNow(Date.now());setMessage('ถ้ามีบัญชีนี้ในระบบ คุณจะได้รับลิงก์ตั้งรหัสผ่านใหม่ทางอีเมล');})}>{cooldown>0?`รอ ${cooldown} วินาที`:'ส่งลิงก์ทางอีเมล'}</Button></Card>
    <ActionRow><Button secondary onPress={()=>router.push('/settings')}>กลับตั้งค่า</Button><Button secondary loading={busy} onPress={()=>void run(async()=>{await state.signOut();router.replace('/login');},true)}>ออกจากระบบ</Button></ActionRow>
  </View>;
}
