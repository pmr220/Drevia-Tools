# Drevia Infotech Tools — Advanced 3.1.0

This package repairs the uploaded `Drevia-Infotech-Tools-v2.zip`. It is a **Node.js app**, separate from the earlier Python Studio package. Do not mix frontend/backend files from these two packages: their API formats differ.

## Start on Windows

1. Extract this entire ZIP to a new folder. Do not run files inside the ZIP viewer.
2. Install Node.js 22 or newer from https://nodejs.org if it is not installed.
3. For watermark cleanup and link downloads, install Python 3.10+ and double-click **SETUP-ADVANCED-WINDOWS.cmd** first. Then double-click **START-WINDOWS.cmd**. It installs the locked dependencies on first use. Internet is required for that installation.
4. Keep the server window open, then open **http://localhost:3000**.
5. Open **Help & setup** in the navigation. The API and all three asset checks should pass.

Do not double-click index.html or use a file:// URL for the full app. Do not upload only HTML/CSS to a static host and expect OCR to work. If the launch window shows an error, keep it open and read the error; it is not safe to assume the server started. Port conflicts are reported clearly.

## Other systems / terminal startup

```sh
npm ci
npm start
```

Use Node.js 22+. Open http://localhost:3000. `PORT` changes the port. For example, Windows PowerShell: `$env:PORT=3001; npm start`. The launcher assumes the default port unless the environment overrides it.

`npm ci` uses the included package-lock.json. The QR bundle is already included, so even a production-only install can use it. Developer rebuild: `npm run build:assets`. The build script bundles qrcode/lib/browser.js with esbuild; it does not depend on the nonexistent qrcode/build/qrcode.min.js.

## Fix an existing deployment / old cache

Deploy the **complete repaired package**, including lib/, tessdata/, connection.js, diagnostics.html and sw.js. Run `npm ci` and restart the Node process. Then open `/diagnostics.html` (or your subfolder plus diagnostics.html), press **Clear Drevia cached app files & reload**, and reload the tool page. The old v2 worker used cache-first forever; replacing server files alone might not update a page that is already open.

The replacement worker uses fresh assets first, falls back to explicitly cached assets when offline, excludes API requests, uses folder-relative paths and cleans only Drevia-prefixed caches. No private inputs or output downloads are cached. The 30 MB video engine is served locally but is not included in the offline pre-cache; video engine startup still needs the server on a fresh page load. OCR always needs the backend.

## Deploy

Use a host that runs a persistent **Node.js server**, or Docker. Set startup command to `npm start`; configure its assigned `PORT`. Upload tessdata/ and lib/ in full. There is no database or external OCR service. Advanced cleanup/download tools need the Python environment described below; imageio-ffmpeg supplies a native FFmpeg binary. Tesseract.js uses bundled English/Hindi models and its installed WebAssembly runtime. A conventional Node/container host is required; static hosting and a Cloudflare Worker alone cannot run this backend.

Docker example:

```sh
docker compose up --build -d
```

Compose binds to localhost:3000. Put an HTTPS reverse proxy in front of it for public access. Forward both the pages and `/api/*` to Node; do not turn missing API or library requests into index.html. Allow multipart requests up to 105 MB, and set the proxy read timeout above 260 seconds. Keep API responses uncached and do not log upload bodies. Set `TRUST_PROXY=1` only if there is exactly one trusted proxy hop and direct backend access is blocked. Configure edge rate limits and monitor memory before opening public access.

Subfolder example: if the visible site is https://example.com/tools/, proxy **all** `/tools/` traffic to the Node root, stripping `/tools/`. API requests will target `/tools/api/ocr`. Keep the trailing slash for the folder homepage. Do not host the frontend and backend on unrelated origins; no permissive CORS workaround is included.

HTTPS is required on real phones for camera, microphone, clipboard and PWA features. `localhost` on a phone means that phone, not your PC. Use your deployed HTTPS URL for phone testing. Docker/TLS/physical iOS/Android behavior has not been verified here.

## What was fixed

- Included the missing QR browser library and corrected its reproducible build step.
- Added a shared request helper: relative API URLs, timeouts, file:// setup warning, and useful messages for offline/stopped servers, missing endpoints and HTML fallback responses.
- Added Connection check for API/model/asset diagnostics and old cache cleanup.
- Fixed stale service-worker caching, subfolder paths and deletion of unrelated caches.
- Added a Windows startup helper and a locked Node dependency tree.
- OCR now returns real searchable PDFs from Tesseract, combined across input pages in the browser. The original code exported only text with a Latin font, which was unsuitable for Hindi and was not a searchable scan.
- Prevented simultaneous jobs from sharing one OCR worker. One job is admitted at a time; additional requests receive an explicit busy response. Only one language combination stays resident.
- Invalid OCR image input no longer throws an uncaught error that can crash the service; recognition has a 120-second timeout. Language initialization is not included in that recognition timeout.
- Corrected PDF editor output dimensions: its original 0.75 factor shrank every page. PNG export avoids JPEG artifacts around redactions.
- Disabled PDF.js eval in all three PDF-rendering workflows.
- Limited static serving to explicit public file types and library paths; configuration, tests and language models are not downloadable.

## Features retained and limitations

All 13 supplied tools remain, with seven additions (20 total): ZIP, compression, photos-to-PDF, merge/extract, resize photo, video-to-audio, QR, signatures/stamps, OCR, PDF editor, ID photo, invoice, and camera/mic test.

Most processing is local. OCR uploads image pages. Advanced cleanup and link downloads use temporary server files; backend QR is available for integrations but the QR UI stays local. No database or permanent upload directory is used. Advanced jobs create temporary OS directories and delete them after responses; crashes can leave temporary files, so use an ephemeral container volume and clean it between deployments. Tesseract operates in WebAssembly memory; results are returned and not persisted. This does not control reverse-proxy logging, browser download retention, OS memory paging or hosting-provider policies.

OCR supports English, Hindi and their combination. TIFF recognition is passed as one input image; this implementation does not promise every frame of a multi-frame TIFF. Scanned PDFs are rasterized and uploaded page by page, with a 30-page limit per source PDF and 18 MB limit per page image. OCR is not perfect, especially handwriting; verify names/numbers. TXT/DOCX include edits made in the result box. Searchable PDF preserves scan images and the original recognized text layer; editing that box does not alter the PDF layer. DOCX does not reconstruct the original page layout.

The PDF editor still deliberately exports **image-only PDFs**. This removes original text/metadata and permanently covers selected regions in pixels, but discards searchable/selectable text. It is not the content-preserving redaction backend in the earlier Python Studio. There is no direct rewriting/reflow of existing PDF text, cryptographic digital signing, PDF/A promise, or automatic detection of all sensitive data. Inspect every exported redaction. Using OCR afterward may recognize remaining visible content; it cannot restore removed pixels.

QR CSV batch supports PNG/SVG and arbitrary encoded values; single QR export supports PNG/SVG/PDF. Signatures are visual PNGs, not identity-verified signatures. Background removal targets white backgrounds. ID photos do not perform AI subject segmentation. Invoice Studio provides four templates, logo placement, background logo opacity, editable drafts and invoice/quotation/receipt modes. Camera/microphone still require explicit browser permission and supported hardware/codecs.

## Verification

```sh
npm run check
npm test
```

The script check parses all inline page scripts and verifies every local script file exists. Automated integration tests exercise the real Node server, both OCR models, searchable PDF output, invalid-image recovery, asset/API routes and connection error messages. See REPAIR-REPORT.md for actual test results and unverified areas.

Before public rollout, test your actual hosting plan, real phone browsers, representative files, memory limits and codecs. Run `npm audit` and maintain the lockfile. The npm audit does not cover inherited files in lib/; their upstream license/security review remains necessary. Preserve third-party notices when distributing bundled libraries and OCR models.


## Advanced tools: setup and limits

Windows: install Python 3.10+ and Node.js 22+, run SETUP-ADVANCED-WINDOWS.cmd once, then START-WINDOWS.cmd. First installation requires internet. The launcher detects .venv automatically. Do not copy the old v2 server into this package.

Linux/macOS:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-advanced.txt
npm ci
PYTHON_BIN="$PWD/.venv/bin/python" npm start
```

PYTHON_BIN must identify the environment containing the pinned packages. Native wheels are required for OpenCV/PyMuPDF and imageio-ffmpeg; supported Python/platform wheels are necessary. FFMPEG_BIN optionally overrides the packaged executable. Docker installs these dependencies; the Docker image and deployment have not been executed here.

- **Invoice Studio:** Executive, Minimal, Modern and Classic; header logo plus independent 1–20% background watermark; line items, tax, discount, PDF/print and JSON draft reuse. Built-in PDF fonts support Latin text. Use browser Print / Save PDF for Indian scripts. Generic documents, not jurisdiction-specific tax compliance or accounting records.
- **Watermark cleanup:** manually select visible areas in an image, PDF page or short video. OpenCV inpainting fills the area using nearby pixels without cropping. There is no 100% restoration guarantee, Gemini-specific detection, moving-object tracking or invisible-watermark removal. Complex backgrounds can show artifacts. Images: 20 MP; PDFs: 30 pages; videos: 60 seconds, 1080p, 60 fps, even dimensions. Upload limit 100 MB; selected regions together at most 25% of the image. Videos export H.264/AAC MP4. Edited PDF pages become image-only, losing their text/annotations; untouched pages retain their original content. Use the privacy editor for redaction, not inpainting.
- **Video downloader:** yt-dlp integration for direct public YouTube, Instagram and Facebook video/reel URLs. Up to 720p, 10 minutes and 200 MB where a combined audio/video format exists. No profiles, playlists, arbitrary websites, credentials, login-only videos or protected streams. Availability changes with platform rules and host IP. A live YouTube check failed in this environment; successful Instagram/Facebook downloads have not been verified. Treat this as an availability-dependent integration, not guaranteed platform support. Update yt-dlp deliberately when platforms change, then retest.
- **Batch Image Studio:** local conversion to JPEG/PNG/WebP, proportional resizing without upscaling, removal of source EXIF/GPS metadata and ZIP export. Up to 30 images, 10 MB each, 20 MP each, 150 MB total. Re-encoding changes pixels; animated/multi-frame images are not preserved.

The home page automatically counts 20 tools and includes search/category filters. Main navigation stays short; every tool keeps a direct page and footer link. PWA caching supports cached local tools, not offline OCR, cleanup or internet downloading.

## Deployment and distribution notes

Advanced jobs run one at a time per Node process and use temporary files. Run behind HTTPS and an authenticated/abuse-controlled reverse proxy for public deployment. Use a single process per container or budget memory independently for each process. Keep upload/API responses uncached, enforce request limits, use an ephemeral temp volume, apply CPU/memory limits and restrict worker network egress to the platforms/CDNs required. Incoming URL validation is not a substitute for deployment network isolation. No database or persistent user account system is included. On server shutdown/crash, OS temporary data may survive until cleanup; ordinary completion removes the job directories.

Third-party licenses need review before commercial distribution. In particular PyMuPDF is AGPL/commercially licensed; choose and comply with the applicable license before offering a closed-source service. Preserve notices for bundled JavaScript, OCR models, OpenCV and the FFmpeg build. This package does not grant rights to third-party media or dependency licenses.

## Advanced verification (this build)

- 17 Node integration tests passed, including actual English/Hindi OCR, searchable PDF, deployment errors, route protection, download URL rejection and real image cleanup API.
- 5 Python tests passed: region/URL validation, image cleanup, PDF page preservation, video cleanup with frame dimensions and audio retained.
- Browser: branded Modern invoice PDF downloaded and inspected (correct INR 2,950 total and low-opacity logo); two images converted to a downloadable WebP ZIP; home displayed 16 tools.
- Physical iOS/Android, public hosting, Docker, production load and successful social-platform downloads remain unverified.

Run `npm run check` and `npm test`. With the advanced Python environment installed, run `.venv/bin/python tests/test_media.py` (Windows: `.venv\Scripts\python.exe tests\test_media.py`). Set PYTHON_BIN to include the real advanced API test rather than its optional skip.


## Version 3.1: four new local tools and invoice improvements

- Private File Pack: locks up to 50 MB into a .drevia container and unlocks it to a ZIP. AES-256-GCM with a fresh 16-byte salt and 12-byte IV, PBKDF2-SHA256 (600,000 iterations); the format header is authenticated. Passwords are cleared after success and never stored. No password recovery, no server upload, no independent security audit. Requires Web Crypto over HTTPS/localhost. Keep a copy of the app to unlock old packs. Technical API reference: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey
- Duplicate & Integrity Check: exact SHA-256 duplicate groups, ZIP containing one copy of each distinct file, JSON fingerprint manifest and a verification report. Matches filename, size and content, including repeated names. Does not delete originals or detect visually similar images; the manifest is unsigned. Up to 200 files / 200 MB.
- PDF Booklet Arranger: A4/A3 landscape, left/right binding, two-up sheet order and blank padding. Up to 200 pages / 30 MB. Page artwork is embedded; interactive annotations/forms must be flattened first. Print short-edge duplex and test a sheet. No printer control or automatic multi-signature binding.
- Photo Contact Sheet: numbered previews with filenames and dimensions, 2x3 or 3x4 layout, titled A4 PDF. Up to 60 images / 100 MB / 20 MP per image. Captions use browser fonts, including available Indian scripts; output is image-only.
- Invoices: fixed-currency (rupees with INR) or percentage discounts before tax. Item quantity/rate arrows now step by 1; fractional values can still be typed. Units: nos, kg, gram, ltr, ml, metre, sq ft, hour, day, box, set and service. Units and discount type persist in drafts and appear in PDF exports. Earlier version-1 drafts default to fixed discounts and nos.

Update by extracting this complete package to a fresh folder, installing dependencies and restarting the Node server from that folder. An already-running older server at localhost:3000 will not automatically become the new build. Close its launcher before starting the new one, or choose another PORT. Use Help & setup to clear an old Drevia cache if needed. No new packages are needed for these four tools.
