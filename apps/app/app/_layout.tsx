import React from 'react';
import {tone} from '../src/theme';
import {Slot,Redirect,usePathname,useGlobalSearchParams} from 'expo-router';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {useFonts} from 'expo-font';
import {DataProvider,useData} from '../src/state';
import {Frame,C} from '../src/ui';
import {safeReturnPath} from '../src/auth-policy';
import {Loading,MotionProvider} from '../src/motion';
import {ThemeProvider,useTheme} from '../src/theme-provider';
import {OpeningAnimation} from '../src/splash';
import {SuccessProvider} from '../src/success';
import {LinearGradient} from 'expo-linear-gradient';

function Gate(){const state=useData(),path=usePathname(),params=useGlobalSearchParams();
  if(!state.ready)return <Loading fullScreen label="กำลังเตรียมสมุดบันทึก"/>;
  if(state.recovery&&path!=='/auth/reset-password'&&path!=='/auth/callback')return <Redirect href="/auth/reset-password"/>;
  if(['/login','/auth/callback','/auth/reset-password'].includes(path))return <Slot/>;
  if(state.session||state.demo)return <Frame><Slot/></Frame>;
  const query=new URLSearchParams();for(const key of ['id','slip'])if(typeof params[key]==='string')query.set(key,params[key] as string);
  return <Redirect href={{pathname:'/login',params:{next:safeReturnPath(path+(query.size?`?${query}`:''))}}}/>;
}
export default function Layout(){const [fonts,error]=useFonts({NotoThai:require('@expo-google-fonts/noto-sans-thai/400Regular/NotoSansThai_400Regular.ttf'),NotoThaiBold:require('@expo-google-fonts/noto-sans-thai/600SemiBold/NotoSansThai_600SemiBold.ttf'),NotoLatin:require('@expo-google-fonts/noto-sans/400Regular/NotoSans_400Regular.ttf'),NotoLatinBold:require('@expo-google-fonts/noto-sans/600SemiBold/NotoSans_600SemiBold.ttf')});
  return <ThemeProvider><Shell fontsReady={!!fonts||!!error}/></ThemeProvider>;
}
function Shell({fontsReady}:{fontsReady:boolean}){
  const path=usePathname(),authPage=path==='/login'||path.startsWith('/auth/'),{dark}=useTheme(),[intro,setIntro]=React.useState(true);
  return <MotionProvider><SafeAreaProvider><SafeAreaView style={{flex:1,backgroundColor:authPage?tone('#0d1120'):C.bg}} edges={['top','left','right','bottom']}><StatusBar style={authPage||dark?'light':'dark'}/>{!fontsReady?<LinearGradient colors={['#1d2470','#4a3fb8','#7a4fd0']} start={{x:0.1,y:0}} end={{x:0.9,y:1}} style={{flex:1}}/>:<DataProvider><SuccessProvider><Gate key={dark?'dark':'light'}/></SuccessProvider></DataProvider>}{fontsReady&&intro&&<OpeningAnimation onDone={()=>setIntro(false)}/>}</SafeAreaView></SafeAreaProvider></MotionProvider>;
}
