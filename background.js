// Google Forms Universal AI Assistant HUD - Manifest V3 Background Service Worker
// Enables 100% reliable cross-origin API calls (AnyModel, Gemini, Groq, Mistral, OpenRouter)
// bypassing webpage CORS/CSP restrictions.

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Google Form AI HUD] Background Service Worker installed successfully.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH') {
    const { url, options } = request;

    fetch(url, options)
      .then(async (res) => {
        const text = await res.text();
        sendResponse({
          ok: true,
          status: res.status,
          statusText: res.statusText,
          text: text
        });
      })
      .catch((err) => {
        console.error('[Google Form AI HUD] Background fetch failed:', err);
        sendResponse({
          ok: false,
          error: err.message || 'Background network error'
        });
      });

    return true; // Keep message port open for async sendResponse
  }
});
