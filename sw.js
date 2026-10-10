'use strict';
const CACHE_NAME = 'drevia-tools-v3.1.0';
const BASE = new URL('./',self.location.href);
const FILES=['invoice-math.js','workbench-core.js','workbench.js','private-pack.html','duplicate-finder.html','booklet-maker.html','contact-sheet.html','advanced.css','advanced-ui.js','invoice.js','watermark-cleanup.html','watermark.js','video-downloader.html','video-downloader.js','batch-image.html','batch-image.js','','index.html','app.css','app.js','connection.js','diagnostics.html','favicon.svg','manifest.webmanifest','logo-mark.png','icon-192.png','icon-512.png','zip-files.html','compress.html','images-to-pdf.html','merge-pdf.html','resize-photo.html','video-to-audio.html','qr-toolkit.html','signature-stamp.html','ocr-tool.html','pdf-editor.html','passport-photo.html','invoice-maker.html','webcam-test.html','lib/jszip.min.js','lib/jspdf.min.js','lib/pdf-lib.min.js','lib/pdf.min.js','lib/pdf.worker.min.js','lib/lame.js','lib/qrcode.min.js'];
const URLS=FILES.map(p=>new URL(p,BASE).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(CACHE_NAME);await c.addAll(URLS);await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('drevia-')&&k!==CACHE_NAME)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const u=new URL(event.request.url);
  if(u.origin!==BASE.origin||!URLS.includes(u.origin+u.pathname))return;
  event.respondWith((async()=>{const c=await caches.open(CACHE_NAME);try{const r=await fetch(event.request);if(r.ok)await c.put(event.request,r.clone());return r;}catch(_){return await c.match(event.request)||new Response('This app file is not cached. Reconnect and reload.',{status:503,headers:{'Content-Type':'text/plain'}});}})());
});
