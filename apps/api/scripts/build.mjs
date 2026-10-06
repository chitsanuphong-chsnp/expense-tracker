import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const apiRoot=fileURLToPath(new URL('../',import.meta.url));
await build({absWorkingDir:apiRoot,entryPoints:['src/app.ts'],outfile:'dist/app.mjs',bundle:true,platform:'node',target:'node22',format:'esm',packages:'external',alias:{'@expense/core':fileURLToPath(new URL('../../../packages/core/src/index.ts',import.meta.url))}});