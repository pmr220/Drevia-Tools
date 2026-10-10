'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const to = path.join(root, 'lib', 'qrcode.min.js');
try {
  require('esbuild').buildSync({entryPoints:[require.resolve('qrcode/lib/browser.js')],outfile:to,bundle:true,minify:true,platform:'browser',format:'iife',globalName:'QRCode',legalComments:'inline'});
  console.log('Built the local QR browser library.');
} catch (error) {
  if (!fs.existsSync(to) || fs.statSync(to).size < 1000) {
    console.error('QR library missing. Run npm install --include=dev, then npm run build:assets.');
    process.exit(1);
  }
  console.log('Using included QR browser bundle. Rebuild after dependency upgrades.');
}
