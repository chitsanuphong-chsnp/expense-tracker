import React from 'react';
import {View} from 'react-native';
import {money,type Slip} from '@expense/core';
import {T,C,s} from './ui';
export function QrDetails({slip}:{slip:Slip}){
 const details=slip.qr_details,draft=slip.ocr_details;if(!details&&!draft)return null;
 return <View style={{gap:10,padding:14,backgroundColor:'#f4f6fc',borderRadius:14}}>
 {details&&<><T style={s.bold}>ข้อมูลที่ถอดได้จาก QR</T>{details.format==='mini_qr'?<>
 <T selectable style={{fontSize:12}}>ธนาคารต้นทาง: {details.sending_bank_name??'ไม่ทราบชื่อ'} ({details.sending_bank_code})</T>
 <T selectable style={{fontSize:12}}>เลขอ้างอิง: {details.transaction_reference}</T>
 {details.country_code&&<T style={{fontSize:12}}>รหัสประเทศ: {details.country_code}</T>}
 <T style={{fontSize:11,color:C.muted}}>รูปแบบและ checksum ถูกต้อง · ยังไม่ได้ยืนยันธุรกรรมกับธนาคาร</T>
 <T style={{fontSize:12,color:C.muted,lineHeight:21}}>QR นี้ไม่มีฟิลด์จำนวนเงิน วันเวลาธุรกรรม ชื่อผู้โอนหรือผู้รับ และประเภทรายการ</T>
 </>:<T style={{fontSize:12,color:C.muted}}>ไม่ตรงกับรูปแบบ Mini QR ที่รองรับ ยังสกัดข้อมูลธุรกรรมอย่างน่าเชื่อถือไม่ได้</T>}</>}
 {draft&&!draft.error&&<View style={{gap:7,marginTop:6}}><T style={s.bold}>ข้อมูลจาก OCR · กรุณาตรวจสอบ</T><T>จำนวนเงิน: {draft.amount_satang!==null?money(draft.amount_satang):'อ่านไม่ได้'}</T><T>วันเวลา: {draft.date??'อ่านไม่ได้'} {draft.time??''}</T>{draft.sender&&<T>ผู้โอน: {draft.sender}</T>}{draft.recipient&&<T>ผู้รับ: {draft.recipient}</T>}<T style={s.muted}>ตรวจยอดและเลือกประเภทรายการก่อนบันทึก การโอนระหว่างบัญชีตัวเองไม่ใช่รายจ่าย</T></View>}
 {draft?.error&&<T style={s.muted}>OCR ยังอ่านไม่สำเร็จ ลองประมวลผลใหม่หรือกรอกเองได้</T>}
 </View>;
}