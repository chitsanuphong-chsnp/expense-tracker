import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,Image,Platform,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';

const mascot=require('../assets/mascot/wave-v1.png');
const native=Platform.OS!=='web';
const sparkles=[{x:-118,y:-150,size:16,delay:380},{x:122,y:-120,size:12,delay:470},{x:-140,y:20,size:10,delay:560},{x:138,y:40,size:18,delay:430},{x:-80,y:130,size:12,delay:650},{x:96,y:150,size:10,delay:520}];
const coins=[{x:-64,delay:240},{x:8,delay:340},{x:78,delay:300}];

// Shown on every app open (about 2 s), over the app while it loads underneath; then it zooms away.
export function OpeningAnimation({onDone}:{onDone:()=>void}){
  const {width,height}=useWindowDimensions();
  const pop=useRef(new Animated.Value(0)).current,wave=useRef(new Animated.Value(0)).current,title=useRef(new Animated.Value(0)).current;
  const sparkle=useRef(sparkles.map(()=>new Animated.Value(0))).current,coin=useRef(coins.map(()=>new Animated.Value(0))).current;
  const exit=useRef(new Animated.Value(0)).current,[done,setDone]=useState(false);
  useEffect(()=>{
    const t=(v:Animated.Value,toValue:number,duration:number,delay=0,easing=Easing.out(Easing.cubic))=>Animated.timing(v,{toValue,duration,delay,easing,useNativeDriver:native});
    const anim=Animated.sequence([
      Animated.parallel([
        Animated.spring(pop,{toValue:1,friction:5,tension:70,useNativeDriver:native}),
        Animated.sequence([Animated.delay(420),Animated.loop(Animated.sequence([t(wave,1,170,0,Easing.inOut(Easing.quad)),t(wave,-1,170,0,Easing.inOut(Easing.quad))]),{iterations:3}),t(wave,0,140)]),
        t(title,1,520,520),
        ...sparkle.map((v,i)=>Animated.sequence([Animated.delay(sparkles[i].delay),t(v,1,420,0,Easing.out(Easing.back(2))),t(v,0.75,500,0,Easing.inOut(Easing.quad))])),
        ...coin.map((v,i)=>t(v,1,1000,coins[i].delay,Easing.out(Easing.quad))),
      ]),
      Animated.delay(150),
      t(exit,1,420,0,Easing.in(Easing.cubic)),
    ]);
    anim.start(()=>{setDone(true);onDone();});
    return()=>anim.stop();
  },[]);
  if(done)return null;
  // The artwork is 280×342 with the figure slightly right/low inside it; shift so she sits at the exact centre.
  const size=Math.min(220,width*0.52),imageH=size*1.1,imageW=imageH*280/342;
  return <Animated.View pointerEvents="auto" accessibilityLabel="กำลังเปิด Expense Tracker" style={[StyleSheet.absoluteFill,{zIndex:100,opacity:exit.interpolate({inputRange:[0,0.6,1],outputRange:[1,1,0]}),transform:[{scale:exit.interpolate({inputRange:[0,1],outputRange:[1,1.12]})}]}]}>
    <LinearGradient colors={['#4876e2','#6a5fd6','#7756ca']} start={{x:0,y:0}} end={{x:1,y:1}} style={[StyleSheet.absoluteFill,{alignItems:'center',justifyContent:'center'}]}>
      <View style={{position:'absolute',width:size*1.9,height:size*1.9,borderRadius:size,backgroundColor:'rgba(255,255,255,0.08)'}}/>
      {coins.map((c,i)=><Animated.View key={i} style={{position:'absolute',width:30,height:30,borderRadius:15,backgroundColor:'#f7c948',borderWidth:3,borderColor:'#e3a623',alignItems:'center',justifyContent:'center',transform:[{translateX:c.x},{translateY:coin[i].interpolate({inputRange:[0,1],outputRange:[height*0.32,-height*0.3]})},{rotate:coin[i].interpolate({inputRange:[0,1],outputRange:['0deg',`${i%2?-200:220}deg`]})}],opacity:coin[i].interpolate({inputRange:[0,0.15,0.8,1],outputRange:[0,1,1,0]})}}><Text style={{fontFamily:'NotoLatinBold',fontSize:13,color:'#9a6510'}}>฿</Text></Animated.View>)}
      {sparkles.map((p,i)=><Animated.Text key={i} style={{position:'absolute',color:'#fff6c9',fontSize:p.size*1.6,transform:[{translateX:p.x},{translateY:p.y},{scale:sparkle[i]},{rotate:sparkle[i].interpolate({inputRange:[0,1],outputRange:['-40deg','0deg']})}],opacity:sparkle[i]}}>✦</Animated.Text>)}
      <Animated.View style={{alignItems:'center',transform:[{translateY:pop.interpolate({inputRange:[0,1],outputRange:[60,0]})},{scale:pop.interpolate({inputRange:[0,1],outputRange:[0.3,1]})},{rotate:wave.interpolate({inputRange:[-1,1],outputRange:['-6deg','6deg']})}],opacity:pop.interpolate({inputRange:[0,0.3,1],outputRange:[0,1,1]})}}>
        <Image source={mascot} style={{width:imageW,height:imageH,transform:[{translateX:-imageW*0.025},{translateY:-imageH*0.03}]}} resizeMode="contain" accessibilityIgnoresInvertColors/>
      </Animated.View>
      <Animated.View style={{position:'absolute',top:height/2+imageH*0.42+14,left:0,right:0,alignItems:'center',gap:4,opacity:title,transform:[{translateY:title.interpolate({inputRange:[0,1],outputRange:[18,0]})}]}}>
        <Text style={{fontFamily:'NotoLatinBold',fontSize:26,color:'#ffffff'}}>Expense Tracker</Text>
        <Text style={{fontFamily:'NotoThai',fontSize:13,color:'#e6e8ff'}}>สวัสดี! มาดูกันว่าวันนี้ใช้ไปเท่าไหร่</Text>
      </Animated.View>
    </LinearGradient>
  </Animated.View>;
}
