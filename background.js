// Google Forms Universal AI Assistant HUD - Manifest V3 Background Service Worker
// Enables 100% reliable cross-origin API calls (AnyModel, Google Search)
// bypassing webpage CORS/CSP restrictions.

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Google Form AI HUD] Background Service Worker installed successfully.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH') {
    const { url, options, timeout } = request;
    const timeoutMs = timeout || 45000;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    const fetchOptions = {
      ...(options || {}),
      signal: controller ? controller.signal : undefined
    };

    fetch(url, fetchOptions)
      .then(async (res) => {
        if (timer) clearTimeout(timer);
        const text = await res.text();
        sendResponse({
          ok: true,
          status: res.status,
          statusText: res.statusText,
          text: text
        });
      })
      .catch((err) => {
        if (timer) clearTimeout(timer);
        console.error('[Google Form AI HUD] Background fetch failed:', err);
        sendResponse({
          ok: false,
          error: err.name === 'AbortError' ? `Request timed out (${Math.round(timeoutMs / 1000)}s)` : (err.message || 'Background network error')
        });
      });

    return true; // Keep message port open for async sendResponse
  }

  else if (request.type === 'SCAN_EXTENSION_FILES') {
    (async () => {
      try {
        let fileNames = [];

        // 1. Try reading files/files.json from extension package
        try {
          const res = await fetch(chrome.runtime.getURL('files/files.json'));
          if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list)) {
              fileNames = list.filter(name => {
                const lower = (name || '').toLowerCase();
                return ['.docx', '.doc', '.pptx', '.ppt', '.pdf', '.txt', '.md'].some(ext => lower.endsWith(ext));
              });
            }
          }
        } catch (e) {}

        // 2. Try HTML5 FileSystem getPackageDirectoryEntry if supported
        if (fileNames.length === 0 && typeof chrome.runtime.getPackageDirectoryEntry === 'function') {
          try {
            const entries = await new Promise((resolve) => {
              chrome.runtime.getPackageDirectoryEntry((root) => {
                if (!root || chrome.runtime.lastError) return resolve([]);
                root.getDirectory('files', { create: false }, (dir) => {
                  if (!dir || chrome.runtime.lastError) return resolve([]);
                  const reader = dir.createReader();
                  reader.readEntries((results) => resolve(results || []), () => resolve([]));
                }, () => resolve([]));
              });
            });
            if (entries && entries.length > 0) {
              const supported = entries
                .filter(e => e.isFile && !e.name.endsWith('.json'))
                .map(e => e.name)
                .filter(name => {
                  const lower = (name || '').toLowerCase();
                  return ['.docx', '.doc', '.pptx', '.ppt', '.pdf', '.txt', '.md'].some(ext => lower.endsWith(ext));
                });
              if (supported.length > 0) fileNames = supported;
            }
          } catch (e) {}
        }

        // 3. Probing common default filenames in files/
        if (fileNames.length === 0) {
          const probes = [
            'lecture.pptx', 'slides.pptx', 'notes.docx', 'notes.pdf', 'reviewer.pdf',
            'reviewer.docx', 'reviewer.pptx', 'knowledge.docx', 'knowledge.pdf', 'knowledge.pptx',
            'summary.docx', 'summary.pdf', 'biology.pdf', 'science.pdf', 'notes.txt'
          ];
          for (const p of probes) {
            try {
              const chk = await fetch(chrome.runtime.getURL('files/' + p), { method: 'HEAD' });
              if (chk.ok) fileNames.push(p);
            } catch (e) {}
          }
        }

        sendResponse({ ok: true, fileNames });
      } catch (err) {
        console.error('[Google Form AI HUD] SCAN_EXTENSION_FILES error:', err);
        sendResponse({ ok: false, error: err.message, fileNames: [] });
      }
    })();
    return true;
  }

  else if (request.type === 'READ_EXTENSION_FILE') {
    const { fileName } = request;
    (async () => {
      try {
        const fileUrl = chrome.runtime.getURL('files/' + fileName);
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const len = bytes.byteLength;
        // Chunked string conversion to avoid call stack limits on large files
        const chunkSize = 8192;
        for (let i = 0; i < len; i += chunkSize) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)));
        }
        const base64 = btoa(binary);
        sendResponse({ ok: true, fileName, base64, size: buffer.byteLength });
      } catch (err) {
        console.error(`[Google Form AI HUD] READ_EXTENSION_FILE "${fileName}" error:`, err);
        sendResponse({ ok: false, fileName, error: err.message });
      }
    })();
    return true;
  }
});
