import React,{useEffect,useState} from 'react';
import {View,ScrollView,Pressable,TextInput,Platform,useWindowDimensions,KeyboardAvoidingView,ImageBackground} from 'react-native';
import * as Linking from 'expo-linking';
import {useRouter,useLocalSearchParams} from 'expo-router';
import {Wallet,Eye,EyeOff,Check,ShieldCheck} from 'lucide-react-native';
import {T,C,s,Card,Button,ActionRow,Field,Choices} from './ui';
import {Loading} from './motion';
import {Mascot} from './companion';
import {useData} from './state';
import {authService,authStorage,authRedirect,googleEnabled,smsEnabled} from './auth-client';
import {safeReturnPath} from './auth-policy';

const returnKey='expense.auth.return';
function AuthShell({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){
  const {width}=useWindowDimensions(),desktop=width>=1000;
  const hero=<View style={{width:desktop?undefined:'100%',flex:desktop?1:undefined,minWidth:0,padding:desktop?28:25,paddingTop:desktop?20:34,paddingBottom:desktop?30:38,gap:desktop?38:23}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:11}}><View style={{padding:10,backgroundColor:'#ffffff14',borderWidth:1,borderColor:'#ffffff28',borderRadius:14}}><Wallet color='#b5c4ff' size={23}/></View><T style={{fontFamily:'NotoLatinBold',fontSize:desktop?22:19,color:'white'}}>Expense Tracker</T></View>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{flex:1,minWidth:0,gap:10}}><T style={{color:'white',fontFamily:'NotoThaiBold',fontSize:desktop?38:width<350?25:29,lineHeight:desktop?54:41}}>{title}</T><T style={{color:'#b3b9cc',fontSize:desktop?15:12,lineHeight:desktop?27:21}}>{subtitle}</T></View><Mascot size={desktop?116:80} pose="idle" auto={false} interactive={false}/></View>
    {desktop&&<View style={{borderLeftWidth:2,borderColor:'#8799e3',paddingLeft:17,gap:8}}><T style={{color:'#e3e7ff',fontSize:15}}>ทุกการใช้จ่าย มีที่เก็บ</T><T style={{color:'#979fb8',fontSize:12,lineHeight:23}}>รวมบัญชี สลิป และเงินสด{ '\n' }ให้คุณเห็นภาพเงินของตัวเองได้ชัดขึ้น</T></View>}
  </View>;
  return <KeyboardAvoidingView style={{flex:1,backgroundColor:'#0d1120'}} behavior={Platform.OS==='ios'?'padding':undefined}><ImageBackground source={require('../assets/auth/login-budget-desk-v2.jpg')} resizeMode="cover" style={{flex:1,overflow:'hidden'}} imageStyle={desktop?{width:'100%',height:'100%',transform:[{scaleX:-1}]}:{width:'100%',height:300}}><View style={{position:'absolute',top:0,right:0,bottom:0,left:0,backgroundColor:'#070b1866'}} pointerEvents="none"/>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow:1,justifyContent:desktop?'center':'flex-start',alignItems:'center',padding:desktop?36:0}}>
      <View style={{width:'100%',maxWidth:desktop?1100:560,flex:desktop?undefined:1,flexDirection:desktop?'row':'column',alignItems:desktop?'center':'stretch',justifyContent:desktop?'space-between':undefined,gap:desktop?58:0}}>{hero}
      <View style={{backgroundColor:'#fff',width:desktop?460:'100%',maxWidth:desktop?460:undefined,padding:desktop?32:width<350?22:26,paddingTop:desktop?30:28,paddingBottom:desktop?30:32,borderRadius:desktop?32:0,borderTopLeftRadius:desktop?32:38,borderTopRightRadius:desktop?32:38,gap:desktop?17:16,flex:desktop?undefined:1,boxShadow:'0 16px 64px rgba(0,0,0,.18)'}}>
        {children}<View style={{flexDirection:'row',justifyContent:'center',alignItems:'center',gap:6,paddingTop:4}}><ShieldCheck size={13} color='#9298ac'/><T style={{fontSize:10,color:'#9298ac'}}>พื้นที่ส่วนตัวสำหรับสมุดบันทึกเงินของคุณ</T></View>
      </View></View>
    </ScrollView></ImageBackground></KeyboardAvoidingView>;
}
export function PasswordField({label,value,onChangeText,fresh=false,onSubmit,disabled=false}:{label:string;value:string;onChangeText:(value:string)=>void;fresh?:boolean;onSubmit?:()=>void;disabled?:boolean}){
  const [visible,setVisible]=useState(false);
  return <View><T style={s.label}>{label}</T><View style={{position:'relative'}}><TextInput accessibilityLabel={label} style={[s.input,{paddingRight:53}]} value={value} onChangeText={onChangeText} editable={!disabled} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete={fresh?'new-password':'current-password'} textContentType={fresh?'newPassword':'password'} onSubmitEditing={onSubmit} returnKeyType="go"/>
    <Pressable accessibilityRole="button" accessibilityLabel={visible?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'} accessibilityState={{selected:visible}} onPress={()=>setVisible(v=>!v)} style={{position:'absolute',right:3,top:2,width:45,height:44,alignItems:'center',justifyContent:'center'}}>{visible?<EyeOff size={19} color={C.muted}/>:<Eye size={19} color={C.muted}/>}</Pressable></View></View>;
}
function Form({children,onSubmit}:{children:React.ReactNode;onSubmit:()=>void}){return Platform.OS==='web'?React.createElement('form',{onSubmit:(event:any)=>{event.preventDefault();onSubmit();},style:{display:'flex',flexDirection:'column',gap:16}},children):<View style={{gap:16}}>{children}</View>;}
function Message({text,success=false}:{text:string;success?:boolean}){return text?<View accessibilityRole="alert" style={{backgroundColor:success?'#edf8f3':'#fff0f3',padding:13,borderRadius:12}}><T style={{fontSize:12,color:success?C.green:C.red}}>{text}</T></View>:null;}
function Remember({value,onChange,disabled}:{value:boolean;onChange:(v:boolean)=>void;disabled:boolean}){return <Pressable accessibilityRole="checkbox" accessibilityLabel="จดจำการเข้าสู่ระบบ" aria-checked={value} accessibilityState={{checked:value,disabled}} disabled={disabled} onPress={()=>onChange(!value)} style={{flexDirection:'row',alignItems:'center',gap:9,minHeight:44}}><View style={{width:21,height:21,borderRadius:6,borderWidth:1,borderColor:value?C.primary:'#bcc5d7',backgroundColor:value?C.primary:'white',alignItems:'center',justifyContent:'center'}}>{value&&<Check size={15} color="white"/>}</View><T style={{fontSize:12}}>จดจำการเข้าสู่ระบบ</T></Pressable>;}
export function LoginScreen(){
  const state=useData(),router=useRouter(),params=useLocalSearchParams(),next=safeReturnPath(params.next);
  const [mode,setMode]=useState('password'),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[password,setPassword]=useState(''),[remember,setRemember]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState(''),[target,setTarget]=useState(''),[code,setCode]=useState(''),[resendAt,setResendAt]=useState(0),[now,setNow]=useState(Date.now());
  const cooldown=Math.max(0,Math.ceil((resendAt-now)/1000));
  useEffect(()=>{void authStorage.getRemember().then(setRemember).catch(()=>{});},[]);
  useEffect(()=>{if(!resendAt)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[resendAt]);
  useEffect(()=>{if(state.session&&!state.recovery)router.replace(next as any);},[state.session?.user.id,state.recovery,next]);
  function switchMode(value:string){if(busy)return;setMode(value);setTarget('');setCode('');setError('');setInfo('');setPassword('');}
  async function run(fn:()=>Promise<void>){if(busy)return;setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'ดำเนินการไม่สำเร็จ กรุณาลองใหม่');}finally{setBusy(false);}}
  async function send(){if(Date.now()<resendAt)throw new Error('กรุณารอก่อนขอรหัสใหม่');const value=await authService.requestOtp(mode==='phone'?'phone':'email',target||(mode==='phone'?phone:email),remember);setTarget(value);setCode('');setResendAt(Date.now()+60000);setNow(Date.now());setInfo('ส่งรหัสแล้ว ตรวจสอบกล่องข้อความและจดหมายขยะ');}
  function submit(){if(busy||(mode==='forgot'&&Date.now()<resendAt))return;void run(async()=>{if(mode==='forgot'){await authService.forgot(email);setInfo('ถ้ามีบัญชีนี้ในระบบ คุณจะได้รับลิงก์ตั้งรหัสผ่านใหม่ เปิดจากเครื่องและเบราว์เซอร์นี้');setResendAt(Date.now()+60000);setNow(Date.now());}
    else if(mode==='password'){await authService.password(email,password,remember);setPassword('');router.replace(next as any);}
    else if(target){await authService.verifyOtp(mode==='phone'?'phone':'email',target,code);router.replace(next as any);}else await send();});}
  const forgot=mode==='forgot',otp=mode!=='password'&&!forgot;
  return <AuthShell title={forgot?'ลืมรหัสผ่าน':target?'ยืนยันตัวตน':'ยินดีต้อนรับกลับ'} subtitle={forgot?'รับลิงก์ตั้งรหัสผ่านใหม่ทางอีเมล':target?'อีกนิดเดียวก็พร้อมบันทึกแล้ว':'เก็บทุกการใช้จ่ายไว้ในที่เดียว'}>
    {!state.configured&&<View style={{padding:12,borderRadius:12,backgroundColor:'#f3f5ff'}}><T style={{fontSize:12,color:C.muted}}>ยังไม่ได้เชื่อมระบบล็อกอิน ลองข้อมูลตัวอย่างได้ด้านล่าง</T></View>}
    {!forgot&&!target&&<Choices segmented value={mode} onChange={switchMode} items={[{id:'password',name:'รหัสผ่าน'},{id:'email',name:'OTP อีเมล'},{id:'phone',name:'เบอร์โทร'}]}/>}
    <Form onSubmit={submit}>
      {target?<><View style={{gap:6}}><T style={s.bold}>ส่งรหัสไปที่</T><T selectable style={{color:C.primary,fontSize:13}}>{target}</T></View><Field label="รหัส OTP 6 หลัก" value={code} onChangeText={v=>setCode(v.replace(/\D/g,'').slice(0,6))} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" onSubmitEditing={submit} style={{textAlign:'center',letterSpacing:8,fontFamily:'NotoLatinBold',fontSize:23}}/></>:
        mode==='phone'?<><Field label="เบอร์โทรศัพท์" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="0812345678" editable={!busy}/>{!smsEnabled&&<View style={{backgroundColor:'#fff8eb',padding:13,borderRadius:12,gap:6}}><T style={{fontSize:12,color:'#92733c'}}>เตรียมเบอร์โทรไว้แล้ว ยังไม่เปิดส่ง SMS</T><T style={{fontSize:12,color:C.muted}}>ใช้อีเมลรับ OTP ฟรีก่อนได้</T><Button secondary onPress={()=>switchMode('email')}>ใช้ OTP อีเมล</Button></View>}</>:
        <Field label="อีเมล" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" placeholder="you@example.com" editable={!busy} onSubmitEditing={mode==='password'?undefined:submit}/>}
      {mode==='password'&&<PasswordField label="รหัสผ่าน" value={password} onChangeText={setPassword} onSubmit={submit} disabled={busy}/>}
      {!forgot&&!target&&<View style={[s.between,{gap:4}]}><Remember value={remember} onChange={setRemember} disabled={busy}/>{mode==='password'&&<Pressable accessibilityRole="button" onPress={()=>switchMode('forgot')} style={{minHeight:44,justifyContent:'center'}}><T style={{fontSize:12,color:C.primary}}>ลืมรหัสผ่าน?</T></Pressable>}</View>}
      <Message text={error}/><Message text={info} success/>
      {forgot||target?<ActionRow><Button secondary disabled={busy} onPress={()=>switchMode(target?mode:'password')}>กลับ</Button><Button loading={busy} disabled={!state.configured||(forgot&&cooldown>0)} onPress={submit}>{forgot?cooldown>0?`รอ ${cooldown} วินาที`:'ส่งลิงก์':'ยืนยันรหัส'}</Button></ActionRow>:<Button loading={busy} disabled={!state.configured||(mode==='phone'&&!smsEnabled)} onPress={submit}>{otp?'ส่งรหัส OTP':'เข้าสู่ระบบ'}</Button>}
      {target&&<Pressable disabled={busy||cooldown>0} accessibilityRole="button" onPress={()=>void run(send)} style={{minHeight:44,alignItems:'center',justifyContent:'center'}}><T style={{fontSize:12,color:cooldown>0?C.muted:C.primary}}>{cooldown>0?`ส่งรหัสใหม่ได้ใน ${cooldown} วินาที`:'ส่งรหัสใหม่'}</T></Pressable>}
    </Form>
    {!forgot&&!target&&<><View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{height:1,backgroundColor:C.border,flex:1}}/><T style={s.muted}>หรือ</T><View style={{height:1,backgroundColor:C.border,flex:1}}/></View>
      <Button secondary loading={busy} disabled={!state.configured||!googleEnabled} onPress={()=>void run(async()=>{await authStorage.setItem(returnKey,next);const result=await authService.google(remember);if(result)router.replace(result.recovery?'/auth/reset-password':next as any);})}><T style={{fontFamily:'NotoLatinBold',color:C.primary}}>G</T>  เข้าสู่ระบบด้วย Google</Button>
      {!googleEnabled&&state.configured&&<T style={{fontSize:11,color:C.muted,textAlign:'center'}}>Google จะพร้อมใช้เมื่อเชื่อมระบบแล้ว</T>}
      <Button secondary disabled={busy} onPress={()=>void run(async()=>{await state.startDemo();router.replace('/');})}>ลองข้อมูลตัวอย่าง</Button><T style={{fontSize:11,color:C.muted,textAlign:'center'}}>บัญชีส่วนตัว · รหัสผ่านจำผ่านตัวจัดการรหัสผ่านของเครื่อง</T></>}
  </AuthShell>;
}
export function CallbackScreen(){const state=useData(),router=useRouter(),params=useLocalSearchParams(),[error,setError]=useState('');
  useEffect(()=>{let live=true;async function complete(url:string|null){if(!url){if(live)setError('ลิงก์ไม่ครบ กรุณาเข้าสู่ระบบใหม่');return;}try{
    const result=await authService.callback(url);
    if(Platform.OS==='web'&&typeof window!=='undefined')window.history.replaceState(null,'','/auth/callback');
    const next=safeReturnPath(await authStorage.getItem(returnKey));await authStorage.removeItem(returnKey);
    if(live)router.replace(result.recovery?'/auth/reset-password':result.linked?'/account':next as any);
  }catch(e){if(Platform.OS==='web'&&typeof window!=='undefined')window.history.replaceState(null,'','/auth/callback');if(live)setError(e instanceof Error?e.message:'ยืนยันตัวตนไม่สำเร็จ');}}
    // Router params also cover a warm native app; getInitialURL alone returns
    // the app's original launch URL rather than a newly received deep link.
    const query=new URLSearchParams();for(const key of ['code','error'])if(typeof params[key]==='string')query.set(key,params[key] as string);
    const url=Platform.OS==='web'&&typeof window!=='undefined'?Promise.resolve(window.location.href):query.toString()?Promise.resolve(`${authRedirect()}?${query}`):Linking.getInitialURL();void url.then(complete).catch(()=>{if(live)setError('เปิดลิงก์ไม่สำเร็จ');});return()=>{live=false;};},[params.code,params.error]);
  return <AuthShell title="กำลังยืนยันตัวตน" subtitle="เชื่อมคุณกลับสู่สมุดบันทึก">{error?<><Message text={error}/><Button onPress={()=>{state.finishRecovery();router.replace(state.session?'/account':'/login');}}>กลับ{state.session?'ไปบัญชี':'ไปเข้าสู่ระบบ'}</Button></>:<Loading label="กำลังตรวจสอบลิงก์"/>}</AuthShell>;
}
export function ResetPasswordScreen(){const state=useData(),router=useRouter(),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false),[updated,setUpdated]=useState(false);
  async function save(){if(busy)return;setBusy(true);setError('');try{if(!updated){await authService.updatePassword(password,confirm);setUpdated(true);setPassword('');setConfirm('');}await authService.revokeOtherSessions();await state.signOut();setDone(true);}catch(e){setError(e instanceof Error?e.message:'บันทึกรหัสผ่านไม่สำเร็จ');}finally{setBusy(false);}}
  return <AuthShell title={done?'ตั้งรหัสผ่านแล้ว':'ตั้งรหัสผ่านใหม่'} subtitle="ใช้รหัสผ่านใหม่สำหรับบัญชีเดิม">{done?<><Message text="บันทึกรหัสผ่านแล้ว เข้าสู่ระบบด้วยรหัสใหม่ได้เลย" success/><Button onPress={()=>router.replace('/login')}>เข้าสู่ระบบ</Button></>:!state.session?<><T style={s.muted}>เปิดลิงก์จากอีเมลรีเซ็ตรหัสผ่านบนเครื่องที่ขอลิงก์ก่อน</T><Button onPress={()=>router.replace('/login')}>กลับไปเข้าสู่ระบบ</Button></>:<Form onSubmit={()=>void save()}><PasswordField label="รหัสผ่านใหม่" value={password} onChangeText={setPassword} fresh disabled={busy||updated}/><PasswordField label="ยืนยันรหัสผ่านใหม่" value={confirm} onChangeText={setConfirm} fresh disabled={busy||updated} onSubmit={()=>void save()}/><T style={s.muted}>อย่างน้อย 10 ตัวอักษร</T><Message text={error}/><ActionRow><Button secondary disabled={busy} onPress={()=>void state.signOut().then(()=>router.replace('/login')).catch(()=>setError('ออกจากระบบไม่สำเร็จ'))}>ยกเลิก</Button><Button loading={busy} onPress={()=>void save()}>{updated?'ดำเนินการต่อ':'บันทึกรหัสผ่าน'}</Button></ActionRow></Form>}</AuthShell>;
}
