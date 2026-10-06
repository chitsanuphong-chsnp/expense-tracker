import {build} from 'esbuild';
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
