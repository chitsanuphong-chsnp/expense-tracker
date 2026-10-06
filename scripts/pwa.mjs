import {readFile,writeFile,readdir} from 'node:fs/promises';
const root=new URL('../apps/app/dist/',import.meta.url),index=new URL('index.html',root);
let html=await readFile(index,'utf8');
html=html.replace(/<html[^>]*>/,'<html lang="th">').replace(/<title>.*?<\/title>/,'<title>Expense Tracker</title>');
html=html.replace('</head>','<link rel="manifest" href="/manifest.webmanifest"/><link rel="apple-touch-icon" href="/icon-192.png"/><meta name="theme-color" content="#5668df"/></head>');
html=html.replace('</body>',`<script>if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));}</script></body>`);
await writeFile(index,html,'utf8');
const bundles=await readdir(new URL('_expo/static/js/web/',root)),version=bundles.find(f=>f.startsWith('entry-'))?.replace(/\W/g,'')??'v1';
const sw=`const CACHE='shzr-shell-${version}';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/','/manifest.webmanifest','/icon-192.png','/icon-512.png'])));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('shzr-shell-')&&k!==CACHE).map(k=>caches.delete(k)))));});
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api')||r.headers.has('authorization'))return;
 if(r.mode==='navigate'){e.respondWith(fetch(r).catch(()=>caches.match('/')));return;}
 if(!u.pathname.startsWith('/assets/')&&!u.pathname.startsWith('/_expo/static/')&&!['/icon-192.png','/icon-512.png'].includes(u.pathname))return;
 e.respondWith(caches.open(CACHE).then(async c=>{const cached=await c.match(r);if(cached)return cached;const res=await fetch(r);if(res.ok)await c.put(r,res.clone());return res;}));
});`;
await writeFile(new URL('sw.js',root),sw,'utf8');console.log('PWA shell ready; private APIs and slip images are never cached.');
