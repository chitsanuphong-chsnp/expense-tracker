import React,{useState} from 'react';
import {Image,View} from 'react-native';
import {useRouter} from 'expo-router';
import {MessageCircle} from 'lucide-react-native';
import {flexReport,type FlexNode} from '@expense/core';
import {periods,example} from '../src/line-examples';
import {T,Card,Button,ActionRow,Choices,Badge,C,s} from '../src/ui';
import {MotionPressable,Reveal} from '../src/motion';
import {NotificationPreview} from '../src/notification-preview';

const sizes:Record<string,number>={xs:11,sm:13,md:15,lg:19,xl:23,xxl:30};
const spaces:Record<string,number>={xs:4,sm:8,md:16,lg:20};
const previewArt:Record<string,number>={
  'https://expense-tracker.example/line/mascot-reading-v2.png':require('../assets/mascot/reading-v2.png'),
  'https://expense-tracker.example/line/mascot-thinking-v2.png':require('../assets/mascot/thinking-v2.png'),
  'https://expense-tracker.example/line/mascot-celebrate-v2.png':require('../assets/mascot/celebrate-v2.png')
};
function Component({node,onAction}:{node:FlexNode;onAction:(uri:string)=>void}){
  if(node.type==='text')return <T style={{fontSize:sizes[node.size??'md']??15,color:node.color??C.ink,fontFamily:node.weight==='bold'?'NotoThaiBold':'NotoThai',textAlign:node.align==='end'?'right':node.align??'left',flex:node.flex,flexShrink:1}} numberOfLines={node.wrap?undefined:1}>{node.text}</T>;
  if(node.type==='separator')return <View style={{height:1,backgroundColor:'#e8ecf3'}}/>;
  if(node.type==='image')return <Image accessibilityLabel="ตัวละครใน LINE Flex" source={previewArt[node.url]??{uri:node.url}} resizeMode="contain" style={{width:parseFloat(node.size)||88,height:parseFloat(node.size)||88,aspectRatio:1,flexShrink:0}}/>;
  if(node.type==='button')return <MotionPressable accessibilityRole="button" onPress={()=>onAction(node.action.uri)} style={{minHeight:48,flex:node.flex,minWidth:0,flexShrink:1,justifyContent:'center',alignItems:'center',backgroundColor:node.style==='primary'?node.color:undefined,borderRadius:8,paddingHorizontal:8}}><T style={{fontSize:12,flexShrink:1,textAlign:'center',color:node.style==='primary'?'white':'#5564dc',fontFamily:'NotoThaiBold'}}>{node.action.label}</T></MotionPressable>;
  return <View style={{flexDirection:node.layout==='horizontal'?'row':'column',gap:spaces[node.spacing??'']??0,backgroundColor:node.backgroundColor,flex:node.flex,minWidth:0,alignItems:node.alignItems??(node.layout==='horizontal'?(node.contents.every(child=>child.type==='button')?'stretch':'flex-start'):undefined)}}>{node.contents.map((child,i)=><Component key={i} node={child} onAction={onAction}/>)}</View>;
}
export default function LinePreview(){
  const [period,setPeriod]=useState<keyof typeof periods>('day'),[json,setJson]=useState(false),[notification,setNotification]=useState(false),router=useRouter();
  const message=flexReport(example(period),periods[period].key,'https://expense-tracker.example','ตรวจ Drive สำเร็จครบ 4 แหล่ง · รวมรายการเงินสดที่บันทึกเอง');
  const action=(uri:string)=>router.push(uri.endsWith('/slips')?'/slips':'/');
  return <View style={s.section}><View style={[s.between,{flexWrap:'wrap'}]}><View style={{gap:6}}><T style={[s.bold,{fontSize:20}]}>ตัวอย่าง LINE Flex</T><T style={s.muted}>ข้อมูลสมมติ · พรีวิวในแอป หน้าตาอาจต่างจาก LINE ตามอุปกรณ์</T></View><Badge text="ตัวอย่าง" color={C.green}/></View>
    <Choices items={Object.entries(periods).map(([id,p])=>({id,name:p.name}))} value={period} onChange={value=>setPeriod(value as keyof typeof periods)}/>
    <View style={{gap:8,alignItems:'flex-start'}}><Button onPress={()=>setNotification(true)}>จำลอง Noti เด้ง</Button><T style={[s.muted,{fontSize:11}]}>ตัวอย่างแบนเนอร์บนหน้าจอ · ใช้ข้อความสรุปเดียวกับ LINE · กดปิดหรือแตะเพื่อดู Flex</T></View>
    <View style={{alignItems:'center',padding:18,borderRadius:24,backgroundColor:'#e6edf3',gap:15}}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><MessageCircle size={18} color='#267c62'/><T style={[s.bold,{fontSize:13}]}>Expense Tracker</T></View><T style={[s.muted,{fontSize:11}]}>{periods[period].label}</T>
      <Reveal replayKey={period} style={{width:'100%',maxWidth:340,borderRadius:18,overflow:'hidden',backgroundColor:'white',boxShadow:'0 8px 24px rgba(43,64,90,.08)'}}><View style={{padding:20,backgroundColor:message.contents.header.backgroundColor}}><Component node={message.contents.header} onAction={action}/></View><View style={{padding:20}}><Component node={message.contents.body} onAction={action}/></View><View style={{paddingHorizontal:16,paddingBottom:12}}><Component node={message.contents.footer} onAction={action}/></View></Reveal>
      <T style={[s.muted,{fontSize:10,textAlign:'center'}]}>ปุ่มในตัวอย่างเปิดหน้าในแอปนี้ · ตัวอย่างนี้ไม่ส่งข้อความเข้า LINE</T>
    </View><ActionRow testID="line-preview-actions"><Button secondary onPress={()=>router.push('/settings')}>กลับไปตั้งค่า</Button><Button onPress={()=>setJson(!json)}>{json?'ซ่อน JSON':'ดู JSON ของข้อความ'}</Button></ActionRow>
    {json&&<Card style={{gap:12}}><T style={s.bold}>Flex payload · ข้อมูลตัวอย่าง</T><T selectable style={{fontFamily:'monospace',fontSize:10}}>{JSON.stringify(message,null,2)}</T></Card>}
    {notification&&<NotificationPreview text={message.altText} onClose={()=>setNotification(false)}/>}
  </View>;
}
