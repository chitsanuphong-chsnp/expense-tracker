import {parse} from 'promptparse';
import {slipVerify} from 'promptparse/validate';
import type {SlipQrDetails} from '@expense/core';
const banks:Record<string,string>={'011':'ttb','004':'ธนาคารกสิกรไทย','006':'ธนาคารกรุงไทย'};
export function extractSlipQr(payload:string|null):SlipQrDetails|null {
  if(!payload)return null;
  try {
    const parsed=parse(payload,true),mini=slipVerify(payload);
    if(!parsed||!mini)return {format:'unrecognized',sending_bank_code:null,sending_bank_name:null,transaction_reference:null,country_code:null,checksum:null,tags:[],missing:['amount','occurred_at','sender','recipient','direction']};
    const tags=parsed.getTags().flatMap(tag=>tag.subTags?.length?tag.subTags.map(child=>({path:`${tag.id}.${child.id}`,value:child.value})):[{path:tag.id,value:tag.value}]);
    return {format:'mini_qr',sending_bank_code:mini.sendingBank,sending_bank_name:banks[mini.sendingBank]??null,transaction_reference:mini.transRef,country_code:parsed.getTagValue('51')??null,checksum:parsed.getTagValue('91')??null,tags,missing:['amount','occurred_at','sender','recipient','direction']};
  }catch{return {format:'unrecognized',sending_bank_code:null,sending_bank_name:null,transaction_reference:null,country_code:null,checksum:null,tags:[],missing:['amount','occurred_at','sender','recipient','direction']};}
}