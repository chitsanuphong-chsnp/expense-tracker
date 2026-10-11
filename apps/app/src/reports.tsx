import React,{useState} from 'react';
import {tone,toneText,barColor} from './theme';
import {ChevronLeft,ChevronRight} from 'lucide-react-native';
import {View,Platform} from 'react-native';
import {File,Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {money,thaiDate,rangeFor,summarize,transactionsCsv} from '@expense/core';
import {useData} from './state';
import {T,Card,Button,Choices,Badge,Hero,C,s} from './ui';
import {CategoryChart} from './category-chart';
import {GrowingBar,MotionPressable} from './motion';
import {Companion} from './companion';

export function Reports(){
  const {data}=useData(),[period,setPeriod]=useState<'day'|'week'|'month'>('month'),[date,setDate]=useState(thaiDate()),[message,setMessage]=useState('');
  const today=thaiDate(),r=rangeFor(date,period),summary=summarize(data,r.start,r.end);
  const prevDate=thaiDate(new Date(new Date(r.start).getTime()-86400000)),previous=rangeFor(prevDate,period),prev=summarize(data,previous.start,previous.end);
  const days=Math.round((new Date(r.end).getTime()-new Date(r.start).getTime())/86400000);
  const values=Array.from({length:days},(_,i)=>{const d=thaiDate(new Date(new Date(r.start).getTime()+i*86400000)),day=rangeFor(d,'day');return {date:d,amount:summarize(data,day.start,day.end).expense};});
  const max=Math.max(...values.map(v=>v.amount),1),top=summary.byCategory.find(row=>row.expense>0);
  const current=rangeFor(today,period).start===r.start;
  // One step back/forward by the chosen period; no future periods.
  const shift=(step:number)=>{const d=new Date(`${date}T12:00:00+07:00`);if(period==='month')return thaiDate(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+step,1,5)));return thaiDate(new Date(d.getTime()+step*(period==='week'?7:1)*86400000));};
  const fmt=(iso:string,o:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',...o}).format(new Date(iso));
  const label=period==='day'?fmt(r.start,{day:'numeric',month:'short',year:'numeric'}):period==='week'?`${fmt(r.start,{day:'numeric',month:'short'})} – ${fmt(new Date(new Date(r.end).getTime()-1).toISOString(),{day:'numeric',month:'short',year:'numeric'})}`:fmt(r.start,{month:'long',year:'numeric'});
  const navButton={width:44,height:44,borderRadius:14,alignItems:'center' as const,justifyContent:'center' as const,backgroundColor:tone('#eef1fb')};
  async function exportCsv(){
    const csv=transactionsCsv(data.transactions.filter(t=>t.occurred_at>=r.start&&t.occurred_at<r.end),data.accounts,data.categories);
    try{if(Platform.OS==='web'){const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),uri=URL.createObjectURL(blob),a=document.createElement('a');a.href=uri;a.download=`expense-${period}-${date}.csv`;a.click();URL.revokeObjectURL(uri);}else{const f=new File(Paths.cache,'expense.csv');f.write(csv);if(await Sharing.isAvailableAsync())await Sharing.shareAsync(f.uri,{mimeType:'text/csv'});else setMessage('อุปกรณ์นี้ไม่รองรับการแชร์ไฟล์');}}catch{setMessage('ส่งออกไฟล์ไม่สำเร็จ');}
  }
  return <View style={s.section}>
    <Card style={{gap:12}}><Choices segmented value={period} onChange={v=>{setPeriod(v as typeof period);setDate(today);}} items={[{id:'day',name:'วัน'},{id:'week',name:'สัปดาห์'},{id:'month',name:'เดือน'}]}/>
      <View style={s.between}><MotionPressable accessibilityRole="button" accessibilityLabel="ช่วงก่อนหน้า" onPress={()=>setDate(shift(-1))} style={navButton}><ChevronLeft size={20} color={C.primary}/></MotionPressable>
        <MotionPressable accessibilityRole="button" accessibilityLabel={current?label:`${label} แตะเพื่อกลับไปช่วงปัจจุบัน`} disabled={current} onPress={()=>setDate(today)} style={{flex:1,alignItems:'center',gap:2}}><T style={[s.bold,{fontSize:16}]}>{label}</T>{!current&&<T style={{fontSize:11,color:C.primary}}>กลับไป{period==='day'?'วันนี้':period==='week'?'สัปดาห์นี้':'เดือนนี้'}</T>}</MotionPressable>
        <MotionPressable accessibilityRole="button" accessibilityLabel="ช่วงถัดไป" accessibilityState={{disabled:current}} disabled={current} onPress={()=>setDate(shift(1))} style={[navButton,current&&{opacity:.35}]}><ChevronRight size={20} color={C.primary}/></MotionPressable></View></Card>
    <Hero label="ใช้ไปในช่วงนี้" amount={money(summary.expense)}><T style={{color:toneText('#e8ebff'),fontSize:12}}>{new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short'}).format(new Date(r.start))} – {new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric'}).format(new Date(new Date(r.end).getTime()-1))} · {summary.count} รายการ</T></Hero>
    <Companion title={top?`หมวด ${top.name} ใช้มากที่สุด`:'เริ่มเห็นภาพการใช้เงินของคุณ'} text={top?`${money(top.expense)} · ${(top.expense/summary.expense*100).toFixed(1)}% ของยอดที่ใช้ไป`:'บันทึกรายการเพื่อดูสัดส่วนของแต่ละหมวดที่นี่'}/>
    <Card><CategoryChart summary={summary}/></Card>
    <Card style={{gap:15}}><T style={s.bold}>เทียบช่วงก่อนหน้า</T><T style={{color:summary.expense>prev.expense?C.red:C.green}}>ใช้ไป {summary.expense===prev.expense?'เท่าเดิม':`${summary.expense>prev.expense?'เพิ่ม':'ลด'} ${money(Math.abs(summary.expense-prev.expense))}`}</T>
      <View style={{height:145,flexDirection:'row',alignItems:'flex-end',gap:days>10?4:14}}>{values.map((v,i)=><View key={v.date} style={{flex:1,alignItems:'center',gap:8}}><GrowingBar label={`${v.date} ใช้ไป ${money(v.amount)}`} height={Math.max(4,v.amount/max*110)} color={v.date===date?toneText('#6278df'):barColor('#c5bef2')} index={i} replayKey={`${period}:${date}`}/><T style={{fontSize:9,color:C.muted}}>{days>10?(i%5===0?String(i+1):''):new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',weekday:'short'}).format(new Date(`${v.date}T12:00:00+07:00`))}</T></View>)}</View><T style={{fontSize:10,color:C.muted}}>ตามวันที่ทำรายการ · ไม่รวมโอนระหว่างบัญชี</T>
    </Card>
    <Card style={{gap:14}}><T style={s.bold}>แยกตามบัญชี</T>{summary.byAccount.map(a=><View style={s.between} key={a.id}><View style={[s.row,{flex:1,minWidth:0}]}><View style={{width:8,height:8,borderRadius:4,backgroundColor:a.color}}/><T style={{flexShrink:1}}>{a.name}</T></View><T style={[s.bold,{fontSize:13}]}>ใช้ไป {money(a.expense)}</T></View>)}</Card>
    <T style={s.muted}>สลิปรอข้อมูล {summary.pending} รายการ · ยังไม่รวมยอด</T><Button secondary onPress={()=>void exportCsv()}>ส่งออก CSV</Button>{!!message&&<T>{message}</T>}
    <Card style={{gap:12}}><T style={s.bold}>ประวัติรายงาน LINE</T>{data.reports.slice().sort((a,b)=>b.period_end.localeCompare(a.period_end)).slice(0,15).map(r=><View style={s.between} key={r.id}><View style={{flex:1}}><T style={{fontSize:12}}>{r.report_key}</T><T style={s.muted}>{r.error_code??(r.sent_at?new Date(r.sent_at).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'}):'ยังไม่ส่ง')}</T></View><Badge text={r.status==='sent'?'ส่งแล้ว':'รอส่ง'} color={r.status==='sent'?C.green:toneText('#c49243')}/></View>)}{!data.reports.length&&<T style={s.muted}>ยังไม่มีประวัติการส่ง</T>}</Card>
  </View>;
}
