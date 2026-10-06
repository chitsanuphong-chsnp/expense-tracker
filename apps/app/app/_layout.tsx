import React from 'react';
import {Slot,Redirect,usePathname,useGlobalSearchParams} from 'expo-router';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {useFonts} from 'expo-font';
import {DataProvider,useData} from '../src/state';
import {Frame,C} from '../src/ui';
import {safeReturnPath} from '../src/auth-policy';
import {Loading,MotionProvider} from '../src/motion';

function Gate(){const state=useData(),path=usePathname(),params=useGlobalSearchParams();
  if(!state.ready)return <Loading fullScreen label="กำลังเตรียมสมุดบันทึก"/>;
  if(state.recovery&&path!=='/auth/reset-password'&&path!=='/auth/callback')return <Redirect href="/auth/reset-password"/>;
  if(['/login','/auth/callback','/auth/reset-password'].includes(path))return <Slot/>;
  if(state.session||state.demo)return <Frame><Slot/></Frame>;
  const query=new URLSearchParams();for(const key of ['id','slip'])if(typeof params[key]==='string')query.set(key,params[key] as string);
  return <Redirect href={{pathname:'/login',params:{next:safeReturnPath(path+(query.size?`?${query}`:''))}}}/>;
}
export default function Layout(){const [fonts,error]=useFonts({NotoThai:require('@expo-google-fonts/noto-sans-thai/400Regular/NotoSansThai_400Regular.ttf'),NotoThaiBold:require('@expo-google-fonts/noto-sans-thai/600SemiBold/NotoSansThai_600SemiBold.ttf'),NotoLatin:require('@expo-google-fonts/noto-sans/400Regular/NotoSans_400Regular.ttf'),NotoLatinBold:require('@expo-google-fonts/noto-sans/600SemiBold/NotoSans_600SemiBold.ttf')});
  const path=usePathname(),authPage=path==='/login'||path.startsWith('/auth/');
  return <MotionProvider><SafeAreaProvider><SafeAreaView style={{flex:1,backgroundColor:authPage?'#0d1120':C.bg}} edges={['top','left','right','bottom']}><StatusBar style={authPage?'light':'dark'}/>{!fonts&&!error?<Loading fullScreen fontsReady={false} label="กำลังเปิดแอป"/>:<DataProvider><Gate/></DataProvider>}</SafeAreaView></SafeAreaProvider></MotionProvider>;
}
