import React,{useEffect,useRef} from 'react';
import {Animated,Easing,Image,Modal,Platform,Pressable,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MessageCircle,X} from 'lucide-react-native';
import {T,C,s} from './ui';
import {MotionPressable,useMotion} from './motion';

// UI simulation only: uses the actual Flex altText. No notification permission,
// LINE API call, sound, vibration, or background delivery is requested here.
export function NotificationPreview({text,onClose}:{text:string;onClose:()=>void}){
  const {reduced,active}=useMotion(),insets=useSafeAreaInsets();
  const progress=useRef(new Animated.Value(reduced?1:0)).current,closing=useRef(false);
  useEffect(()=>{
    if(closing.current){onClose();return;}
    if(reduced||!active){progress.stopAnimation();progress.setValue(1);return;}
    progress.setValue(0);
    const animation=Animated.spring(progress,{toValue:1,stiffness:210,damping:23,mass:.8,useNativeDriver:Platform.OS!=='web',isInteraction:false});
    animation.start();return()=>animation.stop();
  },[progress,reduced,active]);
  function dismiss(){
    if(closing.current)return;closing.current=true;
    if(reduced){onClose();return;}
    Animated.timing(progress,{toValue:0,duration:180,easing:Easing.in(Easing.cubic),useNativeDriver:Platform.OS!=='web',isInteraction:false}).start(({finished})=>{if(finished)onClose();});
  }
  return <Modal transparent visible animationType="none" onRequestClose={dismiss}>
    <View style={{flex:1}}><Pressable accessibilityRole="button" accessibilityLabel="ปิดตัวอย่างแจ้งเตือน" onPress={dismiss} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
      <Animated.View accessibilityLiveRegion="polite" style={{position:'absolute',top:Math.max(insets.top,12),left:12,right:12,maxWidth:430,alignSelf:'center',marginHorizontal:'auto',borderRadius:24,padding:16,gap:8,backgroundColor:'#f7f8fc',borderWidth:1,borderColor:'white',boxShadow:'0 12px 35px rgba(31,45,74,.18)',opacity:progress,transform:[{translateY:progress.interpolate({inputRange:[0,1],outputRange:[-160,0]})}]}}>
        <View style={s.between}><View style={{flexDirection:'row',alignItems:'center',gap:7}}><MessageCircle size={15} color='#159554'/><T style={{fontFamily:'NotoLatinBold',fontSize:11,color:'#667085'}}>LINE</T><View style={{paddingHorizontal:7,paddingVertical:2,borderRadius:7,backgroundColor:'#e4e9f3'}}><T style={{fontSize:10,color:C.muted}}>ตัวอย่าง</T></View></View><View style={{flexDirection:'row',alignItems:'center',gap:8}}><T style={{fontSize:10,color:C.muted}}>เมื่อสักครู่</T><MotionPressable accessibilityRole="button" accessibilityLabel="ปิด Noti" hitSlop={10} onPress={dismiss} style={{padding:3}}><X size={16} color='#8792a6'/></MotionPressable></View></View>
        <MotionPressable accessibilityRole="button" accessibilityLabel="เปิดข้อความ Flex ตัวอย่าง" onPress={dismiss} style={{flexDirection:'row',gap:12,alignItems:'center'}}><View style={{width:54,height:58,borderRadius:14,backgroundColor:'#eeecfa',alignItems:'center',justifyContent:'center',overflow:'hidden'}}><Image source={require('../assets/mascot/reading-v2.png')} accessibilityLabel="ตัวละครใน Noti ตัวอย่าง" resizeMode="contain" style={{width:50,height:54}}/></View><View style={{flex:1,gap:3}}><T style={[s.bold,{fontSize:14}]}>Expense Tracker</T><T style={{fontSize:13,lineHeight:21}}>{text}</T><T style={{fontSize:10,color:C.muted}}>แตะเพื่อดู Flex ตัวอย่าง</T></View></MotionPressable>
      </Animated.View>
    </View>
  </Modal>;
}
