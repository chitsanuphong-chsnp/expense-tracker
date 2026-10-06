import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,AppState,Easing,Platform,Pressable,Text,View,type PressableProps,type StyleProp,type ViewStyle} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {LinearGradient} from 'expo-linear-gradient';
import {Wallet} from 'lucide-react-native';

const preferenceKey='shzr.reduce-motion';
const nativeDriver=Platform.OS!=='web';
const MotionContext=createContext({reduced:true,manual:false,system:false,active:true,setManual:(_value:boolean)=>{}});

// One shared preference and visibility listener; no per-card polling or render loops.
export function MotionProvider({children}:{children:React.ReactNode}){
  const [system,setSystem]=useState(()=>Platform.OS==='web'&&typeof window!=='undefined'?window.matchMedia('(prefers-reduced-motion: reduce)').matches:true);
  const [manual,setManualState]=useState(false),[active,setActive]=useState(true);
  const preferenceChanged=useRef(false);
  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(preferenceKey).then(value=>{if(alive&&!preferenceChanged.current)setManualState(value==='true');}).catch(()=>{});
    if(Platform.OS==='web'){
      const media=window.matchMedia('(prefers-reduced-motion: reduce)');
      const change=()=>setSystem(media.matches),visibility=()=>setActive(!document.hidden);
      change();visibility();media.addEventListener('change',change);document.addEventListener('visibilitychange',visibility);
      return()=>{alive=false;media.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);};
    }
    AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(alive)setSystem(value);}).catch(()=>{});
    const motion=AccessibilityInfo.addEventListener('reduceMotionChanged',setSystem);
    setActive(AppState.currentState==null||AppState.currentState==='active');
    const visibility=AppState.addEventListener('change',value=>setActive(value==='active'));
    return()=>{alive=false;motion.remove();visibility.remove();};
  },[]);
  function setManual(value:boolean){preferenceChanged.current=true;setManualState(value);void AsyncStorage.setItem(preferenceKey,String(value)).catch(()=>{});}
  return <MotionContext.Provider value={{reduced:system||manual,manual,system,active,setManual}}>{children}</MotionContext.Provider>;
}
export const useMotion=()=>useContext(MotionContext);

export function useReveal(delay=0,replayKey:unknown='mount'){
  const {reduced}=useMotion(),progress=useRef(new Animated.Value(1)).current;
  useEffect(()=>{
    progress.stopAnimation();
    if(reduced){progress.setValue(1);return;}
    progress.setValue(0);
    const animation=Animated.timing(progress,{toValue:1,duration:420,delay,easing:Easing.out(Easing.cubic),useNativeDriver:nativeDriver,isInteraction:false});
    animation.start();return()=>animation.stop();
  },[progress,reduced,delay,replayKey]);
  return {opacity:progress,transform:[{translateY:progress.interpolate({inputRange:[0,1],outputRange:[14,0]})}]};
}
export function Reveal({children,style,delay=0,replayKey}:{children:React.ReactNode;style?:StyleProp<ViewStyle>;delay?:number;replayKey?:unknown}){
  const animation=useReveal(delay,replayKey);
  return <Animated.View style={[style,animation]}>{children}</Animated.View>;
}

const AnimatedPressable=Animated.createAnimatedComponent(Pressable);
export function MotionPressable({style,disabled,onPressIn,onPressOut,onHoverIn,onHoverOut,...props}:Omit<PressableProps,'style'>&{style?:StyleProp<ViewStyle>}){
  const {reduced}=useMotion(),scale=useRef(new Animated.Value(1)).current,lift=useRef(new Animated.Value(0)).current;
  useEffect(()=>{scale.stopAnimation();lift.stopAnimation();scale.setValue(1);lift.setValue(0);return()=>{scale.stopAnimation();lift.stopAnimation();};},[reduced,disabled,scale,lift]);
  function animate(value:Animated.Value,toValue:number){if(reduced||disabled)return;Animated.spring(value,{toValue,stiffness:360,damping:24,mass:.7,useNativeDriver:nativeDriver,isInteraction:false}).start();}
  return <AnimatedPressable {...props} disabled={disabled} onPressIn={event=>{animate(scale,.97);onPressIn?.(event);}} onPressOut={event=>{animate(scale,1);onPressOut?.(event);}} onHoverIn={event=>{animate(lift,-2);onHoverIn?.(event);}} onHoverOut={event=>{animate(lift,0);onHoverOut?.(event);}} style={[style,{transform:[{translateY:lift},{scale}]}]}/>;
}

function useLoop(duration:number,pulse=false){
  const {reduced,active}=useMotion(),value=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    value.stopAnimation();value.setValue(0);
    if(reduced||!active)return;
    const step=(toValue:number)=>Animated.timing(value,{toValue,duration,easing:pulse?Easing.inOut(Easing.sin):Easing.linear,useNativeDriver:nativeDriver,isInteraction:false});
    const animation=Animated.loop(pulse?Animated.sequence([step(1),step(0)]):step(1));
    animation.start();return()=>{animation.stop();value.stopAnimation();};
  },[value,reduced,active,duration,pulse]);
  return value;
}

export function Spinner({size=18,color='#5668df'}:{size?:number;color?:string}){
  const progress=useLoop(950);
  return <Animated.View accessible={false} style={{width:size,height:size,borderRadius:size/2,borderWidth:size>40?3:2,borderColor:`${color}30`,borderTopColor:color,borderRightColor:color,transform:[{rotate:progress.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']})}]}}/>;
}
export function Loading({label='กำลังโหลดข้อมูล',fullScreen=false,fontsReady=true}:{label?:string;fullScreen?:boolean;fontsReady?:boolean}){
  const font=fontsReady?'NotoThai':undefined;
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{busy:true}} style={fullScreen?{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#f3f5fa',gap:24,padding:24}:{alignItems:'center',justifyContent:'center',padding:24,gap:12}}>
    {fullScreen?<><View style={{width:100,height:100,alignItems:'center',justifyContent:'center'}}><View style={{position:'absolute'}}><Spinner size={98} color='#7980e8'/></View><LinearGradient colors={['#5277e5','#8160d2']} style={{width:72,height:72,borderRadius:23,alignItems:'center',justifyContent:'center',boxShadow:'0 8px 22px rgba(86,104,223,.20)'}}><Wallet size={30} color="white"/></LinearGradient></View><View style={{gap:6,alignItems:'center'}}><Text style={{fontFamily:fontsReady?'NotoLatinBold':undefined,fontSize:22,color:'#253044'}}>Expense Tracker</Text><Text style={{fontFamily:font,fontSize:13,color:'#657187'}}>{label}…</Text></View></>:<><Spinner size={28}/><Text style={{fontFamily:font,color:'#657187',fontSize:12}}>{label}…</Text></>}
  </View>;
}

export function DataSkeleton(){
  const progress=useLoop(850,true);
  const block=(width:any,height:number,color='#e1e6f2')=><View style={{width,height,backgroundColor:color,borderRadius:10}}/>;
  return <View accessibilityRole="progressbar" accessibilityLabel="กำลังโหลดข้อมูลรายการ" accessibilityState={{busy:true}} style={{gap:16}}><Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{gap:16,opacity:progress.interpolate({inputRange:[0,1],outputRange:[.55,1]})}}>
    <View style={{padding:25,borderRadius:24,backgroundColor:'#e8ecfb',gap:18}}>{block('30%',16)}{block('65%',42)}{block('45%',12)}</View>
    <View style={{flexDirection:'row',gap:14}}>{[0,1,2].map(i=><View key={i} style={{flex:1,padding:18,borderRadius:19,backgroundColor:'white',gap:16}}>{block(24,24)}{block('75%',12)}{block('90%',24)}</View>)}</View>
    <View style={{padding:20,borderRadius:22,backgroundColor:'white',gap:22}}>{block('40%',18)}{[0,1,2].map(i=><View key={i} style={{flexDirection:'row',gap:16,alignItems:'center'}}>{block(42,42)}<View style={{flex:1,gap:9}}>{block('65%',14)}{block('42%',10)}</View>{block(55,17)}</View>)}</View>
  </Animated.View></View>;
}

export function GrowingBar({height,color,label,index=0,replayKey}:{height:number;color:string;label:string;index?:number;replayKey?:unknown}){
  const {reduced}=useMotion(),progress=useRef(new Animated.Value(1)).current;
  useEffect(()=>{
    progress.stopAnimation();if(reduced){progress.setValue(1);return;}
    progress.setValue(.05);
    const animation=Animated.timing(progress,{toValue:1,duration:520,delay:Math.min(index*25,180),easing:Easing.out(Easing.cubic),useNativeDriver:nativeDriver,isInteraction:false});
    animation.start();return()=>animation.stop();
  },[progress,reduced,height,index,replayKey]);
  // Translate compensates center-origin scaling, keeping the baseline stationary.
  return <Animated.View accessibilityLabel={label} style={{width:'100%',maxWidth:44,height,borderRadius:7,backgroundColor:color,transform:[{translateY:progress.interpolate({inputRange:[0,1],outputRange:[height/2,0]})},{scaleY:progress}]}}/>;
}
