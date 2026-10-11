import React from 'react';
import {Image,View} from 'react-native';
import type {Account,Dataset,SourceCode} from '@expense/core';
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
// Which logo an account gets: the Drive source linked to it, else its name. Cash has none.
export function bankOf(account:Pick<Account,'id'|'name'|'kind'>|null|undefined,sources:Dataset['sources']=[]):SourceCode|null{
  if(!account||account.kind==='cash')return null;
  const linked=sources.find(s=>s.account_id===account.id);if(linked)return linked.source_code;
  const n=account.name.toLowerCase().replace(/[\s_-]/g,'');
  if(n.includes('make'))return 'make';
  if(n.includes('ttb')||n.includes('ทีทีบี')||n.includes('ทหารไทย'))return 'ttb';
  if(n.includes('kplus')||n.includes('kbank')||n.includes('กสิกร'))return 'kplus';
  if(n.includes('krungthai')||n.includes('ktb')||n.includes('กรุงไทย'))return 'krungthai';
  return null;
}
// Account chips with their bank logo in front.
export function withBankIcons<A extends Pick<Account,'id'|'name'|'kind'>>(accounts:A[],sources:Dataset['sources']=[]){
  return accounts.map(a=>{const code=bankOf(a,sources);return code?{...a,icon:<BankIcon code={code}/>}:a;});
}
// A bank name with its logo in front (titles and list rows).
export function BankName({code,children,size=18}:{code:SourceCode|null|undefined;children:React.ReactNode;size?:number}){
  return <View style={{flexDirection:'row',alignItems:'center',gap:6,minWidth:0,flexShrink:1}}><BankIcon code={code} size={size}/>{children}</View>;
}
