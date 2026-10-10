'use strict';
window.DreviaConnection = (() => {
  const base = new URL('./', document.currentScript.src);
  function environmentError() {
    return location.protocol === 'file:' ? 'This page was opened as a file. Run START-WINDOWS.cmd (or npm start), then open http://localhost:3000. OCR and browser workers need the running web server.' : '';
  }
  async function request(route, options = {}) {
    const setup = environmentError(); if (setup) throw new Error(setup);
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), options.timeout || 150000);
    try {
      let response;
      try { response = await fetch(new URL(route.replace(/^\/+/, ''), base), { ...options, signal: controller.signal, cache: 'no-store' }); }
      catch (e) { throw new Error(e.name === 'AbortError' ? 'The server took too long. Try fewer pages or check the hosting resource limits.' : 'Cannot reach the Drevia server. Start it with npm start and use its printed address. If hosted, route api/ requests to the Node app. Open Connection check for details.'); }
      if (!response.ok) {
        let message = '';
        try { const data = await response.json(); message = data.error || data.detail || ''; } catch (_) {}
        if (response.status === 404 || response.status === 405) message = 'The OCR backend is not available at this address. Static-only hosting cannot run server OCR; deploy the Node app or use START-WINDOWS.cmd locally.';
        throw new Error(message || `Server returned HTTP ${response.status}. Check the backend and reverse proxy.`);
      }
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The API returned a webpage instead of JSON. Static hosting or a proxy fallback is intercepting api/ requests. Open Connection check.');
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  function showSetup() {
    const text = environmentError(); if (!text) return;
    const box = document.createElement('div'); box.setAttribute('role', 'alert');
    box.style.cssText = 'padding:18px;background:#fff0d5;color:#633d08;border-bottom:2px solid #d9a54a;font:15px/1.6 system-ui;';
    box.textContent = text; document.body.prepend(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',showSetup); else showSetup();
  return { request, base, environmentError };
})();
