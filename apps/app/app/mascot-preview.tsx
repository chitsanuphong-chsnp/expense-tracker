import React,{useState,useEffect} from 'react';
import {View,Platform} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {Card,T,C,Choices,s} from '../src/ui';
import {Mascot,mascotPoses,type MascotPose} from '../src/companion';

export default function MascotPreview(){
  const [pose,setPose]=useState<MascotPose>('wave');
  const {perf}=useLocalSearchParams<{perf?:string}>(),[sample,setSample]=useState('');
  useEffect(()=>{
    // Local QA opt-in only, never included in the visible product flow or sent anywhere.
    if(Platform.OS!=='web'||perf!=='1'||!['localhost','127.0.0.1'].includes(window.location.hostname))return;
    let frame=0,count=0,previous=0;const values:number[]=[],transforms=new Set<string>();
    setSample('sampling');
    const tick=(time:number)=>{
      count++;
      if(count>30){if(previous)values.push(time-previous);previous=time;const node=document.querySelector(`[data-testid="mascot-pose-${pose}"]`);if(node)transforms.add(getComputedStyle(node).transform);}
      if(count<151)frame=requestAnimationFrame(tick);
      else{const sorted=values.slice().sort((a,b)=>a-b);setSample(JSON.stringify({fps:Math.round(values.length*10000/values.reduce((a,b)=>a+b,0))/10,medianMs:sorted[Math.floor(sorted.length/2)],p95Ms:sorted[Math.floor(sorted.length*.95)],changedTransforms:transforms.size}));}
    };
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[perf,pose]);
  return <Card style={{alignSelf:'center',width:'100%',maxWidth:620,gap:20}}><T style={[s.bold,{fontSize:20}]}>เพื่อนช่วยจดของคุณ</T><View style={{alignItems:'center',paddingVertical:18,backgroundColor:'#f3f1fc',borderRadius:24}}><Mascot size={220} pose={pose} auto={false} onPoseChange={setPose}/></View><Choices value={pose} onChange={value=>setPose(value as MascotPose)} items={mascotPoses.map(p=>({id:p.id,name:p.name}))}/><T style={{fontSize:12,color:C.muted}}>แตะตัวละครหรือเลือกท่าที่ชอบได้เลย</T>{perf==='1'&&<View style={{position:'absolute',width:0,height:0,overflow:'hidden'}} accessibilityElementsHidden><T testID="mascot-frame-sample">{sample}</T></View>}</Card>;
}
