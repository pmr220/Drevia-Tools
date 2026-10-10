'use strict';

const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');
const QRCode = require('qrcode');
const { rateLimit } = require('express-rate-limit');
const { createWorker } = require('tesseract.js');

const app = express();
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const MAX_UPLOAD_BYTES = 18 * 1024 * 1024;
const LANG_DIR = path.join(ROOT, 'tessdata');
const allowedLanguages = new Set(['eng', 'hin', 'eng+hin']);
const workers = new Map();
let ocrBusy = false;
const requiredAssets = ['lib/qrcode.min.js','lib/pdf.min.js','lib/pdf.worker.min.js','lib/ffmpeg.js','lib/814.ffmpeg.js','lib/ffmpeg-core.esm.js','lib/ffmpeg-core.wasm'];

app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'no-referrer' },
  // Local HTTP development must not be upgraded to unavailable HTTPS assets.
  strictTransportSecurity: process.env.NODE_ENV === 'production' ? undefined : false
}));
app.use(compression());
app.use(express.json({ limit: '64kb' }));

const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 180,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' }
});
app.use('/api/', apiLimiter);
app.use('/api/', (_req,res,next)=>{res.set('Cache-Control','no-store');next();});

const ocrLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'OCR is busy for this connection. Please wait a few minutes and try again.' }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 3 },
  fileFilter(_req, file, cb) {
    const ok = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/tiff', 'image/x-ms-bmp'].includes(file.mimetype);
    cb(ok ? null : new Error('Choose a PNG, JPG, WebP, BMP or TIFF image.'), ok);
  }
});

app.get('/api/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    service: 'Drevia Infotech Tools API',
    database: false,
    version: '3.1.0',
    missingAssets: requiredAssets.filter(p=>!fs.existsSync(path.join(ROOT,p))),
    uploadStorage: 'memory-only',
    ocrLanguages: {
      english: fs.existsSync(path.join(LANG_DIR, 'eng.traineddata')),
      hindi: fs.existsSync(path.join(LANG_DIR, 'hin.traineddata'))
    }
  });
});

app.post('/api/qr', async (req, res, next) => {
  try {
    const payload = typeof req.body?.payload === 'string' ? req.body.payload.trim() : '';
    const format = req.body?.format === 'svg' ? 'svg' : 'png';
    if (!payload) return res.status(400).json({ error: 'Enter something to put into the QR code.' });
    if (payload.length > 4096) return res.status(413).json({ error: 'This QR payload is too long. Keep it under 4,096 characters.' });
    const opts = { errorCorrectionLevel: 'M', margin: 2, width: 1024, color: { dark: '#10213d', light: '#FFFFFFFF' } };
    res.set('Cache-Control', 'no-store');
    if (format === 'svg') {
      const svg = await QRCode.toString(payload, { ...opts, type: 'svg' });
      res.type('image/svg+xml').send(svg);
    } else {
      const png = await QRCode.toBuffer(payload, { ...opts, type: 'png' });
      res.type('image/png').send(png);
    }
  } catch (err) { next(err); }
});

async function getOcrWorker(language) {
  if (!allowedLanguages.has(language)) throw new Error('Choose English, Hindi or English + Hindi.');
  if (workers.has(language)) return workers.get(language);
  // Keep at most one model combination in memory; admission below serializes jobs.
  for (const promise of workers.values()) { try { await (await promise).terminate(); } catch (_) {} }
  workers.clear();
  for(const lang of language.split('+'))if(!fs.existsSync(path.join(LANG_DIR,lang+'.traineddata')))throw new Error('OCR language model missing. Restore the tessdata folder from the ZIP.');
  const promise = createWorker(language, 1, {
    langPath: LANG_DIR,
    gzip: false,
    cacheMethod: 'none',
    logger: () => {},
    errorHandler: () => {} // reject the job without throwing an uncaught process-level error
  });
  workers.set(language, promise);
  try { return await promise; }
  catch (err) { workers.delete(language); throw err; }
}

app.post('/api/ocr', ocrLimiter, (req,res,next)=>{
  if(ocrBusy)return res.status(503).json({error:'OCR is processing another page. Please retry shortly.'});
  ocrBusy=true;
  // Release on normal response, or when upload middleware rejects the request.
  res.once('finish',()=>{ocrBusy=false;});
  res.once('close',()=>{if(!req.ocrProcessing)ocrBusy=false;});
  next();
}, upload.single('image'), async (req, res, next) => {
  req.ocrProcessing=true;
  let timer;
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose an image to extract text from.' });
    const language = typeof req.body?.language === 'string' ? req.body.language : 'eng';
    if (!allowedLanguages.has(language)) return res.status(400).json({ error: 'Choose English, Hindi or English + Hindi.' });
    const worker = await getOcrWorker(language);
    const { data } = await Promise.race([
      worker.recognize(req.file.buffer, {}, {text:true,pdf:true}),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('OCR timed out. Try a smaller, clearer page.')),120000);})
    ]);
    res.set('Cache-Control', 'no-store');
    res.json({ text: (data.text || '').trim(), confidence: Math.round(Number(data.confidence || 0)), language,
      pdf: data.pdf ? Buffer.from(data.pdf).toString('base64') : null });
  } catch (err) {
    for(const promise of workers.values()){try{await(await promise).terminate();}catch(_){}}
    workers.clear();
    next(new Error(typeof err==='string'?err:err.message));
  } finally { clearTimeout(timer); ocrBusy=false; }
});

app.use('/api/media', require('./scripts/media-api').router);

app.use('/api/', (_req,res)=>res.status(404).json({error:'Unknown API endpoint. Deploy matching frontend and backend files together.'}));

// Prevent direct downloads of server code, dependency folders, model data and config.
app.use((req, res, next) => {
  let pathname = req.path || '/';
  try { pathname = decodeURIComponent(pathname); } catch (_) {}
  if (/^\/(?:server\.js|package(?:-lock)?\.json|README(?:\.md|\.txt)?|\.env(?:\..*)?|\.nvmrc)(?:$|\/)/i.test(pathname) || /^\/(?:node_modules|tessdata|scripts)(?:\/|$)/i.test(pathname)) return res.sendStatus(404);
  next();
});

// Static assets only; uploaded files are never written to disk.
// Explicit public allowlist: future tests/configuration are never accidentally served.
app.use((req,res,next)=>{
  const requested=req.path==='/'?'index.html':req.path.slice(1);
  const publicFile=/^[\w-]+\.(?:html|css|js|png|jpe?g|svg|webmanifest)$/.test(requested)&&!['server.js','sw.js'].includes(requested);
  const library=/^lib\/[\w.-]+\.(?:js|wasm)$/.test(requested);
  if(publicFile||library||requested==='sw.js')return next();
  res.sendStatus(404);
});
app.use(express.static(ROOT, {
  extensions: ['html'],
  index: 'index.html',
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  setHeaders(res, filePath) {
    if (/\.(html|json|webmanifest|js|css)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
    if (/\.wasm$/i.test(filePath)) res.setHeader('Content-Type', 'application/wasm');
    if (/\.traineddata$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));

app.use((err, _req, res, _next) => {
  if (res.headersSent) return;
  const isUploadError = err instanceof multer.MulterError;
  const message = isUploadError && err.code === 'LIMIT_FILE_SIZE'
    ? `Images must be smaller than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`
    : err.message || 'Something went wrong while processing the request.';
  const status = isUploadError ? 413 : (/Choose a|Enter something|too long|Choose English/.test(message) ? 400 : 500);
  if (status >= 500) console.error('[api]', err.stack || err.message);
  res.status(status).json({ error: message });
});

const server = require.main === module ? app.listen(PORT, () => {
  console.log(`Drevia Infotech Tools running on http://localhost:${PORT}`);
  console.log('Database: none. OCR uploads are held in memory and are not saved to disk.');
  const missing=requiredAssets.filter(p=>!fs.existsSync(path.join(ROOT,p)));
  if(missing.length)console.error('Missing assets:',missing.join(', '),'Run npm run build:assets and restore the complete ZIP.');
}) : null;

async function shutdown() {
  if(server)server.close();
  for (const promise of workers.values()) {
    try { const worker = await promise; await worker.terminate(); } catch (_) {}
  }
  workers.clear();
}
if(server){server.on('error',err=>{console.error(err.code==='EADDRINUSE'?`Port ${PORT} is already in use. Stop the other server or set PORT.`:err.message);process.exitCode=1;});
process.on('SIGINT', ()=>shutdown().then(()=>process.exit(0)));
process.on('SIGTERM', ()=>shutdown().then(()=>process.exit(0)));}
module.exports={app,shutdown};
