import React,{useState,useEffect} from 'react';
import {View,useWindowDimensions} from 'react-native';
import Svg,{Circle,G} from 'react-native-svg';
import {money,type Summary} from '@expense/core';
import {T,C,s} from './ui';
import {MotionPressable,Reveal} from './motion';

export function CategoryChart({summary}:{summary:Summary}){
  const rows=summary.byCategory.filter(row=>row.expense>0),[selected,setSelected]=useState<string|null>(null),{width}=useWindowDimensions();
  useEffect(()=>{if(selected&&!rows.some(row=>row.id===selected))setSelected(null);},[summary,selected]);
  const item=rows.find(row=>row.id===selected),size=176,radius=69,circumference=2*Math.PI*radius;
  let consumed=0;
  return <View style={{gap:15}}><T style={s.bold}>สัดส่วนที่ใช้ไปแต่ละหมวด</T>{!summary.expense?<View style={{padding:25,alignItems:'center',gap:7}}><T style={s.muted}>ยังไม่มีรายจ่ายในช่วงนี้</T><T style={{fontSize:11,color:C.muted}}>บันทึกรายการแล้วกราฟจะอัปเดตที่นี่</T></View>:<View style={{flexDirection:width>=720?'row':'column',alignItems:'center',gap:22}}>
    <Reveal replayKey={`${summary.expense}:${selected}`} style={{width:size,height:size,flexShrink:0}}><Svg width={size} height={size} accessible={false}><Circle cx={size/2} cy={size/2} r={radius} stroke='#eff1f7' strokeWidth={22} fill="none"/><G rotation={-90} origin={`${size/2}, ${size/2}`}>{rows.map(row=>{
      const length=row.expense/summary.expense*circumference,offset=consumed;consumed+=length;
      return <Circle key={row.id} cx={size/2} cy={size/2} r={radius} stroke={row.color} strokeWidth={row.id===selected?26:22} fill="none" strokeDasharray={`${length} ${circumference-length}`} strokeDashoffset={-offset} opacity={selected&&row.id!==selected?0.35:1}/>;
    })}</G></Svg><View pointerEvents="none" style={{position:'absolute',inset:34,alignItems:'center',justifyContent:'center',gap:3}}><T style={{fontSize:10,color:C.muted}} numberOfLines={1}>{item?.name??'ใช้ไปทั้งหมด'}</T><T style={{fontFamily:'NotoLatinBold',fontSize:17}}>{item?`${(item.expense/summary.expense*100).toFixed(1)}%`:money(summary.expense)}</T>{item&&<T style={{fontSize:10,color:C.muted}}>{money(item.expense)}</T>}</View></Reveal>
    <View style={{gap:5,width:width>=720?undefined:'100%',flex:width>=720?1:undefined,minWidth:0}}>{rows.map(row=><MotionPressable key={row.id} accessibilityRole="button" accessibilityLabel={`${row.name} ${money(row.expense)} ${(row.expense/summary.expense*100).toFixed(1)} เปอร์เซ็นต์`} accessibilityState={{selected:selected===row.id}} onPress={()=>setSelected(selected===row.id?null:row.id)} style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:48,paddingHorizontal:10,paddingVertical:8,borderRadius:12,backgroundColor:selected===row.id?'#f0f2fb':'transparent'}}><View style={{width:10,height:10,borderRadius:4,backgroundColor:row.color}}/><View style={{flex:1,minWidth:0}}><T style={{fontSize:12}}>{row.name}</T><T style={{fontSize:10,color:C.muted}}>{(row.expense/summary.expense*100).toFixed(1)}%</T></View><T style={{fontFamily:'NotoLatinBold',fontSize:12}}>{money(row.expense)}</T></MotionPressable>)}</View>
  </View>}</View>;
}
