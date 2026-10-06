import React,{useEffect,useState} from 'react';
import {View,Image,Modal} from 'react-native';
import {Receipt,Expand} from 'lucide-react-native';
import {useData} from './state';
import {T,C,s,Button} from './ui';
import {Loading,MotionPressable,useMotion} from './motion';
import {ModalCompanion} from './modal-companion';

export function SlipImage({id,height=270}:{id:string;height?:number}){
  const state=useData(),{reduced}=useMotion(),[uri,setUri]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[zoom,setZoom]=useState(false);
  useEffect(()=>{let alive=true;setLoading(true);setUri('');setError('');
    state.image(id).then(value=>{if(alive)setUri(value);}).catch(e=>{if(alive)setError(e instanceof Error?e.message:'โหลดภาพไม่สำเร็จ');}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[id,attempt,state.demo,state.session?.access_token]);
  return <View style={{gap:8}}><View style={s.between}><T style={s.label}>ภาพสลิป</T>{uri&&<T style={{fontSize:10,color:C.muted}}>แตะเพื่อขยาย</T>}</View>
    {loading?<View style={{minHeight:height,justifyContent:'center',backgroundColor:'#f5f7fc',borderRadius:18}}><Loading label="กำลังโหลดภาพสลิป"/></View>:uri?<MotionPressable accessibilityRole="button" accessibilityLabel="ขยายภาพสลิป" onPress={()=>setZoom(true)} style={{backgroundColor:'#f5f7fc',borderRadius:18,overflow:'hidden'}}><Image source={{uri}} resizeMode="contain" style={{width:'100%',height}} accessibilityLabel="ภาพสลิปธนาคาร"/><View style={{position:'absolute',right:10,bottom:10,backgroundColor:'white',padding:8,borderRadius:10}}><Expand size={16} color={C.primary}/></View></MotionPressable>:<View style={{minHeight:150,justifyContent:'center',alignItems:'center',backgroundColor:'#f5f7fc',borderRadius:18,gap:10,padding:18}}><Receipt size={26} color='#a6b1cd'/><T style={[s.muted,{textAlign:'center'}]}>{state.demo?'ไม่มีภาพสลิปจริงในโหมดตัวอย่าง':error}</T>{!state.demo&&<Button secondary onPress={()=>setAttempt(v=>v+1)}>โหลดภาพอีกครั้ง</Button>}</View>}
    <Modal visible={zoom} animationType={reduced?'none':'fade'} onRequestClose={()=>setZoom(false)}><View style={{flex:1,backgroundColor:'#f3f5fa',padding:22,paddingTop:55,gap:12}}>{zoom&&<ModalCompanion compact title="ภาพสลิป" pose="reading" action={<Button secondary onPress={()=>setZoom(false)}>ปิด</Button>}/>}<Image source={{uri}} accessibilityLabel="ภาพสลิปขยาย" resizeMode="contain" style={{flex:1,width:'100%'}}/></View></Modal>
  </View>;
}
