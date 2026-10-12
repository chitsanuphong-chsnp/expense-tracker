import React from 'react';
import {Image,Text,View} from 'react-native';
import {accountBank,type Account,type Dataset,type SourceCode} from '@expense/core';
import {tone} from './theme';

// Round bank logos, all cut to the same 96 px circle (from assets/banks/*.png) and shown small beside bank names.
const icons:Record<SourceCode,number>={
  ttb:require('../assets/banks/ttb-icon.png'),
  kplus:require('../assets/banks/kplus-icon.png'),
  krungthai:require('../assets/banks/krungthai-icon.png'),
  make:require('../assets/banks/make-icon.png'),
};
export function BankIcon({code,size=18}:{code:SourceCode|null|undefined;size?:number}){
  if(!code)return null;
  // A hairline ring keeps the white ttb/MAKE circles visible on white chips.
  return <View style={{width:size,height:size,borderRadius:size/2,borderWidth:1,borderColor:tone('#e3e7ef'),overflow:'hidden',backgroundColor:'#ffffff',flexShrink:0}}>
    <Image source={icons[code]} style={{width:'100%',height:'100%'}} accessibilityIgnoresInvertColors/>
  </View>;
}
// Cash: a filled green circle with a centred ฿, the same size and weight as the round bank logos.
export function CashIcon({size=18}:{size?:number}){
  return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:'#2fa866',alignItems:'center',justifyContent:'center',flexShrink:0}}>
    <Text allowFontScaling={false} style={{color:'#ffffff',fontFamily:'NotoLatinBold',fontSize:Math.round(size*0.6),lineHeight:Math.round(size*0.78),textAlign:'center',includeFontPadding:false}}>฿</Text>
  </View>;
}
// The icon for any account: its bank logo, or the money icon for cash.
export function AccountIcon({account,sources=[],size=18}:{account:Pick<Account,'id'|'name'|'kind'>|null|undefined;sources?:Dataset['sources'];size?:number}){
  if(account?.kind==='cash')return <CashIcon size={size}/>;
  return <BankIcon code={accountBank(account,sources)} size={size}/>;
}
// Which logo an account gets (shared rule in core: linked Drive source, else the account name).
export const bankOf=(account:Pick<Account,'id'|'name'|'kind'>|null|undefined,sources:Dataset['sources']=[])=>accountBank(account,sources);
// Account chips with their bank logo in front.
export function withBankIcons<A extends Pick<Account,'id'|'name'|'kind'>>(accounts:A[],sources:Dataset['sources']=[]){
  return accounts.map(a=>a.kind==='cash'||bankOf(a,sources)?{...a,icon:<AccountIcon account={a} sources={sources}/>}:a);
}
// A bank name with its logo in front (titles and list rows).
export function BankName({code,children,size=18}:{code:SourceCode|null|undefined;children:React.ReactNode;size?:number}){
  return <View style={{flexDirection:'row',alignItems:'center',gap:6,minWidth:0,flexShrink:1}}><BankIcon code={code} size={size}/>{children}</View>;
}
// An account name with its icon in front.
export function AccountName({account,sources=[],children,size=18}:{account:Pick<Account,'id'|'name'|'kind'>|null|undefined;sources?:Dataset['sources'];children:React.ReactNode;size?:number}){
  return <View style={{flexDirection:'row',alignItems:'center',gap:6,minWidth:0,flexShrink:1}}><AccountIcon account={account} sources={sources} size={size}/>{children}</View>;
}
