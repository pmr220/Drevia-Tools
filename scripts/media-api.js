'use strict';
const express=require('express'),multer=require('multer'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const router=express.Router();let active=null;
const python=process.env.PYTHON_BIN||'python';
async function run(job,timeout=240000){
 const sync=require('node:fs'),dir=await fs.mkdtemp(path.join(os.tmpdir(),'drevia-worker-'));
 const input=path.join(dir,'request.json'),output=path.join(dir,'response.json'),errors=path.join(dir,'error.log');
 let handles=[];
 try{
  await fs.writeFile(input,JSON.stringify(job));
  handles=[sync.openSync(input,'r'),sync.openSync(output,'w'),sync.openSync(errors,'w')];
  await new Promise((resolve,reject)=>{
   let child;try{child=spawn(python,[path.join(__dirname,'media-worker.py')],{stdio:handles,windowsHide:true});}catch(_){reject(new Error('Advanced processing cannot start. Run SETUP-ADVANCED-WINDOWS.cmd and restart.'));return;}
   let timedOut=false;const timer=setTimeout(()=>{timedOut=true;child.kill();},timeout);
   child.on('error',()=>{clearTimeout(timer);reject(new Error('Python could not start. Run SETUP-ADVANCED-WINDOWS.cmd, then restart the app.'));});
   child.on('close',()=>{clearTimeout(timer);timedOut?reject(new Error('Processing timed out. Try a shorter video or fewer pages.')):resolve();});
  });
  const stat=await fs.stat(output);if(stat.size>100000)throw Error('Worker response exceeded its limit.');
  let result;try{result=JSON.parse(await fs.readFile(output,'utf8'));}catch(_){throw Error('Media processing could not start. Check Python dependencies and restart.');}
  if(!result.ok)throw Error(result.error);return result;
 }finally{for(const fd of handles)try{sync.closeSync(fd);}catch(_){}await fs.rm(dir,{recursive:true,force:true});}
}
router.get('/capabilities',async(_req,res)=>{try{res.json(await run({action:'capabilities'},15000));}catch(e){res.json({image:false,pdf:false,video:false,download:false,error:e.message});}});
function admission(req,res,next){if(req.get('X-Drevia-Client')!=='web'||req.get('Sec-Fetch-Site')==='cross-site')return res.status(403).json({error:'Use the Drevia website to submit a job.'});if(active)return res.status(503).json({error:'Another advanced job is running. Please retry shortly.'});const token={};active=token;req.releaseMedia=()=>{if(active===token)active=null;};req.mediaProcessing=false;res.once('finish',()=>{if(!req.mediaProcessing)req.releaseMedia();});res.once('close',()=>{if(!req.mediaProcessing)req.releaseMedia();});next();}
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:100*1048576,files:1,fields:5,fieldSize:10000}});
async function job(req,res,options,input){let dir;req.mediaProcessing=true;try{
 dir=await fs.mkdtemp(path.join(os.tmpdir(),'drevia-'));const output=path.join(dir,'result');const args={...options,output};
 if(input){args.input=path.join(dir,'input');await fs.writeFile(args.input,input);}
 const result=await run(args);const stat=await fs.stat(output);if(stat.size>220*1048576)throw Error('Result exceeds the download size limit.');
 res.type(result.mime);res.set('Cache-Control','no-store');
 await new Promise((resolve,reject)=>res.download(output,result.name,err=>err?reject(err):resolve()));
 }catch(e){if(!res.headersSent&&!res.destroyed)res.status(422).json({error:e.message});}
 finally{req.mediaProcessing=false;req.releaseMedia();if(dir)await fs.rm(dir,{recursive:true,force:true});}}
router.post('/cleanup',admission,upload.single('file'),async(req,res)=>{
 try{if(!req.file)throw Error('Choose a file.');if(req.body.ownership!=='yes')throw Error('Confirm you may edit this content.');const action=req.body.kind;if(!['image','pdf','video'].includes(action))throw Error('Unsupported file type.');const regions=JSON.parse(req.body.regions||'[]');if(!Array.isArray(regions)||!regions.length||regions.length>12)throw Error('Select 1–12 regions.');await job(req,res,{action,regions,page:Number(req.body.page||0),allPages:req.body.allPages==='true'},req.file.buffer);}catch(e){req.releaseMedia();if(!res.headersSent)res.status(400).json({error:e.message});}});
router.post('/download',admission,async(req,res)=>{if(req.body.ownership!==true||typeof req.body.url!=='string'||req.body.url.length>2000){req.releaseMedia();return res.status(400).json({error:'Enter a video link and confirm permission to download it.'});}await job(req,res,{action:'download',url:req.body.url});});
router.use((err,req,res,_next)=>{req.releaseMedia?.();res.status(400).json({error:err.code==='LIMIT_FILE_SIZE'?'File limit: 100 MB.':err.message});});
module.exports={router,run};
