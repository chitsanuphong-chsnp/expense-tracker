import React,{useState} from 'react';
import {Image,Modal,Pressable,ScrollView,View} from 'react-native';
import {Coffee,Delete,Fuel,Pencil,Plus,ShoppingBag,ShoppingBasket,Store,TrainFront,UtensilsCrossed,X} from 'lucide-react-native';
import {defaultQuickShops,money,parseMoney,suggestedCategories,type QuickShop} from '@expense/core';
import {useData,newId} from './state';
import {useSuccess} from './success';
import {T,C,s,Button,ActionRow,Field} from './ui';
import {tone,toneText} from './theme';
import {MotionPressable,useMotion} from './motion';
import {AccountIcon} from './bank-icon';

// Shop icons: the 7-Eleven logo (assets/shops/7eleven-icon.png, cut from 7eleven.png) and a few common kinds.
const icons:Record<string,{Icon:typeof Store;tint:string;ink:string;label:string}>={
  '7eleven':{Icon:Store,tint:'#e8f5ec',ink:'#0f8a4b',label:'ร้านสะดวกซื้อ'},
  food:{Icon:UtensilsCrossed,tint:'#fdf0e3',ink:'#d2873a',label:'อาหาร'},
  coffee:{Icon:Coffee,tint:'#f3ebfb',ink:'#8a5fc9',label:'กาแฟ'},
  grocery:{Icon:ShoppingBasket,tint:'#e6f4ef',ink:'#2e9d74',label:'ซุปเปอร์'},
  shopping:{Icon:ShoppingBag,tint:'#fbe9f1',ink:'#c2577f',label:'ช้อปปิ้ง'},
  transport:{Icon:TrainFront,tint:'#e8eefc',ink:'#4f74d6',label:'เดินทาง'},
  fuel:{Icon:Fuel,tint:'#fdeee8',ink:'#c96a45',label:'น้ำมัน'},
  store:{Icon:Store,tint:'#eef1f6',ink:'#657187',label:'ร้านค้า'},
};
const logos:Record<string,number>={'7eleven':require('../assets/shops/7eleven-icon.png')};
export function ShopIcon({icon,size=52}:{icon:string;size?:number}){
  if(logos[icon])return <Image source={logos[icon]} accessibilityIgnoresInvertColors style={{width:size,height:size,borderRadius:size*0.3}}/>;
  const k=icons[icon]??icons.store;
  return <View style={{width:size,height:size,borderRadius:size*0.3,backgroundColor:tone(k.tint),alignItems:'center',justifyContent:'center'}}><k.Icon size={size*0.46} color={toneText(k.ink)}/></View>;
}

// Home row: one tap on a shop opens the amount pad. "+" adds a shop; the pencil on the pad edits it.
export function QuickShops(){
  const state=useData(),shops=state.data.settings.quick_shops??defaultQuickShops(state.data.accounts,state.data.sources);
  const [open,setOpen]=useState<QuickShop|null>(null),[editing,setEditing]=useState<QuickShop|'new'|null>(null);
  return <View style={{gap:8}}>
    <T style={{fontSize:12,color:C.muted,fontFamily:'NotoThaiBold',paddingHorizontal:2}}>บันทึกด่วน</T>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10,paddingRight:4}}>
      {shops.map(shop=><MotionPressable key={shop.id} accessibilityRole="button" accessibilityLabel={`บันทึกด่วน ${shop.name}`} onPress={()=>setOpen(shop)} style={{width:76,alignItems:'center',gap:6,paddingVertical:10,borderRadius:18,backgroundColor:tone('#ffffff'),borderWidth:1,borderColor:C.border}}><ShopIcon icon={shop.icon} size={44}/><T style={{fontSize:11,color:C.ink}} numberOfLines={1}>{shop.name}</T></MotionPressable>)}
      <MotionPressable accessibilityRole="button" accessibilityLabel="เพิ่มร้านประจำ" onPress={()=>setEditing('new')} style={{width:76,alignItems:'center',justifyContent:'center',gap:6,paddingVertical:10,borderRadius:18,borderWidth:1,borderStyle:'dashed',borderColor:tone('#c9d1e6')}}><View style={{width:44,height:44,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:tone('#eef1fb')}}><Plus size={20} color={C.primary}/></View><T style={{fontSize:11,color:C.primary}}>เพิ่มร้าน</T></MotionPressable>
    </ScrollView>
    {open&&<AmountSheet shop={open} onClose={()=>setOpen(null)} onEdit={()=>{setEditing(open);setOpen(null);}}/>}
    {editing&&<ShopEditor shop={editing==='new'?null:editing} shops={shops} onClose={()=>setEditing(null)}/>}
  </View>;
}

// Chips that can be turned on and off (accounts allowed for a shop).
function Toggle({on,label,icon,onPress}:{on:boolean;label:string;icon?:React.ReactNode;onPress:()=>void}){
  return <MotionPressable accessibilityRole="button" accessibilityState={{selected:on}} onPress={onPress} style={{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,minHeight:40,borderRadius:12,borderWidth:1,borderColor:on?tone('#bbc5ff'):C.border,backgroundColor:on?tone('#e9edff'):tone('#f5f7fb')}}>{icon}<T style={{fontSize:12,color:on?C.primary:C.muted,fontFamily:on?'NotoThaiBold':'NotoThai'}}>{label}</T></MotionPressable>;
}
function Sheet({children,onClose}:{children:React.ReactNode;onClose:()=>void}){
  const {reduced}=useMotion();
  return <Modal transparent visible animationType={reduced?'none':'slide'} onRequestClose={onClose}>
    <View style={{flex:1,justifyContent:'flex-end',backgroundColor:tone('#20305055')}}>
      <Pressable accessibilityLabel="ปิด" onPress={onClose} style={{flex:1}}/>
      <View style={{maxHeight:'92%',backgroundColor:tone('#ffffff'),borderTopLeftRadius:26,borderTopRightRadius:26,paddingBottom:18}}>
        <View style={{alignSelf:'center',width:40,height:5,borderRadius:3,backgroundColor:tone('#dfe3ec'),marginTop:8}}/>
        <ScrollView contentContainerStyle={{padding:18,gap:14,maxWidth:520,width:'100%',alignSelf:'center'}} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}

// Categories to pick from: the owner's, then suggested ones not created yet (created when saved).
function useCategoryChoices(){
  const {data}=useData(),names=new Set(data.categories.map(c=>c.name));
  return [...data.categories.map(c=>({id:c.id,name:c.name,color:c.color,suggested:false})),...suggestedCategories.filter(([name])=>!names.has(name)).map(([name,color])=>({id:`new:${name}`,name,color,suggested:true}))];
}
async function ensureCategory(state:ReturnType<typeof useData>,choice:string|null):Promise<string|null>{
  if(!choice||!choice.startsWith('new:'))return choice;
  const [name,color]=suggestedCategories.find(([n])=>n===choice.slice(4))!;
  const existing=state.data.categories.find(c=>c.name===name);if(existing)return existing.id;
  if(state.demo){const id=newId();state.updateLocal(d=>({...d,categories:[...d.categories,{id,name,color}]}));return id;}
  const r=await state.call('/categories','POST',{name,color});await state.refresh();return r.id as string;
}

function AmountSheet({shop,onClose,onEdit}:{shop:QuickShop;onClose:()=>void;onEdit:()=>void}){
  const state=useData(),success=useSuccess(),choices=useCategoryChoices();
  const allowed=shop.account_ids.map(id=>state.data.accounts.find(a=>a.id===id)).filter(Boolean) as typeof state.data.accounts;
  const accounts=allowed.length?allowed:state.data.accounts;
  const [digits,setDigits]=useState(''),[account,setAccount]=useState(accounts[0]?.id??''),[category,setCategory]=useState<string|null>(shop.category_id),[showCategory,setShowCategory]=useState(!!shop.category_id),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const amount=parseMoney(digits||'0');
  // Keypad: up to 7 baht digits and 2 satang digits.
  function press(key:string){setError('');setDigits(v=>{
    if(key==='del')return v.slice(0,-1);
    if(key==='.')return v.includes('.')?v:(v||'0')+'.';
    const [baht,satang]=v.split('.');
    if(satang!==undefined)return satang.length>=2?v:v+key;
    if(baht.length>=7)return v;
    return baht==='0'?key:v+key;
  });}
  async function save(){
    if(!amount||!account||busy)return;setBusy(true);
    try{
      const category_id=await ensureCategory(state,category);
      await state.save(newId(),{kind:'expense',amount_satang:amount,account_id:account,to_account_id:null,category_id,occurred_at:new Date().toISOString(),note:'',counterparty:shop.name});
      onClose();success(`บันทึก ${shop.name} ${money(amount)}`);
    }catch(e){setError(e instanceof Error?e.message:'บันทึกไม่สำเร็จ');}finally{setBusy(false);}
  }
  const display=digits?`฿${Number(digits.split('.')[0]||0).toLocaleString('en-US')}${digits.includes('.')?'.'+(digits.split('.')[1]??''):''}`:'฿0';
  return <Sheet onClose={onClose}>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}><ShopIcon icon={shop.icon} size={46}/><View style={{flex:1}}><T style={s.bold}>{shop.name}</T><T style={{fontSize:11,color:C.muted}}>บันทึกเวลานี้ · ใช้ไป</T></View>
      <MotionPressable accessibilityRole="button" accessibilityLabel={`แก้ไข ${shop.name}`} onPress={onEdit} style={{width:40,height:40,alignItems:'center',justifyContent:'center'}}><Pencil size={17} color={C.muted}/></MotionPressable>
      <MotionPressable accessibilityRole="button" accessibilityLabel="ปิด" onPress={onClose} style={{width:40,height:40,alignItems:'center',justifyContent:'center'}}><X size={19} color={C.muted}/></MotionPressable></View>
    <T accessibilityLiveRegion="polite" style={{fontFamily:'NotoLatinBold',fontSize:44,lineHeight:56,textAlign:'center',color:digits?C.ink:toneText('#b4bccc')}}>{display}</T>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'center'}}>{accounts.map(a=><Toggle key={a.id} on={account===a.id} label={a.name} icon={<AccountIcon account={a} sources={state.data.sources}/>} onPress={()=>setAccount(a.id)}/>)}</View>
    {showCategory?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}><Toggle on={!category} label="ไม่ระบุหมวด" onPress={()=>setCategory(null)}/>{choices.map(c=><Toggle key={c.id} on={category===c.id} label={c.suggested?`+ ${c.name}`:c.name} onPress={()=>setCategory(c.id)}/>)}</ScrollView>
      :<MotionPressable accessibilityRole="button" onPress={()=>setShowCategory(true)} style={{alignSelf:'center',paddingVertical:4}}><T style={{fontSize:13,color:C.primary}}>+ เลือกหมวด (ไม่บังคับ)</T></MotionPressable>}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{['1','2','3','4','5','6','7','8','9','.','0','del'].map(key=><MotionPressable key={key} accessibilityRole="button" accessibilityLabel={key==='del'?'ลบตัวเลข':key==='.'?'จุดทศนิยม':key} onPress={()=>press(key)} style={{width:'31.5%',flexGrow:1,height:56,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:tone(key==='del'?'#f1f3f8':'#f5f7fb')}}>{key==='del'?<Delete size={22} color={C.ink}/>:<T style={{fontFamily:'NotoLatinBold',fontSize:24,color:C.ink}}>{key}</T>}</MotionPressable>)}</View>
    {!!error&&<T accessibilityRole="alert" style={{color:C.red}}>{error}</T>}
    <Button loading={busy} disabled={!amount||!account} onPress={()=>void save()}>{amount?`บันทึก ${money(amount)}`:'ใส่ยอด'}</Button>
  </Sheet>;
}

function ShopEditor({shop,shops,onClose}:{shop:QuickShop|null;shops:QuickShop[];onClose:()=>void}){
  const state=useData(),success=useSuccess(),choices=useCategoryChoices();
  const [name,setName]=useState(shop?.name??''),[icon,setIcon]=useState(shop?.icon??'store'),[accounts,setAccounts]=useState<string[]>(shop?.account_ids??[]),[category,setCategory]=useState<string|null>(shop?.category_id??null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function persist(next:QuickShop[],done:string){
    setBusy(true);setError('');
    try{
      if(state.demo)state.updateLocal(d=>({...d,settings:{...d.settings,quick_shops:next}}));
      else{await state.call('/settings','PATCH',{quick_shops:next});await state.refresh();}
      onClose();success(done);
    }catch(e){setError(e instanceof Error?e.message:'บันทึกไม่สำเร็จ');}finally{setBusy(false);}
  }
  async function save(){
    if(!name.trim()){setError('กรอกชื่อร้าน');return;}
    const category_id=await ensureCategory(state,category).catch(()=>null);
    const item:QuickShop={id:shop?.id??newId(),name:name.trim(),icon,account_ids:accounts,category_id};
    await persist(shop?shops.map(x=>x.id===shop.id?item:x):[...shops,item].slice(0,12),shop?'บันทึกร้านแล้ว':'เพิ่มร้านแล้ว');
  }
  const toggle=(id:string)=>setAccounts(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
  return <Sheet onClose={onClose}>
    <View style={s.between}><T style={s.bold}>{shop?'แก้ไขร้านประจำ':'เพิ่มร้านประจำ'}</T><MotionPressable accessibilityRole="button" accessibilityLabel="ปิด" onPress={onClose} style={{width:40,height:40,alignItems:'center',justifyContent:'center'}}><X size={19} color={C.muted}/></MotionPressable></View>
    <Field label="ชื่อร้าน" value={name} onChangeText={setName} placeholder="เช่น 7-Eleven, ร้านข้าวมันไก่"/>
    <T style={s.label}>ไอคอน</T>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10}}>{Object.entries(icons).map(([key,k])=><MotionPressable key={key} accessibilityRole="button" accessibilityLabel={k.label} accessibilityState={{selected:icon===key}} onPress={()=>setIcon(key)} style={{padding:4,borderRadius:16,borderWidth:2,borderColor:icon===key?C.primary:'transparent'}}><ShopIcon icon={key} size={42}/></MotionPressable>)}</ScrollView>
    <T style={s.label}>จ่ายด้วยบัญชี (อันแรกที่เลือก = ค่าเริ่มต้น · ไม่เลือกเลย = ทุกบัญชี)</T>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{state.data.accounts.map(a=><Toggle key={a.id} on={accounts.includes(a.id)} label={accounts.includes(a.id)?`${accounts.indexOf(a.id)+1}. ${a.name}`:a.name} icon={<AccountIcon account={a} sources={state.data.sources}/>} onPress={()=>toggle(a.id)}/>)}</View>
    <T style={s.label}>หมวดเริ่มต้น (ไม่บังคับ)</T>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}><Toggle on={!category} label="ไม่ระบุ" onPress={()=>setCategory(null)}/>{choices.map(c=><Toggle key={c.id} on={category===c.id} label={c.suggested?`+ ${c.name}`:c.name} onPress={()=>setCategory(c.id)}/>)}</ScrollView>
    {!!error&&<T accessibilityRole="alert" style={{color:C.red}}>{error}</T>}
    <ActionRow>{shop?<Button secondary disabled={busy} onPress={()=>void persist(shops.filter(x=>x.id!==shop.id),'ลบร้านแล้ว')}>ลบร้าน</Button>:<Button secondary disabled={busy} onPress={onClose}>ยกเลิก</Button>}<Button loading={busy} onPress={()=>void save()}>บันทึก</Button></ActionRow>
  </Sheet>;
}
