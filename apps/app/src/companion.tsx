import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,Image,Platform,View} from 'react-native';
import {T,C} from './ui';
import {useMotion,MotionPressable} from './motion';

export const mascotPoses=[{id:'wave',name:'โบกมือ'},{id:'idle',name:'ยิ้มทักทาย'},{id:'reading',name:'อ่านสมุด'},{id:'thinking',name:'ครุ่นคิด'},{id:'celebrate',name:'ดีใจ'}] as const;
export type MascotPose=typeof mascotPoses[number]['id'];
// Complete drawings preserve the shoulder/elbow anatomy. The old torso already
// included both arms, so attaching a separate waving arm produced an extra limb.
const artwork=[require('../assets/mascot/wave-v1.png'),require('../assets/mascot/idle-v1.png'),require('../assets/mascot/reading-v2.png'),require('../assets/mascot/thinking-v2.png'),require('../assets/mascot/celebrate-v2.png')];
// Normalize transparent margins in layout only; original PNGs stay unchanged.
// All poses share the same visual top (13), baseline (328) and center (140).
const framing=[{x:52,y:55,width:191,height:254},{x:66,y:48,width:178,height:255},null,null,null];
const web=Platform.OS==='web';
const css=`
@keyframes expenseMascotBreathe{0%,100%{transform:translateY(0)}50%{transform:translateY(var(--mascot-breath))}}
@keyframes expenseMascotWavePose{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}}
@keyframes expenseMascotIdlePose{0%,100%{transform:rotate(-.6deg)}50%{transform:rotate(.6deg)}}
@keyframes expenseMascotRead{0%,100%{transform:rotate(-1deg)}50%{transform:rotate(1deg)}}
@keyframes expenseMascotThink{0%,100%{transform:rotate(-1deg)}50%{transform:rotate(1deg)}}
@keyframes expenseMascotCheer{0%,35%,65%,100%{transform:translateY(0) rotate(0)}45%{transform:translateY(var(--mascot-hop)) rotate(-2deg)}55%{transform:translateY(var(--mascot-breath)) rotate(2deg)}}
`;
const gestureNames=['expenseMascotWavePose','expenseMascotIdlePose','expenseMascotRead','expenseMascotThink','expenseMascotCheer'];
function webAnimation(name:string,duration:number,enabled:boolean):any{return web?{animationName:enabled?name:'none',animationDuration:`${duration}ms`,animationTimingFunction:'ease-in-out',animationIterationCount:'infinite',willChange:enabled?'transform':undefined}:{};}

// Web transforms run on the compositor; native transforms/opacity use the UI
// thread. React updates only for pose changes, never on each animation frame.
export function Mascot({size=92,pose:controlled,auto=true,onPoseChange,interactive=true}:{size?:number;pose?:MascotPose;auto?:boolean;onPoseChange?:(pose:MascotPose)=>void;interactive?:boolean}){
  const {active,reduced}=useMotion(),[localPose,setLocalPose]=useState<MascotPose>('wave'),pose=controlled??localPose;
  const enabled=active&&!reduced,f=size/280,layer=mascotPoses.findIndex(p=>p.id===pose);
  const breathe=useRef(new Animated.Value(0)).current,motion=useRef(new Animated.Value(0)).current;
  const layers=useRef(mascotPoses.map((_,i)=>new Animated.Value(i===layer?1:0))).current;
  useEffect(()=>{if(web&&typeof document!=='undefined'&&!document.getElementById('expense-mascot-motion-v3')){const element=document.createElement('style');element.id='expense-mascot-motion-v3';element.textContent=css;document.head.appendChild(element);}},[]);
  useEffect(()=>{if(!auto||controlled||!enabled)return;const timer=setTimeout(()=>setLocalPose(mascotPoses[(layer+1)%mascotPoses.length].id),8500);return()=>clearTimeout(timer);},[auto,controlled,enabled,layer]);
  useEffect(()=>{
    if(web)return;
    const animation=Animated.parallel(layers.map((opacity,i)=>Animated.timing(opacity,{toValue:i===layer?1:0,duration:reduced?0:200,useNativeDriver:true,isInteraction:false})));
    animation.start();return()=>animation.stop();
  },[layer,reduced,layers]);
  useEffect(()=>{
    breathe.setValue(0);motion.setValue(0);if(web||!enabled)return;
    const timing=(value:Animated.Value,toValue:number,duration:number)=>Animated.timing(value,{toValue,duration,easing:Easing.inOut(Easing.sin),useNativeDriver:true,isInteraction:false});
    const breathLoop=Animated.loop(Animated.sequence([timing(breathe,1,2500),timing(breathe,0,2500)]));
    const duration=pose==='celebrate'?1500:pose==='wave'?1600:2500;
    const gestureLoop=Animated.loop(Animated.sequence([timing(motion,1,duration),timing(motion,0,duration)]));
    breathLoop.start();gestureLoop.start();
    return()=>{breathLoop.stop();gestureLoop.stop();breathe.stopAnimation();motion.stopAnimation();};
  },[enabled,pose,breathe,motion]);
  function next(){const value=mascotPoses[(layer+1)%mascotPoses.length].id;setLocalPose(value);onPoseChange?.(value);}
  const opacity=(index:number):any=>web?{opacity:index===layer?1:0,transition:reduced?'none':'opacity 200ms ease'}:{opacity:layers[index]};
  const nativeMotion=!web&&enabled;
  const sizeStyle={width:size,height:size*342/280,flexShrink:0};
  const figure=<Animated.View testID="mascot-motion" pointerEvents="none" style={[{width:'100%',height:'100%',transformOrigin:'50% 80%'},web?{'--mascot-breath':`${-3*f}px`,'--mascot-hop':`${-8*f}px`} as any:{},nativeMotion&&{transform:[{translateY:breathe.interpolate({inputRange:[0,1],outputRange:[0,-3*f]})}]},webAnimation('expenseMascotBreathe',5000,enabled)]}>
      {artwork.map((source,index)=>{
        const crop=framing[index],scale=crop?315/crop.height:1;
        const imageStyle=crop?{position:'absolute' as const,left:(140-(crop.x+crop.width/2)*scale)*f,top:(13-crop.y*scale)*f,width:280*scale*f,height:342*scale*f}:{width:'100%' as const,height:'100%' as const};
        const angle=index===0?1.5:index===1?.6:1;
        return <Animated.View key={index} testID={`mascot-pose-${mascotPoses[index].id}`} style={[{position:'absolute',inset:0,transformOrigin:'50% 85%'},opacity(index),nativeMotion&&layer===index&&{transform:pose==='celebrate'?[{translateY:motion.interpolate({inputRange:[0,.5,1],outputRange:[0,-8*f,0]})},{rotate:motion.interpolate({inputRange:[0,1],outputRange:['-2deg','2deg']})}]:[{rotate:motion.interpolate({inputRange:[0,1],outputRange:[`${-angle}deg`,`${angle}deg`]})}]},webAnimation(gestureNames[index],index===0?3200:index===4?3000:5000,enabled&&layer===index)]}><Image source={source} accessible={false} resizeMode="contain" style={imageStyle}/></Animated.View>;
      })}
    </Animated.View>;
  if(!interactive)return <View accessible={false} pointerEvents="none" style={sizeStyle}>{figure}</View>;
  return <MotionPressable accessibilityRole="button" accessibilityLabel={`ตัวละคร ${mascotPoses[layer].name} แตะเพื่อเปลี่ยนท่า`} onPress={next} hitSlop={6} style={sizeStyle}>{figure}</MotionPressable>;
}
export function Companion({title,text}:{title:string;text:string}){
  return <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:12,paddingVertical:7,backgroundColor:'#eeedf9',borderRadius:20,overflow:'hidden'}}><Mascot size={68}/><View style={{flex:1,minWidth:0,gap:5}}><T style={{fontFamily:'NotoThaiBold',fontSize:12,color:'#5d5a85'}}>{title}</T><T style={{fontSize:10,color:C.muted}}>{text}</T><T style={{fontSize:9,color:'#9491ae'}}>แตะน้องเพื่อเปลี่ยนท่า</T></View></View>;
}
