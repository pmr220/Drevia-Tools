'use strict';
const WorkbenchCore=(()=>{
 const enc=new TextEncoder(),magic=enc.encode('DREVIA01');
 function subtle(){if(!globalThis.crypto?.subtle)throw Error('Open this tool using HTTPS or localhost.');return crypto.subtle;}
 async function key(password,salt){const material=await subtle().importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);return subtle().deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
 async function seal(bytes,password){
  if(password.length<12)throw Error('Use a password of at least 12 characters.');
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const header=new Uint8Array(36);header.set(magic);header.set(salt,8);header.set(iv,24);
  const encrypted=await subtle().encrypt({name:'AES-GCM',iv,additionalData:header},await key(password,salt),bytes);
  const result=new Uint8Array(header.length+encrypted.byteLength);result.set(header);result.set(new Uint8Array(encrypted),36);return result;
 }
 async function unlock(bytes,password){
  bytes=new Uint8Array(bytes);if(bytes.length<52||!magic.every((v,i)=>bytes[i]===v))throw Error('Choose a Drevia .drevia encrypted pack.');
  try{return await subtle().decrypt({name:'AES-GCM',iv:bytes.slice(24,36),additionalData:bytes.slice(0,36)},await key(password,bytes.slice(8,24)),bytes.slice(36));}catch(_){throw Error('Wrong password or damaged pack. Nothing was unlocked.');}
 }
 async function hash(bytes){return [...new Uint8Array(await subtle().digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');}
 function booklet(count){if(!Number.isInteger(count)||count<1||count>200)throw Error('Choose a PDF with 1–200 pages.');const padded=Math.ceil(count/4)*4,out=[];for(let i=0;i<padded/4;i++){out.push([padded-2*i,1+2*i],[2+2*i,padded-1-2*i]);}return out.map(pair=>pair.map(n=>n>count?null:n));}
 function duplicates(entries){const groups=new Map();entries.forEach((e,i)=>{const k=e.size+':'+e.sha256;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);});return [...groups.values()].filter(g=>g.length>1);}
 return {seal,unlock,hash,booklet,duplicates};
})();
if(typeof module!=='undefined')module.exports=WorkbenchCore;
