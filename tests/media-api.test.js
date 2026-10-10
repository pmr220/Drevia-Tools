'use strict';
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {app,shutdown}=require('../server');let server,base;
before(async()=>{server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s));});base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await shutdown();await new Promise(r=>server.close(r));});
test('advanced capability detection is explicit',async()=>{const r=await fetch(base+'/api/media/capabilities');assert.equal(r.status,200);const d=await r.json();assert.equal(typeof d.image,'boolean');});
test('cross-origin advanced processing is blocked',async()=>{const r=await fetch(base+'/api/media/download',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:'https://example.com',ownership:true})});assert.equal(r.status,403);});
test('arbitrary URL downloads are rejected',async()=>{const r=await fetch(base+'/api/media/download',{method:'POST',headers:{'Content-Type':'application/json','X-Drevia-Client':'web'},body:JSON.stringify({url:'https://127.0.0.1/file',ownership:true})});assert.equal(r.status,422);});
test('real image-cleanup API returns a PNG',{skip:!process.env.PYTHON_BIN},async()=>{const data=new FormData();data.append('file',new Blob([fs.readFileSync(path.join(__dirname,'english.png'))],{type:'image/png'}),'sample.png');data.append('kind','image');data.append('regions','[[0.8,0.7,0.1,0.1]]');data.append('ownership','yes');const r=await fetch(base+'/api/media/cleanup',{method:'POST',headers:{'X-Drevia-Client':'web'},body:data});assert.equal(r.status,200,await r.clone().text());assert.match(r.headers.get('content-type'),/image\/png/);assert.ok((await r.arrayBuffer()).byteLength>100);});
