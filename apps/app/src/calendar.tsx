import React,{useState} from 'react';
import {View,Modal,Pressable,ScrollView} from 'react-native';
import {CalendarDays,ChevronLeft,ChevronRight,X} from 'lucide-react-native';
import {thaiDate} from '@expense/core';
import {calendarDays,moveMonth,validDate} from './calendar-data';
import {T,C,s,Button,ActionRow} from './ui';
import {MotionPressable,useMotion} from './motion';
import {ModalCompanion} from './modal-companion';

export function DateField({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){
  const {reduced}=useMotion(),[open,setOpen]=useState(false),[month,setMonth]=useState(thaiDate().slice(0,7));
  const today=thaiDate(),valid=validDate(value);
  const display=valid?new Intl.DateTimeFormat('th-TH',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${value}T12:00:00Z`)):'เลือกวันที่';
  function pick(date:string){onChange(date);setOpen(false);}
  return <View><T style={s.label}>{label}</T><MotionPressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} accessibilityState={{expanded:open}} onPress={()=>{setMonth((valid?value:today).slice(0,7));setOpen(true);}} style={[s.input,{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}]}><T style={{fontSize:13,flex:1}}>{display}</T><CalendarDays size={18} color={C.primary}/></MotionPressable>
    <Modal visible={open} transparent animationType={reduced?'none':'fade'} onRequestClose={()=>setOpen(false)}><View style={{flex:1,backgroundColor:'#24334f66',justifyContent:'center',padding:12}}><Pressable accessibilityLabel="ปิดปฏิทิน" onPress={()=>setOpen(false)} style={{position:'absolute',inset:0}}/><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow:1,justifyContent:'center',alignItems:'center'}}><View accessibilityViewIsModal style={{width:'100%',maxWidth:380,backgroundColor:'white',borderRadius:25,padding:14,gap:12}}>
      {open&&<ModalCompanion compact title={label} pose="reading" action={<MotionPressable accessibilityRole="button" accessibilityLabel="ปิดปฏิทิน" onPress={()=>setOpen(false)} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><X size={18} color={C.muted}/></MotionPressable>}/>}
      <View style={s.between}><MotionPressable accessibilityRole="button" accessibilityLabel="เดือนก่อนหน้า" onPress={()=>setMonth(moveMonth(month,-1))} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><ChevronLeft color={C.primary} size={20}/></MotionPressable><T style={[s.bold,{fontSize:15}]}>{new Intl.DateTimeFormat('th-TH',{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(`${month}-01T12:00:00Z`))}</T><MotionPressable accessibilityRole="button" accessibilityLabel="เดือนถัดไป" onPress={()=>setMonth(moveMonth(month,1))} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><ChevronRight color={C.primary} size={20}/></MotionPressable></View>
      <View style={{flexDirection:'row'}}>{['จ','อ','พ','พฤ','ศ','ส','อา'].map((day,i)=><View key={i} style={{flex:1,alignItems:'center'}}><T style={{fontSize:11,color:C.muted}}>{day}</T></View>)}</View>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>{calendarDays(month).map(day=><MotionPressable key={day.value} accessibilityRole="button" accessibilityLabel={`เลือกวันที่ ${day.value}`} accessibilityState={{selected:day.value===value}} onPress={()=>pick(day.value)} style={{width:'14.285714%',minHeight:44,alignItems:'center',justifyContent:'center'}}><View style={{width:35,height:35,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:day.value===value?C.primary:day.value===today?'#eef0ff':'transparent',borderWidth:day.value===today?1:0,borderColor:'#b3bdf4'}}><T style={{fontFamily:'NotoLatinBold',fontSize:13,color:day.value===value?'white':day.inMonth?C.ink:'#a5adbd'}}>{day.day}</T></View></MotionPressable>)}</View>
      <ActionRow testID="calendar-actions"><Button secondary onPress={()=>setOpen(false)}>ยกเลิก</Button><Button onPress={()=>pick(today)}>เลือกวันนี้</Button></ActionRow>
    </View></ScrollView></View></Modal>
  </View>;
}
