import {it,expect} from 'vitest';
import {slipVerify,anyId} from 'promptparse/generate';
import {extractSlipQr} from '../apps/api/src/qr-details.ts';
it.each([['011','ttb'],['004','ธนาคารกสิกรไทย'],['006','ธนาคารกรุงไทย']])('extracts verified fields for bank %s without inventing financial data',(code,name)=>{
 const payload=slipVerify({sendingBank:code,transRef:'261005120000123456'});
 const details=extractSlipQr(payload)!;
 expect(details).toMatchObject({format:'mini_qr',sending_bank_code:code,sending_bank_name:name,transaction_reference:'261005120000123456',country_code:'TH'});
 expect(details.tags.find(t=>t.path==='00.02')?.value).toBe('261005120000123456');
 expect(details.missing).toEqual(['amount','occurred_at','sender','recipient','direction']);
 expect(details).not.toHaveProperty('amount_satang');expect(details).not.toHaveProperty('occurred_at');
});
it('does not mistake payment QR amounts or malformed checksums for completed transactions',()=>{
 const payment=anyId({type:'MSISDN',target:'0812345678',amount:99});expect(extractSlipQr(payment)?.format).toBe('unrecognized');
 const mini=slipVerify({sendingBank:'011',transRef:'reference'});expect(extractSlipQr(mini.slice(0,-1)+(mini.endsWith('0')?'1':'0'))?.format).toBe('unrecognized');
 expect(extractSlipQr(null)).toBeNull();expect(extractSlipQr('bad')?.format).toBe('unrecognized');
});