import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {Animated,Easing,Modal,Platform,Pressable,View} from 'react-native';
import {Check} from 'lucide-react-native';
import {T,C} from './ui';
import {tone} from './theme';
import {useMotion} from './motion';

const native=Platform.OS!=='web';
type Show=(message:string)=>void;
const Context=createContext<Show>(()=>{});
// After an action succeeds: a check pops in a green circle with one soft ring, then closes by itself (~1.2 s).
// Tap anywhere to close sooner. With reduced motion it simply appears and closes.
export function SuccessProvider({children}:{children:React.ReactNode}){
  const [message,setMessage]=useState<string|null>(null),[key,setKey]=useState(0);
  const show=useCallback<Show>(text=>{setMessage(text);setKey(k=>k+1);},[]);
  return <Context.Provider value={show}>{children}{message!==null&&<SuccessModal key={key} message={message} onDone={()=>setMessage(null)}/>}</Context.Provider>;
}
export const useSuccess=()=>useContext(Context);

function SuccessModal({message,onDone}:{message:string;onDone:()=>void}){
  const {reduced}=useMotion();
  const v=()=>new Animated.Value(reduced?1:0);
  const fade=useRef(v()).current,pop=useRef(v()).current,tick=useRef(v()).current,ring=useRef(new Animated.Value(reduced?1:0)).current;
  const closing=useRef(false);
  const close=useCallback(()=>{
    if(closing.current)return;closing.current=true;
    if(reduced)return onDone();
    Animated.timing(fade,{toValue:0,duration:180,easing:Easing.in(Easing.quad),useNativeDriver:native}).start(()=>onDone());
  },[reduced]);
  useEffect(()=>{
    if(!reduced)Animated.parallel([
      Animated.timing(fade,{toValue:1,duration:160,useNativeDriver:native}),
      Animated.spring(pop,{toValue:1,friction:5,tension:160,useNativeDriver:native}),
      Animated.sequence([Animated.delay(140),Animated.spring(tick,{toValue:1,friction:5,tension:180,useNativeDriver:native})]),
      Animated.sequence([Animated.delay(120),Animated.timing(ring,{toValue:1,duration:650,easing:Easing.out(Easing.quad),useNativeDriver:native})]),
    ]).start();
    const timer=setTimeout(close,1200);
    return()=>clearTimeout(timer);
  },[]);
  const size=76;
  return <Modal transparent visible animationType="none" onRequestClose={close}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${message} แตะเพื่อปิด`} onPress={close} style={{flex:1}}>
      <Animated.View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:tone('#20305040'),opacity:fade}}>
        <Animated.View accessibilityLiveRegion="polite" style={{minWidth:200,maxWidth:300,paddingVertical:26,paddingHorizontal:28,borderRadius:26,backgroundColor:tone('#ffffff'),alignItems:'center',gap:16,boxShadow:'0 18px 44px rgba(20,30,70,.22)',
          transform:[{scale:pop.interpolate({inputRange:[0,1],outputRange:[0.85,1]})}]}}>
          <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}>
            <Animated.View pointerEvents="none" style={{position:'absolute',width:size,height:size,borderRadius:size/2,borderWidth:3,borderColor:'#2fb38a',
              opacity:ring.interpolate({inputRange:[0,0.1,1],outputRange:[0,0.5,0]}),transform:[{scale:ring.interpolate({inputRange:[0,1],outputRange:[1,1.7]})}]}}/>
            <Animated.View style={{width:size,height:size,borderRadius:size/2,backgroundColor:'#2fb38a',alignItems:'center',justifyContent:'center',
              transform:[{scale:pop.interpolate({inputRange:[0,1],outputRange:[0.3,1]})}]}}>
              <Animated.View style={{opacity:tick,transform:[{scale:tick.interpolate({inputRange:[0,1],outputRange:[0.2,1]})},{rotate:tick.interpolate({inputRange:[0,1],outputRange:['-25deg','0deg']})}]}}>
                <Check size={40} color="#ffffff" strokeWidth={3.4}/>
              </Animated.View>
            </Animated.View>
          </View>
          <T style={{fontFamily:'NotoThaiBold',fontSize:15,color:C.ink,textAlign:'center'}}>{message}</T>
        </Animated.View>
      </Animated.View>
    </Pressable>
  </Modal>;
}
