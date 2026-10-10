const App=(()=>{
const $=id=>document.getElementById(id);
const fmt=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(0)+' KB':n<1073741824?(n/1048576).toFixed(2)+' MB':(n/1073741824).toFixed(2)+' GB';
const tick=()=>new Promise(r=>setTimeout(r,0));
const ext=n=>(n.match(/\.([^.]+)$/)||[,''])[1].toLowerCase();
const base=n=>n.replace(/\.[^.]+$/,'');
const safe=(v,d)=>v.trim().replace(/[\\/:*?"<>|]+/g,'-')||d;
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const TOOLS=[
 ['private-pack.html','Private File Pack','◇','Private File Pack','Lock files locally with a password and unlock them into a ZIP.','Files'],
 ['duplicate-finder.html','Duplicate & Integrity Check','≡','Duplicate & Integrity Check','Find exact copies, export unique files and verify a saved file manifest.','Files'],
 ['booklet-maker.html','PDF Booklet Arranger','▤','PDF Booklet Arranger','Arrange two-up printable sheets in fold order, with blank padding and binding options.','Documents'],
 ['contact-sheet.html','Photo Contact Sheet','▦','Photo Contact Sheet','Produce numbered A4 thumbnail sheets with filenames and image dimensions.','Images'],

 ['watermark-cleanup.html','Watermark cleanup','✦','Watermark Cleanup','Blend selected visible marks in images, short videos and PDFs without cropping.','Media'],
 ['video-downloader.html','Video downloader','↓','Video Link Downloader','Save accessible public YouTube, Instagram or Facebook videos you have permission to download.','Media'],
 ['batch-image.html','Batch images','▧','Batch Image Studio','Convert, resize and remove source metadata from up to 30 images.','Images'],
 ['zip-files.html','Zip files','📦','Photo & Video Zipper','Bundle photos, videos and documents into one ZIP — easy to share, email or back up.','Files'],
 ['compress.html','Compress','🗜️','File Compressor','Shrink photos, videos, PDFs, ZIPs and other files to a target size.','Files'],
 ['images-to-pdf.html','Photos to PDF','📄','Photos to PDF','Turn photos or scans into one tidy PDF for forms, applications and email.','Documents'],
 ['merge-pdf.html','PDF tools','🧩','Merge, Split & Reorder PDFs','Join PDFs, change their order, and keep only the pages you need.','Documents'],
 ['resize-photo.html','Resize photo','🖼️','Resize Photo for Forms','Exact pixels and a KB limit for exam, job and government form uploads.','Images'],
 ['video-to-audio.html','Video to audio','🎵','Video to Audio','Extract MP3, M4A or WAV audio from videos and trim it.','Media'],
 ['qr-toolkit.html','QR toolkit','▦','QR Code & Wi-Fi Sharing','Make QR codes for Wi-Fi, websites, contact cards, email, phone and WhatsApp.','Everyday'],
 ['signature-stamp.html','Sign & stamp','✍️','Signature & Document Stamp Maker','Draw a signature, remove a white photo background, create stamps and sign PDFs.','Documents'],
 ['ocr-tool.html','Image/PDF to text','🔎','Image & PDF to Editable Text','Extract text from photos, scans and screenshots in English or Hindi.','Documents'],
 ['pdf-editor.html','PDF editor','📝','PDF Editor & Privacy Tool','Add text, draw, highlight, sign and permanently redact by flattening edited pages.','Documents'],
 ['passport-photo.html','ID photo','🪪','Passport & ID Photo Formatter','Crop photos to common ID sizes and create a print-ready sheet.','Images'],
 ['invoice-maker.html','Invoice Studio','🧾','Invoice Studio','Four editable templates, header logos, background watermarks and reusable drafts.','Work'],
 ['webcam-test.html','Camera & mic','🎙️','Webcam & Microphone Tester','Check your camera, microphone and recording before calls or interviews.','Everyday']
];
const featuredOrder=['invoice-maker.html','watermark-cleanup.html','pdf-editor.html','ocr-tool.html','video-downloader.html','batch-image.html'];
TOOLS.sort((a,b)=>(featuredOrder.includes(a[0])?featuredOrder.indexOf(a[0]):99)-(featuredOrder.includes(b[0])?featuredOrder.indexOf(b[0]):99));
/* ---- bundled browser libraries (no third-party CDN dependency) ---- */
const LIB={jszip:['lib/jszip.min.js'],jspdf:['lib/jspdf.min.js'],
 pdflib:['lib/pdf-lib.min.js'],pdfjs:['lib/pdf.min.js'],lame:['lib/lame.js']};
const cache={};
const script=src=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=()=>ok(src);s.onerror=()=>{s.remove();no(new Error('load '+src))};document.head.append(s)});
const lib=n=>cache[n]||(cache[n]=(async()=>{for(const s of LIB[n]){try{return await script(s)}catch(e){console.warn(e.message)}}delete cache[n];throw new Error('A bundled tool library could not be loaded. Please reload the page or check that the full website folder was uploaded.')})());
const FF=[{l:'lib/ffmpeg.js',w:'lib/814.ffmpeg.js',u:'lib/ffmpeg-util.js',c:'lib/ffmpeg-core.esm.js',m:'lib/ffmpeg-core.wasm'}];
let ff=null;
async function ffmpeg(status){
  if(ff)return ff;
  const setup=window.DreviaConnection?.environmentError();if(setup)throw new Error(setup);
  status('Starting the video engine (first time only, about 30 MB)…');
  for(const s of FF){try{
    if(!window.FFmpegWASM)await script(s.l);if(!window.FFmpegUtil)await script(s.u);
    const f=new FFmpegWASM.FFmpeg(),{toBlobURL}=FFmpegUtil;
    await f.load({classWorkerURL:await toBlobURL(s.w,'text/javascript'),coreURL:await toBlobURL(s.c,'text/javascript'),wasmURL:await toBlobURL(s.m,'application/wasm')});
    return ff=f;
  }catch(e){console.warn(e)}}
  throw new Error('Could not start the bundled video engine. Confirm every file in the lib folder was uploaded, then try a smaller file.');
}
function loadImage(f){return new Promise((ok,no)=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);ok(im)};im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('Could not read "'+f.name+'". HEIC photos only work in Safari — otherwise choose a JPG or PNG.'))};im.src=u})}
async function save(blob,name){
  if(isIOS){
    const file=new File([blob],name,{type:blob.type||'application/octet-stream'});
    try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name});return}}catch(e){if(e&&e.name==='AbortError')return}
  }
  const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),120000);
}
/* ---- brand shell: header + footer on every page ---- */
const mark=id=>`<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#10b981"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs><rect width="40" height="40" rx="11" fill="url(#${id})"/><path fill="#fff" fill-rule="evenodd" d="M13 10h8.5c6 0 9.5 3.6 9.5 10s-3.5 10-9.500 10H13zM18 14.500v11h3.300c3.300 0 5-2 5-5.500s-1.700-5.500-5-5.500z"/></svg>`;
function shell(){
  const cur=location.pathname.split('/').pop()||'index.html';
  const links=[['index.html#home-tools','All tools & search'],['invoice-maker.html','Invoice Studio'],['pdf-editor.html','PDF editor'],['watermark-cleanup.html','Watermark cleanup'],['video-downloader.html','Video downloader'],['diagnostics.html','Help & setup']];
  const allLinks=[['index.html','Home'],['diagnostics.html','Connection check'],...TOOLS.map(t=>[t[0],t[1]])];
  const brand=id=>`<a class="brand" href="index.html" aria-label="Drevia Infotech home"><span class="lg"><img src="logo-mark.png" alt="Drevia Infotech logo"></span><span><b>Drevia</b> <em>Infotech</em></span></a>`;
  document.body.insertAdjacentHTML('afterbegin',`<header class="site"><div class="wrap">${brand('lg1')}<button class="burger" id="burger" aria-label="Open menu" aria-expanded="false">☰</button><nav id="menu">${links.map(([h,t])=>`<a href="${h}"${h===cur?' aria-current="page"':''}>${t}</a>`).join('')}</nav></div></header>`);
  document.body.insertAdjacentHTML('beforeend',`<footer class="site"><div class="wrap"><div>${brand('lg2')}<p>Practical tools for files, documents and everyday work.</p></div>
<div class="links">${allLinks.map(([h,t])=>`<a href="${h}">${t}</a>`).join('')}</div>
<p class="copy">© ${new Date().getFullYear()} Drevia Infotech. All rights reserved. No account or database is needed. Local tools stay in your browser. OCR uses server memory; cleanup and link downloads use temporary server files.</p></div></footer>`);
  $('burger').onclick=()=>{const m=$('menu'),o=m.classList.toggle('open');$('burger').setAttribute('aria-expanded',o);$('burger').textContent=o?'✕':'☰'};
  if('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(e=>console.warn('Offline setup unavailable:',e.message));
}
shell();
const hero=(t,s)=>`<section class="hero mini"><div class="wrap"><span class="chip">🔒 No account · works on phones and computers</span><h1>${t}</h1><p>${s}</p></div></section>`;
/* ---- generic tool page ---- */
function init(c){
  $('app').insertAdjacentHTML('beforebegin',hero(c.title,c.sub));
  $('app').className='tool';
  $('app').innerHTML=`<label id="drop" for="file"><strong>Tap to choose ${c.multiple?'files':'a file'}, or drop ${c.multiple?'them':'it'} here</strong><span>${c.hint}</span><input id="file" type="file" ${c.multiple?'multiple':''} accept="${c.accept}"></label>
<div class="bar"><h2 id="count">Nothing added</h2><button id="clear" hidden>Clear</button></div>
<ul id="list"><li class="empty">Added files will appear here.</li></ul>
<div class="opts">${c.options||''}</div>
<button id="go" class="primary" disabled>${c.action}</button>
<progress id="prog" max="100" hidden></progress><div id="status" role="status" aria-live="polite"></div>
<section id="result" hidden><div class="summary" id="sum"></div><div id="prev"></div>
<div class="actions"><button id="save" class="primary">Save file</button><button id="again">Start over</button></div>
<p class="note" id="ios" hidden>iPhone: tap Save, then choose <b>Save to Files</b> (or Save Image / Save Video).</p></section>
<p class="note">${c.note}</p>`;
  let files=[],out=null,urls=[],busy=false;
  const status=(t,k='')=>{$('status').textContent=t;$('status').className=k};
  const progress=v=>{$('prog').hidden=false;$('prog').value=Math.max(0,Math.min(100,v))};
  const url=b=>{const u=URL.createObjectURL(b);urls.push(u);return u};
  const isImg=f=>f.type.startsWith('image/')&&!/hei[cf]/.test(f.type);
  const mv=(i,d)=>{const j=i+d;if(j<0||j>=files.length)return;[files[i],files[j]]=[files[j],files[i]];render()};
  function add(list){
    let skip=0;
    for(const f of list){
      if(!c.test(f)){skip++;continue}
      if(!c.multiple)files=[];
      if(files.some(x=>x.name===f.name&&x.size===f.size&&x.lastModified===f.lastModified))continue;
      files.push(f);if(!c.multiple)break;
    }
    status(skip?skip+' file(s) skipped — accepted: '+c.hint+'.':'',skip?'err':'');render();
  }
  function render(){
    urls.forEach(URL.revokeObjectURL);urls=[];$('result').hidden=true;out=null;
    const ul=$('list');ul.innerHTML='';
    if(!files.length){ul.innerHTML='<li class="empty">Added files will appear here.</li>';$('count').textContent='Nothing added';$('clear').hidden=true;$('go').disabled=true;return}
    $('count').textContent=files.length+' file'+(files.length>1?'s':'')+' · '+fmt(files.reduce((s,f)=>s+f.size,0));
    $('clear').hidden=false;$('go').disabled=false;
    files.forEach((f,i)=>{
      const li=document.createElement('li'),img=isImg(f),th=document.createElement(img?'img':'div');th.className='thumb';
      if(img){th.alt='';th.src=url(f)}else th.textContent=(ext(f.name)||'file').slice(0,4).toUpperCase();
      const m=document.createElement('div');m.className='meta';
      m.innerHTML='<div class="name"></div><div class="size">'+fmt(f.size)+'</div>';m.firstChild.textContent=f.name;
      li.append(th,m);
      if(c.multiple&&files.length>1)[['↑',-1,'Move up'],['↓',1,'Move down']].forEach(([t,d,l])=>{const b=document.createElement('button');b.className='mv';b.textContent=t;b.setAttribute('aria-label',l+' '+f.name);b.onclick=()=>mv(i,d);li.append(b)});
      const x=document.createElement('button');x.className='x';x.textContent='×';x.setAttribute('aria-label','Remove '+f.name);x.onclick=()=>{files.splice(i,1);render()};
      li.append(x);ul.append(li);
    });
  }
  const reset=()=>{files=[];$('prog').hidden=true;status('');render()};
  $('file').addEventListener('change',e=>{add([...e.target.files]);e.target.value=''});
  ['dragenter','dragover'].forEach(ev=>$('drop').addEventListener(ev,e=>{e.preventDefault();$('drop').classList.add('over')}));
  ['dragleave','drop'].forEach(ev=>$('drop').addEventListener(ev,e=>{e.preventDefault();$('drop').classList.remove('over')}));
  $('drop').addEventListener('drop',e=>add([...e.dataTransfer.files]));
  $('clear').onclick=reset;
  $('again').onclick=()=>{reset();scrollTo({top:0,behavior:'smooth'})};
  $('save').onclick=()=>out&&save(out.blob,out.name);
  $('go').onclick=async()=>{
    if(busy||!files.length)return;
    busy=true;$('go').disabled=true;$('result').hidden=true;status('Working…');progress(2);
    try{
      out=await c.run(files,{status,progress});
      $('sum').textContent=out.summary||('Done — '+out.name+' ('+fmt(out.blob.size)+')');
      const p=$('prev'),t=out.blob.type;p.innerHTML='';
      if(t.startsWith('image/')){const im=document.createElement('img');im.className='pimg';im.alt='';im.src=url(out.blob);p.append(im)}
      else if(t.startsWith('audio/')){const a=document.createElement('audio');a.controls=true;a.src=url(out.blob);p.append(a)}
      $('ios').hidden=!isIOS;$('result').hidden=false;$('prog').hidden=true;status('');
      $('result').scrollIntoView({behavior:'smooth',block:'nearest'});
    }catch(e){console.error(e);$('prog').hidden=true;status(e&&e.message&&!/^(decode|encode)$/.test(e.message)?e.message:'Something went wrong. Try again with smaller files.','err')}
    finally{busy=false;$('go').disabled=!files.length}
  };
}
return {$,fmt,tick,ext,base,safe,lib,script,ffmpeg,loadImage,save,init,hero,TOOLS,isIOS};
})();
