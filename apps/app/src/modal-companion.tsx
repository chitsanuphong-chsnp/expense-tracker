import React from 'react';
import {Image,View} from 'react-native';
import type {MascotPose} from './companion';
import {T,C,s} from './ui';

type ModalPose=Extract<MascotPose,'reading'|'thinking'|'celebrate'>;
const artwork={reading:require('../assets/mascot/reading-v2.png'),thinking:require('../assets/mascot/thinking-v2.png'),celebrate:require('../assets/mascot/celebrate-v2.png')};

// Dialog artwork is a static image, with no animation loops or focusable control.
export function ModalCompanion({title,description,pose='reading',action,compact=false}:{title:string;description?:string;pose?:ModalPose;action?:React.ReactNode;compact?:boolean}){
  const size=compact?42:56;
  return <View testID="modal-companion" style={{flexDirection:'row',alignItems:'center',gap:compact?8:12}}>
    <Image testID="modal-mascot" source={artwork[pose]} accessible={false} resizeMode="contain" style={{width:size,height:size*342/280,flexShrink:0}}/>
    <View style={{flex:1,minWidth:0,gap:4}}><T style={[s.bold,{fontSize:compact?14:17,flexShrink:1}]}>{title}</T>{!!description&&<T style={{fontSize:11,color:C.muted}}>{description}</T>}</View>
    {action}
  </View>;
}
