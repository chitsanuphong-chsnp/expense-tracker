import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../apps/app/dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.ttf':'font/ttf','.css':'text/css','.svg':'image/svg+xml'};
createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),target=resolve(root,'.'+pathname);
  if((target!==resolve(root)&&!target.startsWith(root.endsWith(sep)?root:root+sep))||pathname.startsWith('/api')){res.writeHead(404);res.end();return;}
  let bytes,type=types[extname(target)]??'application/octet-stream';
  try{bytes=await readFile(target);}catch{if(extname(pathname)){res.writeHead(404);res.end();return;}bytes=await readFile(resolve(root,'index.html'));type=types['.html'];}
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});res.end(bytes);
 }catch{res.writeHead(400);res.end();}
}).listen(8081,'0.0.0.0',()=>console.log('Preview http://localhost:8081'));
