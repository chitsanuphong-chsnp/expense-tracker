import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,Image,Platform,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';

const appIcon=require('../assets/icon-v2-header.png');
const native=Platform.OS!=='web';
const bars=[0.45,0.7,0.35,0.85,0.6,1];

// Every app open (~2.2 s): the brand gradient fades in, the wallet icon pops with a soft ring, a small chart grows
// bar by bar and the name rises. Decoration only: no amounts or other numbers.
export function OpeningAnimation({onDone}:{onDone:()=>void}){
  const {height}=useWindowDimensions();
  const v=()=>new Animated.Value(0);
  const bg=useRef(v()).current,icon=useRef(v()).current,ring=useRef(v()).current,title=useRef(v()).current,exit=useRef(v()).current;
  const grow=useRef(bars.map(()=>v())).current;
  const [done,setDone]=useState(false);
  useEffect(()=>{
    const t=(a:Animated.Value,toValue:number,duration:number,delay=0,easing=Easing.out(Easing.cubic))=>Animated.timing(a,{toValue,duration,delay,easing,useNativeDriver:native});
    const anim=Animated.sequence([
      t(bg,1,320),
      Animated.parallel([
        Animated.spring(icon,{toValue:1,friction:5,tension:120,useNativeDriver:native}),
        t(ring,1,900,120,Easing.out(Easing.quad)),
        Animated.stagger(70,grow.map(g=>Animated.spring(g,{toValue:1,friction:6,tension:110,delay:260,useNativeDriver:native}))),
        t(title,1,480,520),
      ]),
      Animated.delay(420),
      t(exit,1,350,0,Easing.in(Easing.cubic)),
    ]);
    anim.start(()=>{setDone(true);onDone();});
    return()=>anim.stop();
  },[]);
  if(done)return null;
  const iconSize=84,barH=44;
  return <Animated.View pointerEvents="auto" accessibilityLabel="กำลังเปิด Expense Tracker" style={[StyleSheet.absoluteFill,{zIndex:100,opacity:exit.interpolate({inputRange:[0,1],outputRange:[1,0]}),transform:[{scale:exit.interpolate({inputRange:[0,1],outputRange:[1,1.06]})}]}]}>
    <LinearGradient colors={['#eef2ff','#f6f1ff']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill}/>
    <Animated.View style={[StyleSheet.absoluteFill,{opacity:bg}]}><LinearGradient colors={['#4876e2','#7756ca']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill}/></Animated.View>

    <View style={[StyleSheet.absoluteFill,{alignItems:'center',justifyContent:'center',gap:22}]}>
      <View style={{width:iconSize,height:iconSize,alignItems:'center',justifyContent:'center'}}>
        {/* a soft ring spreads out once as the icon lands */}
        <Animated.View pointerEvents="none" style={{position:'absolute',width:iconSize,height:iconSize,borderRadius:28,borderWidth:2,borderColor:'#ffffff',
          opacity:ring.interpolate({inputRange:[0,0.15,1],outputRange:[0,0.55,0]}),transform:[{scale:ring.interpolate({inputRange:[0,1],outputRange:[1,1.9]})}]}}/>
        <Animated.View style={{opacity:icon.interpolate({inputRange:[0,0.2,1],outputRange:[0,1,1]}),transform:[{scale:icon.interpolate({inputRange:[0,1],outputRange:[0.4,1]})},{rotate:icon.interpolate({inputRange:[0,1],outputRange:['-10deg','0deg']})}]}}>
          <View style={{borderRadius:26,boxShadow:'0 12px 30px rgba(20,24,80,.35)'}}><Image source={appIcon} style={{width:iconSize,height:iconSize,borderRadius:26}} accessibilityIgnoresInvertColors/></View>
        </Animated.View>
      </View>
      <View style={{flexDirection:'row',alignItems:'flex-end',gap:7,height:barH}}>{bars.map((b,i)=><Animated.View key={i} style={{width:12,height:barH*b,borderRadius:4,backgroundColor:i===bars.length-1?'#ffd56b':'rgba(255,255,255,0.55)',
        opacity:grow[i],transform:[{translateY:grow[i].interpolate({inputRange:[0,1],outputRange:[barH*b/2,0]})},{scaleY:grow[i]}]}}/>)}</View>
    </View>

    <Animated.View style={{position:'absolute',left:0,right:0,bottom:height*0.11,alignItems:'center',gap:4,opacity:title,transform:[{translateY:title.interpolate({inputRange:[0,1],outputRange:[16,0]})}]}}>
      <Text style={{fontFamily:'NotoLatinBold',fontSize:26,color:'#ffffff'}}>Expense Tracker</Text>
      <Text style={{fontFamily:'NotoThai',fontSize:13,color:'#e6e8ff'}}>สลิปเข้า · อ่านให้อัตโนมัติ · สรุปให้ทุกเช้า</Text>
    </Animated.View>
  </Animated.View>;
}
