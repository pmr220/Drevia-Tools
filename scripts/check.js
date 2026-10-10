'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');let count=0;
for(const name of fs.readdirSync(root)){
 if(name.endsWith('.js')){new vm.Script(fs.readFileSync(path.join(root,name),'utf8'),{filename:name});count++;}
 if(name.endsWith('.html')){
  const html=fs.readFileSync(path.join(root,name),'utf8');
  for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)){
   const src=match[1].match(/src=["']([^"']+)/);
   if(src){if(!fs.existsSync(path.join(root,src[1])))throw new Error(name+' references missing '+src[1]);}
   else{new vm.Script(match[2],{filename:name});count++;}
  }
 }
}
console.log(`PASS: ${count} scripts parsed; every local script reference exists.`);
