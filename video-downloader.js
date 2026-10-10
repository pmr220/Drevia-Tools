'use strict';
AdvancedUI.capability('download');
document.getElementById('downloadForm').onsubmit=e=>{e.preventDefault();AdvancedUI.task(async()=>{const output=await AdvancedUI.post('download',{url:document.getElementById('videoUrl').value.trim(),ownership:document.getElementById('ownership').checked},true);AdvancedUI.offer(output.blob,output.name);});};
