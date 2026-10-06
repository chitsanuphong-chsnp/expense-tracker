import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import {createClient} from '@supabase/supabase-js';
import {RememberedAuthStorage,memoryStore,type Store} from './auth-storage';
import {createAuthService} from './auth-service';
import {secureChunks} from './secure-chunks';
const web=Platform.OS==='web';
function browserStore(name:'localStorage'|'sessionStorage'):Store{return {getItem:async k=>typeof window==='undefined'?null:window[name].getItem(k),setItem:async(k,v)=>{if(typeof window!=='undefined')window[name].setItem(k,v);},removeItem:async k=>{if(typeof window!=='undefined')window[name].removeItem(k);}};}
const secure:Store={getItem:k=>SecureStore.getItemAsync(k),setItem:(k,v)=>SecureStore.setItemAsync(k,v,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),removeItem:k=>SecureStore.deleteItemAsync(k)};
export const authStorage=new RememberedAuthStorage(web?browserStore('localStorage'):secureChunks(secure),web?browserStore('sessionStorage'):memoryStore(),web?browserStore('localStorage'):AsyncStorage);
const url=process.env.EXPO_PUBLIC_SUPABASE_URL,key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const supabase=url&&key?createClient(url,key,{auth:{storage:authStorage,storageKey:'expense.auth.session.v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}}):null;
export const smsEnabled=process.env.EXPO_PUBLIC_SMS_AUTH_ENABLED==='true';
export const googleEnabled=process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED==='true';
export function authRedirect(){return web&&typeof window!=='undefined'?`${window.location.origin}/auth/callback`:'expense-tracker://auth/callback';}
WebBrowser.maybeCompleteAuthSession();
export const authService=createAuthService(supabase,{storage:authStorage,sms:smsEnabled,google:googleEnabled,redirect:authRedirect,launch:async(url,redirect)=>{
  if(web){window.location.assign(url);return undefined;}
  // Expo Go cannot provide a stable production OAuth scheme. Use a development build.
  if(Linking.createURL('/').startsWith('exp://'))throw new Error('Google Login บนมือถือใช้ development build หรือใช้เว็บก่อนได้');
  const result=await WebBrowser.openAuthSessionAsync(url,redirect);return result.type==='success'?result.url:null;
}});
