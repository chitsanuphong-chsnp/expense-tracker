import sharp from 'sharp';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const svg=await readFile(new URL('../apps/app/assets/icon.svg',import.meta.url));
await mkdir(new URL('../apps/app/public/',import.meta.url),{recursive:true});
for(const size of [192,512])await sharp(svg).resize(size,size).png().toFile(fileURLToPath(new URL(`../apps/app/public/icon-${size}.png`,import.meta.url)));
await sharp(svg).resize(1024,1024).png().toFile(fileURLToPath(new URL('../apps/app/assets/icon.png',import.meta.url)));
