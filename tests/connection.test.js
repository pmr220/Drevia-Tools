'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../connection.js'),'utf8');
function helper(fetch,protocol='https:'){
 const ctx={window:{},document:{currentScript:{src:'https://example.test/tools/connection.js'},readyState:'loading',addEventListener(){}},location:{protocol},URL,AbortController,setTimeout,clearTimeout,fetch};
 vm.runInNewContext(source,ctx);return ctx.window.DreviaConnection;
}
test('file mode explains how to start the server without making a request',async()=>{const h=helper(()=>{throw Error('must not fetch');},'file:');await assert.rejects(h.request('api/health'),/START-WINDOWS/);});
test('subfolder installations keep API requests under that folder',async()=>{let requested;const h=helper(async url=>{requested=url.href;return new Response('{"status":"ok"}',{headers:{'Content-Type':'application/json'}});});assert.equal((await h.request('/api/health')).status,'ok');assert.equal(requested,'https://example.test/tools/api/health');});
test('network errors explain the missing server instead of Failed to fetch',async()=>{const h=helper(async()=>{throw new TypeError('Failed to fetch');});await assert.rejects(h.request('api/ocr'),/Cannot reach the Drevia server/);});
test('static host catch-all HTML is diagnosed',async()=>{const h=helper(async()=>new Response('<html>home</html>',{headers:{'Content-Type':'text/html'}}));await assert.rejects(h.request('api/health'),/webpage instead of JSON/);});
test('missing API is diagnosed as a deployment problem',async()=>{const h=helper(async()=>new Response('Not found',{status:404}));await assert.rejects(h.request('api/ocr'),/Static-only hosting/);});
