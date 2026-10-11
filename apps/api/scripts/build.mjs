import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const apiRoot=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(import.meta.url);
await build({
  absWorkingDir:apiRoot,
  entryPoints:['src/app.ts'],
  outfile:'dist/app.mjs',
  bundle:true,
  platform:'node',
  target:'node22',
  format:'esm',
  packages:'external',
  alias:{
    '@expense/core':fileURLToPath(new URL('../../../packages/core/src/index.ts',import.meta.url)),
    // Inline this pure JS decoder; native dependencies such as sharp stay external.
    jsqr:require.resolve('jsqr')
  }
});
// Vercel's file tracing misses the .wasm files tesseract.js-core reads from disk. Bundle the OCR worker into dist
// and place the engine .wasm next to it (Emscripten looks beside the script), so dist/** carries everything.
await build({absWorkingDir:apiRoot,entryPoints:[require.resolve('tesseract.js/src/worker-script/node/index.js')],outfile:'dist/tesseract-worker.cjs',bundle:true,platform:'node',target:'node22',format:'cjs'});
// The worker picks a variant at run time (SIMD support, OEM), so ship all six.
for(const core of ['tesseract-core','tesseract-core-lstm','tesseract-core-simd','tesseract-core-simd-lstm','tesseract-core-relaxedsimd','tesseract-core-relaxedsimd-lstm'])await copyFile(require.resolve(`tesseract.js-core/${core}.wasm`),new URL(`../dist/${core}.wasm`,import.meta.url));
// Ship Thai/English OCR models inside dist so Vercel never downloads them at run time.
await mkdir(new URL('../dist/tessdata/',import.meta.url),{recursive:true});
for(const lang of ['tha','eng'])await copyFile(require.resolve(`@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`),new URL(`../dist/tessdata/${lang}.traineddata.gz`,import.meta.url));
