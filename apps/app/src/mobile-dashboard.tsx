import React from 'react';
import {Image,ScrollView,StyleSheet,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useRouter} from 'expo-router';
import {ArrowDownLeft,ArrowUpRight,ArrowLeftRight,ChartNoAxesCombined,ChevronRight,Plus,Receipt,Wallet} from 'lucide-react-native';
import {money,rangeFor,summarize,thaiDate} from '@expense/core';
import {useData} from './state';
import {T,Card,C,s} from './ui';
import {GrowingBar,MotionPressable,Reveal} from './motion';
import {Mascot} from './companion';

const m=StyleSheet.create({
  page:{gap:12},
  sectionTitle:{fontFamily:'NotoThaiBold',fontSize:15,color:C.ink},
  small:{fontSize:10,color:C.muted},
  amount:{fontFamily:'NotoLatinBold',color:C.ink},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  tile:{width:'48%',flexGrow:1,minWidth:0,borderRadius:19,padding:14,gap:8},
  icon:{width:27,height:27,borderRadius:9,alignItems:'center',justifyContent:'center'},
});

export function MobileDashboard(){
  const {data}=useData(),router=useRouter(),today=thaiDate();
  const day=rangeFor(today,'day'),summary=summarize(data,day.start,day.end);
  const monthRange=rangeFor(today,'month'),month=summarize(data,monthRange.start,monthRange.end);
  const budget=data.settings.budget_satang,over=budget>0&&month.expense>budget;
  const pending=data.slips.filter(slip=>!['linked','duplicate'].includes(slip.status)).length;
  const cashIds=new Set(data.accounts.filter(account=>account.kind==='cash').map(account=>account.id));
  const cash=summary.byAccount.filter(account=>cashIds.has(account.id)).reduce((sum,account)=>sum+account.expense,0);
  const tiles=[
    {label:'รายรับวันนี้',value:money(summary.income),background:'#eeeafb',color:'#8670d3',icon:ArrowDownLeft,path:'/transactions' as const},
    {label:'เงินสุทธิวันนี้',value:money(summary.net),background:'#e7f2fc',color:'#439bd0',icon:Wallet,path:'/transactions' as const},
    {label:'เงินสดใช้ไป',value:money(cash),background:'#fff3df',color:'#d4a247',icon:Wallet,path:'/transactions' as const},
    {label:'สลิปรอข้อมูล',value:`${pending} สลิป`,background:'#e2f4ed',color:'#2daa89',icon:Receipt,path:'/slips' as const},
  ];
  const week=rangeFor(today,'week'),weekSummary=summarize(data,week.start,week.end);
  const days=Array.from({length:7},(_,i)=>{
    const date=thaiDate(new Date(new Date(week.start).getTime()+i*86400000)),range=rangeFor(date,'day');
    return {date,amount:summarize(data,range.start,range.end).expense};
  });
  const peak=Math.max(...days.map(day=>day.amount),1);
  const amount=money(summary.expense),showArt=amount.length<=12;
  const recent=data.transactions.slice().sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at)).slice(0,4);
  return <View style={m.page}>
    <View style={{gap:6,paddingHorizontal:2,paddingVertical:2}}>
      <View style={s.between}><T style={m.small}>งบเดือนนี้ · ใช้ไป {money(month.expense)}</T><MotionPressable accessibilityRole="button" accessibilityLabel="ตั้งงบรายเดือน" onPress={()=>router.push('/settings')} hitSlop={8}><T style={[m.small,{color:over?C.red:C.green,fontFamily:'NotoThaiBold'}]}>{budget?over?'เกินงบ':`เหลือ ${money(Math.max(0,budget-month.expense))}`:'ตั้งงบ'}</T></MotionPressable></View>
      <View accessibilityRole="progressbar" accessibilityLabel="งบรายเดือนที่ใช้ไป" accessibilityValue={{min:0,max:100,now:budget?Math.min(100,Math.round(month.expense/budget*100)):0,text:budget?`ใช้ไป ${money(month.expense)} จาก ${money(budget)}`:'ยังไม่ได้ตั้งงบ'}} style={{height:5,borderRadius:5,backgroundColor:'#e2e6f0',overflow:'hidden'}}><View style={{height:5,borderRadius:5,width:`${budget?Math.min(100,month.expense/budget*100):0}%`,backgroundColor:over?C.red:'#687adf'}}/></View>
    </View>

    <LinearGradient colors={['#4876e2','#7756ca']} start={{x:0,y:0}} end={{x:1,y:1}} style={{padding:18,borderRadius:24,gap:13,boxShadow:'0 9px 22px rgba(78,100,203,.16)'}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:10}}><View style={{flex:1,minWidth:0,gap:5}}><T style={{fontSize:12,color:'#eef0ff'}}>วันนี้ใช้ไป</T><Reveal replayKey={amount}><T accessibilityLabel={`วันนี้ใช้ไป ${amount}`} style={{fontFamily:'NotoLatinBold',fontSize:amount.length>14?25:amount.length>11?29:36,lineHeight:46,color:'white'}}>{amount}</T></Reveal><T style={{fontSize:10,color:'#e2e8ff'}}>{summary.count} รายการ · ไม่รวมโอนระหว่างบัญชี</T></View>
        {showArt&&<Mascot size={76}/>}
      </View>
      <MotionPressable accessibilityRole="button" onPress={()=>router.push('/record')} style={{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,backgroundColor:'white',borderRadius:15}}><Plus size={16} color='#5264b2'/><T style={{fontFamily:'NotoThaiBold',fontSize:12,color:'#3d4d75'}}>บันทึกรายการ</T><ChevronRight size={14} color='#8190ac'/></MotionPressable>
    </LinearGradient>

    <View style={m.grid}>{tiles.map((tile,index)=><Reveal key={tile.label} delay={70+index*35} style={m.tile}><MotionPressable accessibilityRole="button" accessibilityLabel={`${tile.label} ${tile.value}`} onPress={()=>router.push(tile.path)} style={{backgroundColor:tile.background,borderRadius:19,padding:14,gap:8,margin:-14,minHeight:105}}><View style={s.between}><View style={[m.icon,{backgroundColor:tile.color}]}><tile.icon size={15} color="white"/></View><ChevronRight size={13} color='#8a96aa'/></View><View style={{gap:3}}><T style={{fontSize:11,color:'#667184'}}>{tile.label}</T><T style={[m.amount,{fontSize:tile.value.length>13?16:20,color:tile.label==='เงินสุทธิวันนี้'&&summary.net<0?C.red:tile.color}]}>{tile.value}</T></View></MotionPressable></Reveal>)}</View>

    <MotionPressable accessibilityRole="button" accessibilityLabel={`ดูกล่องสลิป รอข้อมูล ${pending} สลิป`} onPress={()=>router.push('/slips')} style={{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:16,backgroundColor:pending?'#fff2db':'#eaf3f0'}}><View style={[m.icon,{backgroundColor:pending?'#ffdf9c':'#d1e9df'}]}><Receipt size={15} color={pending?'#c1933a':'#589980'}/></View><View style={{flex:1,gap:2}}><T style={{fontSize:11,fontFamily:'NotoThaiBold',color:'#647075'}}>{pending?`มี ${pending} สลิปรอเติมข้อมูล`:'กล่องสลิปของคุณ'}</T><T style={m.small}>{pending?'เติมยอดเพื่อรวมในรายงาน':`บันทึกแล้ว ${data.slips.filter(slip=>slip.status==='linked').length} สลิป`}</T></View><ChevronRight size={15} color='#9b9c8b'/></MotionPressable>

    <Card enterDelay={150} style={{gap:12}}><View style={s.between}><View style={{gap:4}}><T style={m.sectionTitle}>การใช้เงินสัปดาห์นี้</T><T style={[m.amount,{fontSize:22,color:'#4c66c2'}]}>{money(weekSummary.expense)}</T></View><MotionPressable accessibilityRole="button" accessibilityLabel="ดูรายงานการใช้เงิน" onPress={()=>router.push('/reports')} style={{width:34,height:34,alignItems:'center',justifyContent:'center',backgroundColor:'#f0f3fc',borderRadius:11}}><ChartNoAxesCombined size={17} color='#7888b8'/></MotionPressable></View>
      <View style={{height:124,flexDirection:'row',alignItems:'flex-end',gap:15}}>{days.map((day,index)=><View key={day.date} style={{flex:1,alignItems:'center',gap:7}}><GrowingBar height={Math.max(5,day.amount/peak*94)} color={day.date===today?'#6f86e7':'#c6b9f2'} label={`${day.date} ใช้ไป ${money(day.amount)}`} index={index} replayKey={today}/><T style={{fontSize:9,color:day.date===today?'#576dc0':C.muted}}>{['จ','อ','พ','พฤ','ศ','ส','อา'][index]}</T></View>)}</View>
      <T style={{fontSize:9,color:'#8b94a6'}}>จันทร์ – อาทิตย์ · ตามวันที่ทำรายการ</T>
    </Card>

    <View style={{gap:10,paddingTop:2}}><View style={s.between}><T style={m.sectionTitle}>แยกตามบัญชี</T><T style={m.small}>ใช้ไปวันนี้</T></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10,paddingBottom:5}}>{summary.byAccount.map(account=><View key={account.id} style={{width:138,backgroundColor:'white',padding:14,borderRadius:18,gap:8,borderWidth:1,borderColor:'#edf0f6'}}><View style={{flexDirection:'row',gap:6,alignItems:'center'}}><View style={{width:7,height:7,borderRadius:4,backgroundColor:account.color}}/><T style={{fontSize:11,fontFamily:'NotoThaiBold'}}>{account.name}</T></View><T style={[m.amount,{fontSize:16}]}>{money(account.expense)}</T><T style={{fontSize:9,color:C.muted}}>รับ {money(account.income)}</T></View>)}</ScrollView></View>

    <Card style={{gap:12}}><View style={s.between}><T style={m.sectionTitle}>หมวดที่ใช้ไป</T><T style={m.small}>เดือนนี้</T></View>{month.byCategory.filter(category=>category.expense>0).slice(0,4).map(category=><View key={category.id} style={{gap:6}}><View style={s.between}><T style={{fontSize:11}}>{category.name}</T><T style={[m.amount,{fontSize:12}]}>{money(category.expense)}</T></View><View style={{height:4,backgroundColor:'#edf0f5',borderRadius:4,overflow:'hidden'}}><View style={{height:4,borderRadius:4,width:`${month.expense?category.expense/month.expense*100:0}%`,backgroundColor:category.color}}/></View></View>)}{!month.expense&&<T style={m.small}>ยังไม่มีรายจ่ายเดือนนี้</T>}</Card>

    <View style={{gap:9}}><View style={s.between}><T style={m.sectionTitle}>รายการล่าสุด</T><MotionPressable accessibilityRole="button" onPress={()=>router.push('/transactions')} hitSlop={8}><T style={{fontSize:11,color:C.primary}}>ดูทั้งหมด ›</T></MotionPressable></View>{recent.map(item=>{
      const account=data.accounts.find(account=>account.id===item.account_id),category=data.categories.find(category=>category.id===item.category_id);
      const color=item.kind==='income'?C.green:item.kind==='transfer'?C.primary:C.red,Icon=item.kind==='income'?ArrowDownLeft:item.kind==='transfer'?ArrowLeftRight:ArrowUpRight;
      return <MotionPressable accessibilityRole="button" key={item.id} onPress={()=>router.push({pathname:'/record',params:{id:item.id}})} style={{backgroundColor:'white',borderRadius:17,padding:13,flexDirection:'row',alignItems:'center',gap:10}}><View style={{width:35,height:35,borderRadius:12,backgroundColor:`${category?.color??color}18`,alignItems:'center',justifyContent:'center'}}><Icon size={16} color={category?.color??color}/></View><View style={{flex:1,minWidth:0,gap:4}}><T style={{fontSize:12,fontFamily:'NotoThaiBold'}} numberOfLines={1}>{item.note||item.counterparty||'รายการ'}</T><T style={{fontSize:9,color:C.muted}} numberOfLines={1}>{account?.name} · {category?.name??'ยังไม่จัดหมวด'} · {new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short'}).format(new Date(item.occurred_at))}</T></View><T style={[m.amount,{fontSize:13,color,flexShrink:0}]}>{item.kind==='income'?'+':item.kind==='expense'?'-':''}{money(item.amount_satang)}</T></MotionPressable>;
    })}{!recent.length&&<Card><T style={m.small}>บันทึกรายการแรกได้จากปุ่มด้านบน</T></Card>}</View>
  </View>;
}
