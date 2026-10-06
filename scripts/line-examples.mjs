import {mkdir,writeFile} from 'node:fs/promises';
import {flexReport} from '@expense/core';
import {periods,example} from '../apps/app/src/line-examples.ts';
const output=new URL('../examples/line-flex/',import.meta.url);
await mkdir(output,{recursive:true});
for(const kind of ['day','week','month']){
  const message=flexReport(example(kind),periods[kind].key,'https://expense-tracker.example','ตรวจ Drive สำเร็จครบ 4 แหล่ง · รวมรายการเงินสดที่บันทึกเอง');
  await writeFile(new URL(`${kind}.json`,output),JSON.stringify(message,null,2)+'\n');
}
console.log('Generated example LINE payloads: examples/line-flex/{day,week,month}.json');
