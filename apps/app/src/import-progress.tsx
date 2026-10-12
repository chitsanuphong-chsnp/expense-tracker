import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {T,C,s} from './ui';
import {tone} from './theme';
import {MotionPressable,useMotion} from './motion';
import {useData} from './state';

type Progress={pending:number;done:number;slips:number;saved?:number};
// Shown while "ดึงสลิปตอนนี้" runs. Polls the API every 2.5 s for real job counts: the bar fills by finished
// import jobs (Drive scans + QR/OCR per slip), a light sweep shows it is still working, and the timer counts up.
export function ImportProgress({since,onCancel}:{since:string;onCancel:()=>void}){
  const state=useData(),{reduced}=useMotion();
  const [progress,setProgress]=useState<Progress|null>(null),[seconds,setSeconds]=useState(0),[width,setWidth]=useState(0);
  const fill=useRef(new Animated.Value(0)).current,sweep=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    let alive=true;
    const poll=async()=>{try{const r=await state.call(`/sync/status?since=${encodeURIComponent(since)}`);if(alive)setProgress(r);}catch{}};
    void poll();const timer=setInterval(poll,2500),clock=setInterval(()=>setSeconds(v=>v+1),1000);
    return()=>{alive=false;clearInterval(timer);clearInterval(clock);};
  },[since]);
  const total=progress?progress.done+progress.pending:0;
  // Nothing finished yet: a small start so the bar never looks stuck at zero.
  const ratio=total?Math.max(0.06,progress!.done/total):0.06;
  useEffect(()=>{Animated.timing(fill,{toValue:ratio,duration:reduced?0:500,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start();},[ratio,reduced]);
  useEffect(()=>{
    if(reduced)return;
    const loop=Animated.loop(Animated.timing(sweep,{toValue:1,duration:1400,easing:Easing.inOut(Easing.quad),useNativeDriver:true}));
    loop.start();return()=>loop.stop();
  },[reduced]);
  const stage=!progress||progress.done===0&&progress.slips===0?'กำลังค้นหาสลิปใน Drive':progress.pending?'กำลังอ่าน QR และ OCR':'กำลังจัดเก็บ';
  const time=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  return <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:Math.round(ratio*100)}} accessibilityLabel={stage} style={{gap:9,padding:14,borderRadius:16,backgroundColor:tone('#f3f5ff')}}>
    <View style={s.between}><T style={{fontFamily:'NotoThaiBold',fontSize:13,color:C.primary}}>{stage}</T><T style={{fontFamily:'NotoLatin',fontSize:12,color:C.muted}}>{time}</T></View>
    <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{height:10,borderRadius:5,backgroundColor:tone('#e1e6f5'),overflow:'hidden'}}>
      <Animated.View style={{height:10,borderRadius:5,overflow:'hidden',width:fill.interpolate({inputRange:[0,1],outputRange:['0%','100%']})}}>
        <LinearGradient colors={['#4876e2','#7756ca']} start={{x:0,y:0}} end={{x:1,y:0}} style={{flex:1}}/>
      </Animated.View>
      {!reduced&&width>0&&<Animated.View pointerEvents="none" style={{position:'absolute',top:0,bottom:0,width:width*0.3,transform:[{translateX:sweep.interpolate({inputRange:[0,1],outputRange:[-width*0.3,width]})}]}}>
        <LinearGradient colors={['rgba(255,255,255,0)','rgba(255,255,255,0.55)','rgba(255,255,255,0)']} start={{x:0,y:0}} end={{x:1,y:0}} style={{flex:1}}/>
      </Animated.View>}
    </View>
    <View style={[s.between,{gap:10}]}>
      <T style={{fontSize:11,color:C.muted,flex:1}}>{progress?`พบสลิปใหม่ ${progress.slips} ใบ · บันทึกแล้ว ${progress.saved??0} · เสร็จ ${progress.done}/${total} งาน`:'เริ่มทำงาน…'}</T>
      <MotionPressable accessibilityRole="button" accessibilityLabel="ยกเลิกการดึงสลิป" onPress={onCancel} style={{paddingHorizontal:14,minHeight:34,borderRadius:10,borderWidth:1,borderColor:tone('#d9def0'),backgroundColor:tone('#ffffff'),justifyContent:'center'}}><T style={{fontSize:12,color:C.red,fontFamily:'NotoThaiBold'}}>ยกเลิก</T></MotionPressable>
    </View>
  </View>;
}
