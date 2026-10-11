import React,{createContext,useContext,useEffect,useState} from 'react';
import {Platform,useColorScheme} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {applyTheme,C} from './ui';
import type {ThemeMode} from './theme';

const key='expense.theme';
const Context=createContext<{mode:ThemeMode;dark:boolean;setMode:(mode:ThemeMode)=>void}>({mode:'system',dark:false,setMode:()=>{}});
// Per-device preference; "system" follows the phone/browser setting.
export function ThemeProvider({children}:{children:React.ReactNode}){
  const system=useColorScheme(),[mode,setModeState]=useState<ThemeMode>('system');
  useEffect(()=>{AsyncStorage.getItem(key).then(v=>{if(v==='light'||v==='dark'||v==='system')setModeState(v);}).catch(()=>{});},[]);
  const dark=mode==='dark'||(mode==='system'&&system==='dark');
  applyTheme(dark); // before children render; the layout remounts the screens when this changes
  useEffect(()=>{if(Platform.OS==='web'&&typeof document!=='undefined'){document.body.style.backgroundColor=C.bg;document.documentElement.style.colorScheme=dark?'dark':'light';}},[dark]);
  const setMode=(next:ThemeMode)=>{setModeState(next);AsyncStorage.setItem(key,next).catch(()=>{});};
  return <Context.Provider value={{mode,dark,setMode}}>{children}</Context.Provider>;
}
export const useTheme=()=>useContext(Context);
