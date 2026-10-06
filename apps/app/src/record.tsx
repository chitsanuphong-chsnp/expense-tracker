import {QrDetails} from './qr-details';
import React,{useEffect,useRef,useState} from 'react';
import {View,Modal,useWindowDimensions} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useRouter,useLocalSearchParams} from 'expo-router';
import {parseMoney,thaiDate,transactionInput,type Transaction} from '@expense/core';
import {useData,newId} from './state';
import {T,Card,Button,ActionRow,Field,Choices,Badge,C,s} from './ui';
import {useMotion} from './motion';
import {DateField} from './calendar';
import {validDate} from './calendar-data';
import {SlipImage} from './slip-image';
import {ModalCompanion} from './modal-companion';

const names={income:'รายรับ',expense:'รายจ่าย',transfer:'โอนระหว่างบัญชี'};
const timeOf=(date:string|Date)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(date));

export function Record(){
  const params=useLocalSearchParams<{id?:string;slip?:string}>();
  return <RecordForm key={`${params.id??'new'}:${params.slip??'manual'}`}/>;
}
function RecordForm(){
  const {reduced}=useMotion(),state=useData(),router=useRouter(),{width}=useWindowDimensions(),params=useLocalSearchParams<{id?:string;slip?:string}>();
  const old=state.data.transactions.find(t=>t.id===params.id),slip=state.data.slips.find(s=>s.id===params.slip||(!!old&&s.transaction_id===old.id));
  const [kind,setKind]=useState<Transaction['kind']>(old?.kind??'expense'),[amount,setAmount]=useState(old?String(old.amount_satang/100):slip?.ocr_details?.amount_satang!=null?String(slip.ocr_details.amount_satang/100):''),[account,setAccount]=useState(old?.account_id??state.data.accounts[0]?.id??''),[toAccount,setToAccount]=useState(old?.to_account_id??''),[category,setCategory]=useState<string|null>(old?.category_id??null),[date,setDate]=useState(old?thaiDate(old.occurred_at):slip?.ocr_details?.date??thaiDate()),[time,setTime]=useState(old?timeOf(old.occurred_at):slip?.ocr_details?.time??timeOf(new Date())),[note,setNote]=useState(old?.note??''),[counterparty,setCounterparty]=useState(old?.counterparty??slip?.ocr_details?.recipient??''),[remember,setRemember]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[confirm,setConfirm]=useState(false),[remembered,setRemembered]=useState(false);
  const id=useRef(old?.id??newId()),accountTouched=useRef(false);
  // Scope preferences to the signed-in owner; demo preferences never carry into real data.
  const preferenceKey=`expense.last-account.${state.demo?'demo':state.session?.user.id??'guest'}`;
  useEffect(()=>{if(old){id.current=old.id;setKind(old.kind);setAmount(String(old.amount_satang/100));setAccount(old.account_id);setToAccount(old.to_account_id??'');setCategory(old.category_id);setDate(thaiDate(old.occurred_at));setTime(timeOf(old.occurred_at));setNote(old.note);setCounterparty(old.counterparty);}},[old?.id]);
  const sourceAccount=state.data.sources.find(s=>s.source_code===slip?.source_code)?.account_id;
  useEffect(()=>{let alive=true;if(old)return;
    setRemembered(false);
    if(sourceAccount&&state.data.accounts.some(a=>a.id===sourceAccount)){if(!accountTouched.current)setAccount(sourceAccount);return;}
    if(slip)return; // Slip source takes precedence; never infer an unrelated last-used bank.
    AsyncStorage.getItem(preferenceKey).then(last=>{if(alive&&!accountTouched.current&&last&&state.data.accounts.some(a=>a.id===last)){setAccount(last);setRemembered(true);}}).catch(()=>{});
    return()=>{alive=false;};
  },[preferenceKey,old?.id,slip?.id,sourceAccount,state.data.accounts]);
  useEffect(()=>{if(!category){const rule=state.data.rules.find(r=>r.counterparty===counterparty.trim());if(rule)setCategory(rule.category_id);}},[counterparty]);
  async function submit(){
    setMessage('');const n=parseMoney(amount);
    if(!n){setMessage('กรอกจำนวนเงินให้ถูกต้อง สูงสุด 2 ตำแหน่งทศนิยม');return;}
    if(!validDate(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)){setMessage('เลือกวันที่และกรอกเวลาให้ถูกต้อง');return;}
    const dt=new Date(`${date}T${time}:00+07:00`);
    const input=transactionInput.safeParse({kind,amount_satang:n,account_id:account,to_account_id:kind==='transfer'?toAccount:null,category_id:kind==='transfer'?null:category,occurred_at:dt.toISOString(),note,counterparty:counterparty.trim()});
    if(!input.success){setMessage('เลือกบัญชีและบัญชีปลายทางให้ถูกต้อง');return;}
    setBusy(true);
    try{
      await state.save(id.current,input.data,params.slip);
      if(!old&&!slip)await AsyncStorage.setItem(preferenceKey,account).catch(()=>{});
      if(remember&&category&&counterparty.trim()){
        if(state.demo)state.updateLocal(d=>({...d,rules:[...d.rules.filter(r=>r.counterparty!==counterparty.trim()),{id:newId(),counterparty:counterparty.trim(),category_id:category}]}));
        else await state.call('/rules','POST',{counterparty:counterparty.trim(),category_id:category});
      }
      router.replace(params.slip?'/slips':'/transactions');
    }catch(e){setMessage(e instanceof Error?e.message:'บันทึกไม่สำเร็จ');}finally{setBusy(false);}
  }
  const split=!!slip&&width>=900;
  return <Card style={{gap:20,maxWidth:slip?1000:760,width:'100%',alignSelf:'center'}}>
    <View style={s.between}><T style={[s.bold,{fontSize:18,flex:1}]}>{old?'แก้ไขรายการ':slip?'เติมข้อมูลสลิป':'บันทึกรายการใหม่'}</T><Badge text={slip?'เชื่อมสลิป':'บันทึกเอง'}/></View>
    <View style={{flexDirection:split?'row':'column',gap:24}}>
      {slip&&<View style={{width:split?'42%':'100%',gap:12}}><SlipImage id={slip.id} height={split?420:250}/><T style={s.muted}>ระบุวันที่ทำรายการจริง วันที่อัปโหลดอาจเป็นคนละวัน</T><QrDetails slip={slip}/>{!!slip.qr_payload&&<T selectable numberOfLines={3} style={{fontSize:10,color:C.muted}}>QR: {slip.qr_payload}</T>}</View>}
      <View style={{flex:1,minWidth:0,gap:18}}>
        <Choices value={kind} onChange={v=>setKind(v as typeof kind)} items={Object.entries(names).map(([id,name])=>({id,name}))}/>
        <Field label="จำนวนเงิน (บาท)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" style={{fontFamily:'NotoLatinBold',fontSize:30,paddingVertical:18}}/>
        <View><View style={s.between}><T style={s.label}>บัญชี{kind==='transfer'?'ต้นทาง':''}</T>{remembered&&<T style={{fontSize:10,color:C.muted}}>เลือกบัญชีล่าสุดให้แล้ว</T>}</View><Choices items={state.data.accounts} value={account} onChange={value=>{accountTouched.current=true;setRemembered(false);setAccount(value);if(value===toAccount)setToAccount('');}}/></View>
        {kind==='transfer'&&<View><T style={s.label}>บัญชีปลายทาง</T><Choices items={state.data.accounts.filter(a=>a.id!==account)} value={toAccount} onChange={setToAccount}/></View>}
        <View style={s.grid}><View style={{flexGrow:1,flexBasis:180}}><DateField label="วันที่ทำรายการ" value={date} onChange={setDate}/></View><View style={{flexGrow:1,flexBasis:120}}><Field label="เวลาไทย (HH:mm)" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" maxLength={5}/></View></View>
        {kind!=='transfer'&&<View><T style={s.label}>หมวดหมู่</T><Choices items={[{id:'none',name:'ยังไม่จัดหมวด'},...state.data.categories]} value={category??'none'} onChange={v=>setCategory(v==='none'?null:v)}/></View>}
        <Field label="ผู้รับ / ผู้โอน / ร้านค้า" value={counterparty} onChangeText={setCounterparty}/><Field label="หมายเหตุ" value={note} onChangeText={setNote} multiline/>
        {!!category&&!!counterparty&&kind!=='transfer'&&<Button secondary onPress={()=>setRemember(!remember)}>{remember?'✓ จำหมวดสำหรับผู้รับนี้':'จำหมวดสำหรับผู้รับนี้ครั้งต่อไป'}</Button>}
        {!!message&&<T accessibilityRole="alert" style={{color:C.red}}>{message}</T>}<ActionRow testID="record-actions">{old&&<Button secondary disabled={busy} onPress={()=>setConfirm(true)}>ลบรายการนี้</Button>}<Button loading={busy} onPress={()=>void submit()}>บันทึกรายการ</Button></ActionRow>
      </View>
    </View>
    <Modal transparent visible={confirm} animationType={reduced?'none':'fade'} onRequestClose={()=>setConfirm(false)}><View style={{flex:1,backgroundColor:'#20305060',justifyContent:'center',padding:25}}><Card style={{maxWidth:430,width:'100%',alignSelf:'center',gap:18}}>{confirm&&<ModalCompanion title="ลบรายการนี้?" pose="thinking"/>}<T>ยอดจะถูกนำออกจากรายงาน สลิปที่เชื่อมจะกลับไปรอกรอกข้อมูล</T><ActionRow testID="modal-actions"><Button secondary onPress={()=>setConfirm(false)}>ยกเลิก</Button><Button onPress={()=>{setConfirm(false);state.remove(old!.id).then(()=>router.replace('/transactions')).catch(e=>setMessage(e.message));}}>ยืนยันลบ</Button></ActionRow></Card></View></Modal>
  </Card>;
}
