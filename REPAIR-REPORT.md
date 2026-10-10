# Repair report — uploaded Drevia v2

## Confirmed findings

1. `lib/qrcode.min.js` was absent from the uploaded ZIP. After installing the specified `qrcode@1.5.4`, its expected `build/qrcode.min.js` was also absent. The original postinstall printed a warning and continued, so the QR page remained broken. Repaired by bundling the actual browser entry and shipping the generated file.
2. OCR fetched `/api/ocr` with no connection-specific handling. A file:// launch, stopped backend, static-only host, or subfolder deployment without a matching root API could produce Failed to fetch, a 404, or HTML instead of JSON. The user's exact deployment was not supplied, so this is a confirmed failure path, not a claim that a particular live host was diagnosed.
3. The v2 service worker served cached assets before checking the network, indefinitely. Updates could leave old scripts active. It also used root-relative paths and deleted all caches on the origin. The replacement uses network-first asset refresh, folder-relative URLs, and Drevia-only cache cleanup.
4. OCR workers were shared across concurrent requests without a queue/admission lock. Worker errors could throw without an error handler. Requests are now serialized with a clear busy response; invalid-image recovery was tested.
5. The OCR PDF download rebuilt text with a Latin built-in font. It was not a searchable scanned PDF and was unsuitable for Hindi. It now exports the actual scan plus Tesseract's searchable text layer; multiple pages are merged locally.
6. PDF editor export multiplied dimensions by 0.75 even though PDF.js already returned PDF points. Removed that factor and verified the exported page remains 400 × 500 points rather than 300 × 375.
7. The frontend/backends in the earlier Python delivery and this new Node ZIP are different. Do not mix their files or API contracts. This repair uses the new Node ZIP as its base and retains all its tool pages.

## Changes

Included QR bundle, reproducible esbuild setup, package-lock, Windows launcher, connection helper, diagnostics page, cache refresh repair, relative API/manifest paths, real searchable OCR PDFs, serialized OCR, recognition timeout, worker error recovery, full-size/lossless PDF export and explicit public file serving. Added Docker starting files and rewritten setup/hosting instructions.

## Verified on this Windows host

- 13 automated tests passed; zero skipped. These include real English and Hindi OCR, searchable PDF generation, invalid-image recovery, all page/critical asset routes, protected-file routes, PNG/SVG API QR generation, and file:// / missing API / HTML fallback / network error / subfolder helper behavior.
- All 19 application and inline page scripts parsed; every referenced local script exists.
- `npm audit --omit=dev` reported zero known vulnerabilities in the installed production npm dependency tree at test time. This excludes the inherited vendor files in lib/ and is not a security certification.
- Browser Connection check: backend, both models, QR library, PDF worker and FFmpeg WebAssembly asset passed.
- Browser QR generation produced its PNG preview and save controls.
- Browser OCR recognized DREVIA INVOICE 12345 and downloaded a searchable PDF. Reopening the actual downloaded PDF with an independent PDF library confirmed the text layer contains that text.
- Browser PDF editor opened the synthetic PDF and exported a flattened file. Independent inspection confirmed 400 × 500 point dimensions were preserved.
- Browser FFmpeg engine loaded and encoded a synthetic one-second WAV audio fixture presented through the video input as M4A, producing an 8 KB result. This tests engine loading and encoding, not every real video/container codec.
- No console errors observed in the tested OCR/media flows.

## Not claimed as verified

The user's actual hosted URL, Docker build, public TLS/proxy configuration, physical iOS/Android devices, every tool's full feature set, large-file stress, every video codec, full offline workflows or camera/microphone hardware. The PDF editor still produces image-only pages; it is not content-preserving PDF text editing. No live deployment was modified.

## Immediate usage

Extract the repaired ZIP into a fresh folder. Install Node.js 22+. Run START-WINDOWS.cmd and open http://localhost:3000 while the server window stays open. For an existing host, deploy all files, run npm ci, restart Node, open diagnostics.html, clear the old Drevia cached app files, and reload.
