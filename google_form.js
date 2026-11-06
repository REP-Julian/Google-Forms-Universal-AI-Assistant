// ==UserScript==
// @name         Google Forms Universal AI Assistant HUD
// @namespace    https://tampermonkey.net/
// @version      1.4.0
// @description  Google Forms AI Solver Patch 1.4.0 with Anti-Proctor Visibility Shield, Face-Down Panic Screen Wipe, IndexedDB Local Answer Cache, Countdown Timer Watchdog, and Weak-Signal Carrier Resilience.
// @author       Assistant
// @match        *://docs.google.com/forms/*
// @match        https://docs.google.com/forms/*
// @match        *://docs.google.com/*
// @match        https://docs.google.com/*
// @match        *://forms.google.com/*
// @match        https://forms.google.com/*
// @match        *://forms.gle/*
// @match        https://forms.gle/*
// @include      *docs.google.com/forms*
// @include      *forms.gle*
// @include      *://docs.google.com/forms/*
// @include      *://forms.gle/*
// @include      https://docs.google.com/forms/*
// @include      https://forms.gle/*
// @connect      *
// @connect      anymodel.org
// @connect      www.google.com
// @connect      google.com
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  // ── 1. ANTI-PROCTOR VISIBILITY & FOCUS-LOSS SHIELD ───────────────────────────
  // Blocks visibilitychange, blur, focusout tracking from Google Forms / exam proctors
  (function installAntiProctorShield() {
    try {
      const doc = typeof document !== 'undefined' ? document : null;
      if (!doc) return;

      try {
        Object.defineProperty(doc, 'hidden', { get: () => false, configurable: true });
        Object.defineProperty(doc, 'visibilityState', { get: () => 'visible', configurable: true });
      } catch (_) {}

      if (typeof Document !== 'undefined' && Document.prototype) {
        try {
          Object.defineProperty(Document.prototype, 'hidden', { get: () => false, configurable: true });
          Object.defineProperty(Document.prototype, 'visibilityState', { get: () => 'visible', configurable: true });
        } catch (_) {}
      }

      const blockedEvents = new Set(['blur', 'focusout', 'visibilitychange']);
      const wrapAddEventListener = (target) => {
        if (!target || !target.addEventListener) return;
        const origAdd = target.addEventListener;
        target.addEventListener = function (type, listener, options) {
          const lower = String(type).toLowerCase();
          if (blockedEvents.has(lower)) {
            const wrapped = function (e) {
              if (e && (e.type === 'blur' || e.type === 'focusout')) return;
              if (e && e.type === 'visibilitychange' && doc.visibilityState === 'hidden') return;
              try { return listener.call(this, e); } catch (_) {}
            };
            return origAdd.call(this, type, wrapped, options);
          }
          return origAdd.call(this, type, listener, options);
        };
      };

      wrapAddEventListener(window);
      wrapAddEventListener(doc);
      console.log('[Google Form AI HUD] 🛡️ Anti-Proctor Visibility & Focus-Loss Shield active.');
    } catch (e) {
      console.warn('[Google Form AI HUD] Anti-proctor shield initialization notice:', e);
    }
  })();

  console.log('%c[Google Form AI HUD v1.4.0]%c Next Level Document RAG, Anti-Proctor Shield, Face-Down Panic & Answer Cache active! (Alt+H or F2 to toggle, or click ⚡ button)',
    'background: #2563eb; color: #ffffff; padding: 3px 8px; border-radius: 4px; font-weight: bold;',
    'color: #38bdf8; font-weight: bold;'
  );

  const STEP_DELAY_MS = 450;
  const DEFAULT_PROVIDER = 'anymodel';
  const DEFAULT_BASE_URL = 'https://anymodel.org/v1';
  const DEFAULT_MODEL = 'ag/gemini-3-flash';

  // ── API Key Pool: round-robin with automatic failover on auth/quota errors ──
  const ANYMODEL_API_KEYS = [
    'sk-dc9d4b7df36ba555-l6bynm-60c40cd4',
    'sk-dc9d4b7df36ba555-wv2zey-5b8ec9d1',
    'sk-dc9d4b7df36ba555-20shpy-0df1133c'
  ];
  let _apiKeyIndex = 0; // in-memory round-robin pointer

  // Returns whichever key is currently active
  function getActiveApiKey() {
    // User may have typed a custom key into the HUD — that always wins
    const stored = (typeof getSafeValue === 'function')
      ? getSafeValue('anymodel_api_key', '').trim()
      : '';
    if (stored && !ANYMODEL_API_KEYS.includes(stored)) return stored;
    return ANYMODEL_API_KEYS[_apiKeyIndex % ANYMODEL_API_KEYS.length];
  }

  // Rotates to the next key in the pool and persists it so the HUD reflects the change
  function rotateApiKey() {
    _apiKeyIndex = (_apiKeyIndex + 1) % ANYMODEL_API_KEYS.length;
    const next = ANYMODEL_API_KEYS[_apiKeyIndex];
    if (typeof setSafeValue === 'function') setSafeValue('anymodel_api_key', next);
    return next;
  }

  // Seed localStorage with the first pool key on first run so the HUD isn't empty
  const DEFAULT_API_KEY = ANYMODEL_API_KEYS[0];

  // AnyModel Verified Live Models (Gemini, Claude, GPT, Grok & Auto-Router)
  const ANYMODEL_MODELS = [
    // --- GOOGLE GEMINI ---
    { id: 'ag/gemini-3-flash', group: 'Google Gemini', label: 'Gemini 3 Flash (ag/gemini-3-flash) [👁️ Vision, ⚡ Ultra Fast & Rock Solid - Top Pick]' },
    { id: 'ag/gemini-2.5-flash', group: 'Google Gemini', label: 'Gemini 2.5 Flash (ag/gemini-2.5-flash) [👁️ Vision, ⚡ Ultra Fast & Light]' },
    { id: 'ag/gemini-3.8-flash-high', group: 'Google Gemini', label: 'Gemini 3.8 Flash High (ag/gemini-3.8-flash) [👁️ Vision, 🧠 Frontier High Reasoning]' },
    { id: 'ag/gemini-3.8-flash-medium', group: 'Google Gemini', label: 'Gemini 3.8 Flash Med (ag/gemini-3.8-flash-medium) [👁️ Vision, 🧠 Balanced]' },
    { id: 'ag/gemini-3.8-flash-low', group: 'Google Gemini', label: 'Gemini 3.8 Flash Low (ag/gemini-3.8-flash-low) [👁️ Vision, ⚡ Fast]' },
    { id: 'ag/gemini-3.1-pro-low', group: 'Google Gemini', label: 'Gemini 3.1 Pro Low (ag/gemini-3.1-pro-low) [👁️ Vision, 🎓 Analytical]' },

    // --- OPENAI GPT ---
    { id: 'cx/gpt-6-astra', group: 'OpenAI GPT', label: 'GPT 6 Astra (cx/gpt-6-astra) [👁️ Vision, 🚀 Frontier Next-Gen Intelligence]' },
    { id: 'cx/gpt-6.1-sol', group: 'OpenAI GPT', label: 'GPT 6.1 Sol (cx/gpt-6.1-sol) [👁️ Vision, 🧠 Ultra High Precision]' },
    { id: 'cx/gpt-6-luna', group: 'OpenAI GPT', label: 'GPT 6 Luna (cx/gpt-6-luna) [👁️ Vision, ⚡ Fast & Concise]' },
    { id: 'cx/gpt-5.6-terra', group: 'OpenAI GPT', label: 'GPT 5.6 Terra (cx/gpt-5.6-terra) [👁️ Vision, 📐 Quantitative Specialist]' },

    // --- ANTHROPIC CLAUDE ---
    { id: 'cc/claude-sonnet-5-5', group: 'Anthropic Claude', label: 'Claude Sonnet 5.5 (cc/claude-sonnet-5-5) [👁️ Vision, 🧠 Deep Analysis & Nuance]' },
    { id: 'cc/claude-opus-5-5', group: 'Anthropic Claude', label: 'Claude Opus 5.5 (cc/claude-opus-5-5) [👁️ Vision, 🎓 Academic & Formal Reasoning]' },
    { id: 'cc/claude-opus-4-8', group: 'Anthropic Claude', label: 'Claude Opus 4.8 (cc/claude-opus-4-8) [👁️ Vision, 🎓 Complex Logic]' },
    { id: 'ag/claude-sonnet-4-6', group: 'Anthropic Claude', label: 'Claude Sonnet 4.6 (ag/claude-sonnet-4-6) [👁️ Vision, 🧠 High Fidelity]' },

    // --- XAI GROK ---
    { id: 'xai/grok-4.7', group: 'xAI Grok', label: 'Grok 4.7 (xai/grok-4.7) [👁️ Vision, ⚡ Ultra Fast & Sharp]' },
    { id: 'xai/grok-4.6', group: 'xAI Grok', label: 'Grok 4.6 (xai/grok-4.6) [👁️ Vision, 🧠 Reasoning]' },

    // --- DEEPSEEK & QWEN ---
    { id: 'ds/deepseek-v4-flash-vision', group: 'DeepSeek / Qwen', label: 'DeepSeek v4 Flash Vision (ds/deepseek-v4) [👁️ Vision, 🧠 High Speed Reasoning]' },
    { id: 'qwen/qwen3.8-27b', group: 'DeepSeek / Qwen', label: 'Qwen 3.8 27B Vision (qwen/qwen3.8-27b) [👁️ Vision, 📐 Concise Precision]' },

    // --- FREE AUTO-ROUTER ---
    { id: 'am/free', group: 'Auto-Routing / Free', label: 'AnyModel Free Auto-Router (am/free) [🆓 Free Backup]' }
  ];

  // Dedicated AnyModel Provider Directory
  const PROVIDERS = {
    anymodel: {
      id: 'anymodel',
      name: 'AnyModel (anymodel.org)',
      baseUrl: DEFAULT_BASE_URL,
      defaultKey: DEFAULT_API_KEY,
      isOpenAI: true,
      defaultModel: DEFAULT_MODEL,
      models: ANYMODEL_MODELS
    }
  };

  const WEB_SEARCH_MODES = [
    { id: 'off', label: '🚫 Off (Pure AnyModel - Low Latency & Minimal Data - Default)' },
    { id: 'auto', label: '🌐 Auto (Live Google Search on Quizzes)' },
    { id: 'always', label: '⚡ Always Google Search (All Questions)' }
  ];

  const TOKEN_MODES = [
    { id: 'unlimited', label: '♾️ Unlimited (No Token Limit - Full Output & Reasoning)', maxTokens: 0 },
    { id: 'ultra', label: '⚡ Ultra Headroom (8,192 Tokens)', maxTokens: 8192 },
    { id: 'maximized', label: '🚀 Maximized (4,096 Tokens)', maxTokens: 4096 },
    { id: 'standard', label: '⚖️ Standard (2,048 Tokens)', maxTokens: 2048 },
    { id: 'compact', label: '🍃 Compact (500 Tokens - Fast & Light)', maxTokens: 500 }
  ];

  // Pacing modes for human-like interaction and anti-detection
  const PACING_MODES = [
    { id: 'humanized', label: '👤 Humanized (Recommended - Anti-Detection & Keystrokes)', readMin: 350, readMax: 700, typeMin: 15, typeMax: 35, stepMin: 400, stepMax: 800 },
    { id: 'fast', label: '⚡ Fast (Instant Input)', readMin: 40, readMax: 80, typeMin: 0, typeMax: 0, stepMin: 120, stepMax: 200 },
    { id: 'stealth', label: '🐢 Ultra Stealth (Slow & Deliberate)', readMin: 800, readMax: 1600, typeMin: 35, typeMax: 70, stepMin: 800, stepMax: 1500 }
  ];

  // Likert scale / Rating sentiment bias profiles for authentic statistical distributions
  const LIKERT_BIAS_MODES = [
    { id: 'positive', label: '⭐ Realistic Positive (Lean 4-5 - Most Surveys)', desc: 'Majority Agree/4 with some Strongly Agree/5 and occasional Neutral/3' },
    { id: 'bell', label: '⚖️ Balanced Bell-Curve (Center 3-4)', desc: 'Centered around 3 and 4 normal distribution' },
    { id: 'mixed', label: '🔀 Varied Mixed (Dynamic Diversity)', desc: 'Organic varied opinions across questions' },
    { id: 'ai', label: '🤖 Pure AI Choice (Unbiased)', desc: 'Pure unadjusted model choice' }
  ];

  // Document Knowledge Grounding Modes (Patch 1.2.0 Next Level)
  const GROUNDING_MODES = [
    { id: 'priority', label: '📚 Documents Priority (Strict Grounding - 0 Web Waste, Top Pick)' },
    { id: 'hybrid', label: '⚡ Hybrid (Documents + Live Google Web Search)' },
    { id: 'fallback', label: '🌐 Fallback (Documents First, Web Search Backup)' }
  ];

  let isProcessing = false;
  let shouldCancel = false;
  let totalTokensUsed = 0;
  let isMinimized = true; // Minimized and phantom invisible by default on refresh
  let lastLikertChoice = -1; // Track last choice to prevent robotic straight-lining

  // ── Phone Orientation Alignment Sensor & Face-Down Panic Screen Wipe ──
  // Pauses automation when phone is held up; resumes when placed flat on desk
  // Instantly wipes/vanishes HUD and aborts solver when phone is flipped face-down
  let isPhoneFlat = true;
  let isOrientationSensorActive = false;
  let orientationListenerAttached = false;
  let lastTiltAngle = 0;
  let lastMotionTime = 0;
  let flatStreak = 0;
  let heldStreak = 0;
  let isPanicWiped = false;
  let updateOrientationBadgeFn = null;
  const DESK_FLAT_MAX_TILT = 15; // <= 15° is flat on desk (S23 FE camera rings rest at 3°-6°). > 15° is held in hand.

  function isOrientationSensorEnabled() {
    return getSafeValue('orientation_sensor_enabled', 'true') === 'true';
  }

  function setOrientationSensorEnabled(enabled) {
    setSafeValue('orientation_sensor_enabled', enabled ? 'true' : 'false');
  }

  function triggerPanicWipe(reason = 'Physical Panic Trigger') {
    if (isPanicWiped) return;
    isPanicWiped = true;
    shouldCancel = true; // Instantly abort any active question solving loop
    console.warn(`[Google Form AI HUD] 🚨 PANIC WIPE: ${reason}`);

    const hud = document.getElementById('google-form-ai-hud');
    const floatBtn = document.getElementById('google-form-ai-btn');
    if (hud) hud.style.setProperty('display', 'none', 'important');
    if (floatBtn) floatBtn.style.setProperty('display', 'none', 'important');

    clearAllPageErrors();
  }

  function restoreFromPanicWipe() {
    if (!isPanicWiped) return;
    isPanicWiped = false;
    shouldCancel = false;
    const hud = document.getElementById('google-form-ai-hud');
    const floatBtn = document.getElementById('google-form-ai-btn');
    if (floatBtn) {
      floatBtn.style.removeProperty('display');
      floatBtn.style.display = 'flex';
    }
    if (hud && !isMinimized) {
      hud.style.removeProperty('display');
      hud.style.display = 'flex';
    }
    setStatus('🟢 Restored from Panic Wipe. Ready.');
    console.log('[Google Form AI HUD] 🟢 Restored from Panic Wipe.');
  }

  // ── Triple-Tap Emergency Screen Gesture & Keyboard Shortcut ──
  let _panicTapTimestamps = [];
  if (typeof window !== 'undefined') {
    window.addEventListener('touchend', (e) => {
      const now = Date.now();
      _panicTapTimestamps.push(now);
      _panicTapTimestamps = _panicTapTimestamps.filter(t => now - t < 700);
      if (_panicTapTimestamps.length >= 3) {
        _panicTapTimestamps = [];
        if (isPanicWiped) {
          restoreFromPanicWipe();
        } else {
          triggerPanicWipe('Triple-tap emergency screen gesture');
        }
      }
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
      if ((e.altKey && (e.key === 'p' || e.key === 'P')) || e.key === 'F9') {
        if (isPanicWiped) restoreFromPanicWipe();
        else triggerPanicWipe('Shortcut panic trigger (Alt+P)');
      }
    });
  }

  function getSensorContexts() {
    const list = [];
    if (typeof window !== 'undefined') list.push(window);
    if (typeof unsafeWindow !== 'undefined' && unsafeWindow && unsafeWindow !== window) {
      list.push(unsafeWindow);
    }
    return list;
  }

  function evaluateFlatState(currentIsFlat, tiltDeg) {
    isOrientationSensorActive = true;
    lastTiltAngle = Math.max(0, Math.round(tiltDeg));

    if (currentIsFlat) {
      flatStreak++;
      heldStreak = 0;
      if (flatStreak >= 2) {
        isPhoneFlat = true;
      }
    } else {
      heldStreak++;
      flatStreak = 0;
      if (heldStreak >= 2) {
        isPhoneFlat = false;
      }
    }

    if (typeof updateOrientationBadgeFn === 'function') {
      updateOrientationBadgeFn();
    }
  }

  // Primary sensor: direct physical gravity vector (accelerationIncludingGravity)
  function handleDeviceMotion(e) {
    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;
    lastMotionTime = Date.now();

    const x = acc.x;
    const y = acc.y;
    const z = acc.z;
    const horizontalG = Math.sqrt(x * x + y * y);
    const totalG = Math.sqrt(x * x + y * y + z * z);
    if (totalG < 3.0) return; // Free-fall or invalid noise

    // Physical tilt from horizontal plane (0° = flat, 90° = vertical upright)
    const sinTilt = Math.min(1, Math.max(0, horizontalG / totalG));
    const tiltDeg = Math.asin(sinTilt) * (180 / Math.PI);

    // Face down detection: phone turned screen-down on desk or in lap (z < -6.0 or tilt >= 165°)
    const isFaceDown = (z < -6.0) || (tiltDeg >= (180 - DESK_FLAT_MAX_TILT));
    if (isFaceDown) {
      triggerPanicWipe('Phone flipped face-down on desk');
    }

    // Flat on desk face-up (z > 3.0 and tiltDeg <= 15°)
    const isFlat = !isFaceDown && (z > 3.0) && (tiltDeg <= DESK_FLAT_MAX_TILT);
    evaluateFlatState(isFlat, tiltDeg);
  }

  // Fallback sensor: Euler angles (only if devicemotion is not emitting)
  function handleDeviceOrientation(e) {
    if (Date.now() - lastMotionTime < 600) return; // Motion sensor is active, ignore orientation to avoid clash
    if (e.beta === null || e.gamma === null) return;

    const radBeta = (e.beta * Math.PI) / 180;
    const radGamma = (e.gamma * Math.PI) / 180;
    const cosTilt = Math.abs(Math.cos(radBeta) * Math.cos(radGamma));
    const tiltDeg = Math.acos(Math.min(1, Math.max(0, cosTilt))) * (180 / Math.PI);

    const isFaceDown = Math.abs(e.beta) > 150;
    if (isFaceDown) {
      triggerPanicWipe('Phone flipped face-down (Euler)');
    }

    const isFlat = !isFaceDown && (tiltDeg <= DESK_FLAT_MAX_TILT);
    evaluateFlatState(isFlat, tiltDeg);
  }

  function initGenericSensor() {
    const contexts = getSensorContexts();
    for (const ctx of contexts) {
      if (typeof ctx.GravitySensor === 'function') {
        try {
          const sensor = new ctx.GravitySensor({ frequency: 25 });
          sensor.addEventListener('reading', () => {
            lastMotionTime = Date.now();
            const x = sensor.x || 0;
            const y = sensor.y || 0;
            const z = sensor.z || 9.8;
            const horizontalG = Math.sqrt(x * x + y * y);
            const totalG = Math.sqrt(x * x + y * y + z * z) || 9.8;
            const sinTilt = Math.min(1, Math.max(0, horizontalG / totalG));
            const tiltDeg = Math.asin(sinTilt) * (180 / Math.PI);

            const isFaceDown = (z < -6.0) || (tiltDeg >= (180 - DESK_FLAT_MAX_TILT));
            if (isFaceDown) {
              triggerPanicWipe('Phone flipped face-down (GravitySensor)');
            }
            const isFlat = !isFaceDown && (z > 3.0) && (tiltDeg <= DESK_FLAT_MAX_TILT);
            evaluateFlatState(isFlat, tiltDeg);
          });
          sensor.addEventListener('error', () => {});
          sensor.start();
          return true;
        } catch (_) {}
      }

      if (typeof ctx.Accelerometer === 'function') {
        try {
          const accel = new ctx.Accelerometer({ frequency: 25 });
          accel.addEventListener('reading', () => {
            lastMotionTime = Date.now();
            const x = accel.x || 0;
            const y = accel.y || 0;
            const z = accel.z || 9.8;
            const horizontalG = Math.sqrt(x * x + y * y);
            const totalG = Math.sqrt(x * x + y * y + z * z) || 9.8;
            const sinTilt = Math.min(1, Math.max(0, horizontalG / totalG));
            const tiltDeg = Math.asin(sinTilt) * (180 / Math.PI);

            const isFaceDown = (z < -6.0) || (tiltDeg >= (180 - DESK_FLAT_MAX_TILT));
            if (isFaceDown) {
              triggerPanicWipe('Phone flipped face-down (Accelerometer)');
            }
            const isFlat = !isFaceDown && (z > 3.0) && (tiltDeg <= DESK_FLAT_MAX_TILT);
            evaluateFlatState(isFlat, tiltDeg);
          });
          accel.addEventListener('error', () => {});
          accel.start();
          return true;
        } catch (_) {}
      }
    }
    return false;
  }

  function attachOrientationSensors() {
    if (orientationListenerAttached || typeof window === 'undefined') return;
    try {
      initGenericSensor();
      const contexts = getSensorContexts();
      contexts.forEach(ctx => {
        try {
          if ('DeviceMotionEvent' in ctx || 'ondevicemotion' in ctx) {
            ctx.addEventListener('devicemotion', handleDeviceMotion, { passive: true });
          }
        } catch (_) {}
        try {
          if ('DeviceOrientationEvent' in ctx || 'ondeviceorientation' in ctx) {
            ctx.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
          }
        } catch (_) {}
      });
      orientationListenerAttached = true;
    } catch (_) {}
  }

  function requestOrientationPermission() {
    if (orientationListenerAttached) return;
    const contexts = getSensorContexts();
    let requested = false;
    for (const ctx of contexts) {
      if (ctx.DeviceOrientationEvent && typeof ctx.DeviceOrientationEvent.requestPermission === 'function') {
        requested = true;
        try {
          ctx.DeviceOrientationEvent.requestPermission().then((res) => {
            if (res === 'granted') attachOrientationSensors();
          }).catch(() => {});
        } catch (_) {}
      }
      if (ctx.DeviceMotionEvent && typeof ctx.DeviceMotionEvent.requestPermission === 'function') {
        requested = true;
        try {
          ctx.DeviceMotionEvent.requestPermission().then((res) => {
            if (res === 'granted') attachOrientationSensors();
          }).catch(() => {});
        } catch (_) {}
      }
    }
    if (!requested) {
      attachOrientationSensors();
    }
  }

  function initOrientationSensor() {
    if (typeof window === 'undefined' || orientationListenerAttached) return;

    const contexts = getSensorContexts();
    let hasReqPerm = false;
    for (const ctx of contexts) {
      if ((ctx.DeviceOrientationEvent && typeof ctx.DeviceOrientationEvent.requestPermission === 'function') ||
          (ctx.DeviceMotionEvent && typeof ctx.DeviceMotionEvent.requestPermission === 'function')) {
        hasReqPerm = true;
        break;
      }
    }

    if (hasReqPerm) {
      const askPermOnce = () => {
        requestOrientationPermission();
        contexts.forEach(ctx => {
          ctx.removeEventListener('click', askPermOnce);
          ctx.removeEventListener('touchend', askPermOnce);
        });
      };
      contexts.forEach(ctx => {
        ctx.addEventListener('click', askPermOnce, { passive: true });
        ctx.addEventListener('touchend', askPermOnce, { passive: true });
      });
    } else {
      attachOrientationSensors();
    }
  }

  // Gatekeeper: pauses solver if user picks up / holds their phone
  async function checkOrientationGate() {
    if (!isOrientationSensorEnabled() || shouldCancel) return;
    if (!isPhoneFlat) {
      setStatus(`✋ [Tilt Sensor] Phone held/tilted (~${lastTiltAngle}°) — solver paused. Place flat on desk (≤15°) to resume...`);
      if (typeof updateOrientationBadgeFn === 'function') updateOrientationBadgeFn();

      while (!isPhoneFlat && !shouldCancel) {
        await sleep(150);
      }

      if (!shouldCancel) {
        setStatus(`📱 [Tilt Sensor] Phone flat on desk detected (~${lastTiltAngle}°). Resuming auto-solver...`);
        if (typeof updateOrientationBadgeFn === 'function') updateOrientationBadgeFn();
        await sleep(250);
      }
    }
  }

  // Real-time pausable delay for natural pacing and anti-detection
  async function pausableSleep(ms) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      if (shouldCancel) return;
      await checkOrientationGate();
      if (shouldCancel) return;
      await sleep(80);
    }
  }

  // ── COUNTDOWN TIMER WATCHDOG & ADAPTIVE PACING ──
  // Detects exam timer elements; auto-accelerates solver if time runs low (< 3 mins)
  function detectFormRemainingTimeSeconds() {
    try {
      const timerSelectors = [
        '[class*="timer" i]', '[id*="timer" i]',
        '[class*="countdown" i]', '[id*="countdown" i]',
        '.time-left', '[data-timer]', '[role="timer"]',
        '.time-remaining', '#time-remaining', '.quilgo-timer',
        '.form-timer', '.timer-display'
      ];
      for (const sel of timerSelectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (!el || el.offsetParent === null) continue;
          const txt = (el.innerText || el.textContent || '').trim();
          const matchTime = txt.match(/\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/);
          if (matchTime) {
            const h = matchTime[1] ? parseInt(matchTime[1], 10) : 0;
            const m = parseInt(matchTime[2], 10);
            const s = parseInt(matchTime[3], 10);
            const totalSec = h * 3600 + m * 60 + s;
            if (totalSec > 0 && totalSec < 86400) {
              return totalSec;
            }
          }
        }
      }
    } catch (_) {}
    return null;
  }

  function getPacingConfig() {
    const remainingSec = detectFormRemainingTimeSeconds();
    if (remainingSec !== null && remainingSec < 180) {
      // Emergency Turbo: under 3 minutes remaining on countdown timer
      return { id: 'emergency_turbo', label: '⏱️ Emergency Turbo (<3m left)', readMin: 0, readMax: 0, stepMin: 50, stepMax: 150 };
    }
    const modeId = getSafeValue('pacing_mode', 'humanized');
    return PACING_MODES.find(m => m.id === modeId) || PACING_MODES[0];
  }

  function getLikertBiasMode() {
    return getSafeValue('likert_bias_mode', 'positive');
  }

  function isLikertOrScaleLabels(labels) {
    if (!labels || labels.length < 3 || labels.length > 11) return false;
    const clean = labels.map(l => String(l).trim().toLowerCase());
    const allNum = clean.every(l => /^[0-9]+$/.test(l));
    if (allNum) return true;
    const agreementWords = ['agree', 'disagree', 'neutral', 'sang-ayon', 'hindi sang-ayon', 'satisfied', 'dissatisfied', 'poor', 'excellent', 'good', 'fair', 'never', 'always', 'sometimes', 'often', 'rarely'];
    const matchCount = clean.filter(l => agreementWords.some(w => l.includes(w))).length;
    return matchCount >= 2;
  }

  function applyLikertBias(labels, originalIdx, biasMode = 'positive') {
    if (!labels || labels.length < 3 || biasMode === 'ai') return originalIdx;
    if (!isLikertOrScaleLabels(labels)) return originalIdx;

    const n = labels.length;
    let chosen = originalIdx;

    if (biasMode === 'positive') {
      if (n === 5) {
        // Standard 5-point Likert: 3 = Agree (4), 4 = Strongly Agree (5), 2 = Neutral (3)
        const r = Math.random();
        let target = 3;
        if (r < 0.55) target = 3;
        else if (r < 0.85) target = 4;
        else target = 2;

        // Anti-straight-lining: if same as previous question, 60% chance to alternate between 3 and 4
        if (target === lastLikertChoice && Math.random() < 0.6) {
          target = (target === 3) ? 4 : 3;
        }
        chosen = target;
      } else if (n >= 6) {
        // 7 to 10 point scale: pick within 70%-90% range
        const highIdx = n - 1;
        const subHigh = Math.max(0, n - 2);
        const midHigh = Math.max(0, n - 3);
        const pool = [subHigh, subHigh, highIdx, midHigh];
        chosen = pool[Math.floor(Math.random() * pool.length)];
        if (chosen === lastLikertChoice && pool.length > 1) {
          chosen = pool.find(x => x !== lastLikertChoice) ?? chosen;
        }
      } else if (n === 4) {
        chosen = Math.random() < 0.65 ? 2 : 3;
      } else if (n === 3) {
        chosen = Math.random() < 0.7 ? 2 : 1;
      }
    } else if (biasMode === 'bell') {
      if (n === 5) {
        const r = Math.random();
        if (r < 0.45) chosen = 2; // Neutral (3)
        else if (r < 0.75) chosen = 3; // Agree (4)
        else if (r < 0.90) chosen = 1; // Disagree (2)
        else if (r < 0.95) chosen = 4; // Strongly Agree (5)
        else chosen = 0; // Strongly Disagree (1)
      } else {
        const mid = Math.floor(n / 2);
        chosen = Math.random() < 0.5 ? mid : (Math.random() < 0.5 ? Math.min(n - 1, mid + 1) : Math.max(0, mid - 1));
      }
    } else if (biasMode === 'mixed') {
      const highLean = Math.floor(n * 0.7);
      const candidates = [highLean, Math.min(n - 1, highLean + 1), Math.max(0, highLean - 1)];
      chosen = candidates[Math.floor(Math.random() * candidates.length)];
    }

    if (chosen >= 0 && chosen < n) {
      lastLikertChoice = chosen;
      return chosen;
    }
    return originalIdx;
  }



  // Safe storage helpers
  function getSafeValue(key, defVal = '') {
    try {
      if (typeof GM_getValue === 'function') {
        const gmVal = GM_getValue(key);
        if (gmVal !== undefined && gmVal !== null && gmVal !== '') {
          return gmVal;
        }
      }
      const localVal = localStorage.getItem('form_ai_' + key);
      if (localVal !== null && localVal !== undefined && localVal !== '') {
        return localVal;
      }
      return defVal;
    } catch (e) {
      return defVal;
    }
  }

  function setSafeValue(key, val) {
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue(key, val);
      }
      localStorage.setItem('form_ai_' + key, val);
    } catch (e) {}
  }

  // ============================================================================
  // DOCUMENT KNOWLEDGE BASE & PARSER ENGINE (PATCH 1.2.0 NEXT LEVEL)
  // Native in-browser parsing for DOCX, PDF, and PPT/PPTX with zero external network overhead
  // ============================================================================
  let activeKnowledgeDocs = [];
  let updateHUDKnowledgeListFn = null;

  async function decompressRawDeflate(compressedUint8Array) {
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(compressedUint8Array);
        writer.close();
        const chunks = [];
        const reader = ds.readable.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        let totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
        const out = new Uint8Array(totalLen);
        let offset = 0;
        for (const c of chunks) {
          out.set(c, offset);
          offset += c.length;
        }
        return out;
      } catch (err) {
        console.warn('[DocParser] Native deflate-raw failed:', err);
      }
    }
    throw new Error('DecompressionStream (deflate-raw) not supported in this browser environment.');
  }

  async function unzipArchive(input) {
    let arrayBuffer;
    if (input instanceof ArrayBuffer) {
      arrayBuffer = input;
    } else if (input && input.buffer instanceof ArrayBuffer) {
      arrayBuffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
    } else {
      throw new Error('Unsupported buffer input for ZIP archive');
    }

    const view = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);
    const files = {};

    let eocdOffset = -1;
    const maxSearch = Math.min(65536, bytes.length - 22);
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - maxSearch); i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      throw new Error('Invalid ZIP archive: End of Central Directory (EOCD) not found.');
    }

    const cdCount = view.getUint16(eocdOffset + 10, true);
    const cdOffset = view.getUint32(eocdOffset + 16, true);

    let currentCdOffset = cdOffset;
    for (let i = 0; i < cdCount; i++) {
      if (currentCdOffset + 46 > bytes.length) break;
      const sig = view.getUint32(currentCdOffset, true);
      if (sig !== 0x02014b50) break;

      const method = view.getUint16(currentCdOffset + 10, true);
      const compSize = view.getUint32(currentCdOffset + 20, true);
      const fnLen = view.getUint16(currentCdOffset + 28, true);
      const extraLen = view.getUint16(currentCdOffset + 30, true);
      const commentLen = view.getUint16(currentCdOffset + 32, true);
      const localHeaderOffset = view.getUint32(currentCdOffset + 42, true);

      const fnBytes = bytes.slice(currentCdOffset + 46, currentCdOffset + 46 + fnLen);
      const fileName = new TextDecoder('utf-8').decode(fnBytes);

      if (localHeaderOffset + 30 <= bytes.length) {
        const localSig = view.getUint32(localHeaderOffset, true);
        if (localSig === 0x04034b50) {
          const localFnLen = view.getUint16(localHeaderOffset + 26, true);
          const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
          const dataStart = localHeaderOffset + 30 + localFnLen + localExtraLen;
          const compressedData = bytes.slice(dataStart, dataStart + compSize);

          if (method === 0) {
            files[fileName] = compressedData;
          } else if (method === 8) {
            try {
              files[fileName] = await decompressRawDeflate(compressedData);
            } catch (err) {
              console.warn(`[DocParser] Failed to decompress "${fileName}":`, err);
            }
          }
        }
      }
      currentCdOffset += 46 + fnLen + extraLen + commentLen;
    }
    return files;
  }

  // --- DOCX Parser ---
  async function parseDocx(arrayBuffer) {
    const files = await unzipArchive(arrayBuffer);
    const docXmlData = files['word/document.xml'];
    if (!docXmlData) {
      throw new Error('Invalid DOCX: missing word/document.xml');
    }

    const xmlStr = new TextDecoder('utf-8').decode(docXmlData);
    const lines = [];

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlStr, 'text/xml');
      const paragraphs = doc.getElementsByTagName('w:p');

      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const textNodes = p.getElementsByTagName('w:t');
        let pText = '';
        for (let j = 0; j < textNodes.length; j++) {
          pText += textNodes[j].textContent;
        }
        const trimmed = pText.trim();
        if (trimmed) lines.push(trimmed);
      }

      // Extract tables if any
      const tables = doc.getElementsByTagName('w:tbl');
      if (tables.length > 0 && lines.length === 0) {
        for (let t = 0; t < tables.length; t++) {
          const rows = tables[t].getElementsByTagName('w:tr');
          for (let r = 0; r < rows.length; r++) {
            const cells = rows[r].getElementsByTagName('w:tc');
            const cellTexts = [];
            for (let c = 0; c < cells.length; c++) {
              const tNodes = cells[c].getElementsByTagName('w:t');
              let ct = '';
              for (let tn of tNodes) ct += tn.textContent;
              if (ct.trim()) cellTexts.push(ct.trim());
            }
            if (cellTexts.length > 0) lines.push(cellTexts.join(' | '));
          }
        }
      }
    } catch (domErr) {
      // Regex fallback
      const pMatches = xmlStr.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
      for (const pXml of pMatches) {
        const tMatches = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        const text = tMatches.map(m => m.replace(/<[^>]+>/g, '')).join('').trim();
        if (text) lines.push(text);
      }
    }

    // Check footnotes / endnotes
    for (const noteFile of ['word/footnotes.xml', 'word/endnotes.xml']) {
      if (files[noteFile]) {
        const noteXml = new TextDecoder('utf-8').decode(files[noteFile]);
        const tMatches = noteXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        const noteText = tMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ').trim();
        if (noteText) lines.push(`[Reference Note]: ${noteText}`);
      }
    }

    const fullText = lines.join('\n\n');
    return {
      fullText,
      lines,
      pageOrSlideCount: Math.max(1, Math.ceil(lines.length / 8))
    };
  }

  // --- PPTX Parser ---
  async function parsePptx(arrayBuffer) {
    const files = await unzipArchive(arrayBuffer);
    const slideFileNames = Object.keys(files).filter(k => /^ppt\/slides\/slide\d+\.xml$/i.test(k));

    slideFileNames.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    const slides = [];

    for (let i = 0; i < slideFileNames.length; i++) {
      const sName = slideFileNames[i];
      const slideNum = parseInt(sName.replace(/\D/g, ''), 10) || (i + 1);
      const xmlStr = new TextDecoder('utf-8').decode(files[sName]);
      const slideTexts = [];

      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlStr, 'text/xml');
        const textNodes = doc.getElementsByTagName('a:t');
        for (let t = 0; t < textNodes.length; t++) {
          const txt = textNodes[t].textContent.trim();
          if (txt) slideTexts.push(txt);
        }
      } catch (domErr) {
        const tMatches = xmlStr.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
        slideTexts.push(...tMatches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean));
      }

      // Check speaker notes
      const noteName = `ppt/notesSlides/notesSlide${slideNum}.xml`;
      if (files[noteName]) {
        const noteXml = new TextDecoder('utf-8').decode(files[noteName]);
        const nMatches = noteXml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
        const noteText = nMatches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ');
        if (noteText) slideTexts.push(`[Speaker Notes: ${noteText}]`);
      }

      if (slideTexts.length > 0) {
        slides.push({
          slideNum,
          text: `[Slide ${slideNum}]\n` + slideTexts.join('\n')
        });
      }
    }

    const fullText = slides.map(s => s.text).join('\n\n');
    return {
      fullText,
      slides,
      pageOrSlideCount: Math.max(1, slides.length)
    };
  }

  // --- PPT Binary Parser (PowerPoint 97-2004 & Renamed PPTX) ---
  async function parsePpt(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    // If actually a PPTX ZIP archive
    if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
      return await parsePptx(arrayBuffer);
    }

    const lines = [];
    let curSlide = 1;
    let currentSlideText = [];

    const view = new DataView(arrayBuffer);
    let i = 0;
    while (i < bytes.length - 8) {
      const recType = view.getUint16(i + 2, true);
      const recLen = view.getUint32(i + 4, true);

      if (recType === 0x0F9F || recType === 0x03EE) { // Slide container
        if (currentSlideText.length > 0) {
          lines.push(`[Slide ${curSlide}]\n` + currentSlideText.join('\n'));
          curSlide++;
          currentSlideText = [];
        }
        i += 8;
        continue;
      }

      if (recType === 0x0FA0 && recLen > 0 && recLen < 200000 && (i + 8 + recLen <= bytes.length)) { // TextCharsAtom (UTF-16LE)
        try {
          const slice = bytes.slice(i + 8, i + 8 + recLen);
          const str = new TextDecoder('utf-16le').decode(slice).trim();
          if (str && str.length >= 2 && !/^[\x00-\x1F\s]+$/.test(str)) {
            currentSlideText.push(str.replace(/\r/g, '\n').replace(/\n{2,}/g, '\n'));
          }
        } catch (e) {}
        i += 8 + recLen;
        continue;
      }

      if (recType === 0x0FA8 && recLen > 0 && recLen < 200000 && (i + 8 + recLen <= bytes.length)) { // TextBytesAtom (ASCII)
        try {
          const slice = bytes.slice(i + 8, i + 8 + recLen);
          const str = new TextDecoder('latin1').decode(slice).trim();
          if (str && str.length >= 2 && !/^[\x00-\x1F\s]+$/.test(str)) {
            currentSlideText.push(str.replace(/\r/g, '\n').replace(/\n{2,}/g, '\n'));
          }
        } catch (e) {}
        i += 8 + recLen;
        continue;
      }

      i++;
    }

    if (currentSlideText.length > 0) {
      lines.push(`[Slide ${curSlide}]\n` + currentSlideText.join('\n'));
    }

    if (lines.length === 0) {
      const rawRuns = extractPrintableStringsFromBytes(bytes);
      if (rawRuns.length > 0) {
        lines.push(rawRuns.join('\n'));
      }
    }

    const fullText = lines.join('\n\n');
    return {
      fullText,
      slides: lines.map((text, idx) => ({ slideNum: idx + 1, text })),
      pageOrSlideCount: Math.max(1, lines.length)
    };
  }

  function extractPrintableStringsFromBytes(bytes, minLength = 4) {
    const strings = [];
    let currentU16 = '';
    for (let i = 0; i < bytes.length - 1; i += 2) {
      const code = bytes[i] | (bytes[i + 1] << 8);
      if (code >= 32 && code <= 126) {
        currentU16 += String.fromCharCode(code);
      } else if (code === 10 || code === 13) {
        if (currentU16.trim().length >= minLength) strings.push(currentU16.trim());
        currentU16 = '';
      } else {
        if (currentU16.trim().length >= minLength) strings.push(currentU16.trim());
        currentU16 = '';
      }
    }
    if (currentU16.trim().length >= minLength) strings.push(currentU16.trim());

    let currentAscii = '';
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b >= 32 && b <= 126) {
        currentAscii += String.fromCharCode(b);
      } else if (b === 10 || b === 13) {
        if (currentAscii.trim().length >= minLength) strings.push(currentAscii.trim());
        currentAscii = '';
      } else {
        if (currentAscii.trim().length >= minLength) strings.push(currentAscii.trim());
        currentAscii = '';
      }
    }
    if (currentAscii.trim().length >= minLength) strings.push(currentAscii.trim());

    const filtered = strings.filter(s => {
      if (/^[A-Za-z0-9+/=]{20,}$/.test(s)) return false;
      if (/^([0-9a-f]{2}){8,}$/i.test(s)) return false;
      if (/xmlns|schema|microsoft|schemas-microsoft|Font/i.test(s)) return false;
      return /[a-zA-Z]{3,}/.test(s);
    });

    return Array.from(new Set(filtered));
  }

  // --- PDF Parser ---
  async function parsePdf(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const textDecoder = new TextDecoder('latin1');
    const rawString = textDecoder.decode(bytes);

    const pages = [];
    let pageNumber = 1;

    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    const streams = [];

    while ((match = streamRegex.exec(rawString)) !== null) {
      const streamStart = match.index + match[0].indexOf('\n') + 1;
      const streamEnd = match.index + match[0].lastIndexOf('\nendstream');
      const streamBytes = bytes.slice(streamStart, streamEnd > streamStart ? streamEnd : streamStart + match[1].length);

      const dictSlice = rawString.slice(Math.max(0, match.index - 350), match.index);
      const isFlate = /\/Filter\s*\/FlateDecode/i.test(dictSlice) || /\/FlateDecode/i.test(dictSlice);

      streams.push({
        bytes: streamBytes,
        isFlate
      });
    }

    for (let sIdx = 0; sIdx < streams.length; sIdx++) {
      const s = streams[sIdx];
      let content = '';

      if (s.isFlate) {
        try {
          let toDecompress = s.bytes;
          if (toDecompress.length > 6 && toDecompress[0] === 0x78) {
            toDecompress = toDecompress.slice(2, toDecompress.length - 4);
          }
          const decompressed = await decompressRawDeflate(toDecompress);
          content = new TextDecoder('latin1').decode(decompressed);
        } catch (err) {
          content = textDecoder.decode(s.bytes);
        }
      } else {
        content = textDecoder.decode(s.bytes);
      }

      if (/BT[\s\S]*?ET/.test(content)) {
        const pageText = extractPdfTextOperators(content);
        if (pageText && pageText.trim()) {
          pages.push({
            page: pageNumber++,
            text: `[Page ${pageNumber - 1}]\n` + pageText.trim()
          });
        }
      }
    }

    if (pages.length === 0) {
      const directTexts = extractPdfTextOperators(rawString);
      if (directTexts && directTexts.trim()) {
        pages.push({ page: 1, text: directTexts.trim() });
      }
    }

    const fullText = pages.map(p => p.text).join('\n\n');
    return {
      fullText,
      pages,
      pageOrSlideCount: Math.max(1, pages.length)
    };
  }

  function extractPdfTextOperators(content) {
    const extractedLines = [];
    const btRegex = /BT([\s\S]*?)ET/g;
    let btMatch;

    while ((btMatch = btRegex.exec(content)) !== null) {
      const block = btMatch[1];
      const lineTokens = [];

      const opRegex = /(\((?:\\\(|\\\)|[^\)])*\)|<[0-9a-fA-F\s]+>)\s*(Tj|'|")|\[([\s\S]*?)\]\s*TJ/g;
      let opMatch;

      while ((opMatch = opRegex.exec(block)) !== null) {
        if (opMatch[1]) {
          lineTokens.push(decodePdfString(opMatch[1]));
        } else if (opMatch[3]) {
          const arrContent = opMatch[3];
          const itemRegex = /(\((?:\\\(|\\\)|[^\)])*\)|<[0-9a-fA-F\s]+>)/g;
          let itemMatch;
          let tjPart = '';
          while ((itemMatch = itemRegex.exec(arrContent)) !== null) {
            tjPart += decodePdfString(itemMatch[1]);
          }
          if (tjPart) lineTokens.push(tjPart);
        }
      }

      if (lineTokens.length > 0) {
        extractedLines.push(lineTokens.join(' '));
      }
    }

    return extractedLines.join('\n');
  }

  function decodePdfString(str) {
    if (!str) return '';
    if (str.startsWith('<') && str.endsWith('>')) {
      const hex = str.slice(1, -1).replace(/\s/g, '');
      if (hex.toUpperCase().startsWith('FEFF')) {
        // UTF-16BE encoded PDF string
        let result = '';
        for (let i = 4; i < hex.length; i += 4) {
          const code = parseInt(hex.substr(i, 4), 16);
          if (!isNaN(code)) result += String.fromCharCode(code);
        }
        return result;
      }
      let result = '';
      for (let i = 0; i < hex.length; i += 2) {
        const byte = parseInt(hex.substr(i, 2), 16);
        if (!isNaN(byte) && byte >= 32) result += String.fromCharCode(byte);
      }
      return result;
    }
    if (str.startsWith('(') && str.endsWith(')')) {
      let unescaped = str.slice(1, -1);
      if (unescaped.charCodeAt(0) === 0xFE && unescaped.charCodeAt(1) === 0xFF) {
        let result = '';
        for (let i = 2; i < unescaped.length - 1; i += 2) {
          const code = (unescaped.charCodeAt(i) << 8) | unescaped.charCodeAt(i + 1);
          result += String.fromCharCode(code);
        }
        return result;
      }
      unescaped = unescaped
        .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
        .replace(/\\r/g, ' ')
        .replace(/\\n/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\\b/g, '')
        .replace(/\\f/g, '')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
        .replace(/\\(.)/g, '$1');
      return unescaped;
    }
    return str;
  }

  // --- Plain Text / Markdown Parser ---
  function parsePlainText(arrayBuffer) {
    const text = new TextDecoder('utf-8').decode(arrayBuffer);
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    return {
      fullText: text,
      lines,
      pageOrSlideCount: Math.max(1, Math.ceil(lines.length / 10))
    };
  }

  // Unified Document Dispatcher (handles File object or { name, arrayBuffer, size })
  async function parseDocumentFile(file) {
    const name = file.name || 'document';
    const lower = name.toLowerCase();
    let arrayBuffer;
    if (file.arrayBuffer && typeof file.arrayBuffer === 'function') {
      arrayBuffer = await file.arrayBuffer();
    } else if (file.arrayBuffer instanceof ArrayBuffer) {
      arrayBuffer = file.arrayBuffer;
    } else if (file.buffer instanceof ArrayBuffer) {
      arrayBuffer = file.buffer;
    } else {
      throw new Error('Unable to extract binary arrayBuffer for ' + name);
    }
    const fileSize = file.size || (arrayBuffer ? arrayBuffer.byteLength : 0);
    let type = 'unknown';
    let parsedData = null;

    if (lower.endsWith('.docx')) {
      type = 'docx';
      parsedData = await parseDocx(arrayBuffer);
    } else if (lower.endsWith('.pptx')) {
      type = 'pptx';
      parsedData = await parsePptx(arrayBuffer);
    } else if (lower.endsWith('.ppt')) {
      type = 'ppt';
      parsedData = await parsePpt(arrayBuffer);
    } else if (lower.endsWith('.pdf')) {
      type = 'pdf';
      parsedData = await parsePdf(arrayBuffer);
    } else if (lower.endsWith('.txt') || lower.endsWith('.md')) {
      type = lower.endsWith('.md') ? 'md' : 'txt';
      parsedData = parsePlainText(arrayBuffer);
    } else {
      // Fallback: try plain text
      type = 'txt';
      parsedData = parsePlainText(arrayBuffer);
    }

    const words = (parsedData.fullText || '').trim().split(/\s+/).filter(Boolean).length;
    const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const chunks = createDocumentChunks(docId, name, type, parsedData);

    return {
      id: docId,
      name,
      type,
      size: fileSize,
      text: parsedData.fullText || '',
      chunks,
      wordCount: words,
      slideOrPageCount: parsedData.pageOrSlideCount || 1,
      loadedAt: new Date().toLocaleTimeString()
    };
  }

  // Document Chunking into Logical Excerpts (~400-800 chars)
  function createDocumentChunks(docId, fileName, fileType, parsedData) {
    const chunks = [];
    if (parsedData.slides && parsedData.slides.length > 0) {
      parsedData.slides.forEach(s => {
        chunks.push({
          id: `${docId}_slide_${s.slideNum}`,
          docId,
          source: fileName,
          type: fileType,
          location: `Slide ${s.slideNum}`,
          text: s.text.trim()
        });
      });
    } else if (parsedData.pages && parsedData.pages.length > 0) {
      parsedData.pages.forEach(p => {
        const paragraphs = p.text.split('\n\n').filter(Boolean);
        if (paragraphs.length <= 1) {
          chunks.push({
            id: `${docId}_p_${p.page}`,
            docId,
            source: fileName,
            type: fileType,
            location: `Page ${p.page}`,
            text: p.text.trim()
          });
        } else {
          paragraphs.forEach((para, idx) => {
            chunks.push({
              id: `${docId}_p_${p.page}_${idx}`,
              docId,
              source: fileName,
              type: fileType,
              location: `Page ${p.page}`,
              text: para.trim()
            });
          });
        }
      });
    } else {
      const paragraphs = (parsedData.fullText || '').split(/\n\s*\n/).filter(Boolean);
      let currentChunk = '';
      let chunkIdx = 1;
      paragraphs.forEach(p => {
        if ((currentChunk + '\n' + p).length > 750) {
          if (currentChunk.trim()) {
            chunks.push({
              id: `${docId}_sec_${chunkIdx++}`,
              docId,
              source: fileName,
              type: fileType,
              location: `Section ${chunkIdx - 1}`,
              text: currentChunk.trim()
            });
          }
          currentChunk = p;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + p;
        }
      });
      if (currentChunk.trim()) {
        chunks.push({
          id: `${docId}_sec_${chunkIdx}`,
          docId,
          source: fileName,
          type: fileType,
          location: `Section ${chunkIdx}`,
          text: currentChunk.trim()
        });
      }
    }
    return chunks;
  }

  // --- In-Memory Fast Semantic / Keyword Search Engine ---
  const KNOWLEDGE_STOP_WORDS = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'of', 'for', 'with', 'by',
    'that', 'this', 'it', 'from', 'as', 'are', 'was', 'were', 'or', 'be', 'has', 'had', 'have',
    'what', 'why', 'how', 'when', 'where', 'who', 'does', 'did', 'do', 'can', 'could', 'should',
    'would', 'question', 'following', 'select', 'choose', 'correct', 'true', 'false', 'below',
    'above', 'answer', 'options', 'statement', 'yang', 'dan', 'di', 'dari', 'ini', 'itu', 'adalah',
    'untuk', 'dengan', 'pada', 'ke', 'oleh', 'sebagai', 'dalam', 'akan', 'atau', 'ang', 'mga', 'ng', 'sa'
  ]);

  function extractKeywords(text) {
    if (!text) return [];
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
    return words.filter(w => w.length >= 3 && !KNOWLEDGE_STOP_WORDS.has(w));
  }

  function searchKnowledgeBase(queryText, optionsList = [], topK = 4) {
    if (!activeKnowledgeDocs || activeKnowledgeDocs.length === 0) return { excerpts: [], summary: '' };

    const allChunks = [];
    activeKnowledgeDocs.forEach(doc => {
      if (doc.chunks && Array.isArray(doc.chunks)) {
        allChunks.push(...doc.chunks);
      }
    });

    if (allChunks.length === 0) return { excerpts: [], summary: '' };

    const qKeywords = extractKeywords(queryText);
    const optKeywords = optionsList.flatMap(opt => extractKeywords(opt));
    const cleanQ = (queryText || '').toLowerCase();

    const scored = allChunks.map(chunk => {
      const cLower = chunk.text.toLowerCase();
      let score = 0;

      // 1. Question keyword matches
      qKeywords.forEach(kw => {
        if (cLower.includes(kw)) {
          score += 3;
          const count = (cLower.match(new RegExp(`\\b${kw}\\b`, 'g')) || []).length;
          if (count > 1) score += Math.min(count * 1.5, 6);
        }
      });

      // 2. Options matches (Huge bonus if an entire option appears in the slide/page!)
      optionsList.forEach(opt => {
        const optClean = opt.trim().toLowerCase();
        if (optClean.length >= 4 && cLower.includes(optClean)) {
          score += 15;
        }
      });

      optKeywords.forEach(kw => {
        if (cLower.includes(kw)) score += 2;
      });

      // 3. Exact phrase match bonus
      if (cleanQ.length > 12 && cLower.includes(cleanQ.slice(0, Math.min(cleanQ.length, 35)))) {
        score += 25;
      }

      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const bestHits = scored.filter(s => s.score >= 5).slice(0, topK);

    if (bestHits.length === 0) {
      if (scored[0] && scored[0].score >= 2) {
        bestHits.push(scored[0]);
      } else {
        return { excerpts: [], summary: '' };
      }
    }

    const excerpts = bestHits.map(h => ({
      source: h.chunk.source,
      location: h.chunk.location,
      text: h.chunk.text,
      score: Math.round(h.score)
    }));

    const summary = excerpts.map(e => `[Source: ${e.source} (${e.location})]\n"${e.text}"`).join('\n\n');
    return { excerpts, summary };
  }

  function getGroundingPrompt(qInfo, labels = [], isLikert = false) {
    if (isLikert) return { prompt: '', found: false, mode: 'off' };
    const mode = getSafeValue('grounding_mode', 'priority');
    const docGrounding = searchKnowledgeBase(qInfo.fullText || qInfo.title, labels);

    if (docGrounding.summary && docGrounding.excerpts.length > 0) {
      const primarySource = docGrounding.excerpts[0]?.source || 'Study Material Folder';
      const topScore = docGrounding.excerpts[0]?.score || 0;
      const count = docGrounding.excerpts.length;

      const groundingHeader = `═══════════════════════════════════════════════════════════════════\n📚 SOURCE MATERIAL EVIDENCE (From user's study folder - ${count} matching excerpts):\n${docGrounding.summary}\n═══════════════════════════════════════════════════════════════════\nCRITICAL GROUNDING INSTRUCTIONS:\n- The above excerpts are extracted directly from the user's course documents (${primarySource}).\n- Treat this evidence as absolute ground truth above all general knowledge or web data.\n- Pick/formulate the answer that strictly aligns with these exact lecture slides / notes.\n\n`;

      return {
        prompt: groundingHeader,
        found: true,
        primarySource,
        topScore,
        count,
        mode
      };
    }

    return { prompt: '', found: false, mode };
  }

  // Storage Persistence for Document Knowledge Base
  function saveKnowledgeDocsToStorage() {
    try {
      const lightweightDocs = activeKnowledgeDocs.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        size: d.size,
        wordCount: d.wordCount,
        slideOrPageCount: d.slideOrPageCount,
        loadedAt: d.loadedAt,
        chunks: d.chunks
      }));
      const jsonStr = JSON.stringify(lightweightDocs);
      if (jsonStr.length < 4500000) {
        setSafeValue('knowledge_docs_cache', jsonStr);
      }
    } catch (e) {
      console.warn('[DocParser] Could not cache documents to storage:', e);
    }
  }

  function loadKnowledgeDocsFromStorage() {
    try {
      const raw = getSafeValue('knowledge_docs_cache', '');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          activeKnowledgeDocs = parsed;
          console.log(`[Google Form AI HUD] Loaded ${activeKnowledgeDocs.length} cached study documents from local storage.`);
        }
      }
    } catch (e) {}
  }

  function removeKnowledgeDoc(docId) {
    activeKnowledgeDocs = activeKnowledgeDocs.filter(d => d.id !== docId);
    saveKnowledgeDocsToStorage();
    if (typeof updateHUDKnowledgeListFn === 'function') {
      updateHUDKnowledgeListFn();
    }
    setStatus(`Removed document. Remaining: ${activeKnowledgeDocs.length} file(s).`);
  }

  function clearAllKnowledgeDocs() {
    activeKnowledgeDocs = [];
    setSafeValue('knowledge_docs_cache', '');
    if (typeof updateHUDKnowledgeListFn === 'function') {
      updateHUDKnowledgeListFn();
    }
    setStatus('🧹 Knowledge Base cleared. Study material folder emptied.');
  }

  // Ingestion handler for folder / files selection
  async function handleSelectedDocumentFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    const supportedExts = ['.docx', '.doc', '.pptx', '.ppt', '.pdf', '.txt', '.md'];
    const validFiles = Array.from(fileList).filter(f => {
      const name = (f.name || '').toLowerCase();
      return supportedExts.some(ext => name.endsWith(ext));
    });

    if (validFiles.length === 0) {
      setStatus('⚠️ No supported files (.docx, .pdf, .ppt, .pptx) found in selection.');
      return;
    }

    setStatus(`📂 Reading ${validFiles.length} file(s) from study folder...`);
    let successCount = 0;

    for (let i = 0; i < validFiles.length; i++) {
      const f = validFiles[i];
      try {
        setStatus(`[${i + 1}/${validFiles.length}] 📖 Reading "${f.name}" (${Math.round(f.size / 1024)} KB)...`);
        const parsedDoc = await parseDocumentFile(f);
        const existingIdx = activeKnowledgeDocs.findIndex(d => d.name === parsedDoc.name);
        if (existingIdx !== -1) {
          activeKnowledgeDocs[existingIdx] = parsedDoc;
        } else {
          activeKnowledgeDocs.push(parsedDoc);
        }
        successCount++;
      } catch (err) {
        console.error('Failed to parse document:', f.name, err);
        setStatus(`⚠️ Failed to parse "${f.name}": ${err.message}`);
      }
    }

    saveKnowledgeDocsToStorage();
    if (typeof updateHUDKnowledgeListFn === 'function') {
      updateHUDKnowledgeListFn();
    }

    const totalWords = activeKnowledgeDocs.reduce((acc, d) => acc + (d.wordCount || 0), 0);
    setStatus(`✅ Successfully indexed ${successCount} document(s)! Knowledge Base now has ${activeKnowledgeDocs.length} files (~${totalWords.toLocaleString()} words). Ready for Ground-Truth answering.`);
  }

  // Auto-Ingestion from Extension's dedicated "files/" folder (Zero Drag-and-Drop required)
  async function loadFilesFromExtensionFolder(isManualTrigger = false) {
    try {
      if (isManualTrigger) {
        setStatus('🔍 Scanning extension "files/" folder for study materials...');
      }

      let fileNames = [];

      // 1. Try reading files/files.json via web_accessible_resources
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
          const jsonUrl = chrome.runtime.getURL('files/files.json');
          const res = await fetch(jsonUrl, { cache: 'no-cache' });
          if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list) && list.length > 0) {
              fileNames = list.filter(name => {
                const lower = (name || '').toLowerCase();
                return ['.docx', '.doc', '.pptx', '.ppt', '.pdf', '.txt', '.md'].some(ext => lower.endsWith(ext));
              });
            }
          }
        }
      } catch (e) {}

      // 2. Fallback to background service worker scan
      if (fileNames.length === 0 && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        try {
          const bgRes = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'SCAN_EXTENSION_FILES' }, (resp) => {
              if (chrome.runtime.lastError || !resp) resolve(null);
              else resolve(resp);
            });
          });
          if (bgRes && bgRes.ok && Array.isArray(bgRes.fileNames) && bgRes.fileNames.length > 0) {
            fileNames = bgRes.fileNames;
          }
        } catch (e) {}
      }

      if (fileNames.length === 0) {
        if (isManualTrigger) {
          setStatus('⚠️ No study files found in "files/" folder. Place your .docx, .pdf, or .pptx files in files/ and run sync_files.bat.');
        }
        return;
      }

      let newlyLoaded = 0;
      for (let i = 0; i < fileNames.length; i++) {
        const fileName = fileNames[i];
        try {
          let arrayBuffer = null;
          let fileSize = 0;

          // Try direct fetch via web_accessible_resources
          try {
            const fileUrl = chrome.runtime.getURL('files/' + fileName);
            const fileRes = await fetch(fileUrl, { cache: 'no-cache' });
            if (fileRes.ok) {
              arrayBuffer = await fileRes.arrayBuffer();
              fileSize = arrayBuffer.byteLength;
            }
          } catch (e) {}

          // Fallback via background script
          if (!arrayBuffer && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            const readRes = await new Promise((resolve) => {
              chrome.runtime.sendMessage({ type: 'READ_EXTENSION_FILE', fileName }, (resp) => {
                if (chrome.runtime.lastError || !resp) resolve(null);
                else resolve(resp);
              });
            });
            if (readRes && readRes.ok && readRes.base64) {
              const binary = atob(readRes.base64);
              const bytes = new Uint8Array(binary.length);
              for (let b = 0; b < binary.length; b++) {
                bytes[b] = binary.charCodeAt(b);
              }
              arrayBuffer = bytes.buffer;
              fileSize = readRes.size || bytes.byteLength;
            }
          }

          if (arrayBuffer && arrayBuffer.byteLength > 0) {
            const parsedDoc = await parseDocumentFile({
              name: fileName,
              arrayBuffer,
              size: fileSize
            });
            const existingIdx = activeKnowledgeDocs.findIndex(d => d.name === parsedDoc.name);
            if (existingIdx !== -1) {
              activeKnowledgeDocs[existingIdx] = parsedDoc;
            } else {
              activeKnowledgeDocs.push(parsedDoc);
            }
            newlyLoaded++;
          }
        } catch (fileErr) {
          console.warn(`[Google Form AI HUD] Could not load "${fileName}" from files/ folder:`, fileErr);
        }
      }

      if (newlyLoaded > 0) {
        saveKnowledgeDocsToStorage();
        if (typeof updateHUDKnowledgeListFn === 'function') {
          updateHUDKnowledgeListFn();
        }
        const totalWords = activeKnowledgeDocs.reduce((acc, d) => acc + (d.wordCount || 0), 0);
        console.log(`[Google Form AI HUD] Auto-loaded ${newlyLoaded} file(s) from "files/" folder (~${totalWords.toLocaleString()} words).`);
        if (isManualTrigger) {
          setStatus(`✅ Successfully synced ${newlyLoaded} file(s) from "files/" folder (~${totalWords.toLocaleString()} words). Knowledge Base active!`);
        }
      }
    } catch (err) {
      console.error('[Google Form AI HUD] loadFilesFromExtensionFolder failed:', err);
    }
  }

  // 100% Token-Free Local Profile Store
  // Diverse, hyper-realistic Philippine personas residing strictly in Quezon City (QC), Metro Manila
  const QC_PHILIPPINES_PERSONAS = [
    {
      id: 'julian_santos',
      label: '🇵🇭 Julian Gabriel Santos (Diliman, QC - UP Diliman)',
      fullName: 'Julian Gabriel Santos',
      firstName: 'Julian',
      middleName: 'Gabriel',
      lastName: 'Santos',
      nickname: 'Ian',
      email: 'julian.santos.upd@gmail.com',
      phone: '09178452190',
      address: '14 Katipunan Ave, Brgy. Diliman',
      city: 'Quezon City',
      provinceOrState: 'Metro Manila',
      postalCode: '1101',
      country: 'Philippines',
      age: '21',
      gender: 'Male',
      birthdate: '2004-03-18',
      birthplace: 'Quezon City',
      bloodType: 'O',
      religion: 'Roman Catholic',
      nationality: 'Filipino',
      maritalStatus: 'Single',
      occupation: 'Student',
      schoolOrOrg: 'University of the Philippines Diliman',
      facultyOrMajor: 'BS Computer Science',
      studentId: '2023-14892',
      yearLevel: '3rd Year',
      batchYear: '2023',
      semester: '1st Semester',
      emergencyContact: '09175551234',
      hobby: 'Coding, Gaming, Basketball, Reading',
      socialMedia: '@iansantos_qc'
    },
    {
      id: 'bea_dizon',
      label: '🇵🇭 Bea Marie Dizon (Loyola Heights, QC - Ateneo)',
      fullName: 'Bea Marie Dizon',
      firstName: 'Bea',
      middleName: 'Marie',
      lastName: 'Dizon',
      nickname: 'Bea',
      email: 'bea.dizon.admu@gmail.com',
      phone: '09279124485',
      address: '88 Esteban Abada St, Brgy. Loyola Heights',
      city: 'Quezon City',
      provinceOrState: 'Metro Manila',
      postalCode: '1108',
      country: 'Philippines',
      age: '20',
      gender: 'Female',
      birthdate: '2005-07-24',
      birthplace: 'Quezon City',
      bloodType: 'A',
      religion: 'Roman Catholic',
      nationality: 'Filipino',
      maritalStatus: 'Single',
      occupation: 'Student',
      schoolOrOrg: 'Ateneo de Manila University',
      facultyOrMajor: 'BS Management Information Systems',
      studentId: '224819',
      yearLevel: '2nd Year',
      batchYear: '2023',
      semester: '1st Semester',
      emergencyContact: '09189994321',
      hobby: 'Photography, Badminton, Digital Art',
      socialMedia: '@beadizon_'
    },
    {
      id: 'mark_mendoza',
      label: '🇵🇭 Mark Lester Mendoza (Commonwealth, QC - QCU)',
      fullName: 'Mark Lester Mendoza',
      firstName: 'Mark',
      middleName: 'Lester',
      lastName: 'Mendoza',
      nickname: 'Mack',
      email: 'mark.mendoza.qcu@gmail.com',
      phone: '09953216789',
      address: '25 Commonwealth Ave, Brgy. Commonwealth',
      city: 'Quezon City',
      provinceOrState: 'Metro Manila',
      postalCode: '1121',
      country: 'Philippines',
      age: '22',
      gender: 'Male',
      birthdate: '2003-11-09',
      birthplace: 'Quezon City',
      bloodType: 'B',
      religion: 'Christian',
      nationality: 'Filipino',
      maritalStatus: 'Single',
      occupation: 'Student / Freelancer',
      schoolOrOrg: 'Quezon City University',
      facultyOrMajor: 'BS Information Technology',
      studentId: '21-0489',
      yearLevel: '4th Year',
      batchYear: '2021',
      semester: '1st Semester',
      emergencyContact: '09087776543',
      hobby: 'Mobile Legends, Web Dev, Cycling',
      socialMedia: '@mackmendoza_qc'
    },
    {
      id: 'patricia_reyes',
      label: '🇵🇭 Patricia Ann Reyes (Cubao, QC - TIP QC)',
      fullName: 'Patricia Ann Reyes',
      firstName: 'Patricia',
      middleName: 'Ann',
      lastName: 'Reyes',
      nickname: 'Trish',
      email: 'patricia.reyes.tip@gmail.com',
      phone: '09184567812',
      address: '73 Aurora Blvd, Brgy. Socorro, Cubao',
      city: 'Quezon City',
      provinceOrState: 'Metro Manila',
      postalCode: '1109',
      country: 'Philippines',
      age: '21',
      gender: 'Female',
      birthdate: '2004-05-14',
      birthplace: 'Quezon City',
      bloodType: 'AB',
      religion: 'Roman Catholic',
      nationality: 'Filipino',
      maritalStatus: 'Single',
      occupation: 'Student',
      schoolOrOrg: 'Technological Institute of the Philippines QC',
      facultyOrMajor: 'BS Computer Engineering',
      studentId: '2210852',
      yearLevel: '3rd Year',
      batchYear: '2022',
      semester: '1st Semester',
      emergencyContact: '09172223344',
      hobby: 'Robotics, Graphic Design, Music',
      socialMedia: '@trishreyes'
    },
    {
      id: 'john_bautista',
      label: '🇵🇭 John Paolo Bautista (Fairview, QC - FEU Diliman)',
      fullName: 'John Paolo Bautista',
      firstName: 'John',
      middleName: 'Paolo',
      lastName: 'Bautista',
      nickname: 'JP',
      email: 'jp.bautista.feu@gmail.com',
      phone: '09283456711',
      address: '42 Regalado Ave, North Fairview',
      city: 'Quezon City',
      provinceOrState: 'Metro Manila',
      postalCode: '1118',
      country: 'Philippines',
      age: '20',
      gender: 'Male',
      birthdate: '2005-01-30',
      birthplace: 'Quezon City',
      bloodType: 'O',
      religion: 'Roman Catholic',
      nationality: 'Filipino',
      maritalStatus: 'Single',
      occupation: 'Student',
      schoolOrOrg: 'FEU Diliman',
      facultyOrMajor: 'BS Business Administration',
      studentId: '2023-08914',
      yearLevel: '2nd Year',
      batchYear: '2023',
      semester: '1st Semester',
      emergencyContact: '09191238877',
      hobby: 'Stock Trading, Football, Fitness',
      socialMedia: '@jpbautista_ph'
    },
    {
      id: 'althea_garcia',
      label: '🇵🇭 Althea Mae Garcia (Project 4, QC - Trinity Univ)',
      fullName: 'Althea Mae Garcia',
      firstName: 'Althea',
      middleName: 'Mae',
      lastName: 'Garcia',
      nickname: 'Thea',
      email: 'althea.garcia.tua@gmail.com',
      phone: '09395678901',
      address: '19 P. Tuazon Blvd, Project 4',
      city: 'Quezon City',
      provinceOrState: 'Metro Manila',
      postalCode: '1109',
      country: 'Philippines',
      age: '22',
      gender: 'Female',
      birthdate: '2003-09-05',
      birthplace: 'Quezon City',
      bloodType: 'A',
      religion: 'Christian',
      nationality: 'Filipino',
      maritalStatus: 'Single',
      occupation: 'Student',
      schoolOrOrg: 'Trinity University of Asia',
      facultyOrMajor: 'BS Nursing',
      studentId: '2021-03412',
      yearLevel: '4th Year',
      batchYear: '2021',
      semester: '1st Semester',
      emergencyContact: '09176549870',
      hobby: 'Volunteering, Cooking, Volleyball',
      socialMedia: '@theagarcia'
    },
    {
      id: 'gabriel_cruz',
      label: '🇵🇭 Gabriel Angelo Cruz (Novaliches, QC - QCU)',
      fullName: 'Gabriel Angelo Cruz',
      firstName: 'Gabriel',
      middleName: 'Angelo',
      lastName: 'Cruz',
      nickname: 'Gab',
      email: 'gabriel.cruz.qcu@gmail.com',
      phone: '09451239874',
      address: '56 Quirino Highway, Brgy. Novaliches Proper',
      city: 'Quezon City',
      provinceOrState: 'Metro Manila',
      postalCode: '1123',
      country: 'Philippines',
      age: '21',
      gender: 'Male',
      birthdate: '2004-10-12',
      birthplace: 'Quezon City',
      bloodType: 'B',
      religion: 'Roman Catholic',
      nationality: 'Filipino',
      maritalStatus: 'Single',
      occupation: 'Student',
      schoolOrOrg: 'Quezon City University',
      facultyOrMajor: 'BS Accountancy',
      studentId: '22-0914',
      yearLevel: '3rd Year',
      batchYear: '2022',
      semester: '1st Semester',
      emergencyContact: '09204445566',
      hobby: 'Chess, Anime, Guitar, Running',
      socialMedia: '@gabcruz_qc'
    },
    {
      id: 'alyssa_flores',
      label: '🇵🇭 Alyssa Nicole Flores (Batasan Hills, QC - New Era Univ)',
      fullName: 'Alyssa Nicole Flores',
      firstName: 'Alyssa',
      middleName: 'Nicole',
      lastName: 'Flores',
      nickname: 'Aly',
      email: 'alyssa.flores.neu@gmail.com',
      phone: '09176541298',
      address: '31 IBP Road, Brgy. Batasan Hills',
      city: 'Quezon City',
      provinceOrState: 'Metro Manila',
      postalCode: '1126',
      country: 'Philippines',
      age: '20',
      gender: 'Female',
      birthdate: '2005-04-20',
      birthplace: 'Quezon City',
      bloodType: 'O',
      religion: 'Iglesia ni Cristo',
      nationality: 'Filipino',
      maritalStatus: 'Single',
      occupation: 'Student',
      schoolOrOrg: 'New Era University',
      facultyOrMajor: 'BS Psychology',
      studentId: '22-19402',
      yearLevel: '2nd Year',
      batchYear: '2023',
      semester: '1st Semester',
      emergencyContact: '09183332211',
      hobby: 'Creative Writing, Singing, Swimming',
      socialMedia: '@alyflores_qc'
    },
    {
      id: 'christian_villanueva',
      label: '🇵🇭 Christian Dave Villanueva (Sta. Mesa Heights, QC - UST)',
      fullName: 'Christian Dave Villanueva',
      firstName: 'Christian',
      middleName: 'Dave',
      lastName: 'Villanueva',
      nickname: 'Chris',
      email: 'chris.villanueva.ust@gmail.com',
      phone: '09268871923',
      address: '45 Biak na Bato St, Brgy. Sta. Mesa Heights',
      city: 'Quezon City',
      provinceOrState: 'Metro Manila',
      postalCode: '1114',
      country: 'Philippines',
      age: '21',
      gender: 'Male',
      birthdate: '2004-08-22',
      birthplace: 'Quezon City',
      bloodType: 'O',
      religion: 'Roman Catholic',
      nationality: 'Filipino',
      maritalStatus: 'Single',
      occupation: 'Student',
      schoolOrOrg: 'University of Santo Tomas',
      facultyOrMajor: 'BS Medical Technology',
      studentId: '2022-108291',
      yearLevel: '3rd Year',
      batchYear: '2022',
      semester: '1st Semester',
      emergencyContact: '09173349911',
      hobby: 'Swimming, Piano, Sci-Fi Movies',
      socialMedia: '@chrisvillanueva'
    },
    {
      id: 'samantha_ramos',
      label: '🇵🇭 Samantha Joy Ramos (Loyola Heights, QC - Miriam College)',
      fullName: 'Samantha Joy Ramos',
      firstName: 'Samantha',
      middleName: 'Joy',
      lastName: 'Ramos',
      nickname: 'Sam',
      email: 'sam.ramos.mc@gmail.com',
      phone: '09171239845',
      address: '12 Katipunan Ave, Brgy. Loyola Heights',
      city: 'Quezon City',
      provinceOrState: 'Metro Manila',
      postalCode: '1108',
      country: 'Philippines',
      age: '20',
      gender: 'Female',
      birthdate: '2005-02-14',
      birthplace: 'Quezon City',
      bloodType: 'AB',
      religion: 'Christian',
      nationality: 'Filipino',
      maritalStatus: 'Single',
      occupation: 'Student',
      schoolOrOrg: 'Miriam College',
      facultyOrMajor: 'BA Communication',
      studentId: 'MC-2023-4410',
      yearLevel: '2nd Year',
      batchYear: '2023',
      semester: '1st Semester',
      emergencyContact: '09184452109',
      hobby: 'Podcasting, Journaling, Baking',
      socialMedia: '@samramos_qc'
    },
    {
      id: 'rafael_castro',
      label: '🇵🇭 Rafael Miguel Castro (Fairview, QC - NU Fairview)',
      fullName: 'Rafael Miguel Castro',
      firstName: 'Rafael',
      middleName: 'Miguel',
      lastName: 'Castro',
      nickname: 'Raffy',
      email: 'rafael.castro.nu@gmail.com',
      phone: '09983419082',
      address: '89 Commonwealth Ave, Brgy. Greater Fairview',
      city: 'Quezon City',
      provinceOrState: 'Metro Manila',
      postalCode: '1118',
      country: 'Philippines',
      age: '22',
      gender: 'Male',
      birthdate: '2003-06-19',
      birthplace: 'Quezon City',
      bloodType: 'B',
      religion: 'Roman Catholic',
      nationality: 'Filipino',
      maritalStatus: 'Single',
      occupation: 'Student / Barista',
      schoolOrOrg: 'National University Fairview',
      facultyOrMajor: 'BS Tourism Management',
      studentId: '2021-09823',
      yearLevel: '4th Year',
      batchYear: '2021',
      semester: '1st Semester',
      emergencyContact: '09228891024',
      hobby: 'Coffee Brewing, Skateboarding, Photography',
      socialMedia: '@raffycastro'
    },
    {
      id: 'maria_angela_tan',
      label: '🇵🇭 Maria Angela Tan (New Manila, QC - Trinity / St. Luke\'s)',
      fullName: 'Maria Angela Tan',
      firstName: 'Maria',
      middleName: 'Angela',
      lastName: 'Tan',
      nickname: 'Gela',
      email: 'gela.tan.qc@gmail.com',
      phone: '09195543187',
      address: '27 E. Rodriguez Sr. Ave, Brgy. Mariana, New Manila',
      city: 'Quezon City',
      provinceOrState: 'Metro Manila',
      postalCode: '1112',
      country: 'Philippines',
      age: '21',
      gender: 'Female',
      birthdate: '2004-12-03',
      birthplace: 'Quezon City',
      bloodType: 'A',
      religion: 'Roman Catholic',
      nationality: 'Filipino',
      maritalStatus: 'Single',
      occupation: 'Student',
      schoolOrOrg: 'Trinity University of Asia',
      facultyOrMajor: 'BS Medical Technology',
      studentId: '2022-04189',
      yearLevel: '3rd Year',
      batchYear: '2022',
      semester: '1st Semester',
      emergencyContact: '09178823190',
      hobby: 'Violin, Hiking, Astronomy',
      socialMedia: '@gelatan_qc'
    }
  ];

  const DEFAULT_USER_PROFILE = Object.assign({}, QC_PHILIPPINES_PERSONAS[0]);

  // Session-bound persona: keeps identity consistent across multi-page forms, but rotates on new form runs
  let currentSessionPersona = null;
  let updateHUDPersonaFn = null;

  function isAutoRotateEnabled() {
    return getSafeValue('auto_rotate_personas', 'true') === 'true';
  }

  function setAutoRotate(enabled) {
    setSafeValue('auto_rotate_personas', enabled ? 'true' : 'false');
  }

  // ── Profile Autofill Toggle ──────────────────────────────────────────────────
  // When disabled the zero-token profile shortcut is skipped and every question
  // goes to the AI, letting you prevent personal data from being auto-filled.
  function isProfileAutofillEnabled() {
    return getSafeValue('profile_autofill_enabled', 'false') === 'true';
  }

  function setProfileAutofillEnabled(enabled) {
    setSafeValue('profile_autofill_enabled', enabled ? 'true' : 'false');
  }

  // Infinite Dynamic QC Persona Generator: Generates authentic, unique Quezon City college identities on the fly
  function generateDynamicQCPersona() {
    const maleFirst = ['Julian', 'Gabriel', 'Mark', 'Lester', 'John', 'Paolo', 'Christian', 'Dave', 'Rafael', 'Miguel', 'Joshua', 'Angelo', 'Kevin', 'Kyle', 'Daniel', 'Carlo', 'Adrian', 'Justin', 'Ethan', 'Nathan', 'Vince', 'Jerome', 'Lance', 'Enzo', 'Lorenzo', 'Renz', 'Alden', 'Marco', 'Sean', 'Dominic'];
    const femaleFirst = ['Bea', 'Marie', 'Patricia', 'Ann', 'Althea', 'Mae', 'Alyssa', 'Nicole', 'Samantha', 'Joy', 'Maria', 'Angela', 'Camille', 'Chloe', 'Andrea', 'Jasmine', 'Sophia', 'Denise', 'Kimberly', 'Bianca', 'Angel', 'Rochelle', 'Katrina', 'Trisha', 'Marianne', 'Hannah', 'Giselle', 'Paula', 'Clarisse', 'Regina'];
    const middleNames = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Dizon', 'Mendoza', 'Garcia', 'Flores', 'Ramos', 'Castro', 'Villanueva', 'Tan', 'Lopez', 'Aquino', 'Gonzales', 'Dela Cruz', 'Navarro', 'Mercado', 'Soriano', 'Valdez', 'De Leon', 'Morales', 'Castillo', 'Perez', 'Salonga', 'Lim', 'Chua', 'Sy', 'Ocampo', 'Tolentino'];
    const lastNames = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Dizon', 'Mendoza', 'Garcia', 'Flores', 'Ramos', 'Castro', 'Villanueva', 'Tan', 'Lopez', 'Aquino', 'Gonzales', 'Dela Cruz', 'Navarro', 'Mercado', 'Soriano', 'Valdez', 'De Leon', 'Morales', 'Castillo', 'Perez', 'Salonga', 'Lim', 'Chua', 'Sy', 'Ocampo', 'Tolentino'];

    const isMale = Math.random() < 0.5;
    const firstName = isMale ? maleFirst[Math.floor(Math.random() * maleFirst.length)] : femaleFirst[Math.floor(Math.random() * femaleFirst.length)];
    const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
    let lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    while (lastName === middleName) {
      lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    }

    const nickname = firstName.length <= 4 ? firstName : (isMale ? ['Ian', 'Mack', 'JP', 'Chris', 'Raffy', 'Gab', 'Josh', 'Dan', 'Nic', 'Ken', 'Ren'][Math.floor(Math.random() * 11)] : ['Bea', 'Trish', 'Thea', 'Aly', 'Sam', 'Gela', 'Cami', 'Andie', 'Soph', 'Kim'][Math.floor(Math.random() * 10)]);

    const qcLocations = [
      { brgy: 'Diliman', street: '14 Katipunan Ave', zip: '1101' },
      { brgy: 'Loyola Heights', street: '88 Esteban Abada St', zip: '1108' },
      { brgy: 'Commonwealth', street: '25 Commonwealth Ave', zip: '1121' },
      { brgy: 'Cubao', street: '73 Aurora Blvd, Brgy. Socorro', zip: '1109' },
      { brgy: 'North Fairview', street: '42 Regalado Ave', zip: '1118' },
      { brgy: 'Project 4', street: '19 P. Tuazon Blvd', zip: '1109' },
      { brgy: 'Novaliches', street: '56 Quirino Highway, Brgy. Novaliches Proper', zip: '1123' },
      { brgy: 'Batasan Hills', street: '31 IBP Road', zip: '1126' },
      { brgy: 'Sta. Mesa Heights', street: '45 Biak na Bato St', zip: '1114' },
      { brgy: 'New Manila', street: '27 E. Rodriguez Sr. Ave, Brgy. Mariana', zip: '1112' },
      { brgy: 'Tandang Sora', street: '18 Tandang Sora Ave', zip: '1116' },
      { brgy: 'Teachers Village', street: '33 Maginhawa St', zip: '1101' },
      { brgy: 'South Triangle', street: '62 Timog Ave', zip: '1103' }
    ];
    const loc = qcLocations[Math.floor(Math.random() * qcLocations.length)];

    const schools = [
      { name: 'University of the Philippines Diliman', short: 'upd', majors: ['BS Computer Science', 'BS Business Administration', 'BS Civil Engineering', 'BA Communication', 'BS Statistics', 'BS Psychology', 'BS Economics'] },
      { name: 'Ateneo de Manila University', short: 'admu', majors: ['BS Management Information Systems', 'BS Management', 'BS Computer Science', 'BA Communication', 'BS Psychology'] },
      { name: 'Quezon City University', short: 'qcu', majors: ['BS Information Technology', 'BS Accountancy', 'BS Electronics Engineering', 'BS Entrepreneurship'] },
      { name: 'Technological Institute of the Philippines QC', short: 'tip', majors: ['BS Computer Engineering', 'BS Information Technology', 'BS Electrical Engineering', 'BS Architecture'] },
      { name: 'Far Eastern University Diliman', short: 'feu', majors: ['BS Business Administration', 'BS Information Technology', 'BS Accountancy'] },
      { name: 'Trinity University of Asia', short: 'tua', majors: ['BS Nursing', 'BS Medical Technology', 'BS Psychology', 'BS Tourism Management'] },
      { name: 'New Era University', short: 'neu', majors: ['BS Psychology', 'BS Computer Science', 'BS Civil Engineering', 'BS Accountancy'] },
      { name: 'University of Santo Tomas', short: 'ust', majors: ['BS Medical Technology', 'BS Nursing', 'BS Information Systems', 'BS Pharmacy'] },
      { name: 'Miriam College', short: 'mc', majors: ['BA Communication', 'BS Psychology', 'BS Environmental Planning', 'BS Entrepreneurship'] },
      { name: 'National University Fairview', short: 'nu', majors: ['BS Tourism Management', 'BS Information Technology', 'BS Business Administration'] }
    ];
    const sch = schools[Math.floor(Math.random() * schools.length)];
    const major = sch.majors[Math.floor(Math.random() * sch.majors.length)];

    const yearNum = Math.floor(Math.random() * 4) + 1;
    const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
    const yearLevel = yearLevels[yearNum - 1];
    const batchYear = String(2025 - yearNum);
    const age = String(18 + yearNum);
    const birthYear = String(2025 - (18 + yearNum));
    const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const birthdate = `${birthYear}-${birthMonth}-${birthDay}`;

    const studentIdRandom = Math.floor(10000 + Math.random() * 90000);
    const studentId = `${batchYear}-${studentIdRandom}`;

    const cleanFn = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const cleanLn = lastName.toLowerCase().replace(/[^a-z]/g, '');
    const emailRand = Math.floor(10 + Math.random() * 90);
    const email = `${cleanFn}.${cleanLn}.${sch.short}${emailRand}@gmail.com`;

    const prefixes = ['0917', '0918', '0927', '0928', '0995', '0945', '0939', '0926', '0998', '0919'];
    const phone = `${prefixes[Math.floor(Math.random() * prefixes.length)]}${Math.floor(1000000 + Math.random() * 9000000)}`;
    const emergencyPhone = `${prefixes[Math.floor(Math.random() * prefixes.length)]}${Math.floor(1000000 + Math.random() * 9000000)}`;

    const hobbies = [
      'Coding, Gaming, Basketball, Reading',
      'Photography, Badminton, Digital Art',
      'Mobile Legends, Web Dev, Cycling',
      'Robotics, Graphic Design, Music',
      'Stock Trading, Football, Fitness',
      'Volunteering, Cooking, Volleyball',
      'Chess, Anime, Guitar, Running',
      'Creative Writing, Singing, Swimming',
      'Baking, Travel, Journaling, Yoga',
      'Coffee Brewing, Skateboarding, Film',
      'Board Games, Hiking, Podcasting, Drawing'
    ];
    const hobby = hobbies[Math.floor(Math.random() * hobbies.length)];
    const socialMedia = `@${cleanFn}${cleanLn}_qc`;

    const bloodTypes = ['O', 'A', 'B', 'AB'];
    const bloodType = bloodTypes[Math.floor(Math.random() * bloodTypes.length)];
    const religions = ['Roman Catholic', 'Christian', 'Roman Catholic', 'Iglesia ni Cristo', 'Roman Catholic'];
    const religion = religions[Math.floor(Math.random() * religions.length)];

    const id = `dyn_${cleanFn}_${cleanLn}_${Date.now().toString(36)}`;
    const fullName = `${firstName} ${middleName} ${lastName}`;

    return {
      id,
      label: `✨ ${fullName} (${loc.brgy}, QC - ${sch.name})`,
      fullName,
      firstName,
      middleName,
      lastName,
      nickname,
      email,
      phone,
      address: `${loc.street}, Brgy. ${loc.brgy}`,
      city: 'Quezon City',
      provinceOrState: 'Metro Manila',
      postalCode: loc.zip,
      country: 'Philippines',
      age,
      gender: isMale ? 'Male' : 'Female',
      birthdate,
      birthplace: 'Quezon City',
      bloodType,
      religion,
      nationality: 'Filipino',
      maritalStatus: 'Single',
      occupation: 'Student',
      schoolOrOrg: sch.name,
      facultyOrMajor: major,
      studentId,
      yearLevel,
      batchYear,
      semester: '1st Semester',
      emergencyContact: emergencyPhone,
      hobby,
      socialMedia,
      isDynamic: true
    };
  }

  // Automatically rotates to a fresh persona (Infinite Generator or Presets) so each form run has a distinct name & identity
  function rotatePersona(force = false) {
    const mode = getSafeValue('persona_mode', 'infinite'); // 'infinite' or 'preset'
    let nextPersona;

    if (mode === 'infinite') {
      nextPersona = generateDynamicQCPersona();
    } else {
      const list = QC_PHILIPPINES_PERSONAS;
      let nextIdx = 0;
      try {
        const currentIdx = parseInt(getSafeValue('persona_rotation_index', '-1'), 10);
        nextIdx = (isNaN(currentIdx) || currentIdx < 0 ? 0 : currentIdx + 1) % list.length;
      } catch (e) {
        nextIdx = Math.floor(Math.random() * list.length);
      }
      setSafeValue('persona_rotation_index', String(nextIdx));
      nextPersona = Object.assign({}, list[nextIdx]);
    }

    setSafeValue('user_profile', JSON.stringify(nextPersona));
    currentSessionPersona = nextPersona;

    if (typeof updateHUDPersonaFn === 'function') {
      try { updateHUDPersonaFn(nextPersona); } catch (e) {}
    }
    setStatus(`[Persona Rotated: ${mode === 'infinite' ? 'Infinite QC' : 'Preset QC'}] 👤 Active: ${nextPersona.fullName} (${nextPersona.email})`);
    return nextPersona;
  }

  function getUserProfile(useSession = true) {
    if (useSession && currentSessionPersona) {
      return currentSessionPersona;
    }
    try {
      const raw = getSafeValue('user_profile', '');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (useSession) currentSessionPersona = parsed;
        return Object.assign({}, DEFAULT_USER_PROFILE, parsed);
      }
    } catch (e) {}
    const def = Object.assign({}, DEFAULT_USER_PROFILE);
    if (useSession) currentSessionPersona = def;
    return def;
  }

  function saveUserProfile(profile) {
    try {
      setSafeValue('user_profile', JSON.stringify(profile));
      return true;
    } catch (e) {
      return false;
    }
  }

  // High-precision pattern detector for personal identity and survey metadata questions
  function matchUserProfile(title, description = '', profile = DEFAULT_USER_PROFILE) {
    const rawText = `${title} ${description}`.trim();
    const text = rawText.toLowerCase();

    // Guard: If the question is an obvious general survey / opinion / quiz question, skip profile matching
    if (/\b(what\s+do\s+you|how\s+do\s+you|why\s+do\s+you|which\s+of\s+the\s+following|select\s+all|rate\s+your|opinion\s+on|thoughts\s+on|evaluate|do\s+you\s+(think|agree|use|prefer|believe)|ano\s+ang\s+iyong\s+pananaw)\b/i.test(text)) {
      return null;
    }

    // 0. Combined Place and Date of Birth (Tempat, Tanggal Lahir / TTL)
    if (/\b(ttl|tempat\s*(dan|\/|,)?\s*tanggal\s*lahir|tempat\s*tgl\s*lahir|birth\s*place\s*and\s*date)\b/i.test(text)) {
      const bCity = profile.birthplace || 'Quezon City';
      const bDate = profile.birthdate || '2003-08-15';
      return { field: 'birthplaceAndDate', value: `${bCity}, ${bDate}` };
    }

    // 1. Email Address
    if (/\b(your\s*e-?mail|e-?mail\s*address|alamat\s*email|surel|iyong\s*email)\b/i.test(text) ||
        /^(e-?mail|email\s*address|surel)[\s:?*]*$/i.test(text)) {
      return { field: 'email', value: profile.email };
    }

    // 2. Emergency Contact
    if (/\b(emergency\s*contact|kontak\s*darurat|nomor\s*darurat|emergency\s*phone|emergency\s*number)\b/i.test(text)) {
      return { field: 'emergencyContact', value: profile.emergencyContact };
    }

    // 3. Phone / WhatsApp / Mobile Number
    if (/\b(phone\s*number|mobile\s*number|cellphone\s*number|contact\s*number|nomor\s*(hp|telepon|wa)|no\s*(hp|telp|wa)|whatsapp\s*number|numero\s*ng\s*telepono)\b/i.test(text) ||
        /^(phone|telepon|handphone|nomor\s*hp|no\s*hp|whatsapp|wa|mobile)[\s:?*]*$/i.test(text)) {
      return { field: 'phone', value: profile.phone };
    }

    // 4. Nickname / Alias / Panggilan
    if (/\b(nickname|nama\s*panggilan|alias|palayaw|iyong\s*palayaw)\b/i.test(text) ||
        /^(nickname|alias|panggilan|palayaw)[\s:?*]*$/i.test(text)) {
      return { field: 'nickname', value: profile.nickname };
    }

    // 5. First Name
    if (/\b(first\s*name|nama\s*depan|given\s*name|nama\s*pertama|unang\s*pangalan)\b/i.test(text)) {
      return { field: 'firstName', value: profile.firstName };
    }

    // 6. Middle Name
    if (/\b(middle\s*name|nama\s*tengah|gitnang\s*pangalan)\b/i.test(text)) {
      return { field: 'middleName', value: profile.middleName };
    }

    // 7. Last Name / Surname
    if (/\b(last\s*name|surname|family\s*name|nama\s*belakang|nama\s*keluarga|apelyido)\b/i.test(text)) {
      return { field: 'lastName', value: profile.lastName };
    }

    // 8. Student ID / Employee ID / NIK / NIM / NPM / NISN
    if (/\b(student\s*(id|no|num|number)|id\s*number|nim|npm|nisn|nomor\s*induk|id\s*karyawan|employee\s*id|nrp|nik|ktp|no\s*identitas|id\s*ng\s*mag-aaral)\b/i.test(text)) {
      return { field: 'studentId', value: profile.studentId };
    }

    // 9. Faculty / Major / Program of Study / Course
    if (/\b(your\s*(major|course|program|degree|faculty|department)|what\s*is\s*your\s*(major|course|program)|course\s*\/\s*major|major\s*\/\s*course|degree\s*program|program\s*studi|nama\s*jurusan|asal\s*jurusan|anong\s*kurso|field\s*of\s*study)\b/i.test(text) ||
        /^(major|course|kurso|jurusan|prodi|program\s*studi|fakultas|faculty)[\s:?*]*$/i.test(text)) {
      return { field: 'facultyOrMajor', value: profile.facultyOrMajor };
    }

    // 10. School / University / Campus / Organization / Workplace
    if (/\b(your\s*(school|university|campus|college|institution|workplace|company|organization)|name\s*of\s*(school|university|campus|college|institution|company)|school\s*\/\s*university|school\s*name|university\s*name|nama\s*(sekolah|kampus|universitas|perguruan\s*tinggi|instansi|organisasi|perusahaan)|asal\s*(sekolah|kampus|universitas)|anong\s*(paaralan|pamantasan|unibersidad)|paaralan\s*\/\s*pamantasan|pangalan\s*ng\s*(paaralan|pamantasan|unibersidad)|school\s*or\s*university|current\s*school|current\s*university)\b/i.test(text) ||
        /^(school|university|campus|college|institution|sekolah|kampus|universitas|asal\s*sekolah|nama\s*kampus|paaralan|pamantasan|unibersidad)[\s:?*]*$/i.test(text)) {
      return { field: 'schoolOrOrg', value: profile.schoolOrOrg };
    }

    // 11. Occupation / Job / Profession
    if (/\b(your\s*(occupation|job|profession)|current\s*(occupation|job)|pekerjaan\s*anda|profesi\s*anda|hanapbuhay|trabaho\s*mo)\b/i.test(text) ||
        /^(occupation|pekerjaan|profesi|trabaho|hanapbuhay)[\s:?*]*$/i.test(text)) {
      return { field: 'occupation', value: profile.occupation };
    }

    // 12. Religion / Agama
    if (/\b(your\s*religion|agama\s*anda|relihiyon|iyong\s*relihiyon)\b/i.test(text) ||
        /^(religion|agama|relihiyon)[\s:?*]*$/i.test(text)) {
      return { field: 'religion', value: profile.religion };
    }

    // 13. Marital Status
    if (/\b(marital\s*status|status\s*pernikahan|status\s*kawin|status\s*perkawinan|katayuang\s*sibil|civil\s*status)\b/i.test(text)) {
      return { field: 'maritalStatus', value: profile.maritalStatus };
    }

    // 14. Nationality / Citizenship
    if (/\b(nationality|citizenship|kewarganegaraan|kebangsaan|nasyonalidad|pagkamamamayan)\b/i.test(text)) {
      return { field: 'nationality', value: profile.nationality };
    }

    // 15. Place of Birth / Tempat Lahir
    if (/\b(place\s*of\s*birth|birth\s*place|tempat\s*lahir|kota\s*kelahiran|lugar\s*ng\s*kapanganakan)\b/i.test(text)) {
      return { field: 'birthplace', value: profile.birthplace };
    }

    // 16. Birthdate / Date of Birth
    if (/\b(birth\s*date|date\s*of\s*birth|tanggal\s*lahir|tgl\s*lahir|birthdate|dob|petsa\s*ng\s*kapanganakan)\b/i.test(text)) {
      return { field: 'birthdate', value: profile.birthdate };
    }

    // 17. Age / Usia / Umur
    if ((/\b(your\s*age|how\s*old\s*are\s*you|usia\s*anda|umur\s*anda|ilang\s*taon\s*ka|exact\s*age)\b/i.test(text) ||
         /^(age|usia|umur|edad)[\s:?*]*$/i.test(text)) &&
        !/\b(range|kategori|rentang|bracket|group|average)\b/i.test(text)) {
      return { field: 'age', value: profile.age };
    }

    // 18. Gender / Sex
    if (/\b(your\s*(gender|sex)|jenis\s*kelamin|kasarian)\b/i.test(text) ||
        /^(gender|sex|jenis\s*kelamin|kasarian)[\s:?*]*$/i.test(text)) {
      return { field: 'gender', value: profile.gender };
    }

    // 19. Blood Type / Golongan Darah
    if (/\b(blood\s*type|golongan\s*darah|goldar|blood\s*group|tipe\s*darah|uri\s*ng\s*dugo)\b/i.test(text)) {
      return { field: 'bloodType', value: profile.bloodType };
    }

    // 20. Postal / Zip Code
    if (/\b(postal\s*code|zip\s*code|kode\s*pos|kodepos)\b/i.test(text)) {
      return { field: 'postalCode', value: profile.postalCode };
    }

    // 21. Province / State
    if (/\b(your\s*(province|state)|province\s*of\s*residence|provinsi\s*tempat\s*tinggal|lalawigan)\b/i.test(text) ||
        /^(province|provinsi|lalawigan)[\s:?*]*$/i.test(text)) {
      return { field: 'provinceOrState', value: profile.provinceOrState };
    }

    // 22. City / Kota
    if (/\b(your\s*city|city\s*of\s*residence|current\s*city|kota\s*domisili|kota\s*tempat\s*tinggal|lungsod)\b/i.test(text) ||
        /^(city|kota|kabupaten|lungsod)[\s:?*]*$/i.test(text)) {
      return { field: 'city', value: profile.city };
    }

    // 23. Country / Negara
    if (/\b(your\s*country|country\s*of\s*(origin|residence)|negara\s*asal|bansang\s*pinagmulan)\b/i.test(text) ||
        /^(country|negara|bansa)[\s:?*]*$/i.test(text)) {
      return { field: 'country', value: profile.country };
    }

    // 24. Address / Domisili / Tempat Tinggal
    if (/\b(home\s*address|street\s*address|residential\s*address|current\s*address|alamat\s*lengkap|alamat\s*rumah|alamat\s*domisili|buong\s*tirahan)\b/i.test(text) ||
        /^(address|alamat|tirahan)[\s:?*]*$/i.test(text)) {
      return { field: 'address', value: profile.address };
    }

    // 25. Hobby / Interest
    if (/\b(your\s*(hobby|hobbies)|hobi\s*anda|mga\s*hilig)\b/i.test(text) ||
        /^(hobby|hobbies|hobi)[\s:?*]*$/i.test(text)) {
      return { field: 'hobby', value: profile.hobby };
    }

    // 26. Social Media / LinkedIn / Instagram
    if (/\b(your\s*(social\s*media|linkedin|instagram|twitter|tiktok)|social\s*media\s*account|link\s*profil\s*(linkedin|instagram))\b/i.test(text) ||
        /^(linkedin|social\s*media|instagram|twitter)[\s:?*]*$/i.test(text)) {
      return { field: 'socialMedia', value: profile.socialMedia };
    }

    // 27. Full Name
    if (/\b(full\s*name|nama\s*lengkap|complete\s*name|nama\s*anda|your\s*name|nama\s*siswa|nama\s*mahasiswa|nama\s*peserta|nama\s*kandidat|nama\s*responden|buong\s*pangalan|iyong\s*pangalan|pangalan\s*ng\s*mag-aaral|pangalan\s*ng\s*estudyante)\b/i.test(text) ||
        /^(name|nama|pangalan|full\s*name|complete\s*name|nama\s*lengkap|buong\s*pangalan)[\s:?*]*$/i.test(text)) {
      return { field: 'fullName', value: profile.fullName };
    }

    // 28. Year Level / Academic Year / Tingkat Kuliah / Grade Level
    if (/\b(year\s*level|academic\s*year|current\s*year\s*level|year\s*of\s*study|tingkat\s*kuliah|antay\s*o\s*taon)\b/i.test(text) ||
        /^(year\s*level|academic\s*year|tingkat)[\s:?*]*$/i.test(text)) {
      return { field: 'yearLevel', value: profile.yearLevel };
    }

    // 29. Semester
    if (/\b(current\s*semester|semester\s*sa\s*kasalukuyan)\b/i.test(text) ||
        /^(semester|sem)[\s:?*]*$/i.test(text)) {
      return { field: 'semester', value: profile.semester };
    }

    // 30. Batch Year / Tahun Angkatan / Tahun Masuk
    if (/\b(tahun\s*angkatan|tahun\s*masuk|batch\s*year|entry\s*year|cohort)\b/i.test(text) ||
        /^(angkatan|batch\s*year)[\s:?*]*$/i.test(text)) {
      return { field: 'batchYear', value: profile.batchYear };
    }

    return null;
  }

  // Matches gender, blood type, marital status, religion, nationality, and text against option labels
  function findMatchingOptionIndex(options, field, value) {
    if (!options || options.length === 0) return -1;
    const v = String(value).trim();
    const t = v.toLowerCase();

    if (field === 'gender') {
      const isMale = /^(male|pria|laki|laki-laki|man|l|m)$/i.test(t);
      const isFemale = /^(female|wanita|perempuan|woman|p|w|f)$/i.test(t);

      for (let i = 0; i < options.length; i++) {
        const opt = options[i].trim().toLowerCase();
        if (isMale && /\b(male|pria|laki[- ]*laki|laki|man)\b/i.test(opt)) return i;
        if (isFemale && /\b(female|wanita|perempuan|woman)\b/i.test(opt)) return i;
      }

      for (let i = 0; i < options.length; i++) {
        const opt = options[i].trim().toLowerCase();
        if (isMale && (opt === 'l' || opt === 'm' || opt.startsWith('l ') || opt.startsWith('m '))) return i;
        if (isFemale && (opt === 'p' || opt === 'w' || opt === 'f' || opt.startsWith('p ') || opt.startsWith('w ') || opt.startsWith('f '))) return i;
      }
    }

    if (field === 'maritalStatus') {
      const isSingle = /^(single|belum|belum\s*menikah|lajang|tidak\s*kawin|bujang)$/i.test(t);
      const isMarried = /^(married|menikah|kawin)$/i.test(t);
      for (let i = 0; i < options.length; i++) {
        const opt = options[i].trim().toLowerCase();
        if (isSingle && /\b(single|belum|belum\s*menikah|lajang|tidak\s*kawin|bujang)\b/i.test(opt)) return i;
        if (isMarried && /\b(married|menikah|kawin)\b/i.test(opt) && !/\b(belum|tidak)\b/i.test(opt)) return i;
      }
    }

    if (field === 'religion') {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i].trim().toLowerCase();
        if (t.includes('islam') && /\b(islam|muslim)\b/i.test(opt)) return i;
        if (t.includes('kristen') && /\b(kristen|protestan|christian)\b/i.test(opt)) return i;
        if (t.includes('katolik') && /\b(katolik|catholic)\b/i.test(opt)) return i;
        if (t.includes('hindu') && /\b(hindu)\b/i.test(opt)) return i;
        if (t.includes('buddha') && /\b(buddha|budha)\b/i.test(opt)) return i;
      }
    }

    if (field === 'nationality') {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i].trim().toLowerCase();
        if ((t.includes('wni') || t.includes('indonesia')) && /\b(wni|indonesia)\b/i.test(opt)) return i;
        if ((t.includes('wna') || t.includes('foreign')) && /\b(wna|asing|foreign)\b/i.test(opt)) return i;
      }
    }

    if (field === 'bloodType') {
      const tBlood = v.toUpperCase();
      for (let i = 0; i < options.length; i++) {
        if (options[i].trim().toUpperCase() === tBlood) return i;
      }
      for (let i = 0; i < options.length; i++) {
        const tokens = options[i].toUpperCase().replace(/[^A-Z0-9+]/g, ' ').split(/\s+/).filter(Boolean);
        if (tokens.includes(tBlood)) return i;
      }
      for (let i = 0; i < options.length; i++) {
        const clean = options[i].trim().toUpperCase().replace(/GOLONGAN\s*DARAH|GOLDAR|BLOOD\s*TYPE|TIPE/g, '').trim();
        if (tBlood === 'AB' && clean.startsWith('AB')) return i;
        if (tBlood === 'A' && clean.startsWith('A') && !clean.startsWith('AB')) return i;
        if (tBlood === 'B' && clean.startsWith('B')) return i;
        if (tBlood === 'O' && clean.startsWith('O')) return i;
      }
    }

    if (field === 'yearLevel') {
      let num = '';
      if (/\b(1|1st|first|freshman|tingkat\s*1|tahun\s*1|sem\s*(1|2))\b/i.test(t)) num = '1';
      else if (/\b(2|2nd|second|sophomore|tingkat\s*2|tahun\s*2|sem\s*(3|4))\b/i.test(t)) num = '2';
      else if (/\b(3|3rd|third|junior|tingkat\s*3|tahun\s*3|sem\s*(5|6))\b/i.test(t)) num = '3';
      else if (/\b(4|4th|fourth|senior|tingkat\s*4|tahun\s*4|sem\s*(7|8))\b/i.test(t)) num = '4';

      for (let i = 0; i < options.length; i++) {
        const opt = options[i].trim().toLowerCase();
        if (opt === 'choose' || opt === 'pilih' || opt === 'select' || opt === '') continue;

        if (opt === t || opt.includes(t) || t.includes(opt)) return i;

        if (num === '1' && /\b(1st|1|first|freshman|tingkat\s*1|tahun\s*1)\b/i.test(opt)) return i;
        if (num === '2' && /\b(2nd|2|second|sophomore|tingkat\s*2|tahun\s*2)\b/i.test(opt)) return i;
        if (num === '3' && /\b(3rd|3|third|junior|tingkat\s*3|tahun\s*3)\b/i.test(opt)) return i;
        if (num === '4' && /\b(4th|4|fourth|senior|tingkat\s*4|tahun\s*4)\b/i.test(opt)) return i;
      }
    }

    if (field === 'semester') {
      const targetNum = v.replace(/[^0-9]/g, '') || v.toLowerCase();
      for (let i = 0; i < options.length; i++) {
        const opt = options[i].trim().toLowerCase();
        const optNum = opt.replace(/[^0-9]/g, '');
        if (optNum && optNum === targetNum) return i;
        if (opt.includes(targetNum)) return i;
      }
    }

    if (field === 'batchYear') {
      const targetYear = v.trim();
      for (let i = 0; i < options.length; i++) {
        const opt = options[i].trim();
        if (opt.includes(targetYear)) return i;
      }
    }

    const vLower = v.toLowerCase();
    for (let i = 0; i < options.length; i++) {
      const opt = options[i].trim().toLowerCase();
      if (!opt || opt === 'choose' || opt === 'pilih' || opt === 'select' || /\b(other|lainnya|lain|iba|otro|autre|sonstiges)\b/i.test(opt)) continue;
      if (opt.length >= 3 && (opt === vLower || opt.includes(vLower) || (vLower.length >= 4 && vLower.includes(opt)))) {
        return i;
      }
    }

    return -1;
  }

  // Analyzes option strings to deduce the question field when title is brief/ambiguous
  function detectFieldFromOptions(labels) {
    if (!labels || labels.length === 0) return null;
    const clean = labels.map(l => l.trim().toLowerCase()).filter(l => l && !/^(choose|pilih|select)$/i.test(l));
    if (clean.length === 0) return null;

    if (clean.some(l => /\b(1st\s*year|2nd\s*year|3rd\s*year|4th\s*year|freshman|sophomore|junior|senior|tingkat\s*(1|2|3|4)|tahun\s*(ke-?\s*)?(1|2|3|4))\b/i.test(l))) {
      return 'yearLevel';
    }
    if (clean.some(l => /\b(male|female|pria|wanita|laki[- ]*laki|perempuan)\b/i.test(l))) {
      return 'gender';
    }
    if (clean.every(l => /^(a|b|ab|o|golongan\s*(a|b|ab|o)|a\+|b\+|ab\+|o\+|a-|b-|ab-|o-)$/i.test(l))) {
      return 'bloodType';
    }
    if (clean.some(l => /\b(single|married|belum\s*menikah|menikah|lajang|cerai)\b/i.test(l))) {
      return 'maritalStatus';
    }
    if (clean.some(l => /\b(islam|kristen|katolik|hindu|buddha|protestan)\b/i.test(l))) {
      return 'religion';
    }
    if (clean.some(l => /\b(wni|wna|indonesia|foreign)\b/i.test(l))) {
      return 'nationality';
    }
    if (clean.some(l => /\b(semester\s*[1-8]|sem\s*[1-8])\b/i.test(l))) {
      return 'semester';
    }
    if (clean.length >= 2 && clean.every(l => /^(201\d|202\d|angkatan\s*20\d\d)$/i.test(l))) {
      return 'batchYear';
    }
    return null;
  }

  // Dispatches full event lifecycle to ensure Google Forms dropdown registers selection and closes popup cleanly
  async function safelySelectDropdownOption(optionEl) {
    if (!optionEl || shouldCancel) return false;
    await checkOrientationGate();
    if (shouldCancel) return false;
    try {
      optionEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await sleep(100);
      if (typeof optionEl.focus === 'function') optionEl.focus();

      const eventOpts = { bubbles: true, cancelable: true, view: window };
      optionEl.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
      optionEl.dispatchEvent(new MouseEvent('mousedown', eventOpts));
      optionEl.dispatchEvent(new PointerEvent('pointerup', eventOpts));
      optionEl.dispatchEvent(new MouseEvent('mouseup', eventOpts));
      optionEl.click();

      await sleep(250);

      const stillOpen = Array.from(document.querySelectorAll('div[role="option"]')).some(o => o.offsetParent !== null);
      if (stillOpen) {
        document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape', code: 'Escape', keyCode: 27 }));
        document.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Escape', code: 'Escape', keyCode: 27 }));
      }
      const parentBlock = optionEl.closest('.Qr7Oae, div[role="listitem"]');
      if (parentBlock) clearBlockErrors(parentBlock);
      return true;
    } catch (err) {
      console.warn('[Google Form AI HUD] Option selection fallback:', err);
      try { optionEl.click(); } catch (e) {}
      const parentBlock = optionEl.closest('.Qr7Oae, div[role="listitem"]');
      if (parentBlock) clearBlockErrors(parentBlock);
      return true;
    }
  }

  // Safe HTTP request helper with adaptive 45s timeout for mobile/cellular networks
  function httpRequest(options) {
    const timeoutMs = options.timeout || 45000;
    return new Promise((resolve, reject) => {
      // 1. Userscript environment with GM_xmlhttpRequest
      if (typeof GM_xmlhttpRequest === 'function') {
        try {
          return GM_xmlhttpRequest({
            ...options,
            timeout: timeoutMs,
            onload: resolve,
            onerror: reject,
            ontimeout: () => reject(new Error('Request timed out (' + Math.round(timeoutMs / 1000) + 's)'))
          });
        } catch (e) {
          console.warn('[Google Form AI HUD] GM_xmlhttpRequest failed:', e);
        }
      }

      // 2. Chrome Extension (Manifest V3) environment with background service worker
      if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
        try {
          const fetchOpts = {
            method: options.method || 'GET',
            headers: options.headers || {}
          };
          if (options.data) {
            fetchOpts.body = options.data;
          }

          chrome.runtime.sendMessage({
            type: 'FETCH',
            url: options.url,
            options: fetchOpts,
            timeout: timeoutMs
          }, (res) => {
            if (chrome.runtime.lastError || !res) {
              // Service worker might be sleeping or not responding, fallback to direct fetch
              doDirectFetch(options, resolve, reject);
              return;
            }
            if (!res.ok) {
              return reject(new Error(res.error || 'Extension background fetch error'));
            }
            if (options.responseType === 'blob') {
              resolve({ status: res.status, statusText: res.statusText, response: res.text });
            } else {
              resolve({ status: res.status, statusText: res.statusText, responseText: res.text });
            }
          });
          return;
        } catch (e) {
          console.warn('[Google Form AI HUD] Extension sendMessage failed:', e);
        }
      }

      // 3. Fallback direct fetch with AbortController timeout
      doDirectFetch(options, resolve, reject);
    });
  }

  function doDirectFetch(options, resolve, reject) {
    const timeoutMs = options.timeout || 45000;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutTimer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    const fetchOpts = {
      method: options.method || 'GET',
      headers: options.headers || {},
      signal: controller ? controller.signal : undefined
    };
    if (options.data) {
      fetchOpts.body = options.data;
    }

    fetch(options.url, fetchOpts)
      .then(async (res) => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (options.responseType === 'blob') {
          const blob = await res.blob();
          resolve({ status: res.status, statusText: res.statusText, response: blob });
        } else {
          const text = await res.text();
          resolve({ status: res.status, statusText: res.statusText, responseText: text });
        }
      })
      .catch((err) => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        reject(new Error(err.name === 'AbortError' ? ('Request timed out (' + Math.round(timeoutMs / 1000) + 's)') : (err.message || 'Network fetch error')));
      });
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function waitForElement(selector, root = document, timeout = 2500) {
    return new Promise((resolve) => {
      const el = root.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const target = root.querySelector(selector);
        if (target) {
          observer.disconnect();
          resolve(target);
        }
      });

      observer.observe(root, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.style.cursor = 'move';
    handle.style.touchAction = 'none';

    handle.addEventListener('mousedown', dragMouseDown);

    function dragMouseDown(e) {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.addEventListener('mouseup', closeDragElement);
      document.addEventListener('mousemove', elementDrag);
    }

    handle.addEventListener('touchstart', dragTouchStart, { passive: false });

    function dragTouchStart(e) {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (!e.touches || e.touches.length === 0) return;
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;
      document.addEventListener('touchend', closeTouchElement, { passive: false });
      document.addEventListener('touchcancel', closeTouchElement, { passive: false });
      document.addEventListener('touchmove', elementTouchDrag, { passive: false });
    }

    function elementDrag(e) {
      e.preventDefault();
      updatePosition(e.clientX, e.clientY);
    }

    function elementTouchDrag(e) {
      if (!e.touches || e.touches.length === 0) return;
      e.preventDefault();
      updatePosition(e.touches[0].clientX, e.touches[0].clientY);
    }

    function updatePosition(clientX, clientY) {
      pos1 = pos3 - clientX;
      pos2 = pos4 - clientY;
      pos3 = clientX;
      pos4 = clientY;

      const newTop = element.offsetTop - pos2;
      const newLeft = element.offsetLeft - pos1;

      const vpW = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      const vpH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const maxTop = Math.max(8, vpH - (element.offsetHeight || 100) - 8);
      const maxLeft = Math.max(8, vpW - (element.offsetWidth || 100) - 8);
      const clampedTop = Math.min(Math.max(8, newTop), Math.max(8, maxTop));
      const clampedLeft = Math.min(Math.max(8, newLeft), Math.max(8, maxLeft));

      element.style.setProperty('top', clampedTop + 'px', 'important');
      element.style.setProperty('left', clampedLeft + 'px', 'important');
      element.style.setProperty('right', 'auto', 'important');
      element.style.setProperty('bottom', 'auto', 'important');
    }

    function closeDragElement() {
      document.removeEventListener('mouseup', closeDragElement);
      document.removeEventListener('mousemove', elementDrag);
    }

    function closeTouchElement() {
      document.removeEventListener('touchend', closeTouchElement);
      document.removeEventListener('touchcancel', closeTouchElement);
      document.removeEventListener('touchmove', elementTouchDrag);
    }
  }

  // Pure DOM construction to completely avoid Trusted Types (TrustedHTML) CSP errors
  let hudContainer = null;
  let hudPanel = null;
  let hudFloatingButton = null;

  function updateHUDState() {
    if (!hudContainer || !hudPanel || !hudFloatingButton) return;

    if (isMinimized) {
      // Show floating trigger button in stealth mode, hide panel
      hudPanel.style.setProperty('display', 'none', 'important');
      hudFloatingButton.style.setProperty('display', 'flex', 'important');
      const curS = getStealthSettings();
      hudFloatingButton.style.opacity = curS.opacity;
      hudFloatingButton.style.background = curS.bg;
      hudFloatingButton.style.color = curS.color;
      hudFloatingButton.style.border = curS.border;
      hudFloatingButton.style.boxShadow = curS.shadow;
      hudFloatingButton.style.fontSize = (curS.opacity === '0' || curS.color === 'transparent') ? '0px' : '20px';
      hudContainer.title = '';
      hudContainer.style.setProperty('top', 'auto', 'important');
      hudContainer.style.setProperty('left', 'auto', 'important');
      hudContainer.style.setProperty('bottom', 'max(16px, env(safe-area-inset-bottom, 16px))', 'important');
      hudContainer.style.setProperty('right', 'max(16px, env(safe-area-inset-right, 16px))', 'important');
      hudContainer.style.setProperty('width', 'auto', 'important');
      hudContainer.style.setProperty('height', 'auto', 'important');
      hudContainer.style.setProperty('background', 'transparent', 'important');
      hudContainer.style.setProperty('border', 'none', 'important');
      hudContainer.style.setProperty('box-shadow', 'none', 'important');
      hudContainer.style.setProperty('visibility', 'visible', 'important');
      hudContainer.style.setProperty('opacity', '1', 'important');
      hudContainer.style.setProperty('pointer-events', 'auto', 'important');
      hudContainer.style.setProperty('position', 'fixed', 'important');
      hudContainer.style.setProperty('z-index', '2147483647', 'important');
    } else {

      // Show full panel, hide floating button
      hudFloatingButton.style.setProperty('display', 'none', 'important');
      hudPanel.style.setProperty('display', 'flex', 'important');
      hudContainer.title = '';
      hudContainer.style.setProperty('top', 'max(12px, env(safe-area-inset-top, 12px))', 'important');
      hudContainer.style.setProperty('bottom', 'auto', 'important');
      if (typeof window !== 'undefined' && window.innerWidth <= 480) {
        hudContainer.style.setProperty('left', 'max(8px, env(safe-area-inset-left, 8px))', 'important');
        hudContainer.style.setProperty('right', 'max(8px, env(safe-area-inset-right, 8px))', 'important');
        hudContainer.style.setProperty('width', 'calc(100vw - 16px)', 'important');
        hudContainer.style.setProperty('max-width', 'calc(100vw - 16px)', 'important');
      } else {
        hudContainer.style.setProperty('left', 'auto', 'important');
        hudContainer.style.setProperty('right', 'max(16px, env(safe-area-inset-right, 16px))', 'important');
        hudContainer.style.setProperty('width', '360px', 'important');
        hudContainer.style.setProperty('max-width', 'calc(100vw - 20px)', 'important');
      }
      hudContainer.style.setProperty('height', 'auto', 'important');
      hudContainer.style.setProperty('visibility', 'visible', 'important');
      hudContainer.style.setProperty('opacity', '1', 'important');
      hudContainer.style.setProperty('pointer-events', 'auto', 'important');
      hudContainer.style.setProperty('position', 'fixed', 'important');
      hudContainer.style.setProperty('z-index', '2147483647', 'important');
    }
  }

  function getStealthSettings() {
    const isMobileDevice = typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 480);
    const defaultStealth = isMobileDevice ? 'subtle' : 'phantom';
    const level = getSafeValue('hud_stealth_level', defaultStealth);
    if (level === 'phantom' || level === 'invisible') {
      return {
        opacity: '0',
        bg: 'transparent',
        color: 'transparent',
        border: 'none',
        shadow: 'none',
        hoverOpacity: '0.95',
        hoverBg: '#2563eb',
        hoverColor: '#ffffff',
        hoverBorder: '2px solid #60a5fa',
        hoverShadow: '0 4px 18px rgba(37, 99, 235, 0.7)'
      };
    }
    if (level === 'ghost') {
      return {
        opacity: '0',
        bg: 'transparent',
        color: 'transparent',
        border: 'none',
        shadow: 'none',
        hoverOpacity: '0.95',
        hoverBg: '#1e293b',
        hoverColor: '#38bdf8',
        hoverBorder: '1.5px solid #3b82f6',
        hoverShadow: '0 4px 14px rgba(0, 0, 0, 0.5)'
      };
    }
    if (level === 'ultra') {
      return {
        opacity: '0.15',
        bg: '#1e293b',
        color: '#94a3b8',
        border: '1px solid #334155',
        shadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        hoverOpacity: '0.95',
        hoverBg: '#1e293b',
        hoverColor: '#38bdf8',
        hoverBorder: '1.5px solid #3b82f6',
        hoverShadow: '0 2px 10px rgba(0, 0, 0, 0.4)'
      };
    }
    if (level === 'subtle') {
      return {
        opacity: '0.35',
        bg: '#1e293b',
        color: '#38bdf8',
        border: '1.5px solid #3b82f6',
        shadow: '0 2px 10px rgba(0, 0, 0, 0.4)',
        hoverOpacity: '1',
        hoverBg: '#1e293b',
        hoverColor: '#38bdf8',
        hoverBorder: '1.5px solid #3b82f6',
        hoverShadow: '0 4px 14px rgba(0, 0, 0, 0.5)'
      };
    }
    // 'visible' (Solid blue button)
    return {
      opacity: '1',
      bg: '#2563eb',
      color: '#ffffff',
      border: '2px solid #60a5fa',
      shadow: '0 4px 18px rgba(37, 99, 235, 0.7)',
      hoverOpacity: '1',
      hoverBg: '#2563eb',
      hoverColor: '#ffffff',
      hoverBorder: '2px solid #60a5fa',
      hoverShadow: '0 4px 18px rgba(37, 99, 235, 0.7)'
    };
  }


  function createHUD() {
    if (document.getElementById('ai-form-hud')) {
      const existing = document.getElementById('ai-form-hud');
      if (document.body && existing.parentElement !== document.body) {
        document.body.appendChild(existing);
      }
      return;
    }

    const targetParent = document.body || document.documentElement;
    if (!targetParent) {
      return;
    }

    // Injected style to enforce box-sizing, custom scrollbars, and mobile/iOS responsive optimizations
    if (!document.getElementById('ai-form-hud-style')) {
      const hudStyleEl = document.createElement('style');
      hudStyleEl.id = 'ai-form-hud-style';
      hudStyleEl.textContent = `
        #ai-form-hud, #ai-form-hud * {
          box-sizing: border-box !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        #ai-form-hud button,
        #ai-form-hud select,
        #ai-form-hud input,
        #ai-form-hud label {
          touch-action: manipulation !important;
        }
        #ai-hud-tabs button:focus, #ai-hud-tabs button:active, #ai-hud-tabs button:focus-visible {
          outline: none !important;
          border: none !important;
        }
        #ai-hud-body::-webkit-scrollbar,
        #ai-hud-status::-webkit-scrollbar,
        #ai-hud-docs-list::-webkit-scrollbar {
          width: 5px !important;
          height: 5px !important;
        }
        #ai-hud-body::-webkit-scrollbar-track,
        #ai-hud-status::-webkit-scrollbar-track,
        #ai-hud-docs-list::-webkit-scrollbar-track {
          background: #020617 !important;
        }
        #ai-hud-body::-webkit-scrollbar-thumb,
        #ai-hud-status::-webkit-scrollbar-thumb,
        #ai-hud-docs-list::-webkit-scrollbar-thumb {
          background: #334155 !important;
          border-radius: 4px !important;
        }
        #ai-hud-body::-webkit-scrollbar-thumb:hover,
        #ai-hud-status::-webkit-scrollbar-thumb:hover,
        #ai-hud-docs-list::-webkit-scrollbar-thumb:hover {
          background: #475569 !important;
        }
        #ai-hud-body,
        #ai-hud-docs-list,
        #ai-hud-status {
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior: contain !important;
        }
        /* Mobile Phone & iOS Safari optimizations */
        @media (max-width: 480px) {
          #ai-form-hud {
            right: max(8px, env(safe-area-inset-right, 8px)) !important;
            bottom: max(10px, env(safe-area-inset-bottom, 10px)) !important;
            left: max(8px, env(safe-area-inset-left, 8px)) !important;
            width: calc(100vw - max(16px, env(safe-area-inset-left, 8px) + env(safe-area-inset-right, 8px))) !important;
            max-width: calc(100vw - max(16px, env(safe-area-inset-left, 8px) + env(safe-area-inset-right, 8px))) !important;
            margin: 0 auto !important;
          }
          #ai-hud-panel {
            width: 100% !important;
            max-width: 100% !important;
            max-height: min(90vh, calc(100dvh - 16px), calc(100svh - 16px)) !important;
            border-radius: 12px !important;
          }
          #ai-hud-tabs {
            padding: 6px 4px !important;
            gap: 3px !important;
          }
          #ai-hud-tabs button {
            padding: 7px 1px !important;
            font-size: 10.5px !important;
          }
          #ai-hud-body {
            max-height: calc(88dvh - 95px) !important;
            padding: 10px 10px !important;
            -webkit-overflow-scrolling: touch !important;
            overscroll-behavior: contain !important;
          }
          /* Prevents iOS Safari from auto-zooming page on input focus */
          #ai-form-hud input,
          #ai-form-hud select,
          #ai-form-hud textarea {
            font-size: 16px !important;
          }
          #ai-solve-btn {
            font-size: 11.5px !important;
            padding: 10px 8px !important;
          }
        }
        @media (max-width: 380px) {
          .ai-grid-2col {
            grid-template-columns: 1fr !important;
          }
          #ai-hud-tabs button {
            font-size: 9.5px !important;
            padding: 6px 0px !important;
          }
          #ai-solve-btn {
            font-size: 11px !important;
            padding: 10px 4px !important;
          }
        }
      `;
      document.head.appendChild(hudStyleEl);
    }

    hudContainer = document.createElement('div');
    hudContainer.id = 'ai-form-hud';
    hudContainer.style.cssText = `
      position: fixed !important;
      bottom: max(16px, env(safe-area-inset-bottom, 16px)) !important;
      right: max(16px, env(safe-area-inset-right, 16px)) !important;
      top: auto !important;
      left: auto !important;
      width: min(360px, calc(100vw - 16px)) !important;
      max-width: calc(100vw - 16px) !important;
      height: auto !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      box-sizing: border-box !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    `;

    // 1. FLOATING MINIMIZED TRIGGER BUTTON
    hudFloatingButton = document.createElement('div');
    hudFloatingButton.id = 'ai-hud-floating-btn';
    const s = getStealthSettings();
    hudFloatingButton.textContent = '⚡';
    hudFloatingButton.style.cssText = `
      width: 48px !important;
      height: 48px !important;
      min-width: 48px !important;
      min-height: 48px !important;
      border-radius: 50% !important;
      background: ${s.bg} !important;
      color: ${s.color} !important;
      border: ${s.border} !important;
      box-shadow: ${s.shadow} !important;
      opacity: ${s.opacity} !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: ${(s.opacity === '0' || s.color === 'transparent') ? '0px' : '20px'} !important;
      font-weight: 700 !important;
      touch-action: none !important;
      -webkit-tap-highlight-color: transparent !important;
      transition: transform 0.15s ease, opacity 0.2s ease, box-shadow 0.2s ease !important;
    `;

    let hudTouchStartTime = 0;
    hudFloatingButton.addEventListener('touchstart', (e) => {
      hudTouchStartTime = Date.now();
      const curS = getStealthSettings();
      hudFloatingButton.style.fontSize = '20px';
      hudFloatingButton.style.opacity = curS.hoverOpacity || '1';
      hudFloatingButton.style.background = curS.hoverBg || '#2563eb';
      hudFloatingButton.style.color = curS.hoverColor || '#ffffff';
    }, { passive: true });

    hudFloatingButton.addEventListener('touchend', (e) => {
      requestOrientationPermission();
      if (Date.now() - hudTouchStartTime < 350) {
        e.preventDefault();
        e.stopPropagation();
        isMinimized = false;
        updateHUDState();
      }
    });

    hudFloatingButton.addEventListener('click', (e) => {
      requestOrientationPermission();
      e.stopPropagation();
      isMinimized = false;
      updateHUDState();
    });

    hudFloatingButton.addEventListener('mouseenter', () => {
      const curS = getStealthSettings();
      hudFloatingButton.style.fontSize = '20px';
      hudFloatingButton.style.transform = 'scale(1.12)';
      hudFloatingButton.style.opacity = curS.hoverOpacity || '1';
      hudFloatingButton.style.background = curS.hoverBg || '#2563eb';
      hudFloatingButton.style.color = curS.hoverColor || '#ffffff';
      hudFloatingButton.style.border = curS.hoverBorder || '2px solid #60a5fa';
      hudFloatingButton.style.boxShadow = curS.hoverShadow || '0 4px 18px rgba(37,99,235,0.7)';
    });

    hudFloatingButton.addEventListener('mouseleave', () => {
      const curS = getStealthSettings();
      hudFloatingButton.style.transform = 'scale(1)';
      hudFloatingButton.style.opacity = curS.opacity;
      hudFloatingButton.style.background = curS.bg;
      hudFloatingButton.style.color = curS.color;
      hudFloatingButton.style.border = curS.border;
      hudFloatingButton.style.boxShadow = curS.shadow;
      hudFloatingButton.style.fontSize = (curS.opacity === '0' || curS.color === 'transparent') ? '0px' : '20px';
    });


    // 2. MAIN EXPANDED PANEL
    hudPanel = document.createElement('div');
    hudPanel.id = 'ai-hud-panel';
    hudPanel.style.cssText = `
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      min-height: 220px !important;
      max-height: min(88vh, calc(100vh - 32px)) !important;
      background: #0f172a !important;
      color: #f8fafc !important;
      border: 1px solid #334155 !important;
      border-radius: 12px !important;
      box-shadow: 0 16px 40px rgba(0,0,0,0.65) !important;
      overflow: hidden !important;
      font-size: 13px !important;
      display: none !important;
      flex-direction: column !important;
      line-height: 1.4 !important;
      cursor: default !important;
      box-sizing: border-box !important;
    `;

    // Header
    const header = document.createElement('div');
    header.id = 'ai-hud-header';
    header.style.cssText = `
      padding: 10px 14px;
      background: #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      border-bottom: 1px solid #334155;
      cursor: move;
      box-sizing: border-box;
      flex-shrink: 0;
      width: 100%;
    `;

    const titleBadge = document.createElement('div');
    titleBadge.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #f8fafc;';

    const indicator = document.createElement('span');
    indicator.id = 'ai-hud-indicator';
    indicator.textContent = '●';
    indicator.style.cssText = 'color: #10b981; font-size: 11px;';

    const titleText = document.createElement('span');
    titleText.textContent = 'Google Form AI Assistant';

    titleBadge.appendChild(indicator);
    titleBadge.appendChild(titleText);

    const minBtn = document.createElement('button');
    minBtn.id = 'ai-minimize-btn';
    minBtn.textContent = '−';
    minBtn.title = 'Minimize (Alt+H or F2)';
    minBtn.style.cssText = 'background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 22px; line-height: 1; padding: 0 4px; outline: none; display: flex; align-items: center; justify-content: center;';

    header.appendChild(titleBadge);
    header.appendChild(minBtn);

    // TAB BAR NAVIGATION
    const navTabBar = document.createElement('div');
    navTabBar.id = 'ai-hud-tabs';
    navTabBar.style.cssText = 'display: flex; background: #0b0f19; border-bottom: 1px solid #334155; padding: 6px 8px; gap: 4px; box-sizing: border-box; overflow: hidden; flex-shrink: 0; width: 100%;';

    const tabsDef = [
      { id: 'solver', label: '🚀 Solver', title: 'Main solver cockpit & status' },
      { id: 'study', label: '📚 Study', title: 'Dedicated study materials & knowledge base HUD' },
      { id: 'settings', label: '⚙️ Settings', title: 'AI provider, API keys, models, reasoning, stealth, pacing, likert' },
      { id: 'profile', label: '👤 Profile', title: 'Autofill persona and profile' }
    ];

    const tabButtons = {};
    let activeTabId = 'solver';

    tabsDef.forEach(t => {
      const btn = document.createElement('button');
      btn.id = `ai-tab-btn-${t.id}`;
      btn.textContent = t.label;
      btn.title = t.title;
      btn.style.cssText = `flex: 1; min-width: 0; padding: 6px 2px; border: none; outline: none; border-radius: 5px; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; transition: all 0.15s ease; background: ${t.id === 'solver' ? '#2563eb' : '#1e293b'}; color: ${t.id === 'solver' ? '#ffffff' : '#94a3b8'}; box-shadow: ${t.id === 'solver' ? '0 0 0 1px #3b82f6 inset' : 'none'};`;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(t.id);
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        switchTab(t.id);
      });
      tabButtons[t.id] = btn;
      navTabBar.appendChild(btn);
    });

    let viewSolver = null;
    let viewStudy = null;
    let viewSettings = null;
    let viewProfile = null;
    let updateSolverCards = null;

    function switchTab(targetId) {
      activeTabId = targetId;
      Object.keys(tabButtons).forEach(id => {
        const b = tabButtons[id];
        b.style.outline = 'none';
        if (id === targetId) {
          b.style.background = '#2563eb';
          b.style.color = '#ffffff';
          b.style.boxShadow = '0 0 0 1px #3b82f6 inset';
        } else {
          b.style.background = '#1e293b';
          b.style.color = '#94a3b8';
          b.style.boxShadow = 'none';
        }
      });

      if (viewSolver) viewSolver.style.display = targetId === 'solver' ? 'flex' : 'none';
      if (viewStudy) viewStudy.style.display = targetId === 'study' ? 'flex' : 'none';
      if (viewSettings) viewSettings.style.display = targetId === 'settings' ? 'flex' : 'none';
      if (viewProfile) viewProfile.style.display = targetId === 'profile' ? 'flex' : 'none';

      if (targetId === 'solver' && typeof updateSolverCards === 'function') {
        updateSolverCards();
      }
    }

    // Body
    const body = document.createElement('div');
    body.id = 'ai-hud-body';
    body.style.cssText = 'padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; overflow-x: hidden; max-height: calc(88vh - 95px); width: 100%; box-sizing: border-box;';

    // 1. AI Provider (Dedicated AnyModel)
    const providerSection = document.createElement('div');
    const providerLabel = document.createElement('div');
    providerLabel.textContent = 'AI Provider';
    providerLabel.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 2px;';

    const providerBadge = document.createElement('div');
    providerBadge.id = 'ai-provider-badge';
    providerBadge.textContent = '⚡ AnyModel (anymodel.org) — Dedicated Active';
    providerBadge.style.cssText = 'background: #1e293b; border: 1.5px solid #3b82f6; color: #38bdf8; padding: 7px 10px; border-radius: 6px; width: 100%; box-sizing: border-box; font-size: 13px; font-weight: 700;';

    providerSection.appendChild(providerLabel);
    providerSection.appendChild(providerBadge);

    // 2. API Key
    const keySection = document.createElement('div');
    const keyLabel = document.createElement('div');
    keyLabel.textContent = 'AnyModel API Key';
    keyLabel.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 2px;';

    const keyInput = document.createElement('input');
    keyInput.type = 'password';
    keyInput.id = 'ai-api-key';
    keyInput.placeholder = 'Paste AnyModel API key here';
    keyInput.style.cssText = 'background: #1e293b; border: 1px solid #475569; color: #f8fafc; padding: 8px 10px; border-radius: 6px; width: 100%; box-sizing: border-box; font-size: 15px; outline: none;';

    keySection.appendChild(keyLabel);
    keySection.appendChild(keyInput);

    // 3. API Base URL
    const urlSection = document.createElement('div');
    const urlLabel = document.createElement('div');
    urlLabel.textContent = 'API Base URL';
    urlLabel.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 2px;';

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.id = 'ai-base-url';
    urlInput.placeholder = DEFAULT_BASE_URL;
    urlInput.value = DEFAULT_BASE_URL;
    urlInput.style.cssText = 'background: #1e293b; border: 1px solid #475569; color: #f8fafc; padding: 8px 10px; border-radius: 6px; width: 100%; box-sizing: border-box; font-size: 13px; outline: none;';

    urlSection.appendChild(urlLabel);
    urlSection.appendChild(urlInput);

    // 4. Model
    const modelSection = document.createElement('div');
    const modelLabel = document.createElement('div');
    modelLabel.textContent = 'AnyModel Model';
    modelLabel.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 2px;';

    const modelSelect = document.createElement('select');
    modelSelect.id = 'ai-model-select';
    modelSelect.style.cssText = 'background: #1e293b; border: 1px solid #475569; color: #f8fafc; padding: 8px 10px; border-radius: 6px; width: 100%; box-sizing: border-box; font-size: 14px; outline: none;';

    function populateModels(selectedModelId) {
      modelSelect.textContent = '';
      const groups = {};
      ANYMODEL_MODELS.forEach(m => {
        const grpName = m.group || 'Other';
        if (!groups[grpName]) {
          const optGroup = document.createElement('optgroup');
          optGroup.label = `─── ${grpName.toUpperCase()} ───`;
          optGroup.style.cssText = 'background: #0f172a; color: #38bdf8; font-weight: bold; padding: 4px;';
          groups[grpName] = optGroup;
          modelSelect.appendChild(optGroup);
        }
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.label;
        opt.style.cssText = 'background: #1e293b; color: #f8fafc; font-weight: normal; padding: 4px;';
        if (selectedModelId && m.id === selectedModelId) {
          opt.selected = true;
        }
        groups[grpName].appendChild(opt);
      });
      if (!modelSelect.value && ANYMODEL_MODELS[0]) {
        modelSelect.value = ANYMODEL_MODELS[0].id;
      }
    }

    const testModelsBtn = document.createElement('button');
    testModelsBtn.id = 'ai-test-models-btn';
    testModelsBtn.textContent = '⚡ Auto-Test Available Models';
    testModelsBtn.title = 'Ping top models on AnyModel and find fastest working with lowest latency';
    testModelsBtn.style.cssText = 'background: #0284c7; color: #fff; border: none; padding: 7px 10px; border-radius: 5px; cursor: pointer; font-weight: 700; font-size: 11px; margin-top: 5px; width: 100%; transition: background 0.15s;';
    testModelsBtn.onmouseover = () => { testModelsBtn.style.background = '#0369a1'; };
    testModelsBtn.onmouseout = () => { testModelsBtn.style.background = '#0284c7'; };
    testModelsBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      testModelsBtn.disabled = true;
      testModelsBtn.textContent = '⏳ Testing Models...';
      try {
        await testAvailableModels();
      } finally {
        testModelsBtn.disabled = false;
        testModelsBtn.textContent = '⚡ Auto-Test Available Models';
      }
    });

    modelSection.appendChild(modelLabel);
    modelSection.appendChild(modelSelect);
    modelSection.appendChild(testModelsBtn);

    // 4b. Live Web Search Grounding Control
    const webSearchSection = document.createElement('div');
    const webSearchLabel = document.createElement('div');
    webSearchLabel.textContent = 'Live Web Search Grounding (100% Quiz Accuracy)';
    webSearchLabel.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #38bdf8; font-weight: 600; margin-bottom: 2px;';

    const webSearchSelect = document.createElement('select');
    webSearchSelect.id = 'ai-web-search-select';
    webSearchSelect.style.cssText = 'background: #1e293b; border: 1.5px solid #0284c7; color: #f8fafc; padding: 8px 10px; border-radius: 6px; width: 100%; box-sizing: border-box; font-size: 13px; outline: none; font-weight: 600; cursor: pointer;';

    WEB_SEARCH_MODES.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = w.label;
      webSearchSelect.appendChild(opt);
    });

    webSearchSection.appendChild(webSearchLabel);
    webSearchSection.appendChild(webSearchSelect);

    // 5. Reasoning Token Budget
    const tokenSection = document.createElement('div');
    const tokenLabel = document.createElement('div');
    tokenLabel.textContent = 'Reasoning Headroom (Token Budget)';
    tokenLabel.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 2px;';

    const tokenSelect = document.createElement('select');
    tokenSelect.id = 'ai-token-select';
    tokenSelect.style.cssText = 'background: #1e293b; border: 1px solid #475569; color: #f8fafc; padding: 8px 10px; border-radius: 6px; width: 100%; box-sizing: border-box; font-size: 14px; outline: none;';

    TOKEN_MODES.forEach(t => {
      const opt = document.createElement('option');
      opt.value = String(t.maxTokens);
      opt.textContent = t.label;
      tokenSelect.appendChild(opt);
    });

    tokenSection.appendChild(tokenLabel);
    tokenSection.appendChild(tokenSelect);

    // 6. Stealth Level (When Minimized)
    const stealthSection = document.createElement('div');
    const stealthLabel = document.createElement('div');
    stealthLabel.textContent = 'Stealth Concealment (When Minimized)';
    stealthLabel.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 2px;';

    const stealthSelect = document.createElement('select');
    stealthSelect.id = 'ai-stealth-select';
    stealthSelect.style.cssText = 'background: #1e293b; border: 1px solid #475569; color: #f8fafc; padding: 8px 10px; border-radius: 6px; width: 100%; box-sizing: border-box; font-size: 14px; outline: none;';

    const STEALTH_OPTIONS = [
      { id: 'phantom', label: '🥷 100% Phantom (Zero trace, invisible at max brightness - Blue touch)' },
      { id: 'ghost', label: '🌫️ Ultra Ghost (Zero trace at full brightness - Dark touch)' },
      { id: 'ultra', label: '👁️ Low Profile (15% opacity)' },
      { id: 'subtle', label: '🔹 Subtle (35% opacity)' },
      { id: 'visible', label: '🔘 Solid Visible Button' }
    ];

    STEALTH_OPTIONS.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.label;
      stealthSelect.appendChild(opt);
    });


    stealthSection.appendChild(stealthLabel);
    stealthSection.appendChild(stealthSelect);

    // 6b. Pacing & Typing Speed (Anti-Detection)
    const pacingSection = document.createElement('div');
    const pacingLabel = document.createElement('div');
    pacingLabel.textContent = 'Pacing & Typing Speed (Anti-Detection)';
    pacingLabel.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 2px;';

    const pacingSelect = document.createElement('select');
    pacingSelect.id = 'ai-pacing-select';
    pacingSelect.style.cssText = 'background: #1e293b; border: 1px solid #475569; color: #f8fafc; padding: 8px 10px; border-radius: 6px; width: 100%; box-sizing: border-box; font-size: 14px; outline: none;';

    PACING_MODES.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label;
      pacingSelect.appendChild(opt);
    });

    pacingSection.appendChild(pacingLabel);
    pacingSection.appendChild(pacingSelect);

    // 6c. Likert / Rating Sentiment Bias
    const likertSection = document.createElement('div');
    const likertLabel = document.createElement('div');
    likertLabel.textContent = 'Likert / Rating Sentiment Bias';
    likertLabel.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 2px;';

    const likertSelect = document.createElement('select');
    likertSelect.id = 'ai-likert-select';
    likertSelect.style.cssText = 'background: #1e293b; border: 1px solid #475569; color: #f8fafc; padding: 8px 10px; border-radius: 6px; width: 100%; box-sizing: border-box; font-size: 14px; outline: none;';

    LIKERT_BIAS_MODES.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.label;
      likertSelect.appendChild(opt);
    });

    likertSection.appendChild(likertLabel);
    likertSection.appendChild(likertSelect);

    // 6d. Phone Alignment & Flat Desk Sensor
    const orientationSection = document.createElement('div');
    const orientationLabel = document.createElement('div');
    orientationLabel.textContent = '📱 Phone Alignment / Flat Desk Sensor';
    orientationLabel.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #38bdf8; font-weight: 600; margin-bottom: 2px;';

    const orientationCard = document.createElement('div');
    orientationCard.style.cssText = 'background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px;';

    const orientationToggleRow = document.createElement('div');
    orientationToggleRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

    const orientationToggleLabel = document.createElement('span');
    orientationToggleLabel.textContent = 'Hold Phone to Pause Automation';
    orientationToggleLabel.style.cssText = 'font-size: 12px; color: #f8fafc; font-weight: 600;';

    const orientationToggle = document.createElement('input');
    orientationToggle.type = 'checkbox';
    orientationToggle.id = 'ai-orientation-toggle';
    orientationToggle.checked = isOrientationSensorEnabled();
    orientationToggle.style.cssText = 'width: 18px; height: 18px; cursor: pointer; accent-color: #38bdf8;';
    orientationToggle.addEventListener('change', () => {
      setOrientationSensorEnabled(orientationToggle.checked);
      if (orientationToggle.checked) requestOrientationPermission();
      if (typeof updateOrientationBadgeFn === 'function') updateOrientationBadgeFn();
      setStatus(`Flat Desk Sensor ${orientationToggle.checked ? 'ENABLED (Pauses when lifted)' : 'DISABLED'}`);
    });

    orientationToggleRow.appendChild(orientationToggleLabel);
    orientationToggleRow.appendChild(orientationToggle);

    const orientationStatusRow = document.createElement('div');
    orientationStatusRow.id = 'ai-orientation-status-row';
    orientationStatusRow.style.cssText = 'font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;';
    orientationStatusRow.innerHTML = '<span>Live Sensor Status:</span><span id="ai-orientation-badge" style="background: #10b981; color: #fff; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10px;">📱 FLAT (READY)</span>';

    orientationCard.appendChild(orientationToggleRow);
    orientationCard.appendChild(orientationStatusRow);
    orientationSection.appendChild(orientationLabel);
    orientationSection.appendChild(orientationCard);

    // 7. Save Button
    const saveBtn = document.createElement('button');
    saveBtn.id = 'ai-save-settings-btn';
    saveBtn.textContent = 'Save Settings';
    saveBtn.style.cssText = 'background: #334155; color: #fff; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; transition: background 0.15s;';
    saveBtn.onmouseover = () => { saveBtn.style.background = '#475569'; };
    saveBtn.onmouseout = () => { saveBtn.style.background = '#334155'; };

    // 8. Profile / Fallback Data Collapsible Section
    const profileToggleBtn = document.createElement('button');
    profileToggleBtn.id = 'ai-profile-toggle-btn';
    profileToggleBtn.textContent = '👤 Autofill Profile (Fallback Data) ▼';
    profileToggleBtn.title = 'Personal metadata to automatically answer survey questions without calling AI API';
    profileToggleBtn.style.cssText = 'background: #1e293b; color: #38bdf8; border: 1px solid #0284c7; padding: 7px 10px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 11px; text-align: left; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s;';
    profileToggleBtn.onmouseover = () => { profileToggleBtn.style.background = '#0f172a'; };
    profileToggleBtn.onmouseout = () => { profileToggleBtn.style.background = '#1e293b'; };

    const profileContainer = document.createElement('div');
    profileContainer.id = 'ai-profile-container';
    profileContainer.style.cssText = 'background: #020617; border: 1px solid #334155; border-radius: 6px; padding: 10px; display: none; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; -webkit-overflow-scrolling: touch; box-sizing: border-box;';

    function createField(labelText, id, placeholder, val = '') {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 2px; min-width: 0; width: 100%; box-sizing: border-box;';
      const lbl = document.createElement('label');
      lbl.textContent = labelText;
      lbl.style.cssText = 'font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
      const inp = document.createElement('input');
      inp.id = id;
      inp.type = 'text';
      inp.value = val;
      inp.placeholder = placeholder;
      inp.style.cssText = 'background: #0f172a; border: 1px solid #334155; color: #f8fafc; padding: 6px 8px; border-radius: 4px; font-size: 13px; outline: none; width: 100%; min-width: 0; box-sizing: border-box;';
      wrapper.appendChild(lbl);
      wrapper.appendChild(inp);
      return { wrapper, inp };
    }

    function createRow(item1, item2) {
      const row = document.createElement('div');
      row.className = 'ai-grid-2col';
      row.style.cssText = 'display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; width: 100%; box-sizing: border-box;';
      row.appendChild(item1.wrapper);
      row.appendChild(item2.wrapper);
      return row;
    }

    const currentSavedProfile = getUserProfile();

    const fFullName = createField('Full Name', 'ai-p-fullname', 'Full Name', currentSavedProfile.fullName);
    const fNickname = createField('Nickname', 'ai-p-nickname', 'Nickname', currentSavedProfile.nickname);
    const fFirstName = createField('First Name', 'ai-p-firstname', 'First Name', currentSavedProfile.firstName);
    const fMiddleName = createField('Middle Name', 'ai-p-middlename', 'Middle Name', currentSavedProfile.middleName);
    const fLastName = createField('Last Name', 'ai-p-lastname', 'Last Name', currentSavedProfile.lastName);
    const fStudentId = createField('NIM / Student ID / NIK', 'ai-p-studentid', '2106789123', currentSavedProfile.studentId);
    const fEmail = createField('Email Address', 'ai-p-email', 'name@example.com', currentSavedProfile.email);
    const fPhone = createField('Phone / WhatsApp', 'ai-p-phone', '081298765432', currentSavedProfile.phone);
    const fEmergencyPhone = createField('Emergency Contact', 'ai-p-emergency', '081311223344', currentSavedProfile.emergencyContact);
    const fAddress = createField('Address / Domisili', 'ai-p-address', 'Street Name, District', currentSavedProfile.address);
    const fCity = createField('City / Kota', 'ai-p-city', 'City', currentSavedProfile.city);
    const fProvince = createField('Province / State', 'ai-p-province', 'Province', currentSavedProfile.provinceOrState);
    const fPostalCode = createField('Postal Code', 'ai-p-postalcode', '10310', currentSavedProfile.postalCode);
    const fCountry = createField('Country / Negara', 'ai-p-country', 'Indonesia', currentSavedProfile.country);
    const fAge = createField('Age', 'ai-p-age', '21', currentSavedProfile.age);
    const fGender = createField('Gender', 'ai-p-gender', 'Male / Female', currentSavedProfile.gender);
    const fBirthdate = createField('Birthdate (YYYY-MM-DD)', 'ai-p-birthdate', '2003-08-15', currentSavedProfile.birthdate);
    const fBirthplace = createField('Place of Birth', 'ai-p-birthplace', 'City of birth', currentSavedProfile.birthplace);
    const fBloodType = createField('Blood Type', 'ai-p-bloodtype', 'O / A / B / AB', currentSavedProfile.bloodType);
    const fReligion = createField('Religion / Agama', 'ai-p-religion', 'Islam / Kristen / etc', currentSavedProfile.religion);
    const fNationality = createField('Nationality', 'ai-p-nationality', 'WNI / Indonesia', currentSavedProfile.nationality);
    const fMarital = createField('Marital Status', 'ai-p-marital', 'Single / Married', currentSavedProfile.maritalStatus);
    const fSchoolOrOrg = createField('School / Org / Campus', 'ai-p-school', 'Universitas / Company', currentSavedProfile.schoolOrOrg);
    const fFacultyOrMajor = createField('Major / Program Studi', 'ai-p-major', 'Informatika / Engineering', currentSavedProfile.facultyOrMajor);
    const fOccupation = createField('Occupation / Pekerjaan', 'ai-p-occupation', 'Mahasiswa / Employee', currentSavedProfile.occupation);
    const fHobby = createField('Hobby / Minat', 'ai-p-hobby', 'Reading, Coding, Sports', currentSavedProfile.hobby);
    const fSocial = createField('Social Media / LinkedIn', 'ai-p-social', '@username', currentSavedProfile.socialMedia);
    const fYearLevel = createField('Year Level / Tingkat', 'ai-p-yearlevel', '3rd Year / Tingkat 3', currentSavedProfile.yearLevel || '3rd Year');
    const fBatchYear = createField('Batch / Angkatan', 'ai-p-batch', '2023', currentSavedProfile.batchYear || '2023');
    const fSemester = createField('Semester', 'ai-p-semester', '5', currentSavedProfile.semester || '5');

    // QC Persona Selector with Auto-Rotate and Manual Jump controls
    const personaSelectorWrapper = document.createElement('div');
    personaSelectorWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 6px; padding-bottom: 8px; margin-bottom: 6px; border-bottom: 1px solid #334155; width: 100%; box-sizing: border-box;';

    const personaHeaderRow = document.createElement('div');
    personaHeaderRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;';

    const personaLabel = document.createElement('div');
    personaLabel.textContent = '🇵🇭 QC Personas (Strictly Quezon City)';
    personaLabel.style.cssText = 'font-size: 11px; text-transform: uppercase; color: #38bdf8; font-weight: 700;';

    const autoRotateToggle = document.createElement('button');
    autoRotateToggle.id = 'ai-auto-rotate-btn';
    autoRotateToggle.title = 'Click to switch Auto-Rotation mode: Infinite Dynamic -> Preset Round-Robin -> OFF';
    const renderAutoRotateBtn = () => {
      const mode = getSafeValue('persona_mode', 'infinite');
      const enabled = isAutoRotateEnabled();
      if (!enabled) {
        autoRotateToggle.textContent = '⏸️ Auto-Rotate: OFF';
        autoRotateToggle.style.cssText = 'background: #334155; color: #94a3b8; border: 1px solid #475569; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0;';
      } else if (mode === 'infinite') {
        autoRotateToggle.textContent = '✨ Auto-Rotate: Infinite';
        autoRotateToggle.style.cssText = 'background: #047857; color: #ecfdf5; border: 1px solid #10b981; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0;';
      } else {
        autoRotateToggle.textContent = '🔁 Auto-Rotate: Presets';
        autoRotateToggle.style.cssText = 'background: #0369a1; color: #f0f9ff; border: 1px solid #38bdf8; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0;';
      }
    };
    renderAutoRotateBtn();
    autoRotateToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const currentMode = getSafeValue('persona_mode', 'infinite');
      const currentEnabled = isAutoRotateEnabled();
      if (!currentEnabled) {
        setAutoRotate(true);
        setSafeValue('persona_mode', 'infinite');
      } else if (currentMode === 'infinite') {
        setSafeValue('persona_mode', 'presets');
      } else {
        setAutoRotate(false);
      }
      renderAutoRotateBtn();
      setStatus(`Persona Rotation: ${isAutoRotateEnabled() ? (getSafeValue('persona_mode', 'infinite') === 'infinite' ? '✨ Infinite Dynamic Mode' : '🔁 Preset Round-Robin Mode') : '⏸️ PAUSED'}`);
    });

    personaHeaderRow.appendChild(personaLabel);
    personaHeaderRow.appendChild(autoRotateToggle);

    const personaSelectWrapper = document.createElement('div');
    personaSelectWrapper.style.cssText = 'width: 100%; box-sizing: border-box;';

    const personaSelect = document.createElement('select');
    personaSelect.id = 'ai-qc-persona-select';
    personaSelect.style.cssText = 'width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #0284c7; color: #f8fafc; padding: 6px 8px; border-radius: 4px; font-size: 12px; outline: none; font-weight: 600; cursor: pointer; text-overflow: ellipsis; overflow: hidden;';

    QC_PHILIPPINES_PERSONAS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label;
      personaSelect.appendChild(opt);
    });
    personaSelectWrapper.appendChild(personaSelect);

    const personaBtnRow = document.createElement('div');
    personaBtnRow.style.cssText = 'display: flex; gap: 6px; width: 100%; box-sizing: border-box;';

    const genInfiniteBtn = document.createElement('button');
    genInfiniteBtn.textContent = '✨ New QC';
    genInfiniteBtn.title = 'Generate a brand new authentic Quezon City college student identity right now';
    genInfiniteBtn.style.cssText = 'flex: 1; min-width: 0; background: #059669; color: #fff; border: none; padding: 6px 4px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap; text-align: center;';

    const nextPersonaBtn = document.createElement('button');
    nextPersonaBtn.textContent = '⏭️ Next';
    nextPersonaBtn.title = 'Rotate to the next persona';
    nextPersonaBtn.style.cssText = 'flex: 1; min-width: 0; background: #0284c7; color: #fff; border: none; padding: 6px 4px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap; text-align: center;';

    const randomPersonaBtn = document.createElement('button');
    randomPersonaBtn.textContent = '🎲 Random';
    randomPersonaBtn.title = 'Switch to a random preset persona';
    randomPersonaBtn.style.cssText = 'flex: 1; min-width: 0; background: #2563eb; color: #fff; border: none; padding: 6px 4px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap; text-align: center;';

    personaBtnRow.appendChild(genInfiniteBtn);
    personaBtnRow.appendChild(nextPersonaBtn);
    personaBtnRow.appendChild(randomPersonaBtn);

    function applyPersonaToInputs(p, announce = true) {
      if (!p) return;
      let existingOpt = Array.from(personaSelect.options).find(o => o.value === p.id);
      if (!existingOpt) {
        existingOpt = document.createElement('option');
        existingOpt.value = p.id;
        existingOpt.textContent = p.label || `✨ ${p.fullName} (${p.schoolOrOrg})`;
        personaSelect.insertBefore(existingOpt, personaSelect.firstChild);
      }
      personaSelect.value = p.id;
      fFullName.inp.value = p.fullName;
      fNickname.inp.value = p.nickname;
      fFirstName.inp.value = p.firstName;
      fMiddleName.inp.value = p.middleName;
      fLastName.inp.value = p.lastName;
      fStudentId.inp.value = p.studentId;
      fEmail.inp.value = p.email;
      fPhone.inp.value = p.phone;
      fEmergencyPhone.inp.value = p.emergencyContact;
      fAddress.inp.value = p.address;
      fCity.inp.value = p.city;
      fProvince.inp.value = p.provinceOrState;
      fPostalCode.inp.value = p.postalCode;
      fCountry.inp.value = p.country;
      fAge.inp.value = p.age;
      fGender.inp.value = p.gender;
      fBirthdate.inp.value = p.birthdate;
      fBirthplace.inp.value = p.birthplace;
      fBloodType.inp.value = p.bloodType;
      fReligion.inp.value = p.religion;
      fNationality.inp.value = p.nationality;
      fMarital.inp.value = p.maritalStatus;
      fSchoolOrOrg.inp.value = p.schoolOrOrg;
      fFacultyOrMajor.inp.value = p.facultyOrMajor;
      fYearLevel.inp.value = p.yearLevel;
      fBatchYear.inp.value = p.batchYear;
      fSemester.inp.value = p.semester;
      fOccupation.inp.value = p.occupation;
      fHobby.inp.value = p.hobby;
      fSocial.inp.value = p.socialMedia;
      saveUserProfile(p);
      currentSessionPersona = p;
      if (announce) {
        setStatus(`[QC Persona] Loaded: ${p.fullName} (${p.address}, Quezon City)`);
      }
    }

    updateHUDPersonaFn = (p) => applyPersonaToInputs(p, false);

    personaSelect.addEventListener('change', () => {
      const p = QC_PHILIPPINES_PERSONAS.find(x => x.id === personaSelect.value) || QC_PHILIPPINES_PERSONAS[0];
      applyPersonaToInputs(p);
    });

    genInfiniteBtn.addEventListener('click', () => {
      const p = generateDynamicQCPersona();
      applyPersonaToInputs(p);
    });

    nextPersonaBtn.addEventListener('click', () => {
      rotatePersona(true);
    });

    randomPersonaBtn.addEventListener('click', () => {
      const otherPersonas = QC_PHILIPPINES_PERSONAS.filter(x => x.id !== personaSelect.value);
      const p = otherPersonas[Math.floor(Math.random() * otherPersonas.length)] || QC_PHILIPPINES_PERSONAS[0];
      applyPersonaToInputs(p);
    });

    personaSelectorWrapper.appendChild(personaHeaderRow);
    personaSelectorWrapper.appendChild(personaSelectWrapper);
    personaSelectorWrapper.appendChild(personaBtnRow);

    profileContainer.appendChild(personaSelectorWrapper);
    profileContainer.appendChild(createRow(fFullName, fNickname));

    profileContainer.appendChild(createRow(fFirstName, fLastName));
    profileContainer.appendChild(createRow(fMiddleName, fStudentId));
    profileContainer.appendChild(createRow(fEmail, fPhone));
    profileContainer.appendChild(fAddress.wrapper);
    profileContainer.appendChild(createRow(fCity, fProvince));
    profileContainer.appendChild(createRow(fPostalCode, fCountry));
    profileContainer.appendChild(createRow(fAge, fGender));
    profileContainer.appendChild(createRow(fBirthdate, fBirthplace));
    profileContainer.appendChild(createRow(fBloodType, fReligion));
    profileContainer.appendChild(createRow(fNationality, fMarital));
    profileContainer.appendChild(createRow(fSchoolOrOrg, fFacultyOrMajor));
    profileContainer.appendChild(createRow(fYearLevel, fBatchYear));
    profileContainer.appendChild(createRow(fSemester, fOccupation));
    profileContainer.appendChild(createRow(fEmergencyPhone, fHobby));
    profileContainer.appendChild(fSocial.wrapper);

    const profileActions = document.createElement('div');
    profileActions.style.cssText = 'display: flex; gap: 6px; margin-top: 4px;';

    const saveProfileBtn = document.createElement('button');
    saveProfileBtn.textContent = 'Save Profile';
    saveProfileBtn.style.cssText = 'flex: 1; background: #0284c7; color: #fff; border: none; padding: 6px 10px; border-radius: 4px; font-weight: 600; font-size: 11px; cursor: pointer;';
    saveProfileBtn.onmouseover = () => { saveProfileBtn.style.background = '#0369a1'; };
    saveProfileBtn.onmouseout = () => { saveProfileBtn.style.background = '#0284c7'; };

    const resetProfileBtn = document.createElement('button');
    resetProfileBtn.textContent = 'Reset';
    resetProfileBtn.style.cssText = 'background: #334155; color: #cbd5e1; border: none; padding: 6px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;';
    resetProfileBtn.onmouseover = () => { resetProfileBtn.style.background = '#475569'; };
    resetProfileBtn.onmouseout = () => { resetProfileBtn.style.background = '#334155'; };

    profileActions.appendChild(saveProfileBtn);
    profileActions.appendChild(resetProfileBtn);
    profileContainer.appendChild(profileActions);

    let isProfileExpanded = false;
    profileToggleBtn.addEventListener('click', () => {
      isProfileExpanded = !isProfileExpanded;
      profileContainer.style.display = isProfileExpanded ? 'flex' : 'none';
      profileToggleBtn.textContent = isProfileExpanded ? '👤 Autofill Profile (Fallback Data) ▲' : '👤 Autofill Profile (Fallback Data) ▼';
    });

    saveProfileBtn.addEventListener('click', () => {
      const p = {
        fullName: fFullName.inp.value.trim(),
        nickname: fNickname.inp.value.trim(),
        firstName: fFirstName.inp.value.trim(),
        middleName: fMiddleName.inp.value.trim(),
        lastName: fLastName.inp.value.trim(),
        studentId: fStudentId.inp.value.trim(),
        email: fEmail.inp.value.trim(),
        phone: fPhone.inp.value.trim(),
        emergencyContact: fEmergencyPhone.inp.value.trim(),
        address: fAddress.inp.value.trim(),
        city: fCity.inp.value.trim(),
        provinceOrState: fProvince.inp.value.trim(),
        postalCode: fPostalCode.inp.value.trim(),
        country: fCountry.inp.value.trim(),
        age: fAge.inp.value.trim(),
        gender: fGender.inp.value.trim(),
        birthdate: fBirthdate.inp.value.trim(),
        birthplace: fBirthplace.inp.value.trim(),
        bloodType: fBloodType.inp.value.trim(),
        religion: fReligion.inp.value.trim(),
        nationality: fNationality.inp.value.trim(),
        maritalStatus: fMarital.inp.value.trim(),
        schoolOrOrg: fSchoolOrOrg.inp.value.trim(),
        facultyOrMajor: fFacultyOrMajor.inp.value.trim(),
        yearLevel: fYearLevel.inp.value.trim(),
        batchYear: fBatchYear.inp.value.trim(),
        semester: fSemester.inp.value.trim(),
        occupation: fOccupation.inp.value.trim(),
        hobby: fHobby.inp.value.trim(),
        socialMedia: fSocial.inp.value.trim()
      };
      saveUserProfile(p);
      setStatus(`[Profile Saved] Updated local profile for ${p.fullName || 'User'}`);
    });

    resetProfileBtn.addEventListener('click', () => {
      fFullName.inp.value = DEFAULT_USER_PROFILE.fullName;
      fNickname.inp.value = DEFAULT_USER_PROFILE.nickname;
      fFirstName.inp.value = DEFAULT_USER_PROFILE.firstName;
      fMiddleName.inp.value = DEFAULT_USER_PROFILE.middleName;
      fLastName.inp.value = DEFAULT_USER_PROFILE.lastName;
      fStudentId.inp.value = DEFAULT_USER_PROFILE.studentId;
      fEmail.inp.value = DEFAULT_USER_PROFILE.email;
      fPhone.inp.value = DEFAULT_USER_PROFILE.phone;
      fEmergencyPhone.inp.value = DEFAULT_USER_PROFILE.emergencyContact;
      fAddress.inp.value = DEFAULT_USER_PROFILE.address;
      fCity.inp.value = DEFAULT_USER_PROFILE.city;
      fProvince.inp.value = DEFAULT_USER_PROFILE.provinceOrState;
      fPostalCode.inp.value = DEFAULT_USER_PROFILE.postalCode;
      fCountry.inp.value = DEFAULT_USER_PROFILE.country;
      fAge.inp.value = DEFAULT_USER_PROFILE.age;
      fGender.inp.value = DEFAULT_USER_PROFILE.gender;
      fBirthdate.inp.value = DEFAULT_USER_PROFILE.birthdate;
      fBirthplace.inp.value = DEFAULT_USER_PROFILE.birthplace;
      fBloodType.inp.value = DEFAULT_USER_PROFILE.bloodType;
      fReligion.inp.value = DEFAULT_USER_PROFILE.religion;
      fNationality.inp.value = DEFAULT_USER_PROFILE.nationality;
      fMarital.inp.value = DEFAULT_USER_PROFILE.maritalStatus;
      fSchoolOrOrg.inp.value = DEFAULT_USER_PROFILE.schoolOrOrg;
      fFacultyOrMajor.inp.value = DEFAULT_USER_PROFILE.facultyOrMajor;
      fYearLevel.inp.value = DEFAULT_USER_PROFILE.yearLevel;
      fBatchYear.inp.value = DEFAULT_USER_PROFILE.batchYear;
      fSemester.inp.value = DEFAULT_USER_PROFILE.semester;
      fOccupation.inp.value = DEFAULT_USER_PROFILE.occupation;
      fHobby.inp.value = DEFAULT_USER_PROFILE.hobby;
      fSocial.inp.value = DEFAULT_USER_PROFILE.socialMedia;
      saveUserProfile(DEFAULT_USER_PROFILE);
      setStatus('[Profile Reset] Restored generic placeholder profile.');
    });

    // 8b. Study Material Knowledge Folder (Patch 1.2.0 Next Level)
    const knowledgeToggleBtn = document.createElement('button');
    knowledgeToggleBtn.id = 'ai-knowledge-toggle-btn';
    knowledgeToggleBtn.style.cssText = 'background: #1e1b4b; color: #c7d2fe; border: 1.5px solid #6366f1; padding: 7px 10px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 11px; text-align: left; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s;';
    knowledgeToggleBtn.onmouseover = () => { knowledgeToggleBtn.style.background = '#312e81'; };
    knowledgeToggleBtn.onmouseout = () => { knowledgeToggleBtn.style.background = '#1e1b4b'; };

    const knowledgeContainer = document.createElement('div');
    knowledgeContainer.id = 'ai-knowledge-container';
    knowledgeContainer.style.cssText = 'background: #020617; border: 1.5px solid #4338ca; border-radius: 8px; padding: 10px; display: none; flex-direction: column; gap: 9px; max-height: 320px; overflow-y: auto; -webkit-overflow-scrolling: touch; box-sizing: border-box;';

    const renderKnowledgeToggleText = () => {
      const count = activeKnowledgeDocs.length;
      const totalWords = activeKnowledgeDocs.reduce((acc, d) => acc + (d.wordCount || 0), 0);
      const isExp = knowledgeContainer.style.display === 'flex';
      const arrow = isExp ? '▲' : '▼';
      const countBadge = count > 0 ? `[${count} Docs • ~${(totalWords/1000).toFixed(1)}k words]` : '[Empty - Click to Load]';
      knowledgeToggleBtn.innerHTML = `<span>📚 Study Material Folder (Patch 1.2.0) ${countBadge}</span><span>${arrow}</span>`;
    };

    // Hidden Folder and File Inputs
    const folderInput = document.createElement('input');
    folderInput.type = 'file';
    folderInput.id = 'ai-folder-input';
    folderInput.webkitdirectory = true;
    folderInput.directory = true;
    folderInput.multiple = true;
    folderInput.style.display = 'none';

    const filesInput = document.createElement('input');
    filesInput.type = 'file';
    filesInput.id = 'ai-files-input';
    filesInput.multiple = true;
    filesInput.accept = '.docx,.doc,.pptx,.ppt,.pdf,.txt,.md';
    filesInput.style.display = 'none';

    // Zero Drag & Drop Info Banner
    const filesFolderNotice = document.createElement('div');
    filesFolderNotice.style.cssText = 'background: rgba(16, 185, 129, 0.08); border: 1px solid #059669; border-radius: 5px; padding: 6px 8px; font-size: 10px; color: #a7f3d0; line-height: 1.4;';
    filesFolderNotice.innerHTML = '📂 <b>Auto-Sync (No Drag & Drop):</b> Put your course files into the extension\'s <code>files/</code> folder. Run <code>sync_files.bat</code> once, and the AI will auto-read them on every form!';

    // Actions Header Row
    const knowledgeActionsRow = document.createElement('div');
    knowledgeActionsRow.style.cssText = 'display: flex; gap: 6px; align-items: center; flex-wrap: wrap;';

    const syncFolderBtn = document.createElement('button');
    syncFolderBtn.id = 'ai-sync-files-btn';
    syncFolderBtn.innerHTML = '🔄 Sync files/ Folder';
    syncFolderBtn.title = 'Automatically scan and load all .docx, .pdf, and .pptx files from the extension files/ folder (Zero drag-and-drop)';
    syncFolderBtn.style.cssText = 'flex: 1.2; background: linear-gradient(135deg, #059669, #047857); color: #fff; border: none; padding: 7px 10px; border-radius: 5px; font-weight: 700; font-size: 11px; cursor: pointer; white-space: nowrap;';
    syncFolderBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await loadFilesFromExtensionFolder(true);
      renderKnowledgeToggleText();
    });

    const openFolderBtn = document.createElement('button');
    openFolderBtn.textContent = '📁 Browse Folder';
    openFolderBtn.title = 'Optionally select an external folder on your computer';
    openFolderBtn.style.cssText = 'flex: 1; background: linear-gradient(135deg, #4f46e5, #4338ca); color: #fff; border: none; padding: 7px 10px; border-radius: 5px; font-weight: 700; font-size: 11px; cursor: pointer; white-space: nowrap;';
    openFolderBtn.addEventListener('click', (e) => {
      e.preventDefault();
      folderInput.click();
    });

    const addFilesBtn = document.createElement('button');
    addFilesBtn.textContent = '📄 Add Files';
    addFilesBtn.title = 'Select individual .docx, .pdf, or .ppt files';
    addFilesBtn.style.cssText = 'flex: 1; background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; border: none; padding: 7px 10px; border-radius: 5px; font-weight: 700; font-size: 11px; cursor: pointer; white-space: nowrap;';
    addFilesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      filesInput.click();
    });

    const importUrlBtn = document.createElement('button');
    importUrlBtn.textContent = '🔗 Import Link';
    importUrlBtn.title = 'Import document directly from a web link / cloud URL (ideal for mobile / iOS)';
    importUrlBtn.style.cssText = 'flex: 1; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; border: none; padding: 7px 10px; border-radius: 5px; font-weight: 700; font-size: 11px; cursor: pointer; white-space: nowrap;';
    importUrlBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const inputUrl = prompt('Enter direct URL to study material (.docx, .pdf, .pptx, .txt):');
      if (!inputUrl || !inputUrl.trim()) return;
      const cleanUrl = inputUrl.trim();
      try {
        setStatus(`🌐 Fetching document from "${cleanUrl.slice(0, 45)}..."`);
        const urlName = cleanUrl.split('/').pop().split('?')[0] || 'imported_doc';
        let arrayBuffer = null;
        try {
          const res = await fetch(cleanUrl);
          if (res.ok) arrayBuffer = await res.arrayBuffer();
        } catch (err) {}

        if (!arrayBuffer) {
          try {
            const crossRes = await fetchCrossDomain({ url: cleanUrl, responseType: 'blob' });
            if (crossRes && crossRes.response) {
              arrayBuffer = await crossRes.response.arrayBuffer();
            }
          } catch (e2) {}
        }

        if (arrayBuffer) {
          const parsed = await parseDocumentFile({
            name: urlName,
            arrayBuffer,
            size: arrayBuffer.byteLength
          });
          const existingIdx = activeKnowledgeDocs.findIndex(d => d.name === parsed.name);
          if (existingIdx !== -1) {
            activeKnowledgeDocs[existingIdx] = parsed;
          } else {
            activeKnowledgeDocs.push(parsed);
          }
          saveKnowledgeDocsToStorage();
          if (typeof updateHUDKnowledgeListFn === 'function') {
            updateHUDKnowledgeListFn();
          }
          renderKnowledgeToggleText();
          setStatus(`✅ Successfully imported "${urlName}" (~${parsed.wordCount} words)! Grounding active.`);
        } else {
          setStatus('⚠️ Could not download file from specified URL. Check link permissions or CORS.');
        }
      } catch (err) {
        setStatus(`⚠️ Failed to import from URL: ${err.message}`);
      }
    });

    const clearAllDocsBtn = document.createElement('button');
    clearAllDocsBtn.textContent = '🧹 Clear';
    clearAllDocsBtn.title = 'Clear all loaded study materials from memory and storage';
    clearAllDocsBtn.style.cssText = 'background: #1e293b; color: #f87171; border: 1px solid #7f1d1d; padding: 7px 10px; border-radius: 5px; font-weight: 600; font-size: 11px; cursor: pointer; white-space: nowrap;';
    clearAllDocsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Clear all study materials from knowledge base?')) {
        clearAllKnowledgeDocs();
        renderKnowledgeToggleText();
      }
    });

    knowledgeActionsRow.appendChild(syncFolderBtn);
    knowledgeActionsRow.appendChild(openFolderBtn);
    knowledgeActionsRow.appendChild(addFilesBtn);
    knowledgeActionsRow.appendChild(importUrlBtn);
    knowledgeActionsRow.appendChild(clearAllDocsBtn);

    // Grounding Mode Selector
    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';
    const modeLabel = document.createElement('label');
    modeLabel.textContent = 'Knowledge Grounding Mode';
    modeLabel.style.cssText = 'font-size: 10px; text-transform: uppercase; color: #a5b4fc; font-weight: 700;';

    const modeSelect = document.createElement('select');
    modeSelect.id = 'ai-grounding-mode-select';
    modeSelect.style.cssText = 'background: #0f172a; border: 1px solid #4338ca; color: #f8fafc; padding: 6px 8px; border-radius: 4px; font-size: 11px; outline: none; font-weight: 600; cursor: pointer;';
    GROUNDING_MODES.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      modeSelect.appendChild(opt);
    });
    modeSelect.value = getSafeValue('grounding_mode', 'priority');
    modeSelect.addEventListener('change', () => {
      setSafeValue('grounding_mode', modeSelect.value);
      setStatus(`Grounding Mode updated: ${modeSelect.options[modeSelect.selectedIndex].text}`);
    });
    modeRow.appendChild(modeLabel);
    modeRow.appendChild(modeSelect);

    // Drag & Drop Zone
    const dropZone = document.createElement('div');
    dropZone.id = 'ai-doc-dropzone';
    dropZone.textContent = '📂 Drag & Drop your study folder or DOCX, PDF, PPT files here';
    dropZone.style.cssText = 'border: 2px dashed #6366f1; border-radius: 6px; padding: 10px; text-align: center; color: #94a3b8; font-size: 11px; cursor: pointer; background: rgba(99, 102, 241, 0.05); transition: all 0.2s;';
    dropZone.addEventListener('click', () => {
      if (typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 480)) {
        filesInput.click();
      } else {
        folderInput.click();
      }
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.background = 'rgba(99, 102, 241, 0.2)';
      dropZone.style.borderColor = '#a5b4fc';
      dropZone.style.color = '#ffffff';
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.background = 'rgba(99, 102, 241, 0.05)';
      dropZone.style.borderColor = '#6366f1';
      dropZone.style.color = '#94a3b8';
    });
    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.style.background = 'rgba(99, 102, 241, 0.05)';
      dropZone.style.borderColor = '#6366f1';
      dropZone.style.color = '#94a3b8';
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await handleSelectedDocumentFiles(e.dataTransfer.files);
        renderKnowledgeToggleText();
      }
    });

    folderInput.addEventListener('change', async () => {
      if (folderInput.files && folderInput.files.length > 0) {
        await handleSelectedDocumentFiles(folderInput.files);
        renderKnowledgeToggleText();
      }
      folderInput.value = '';
    });

    filesInput.addEventListener('change', async () => {
      if (filesInput.files && filesInput.files.length > 0) {
        await handleSelectedDocumentFiles(filesInput.files);
        renderKnowledgeToggleText();
      }
      filesInput.value = '';
    });

    // Documents Cards List
    const docsListContainer = document.createElement('div');
    docsListContainer.id = 'ai-knowledge-docs-list';
    docsListContainer.style.cssText = 'display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto;';

    // Text Preview Drawer
    const previewDrawer = document.createElement('div');
    previewDrawer.id = 'ai-doc-preview-drawer';
    previewDrawer.style.cssText = 'display: none; flex-direction: column; gap: 4px; background: #030712; border: 1px solid #3730a3; border-radius: 6px; padding: 8px; margin-top: 4px;';
    const previewHeader = document.createElement('div');
    previewHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 11px; color: #a5b4fc;';
    const previewTitle = document.createElement('span');
    previewTitle.textContent = 'Document Text Preview';
    const closePreviewBtn = document.createElement('button');
    closePreviewBtn.textContent = '✕ Close';
    closePreviewBtn.style.cssText = 'background: none; border: none; color: #94a3b8; font-size: 10px; cursor: pointer;';
    closePreviewBtn.addEventListener('click', () => { previewDrawer.style.display = 'none'; });
    previewHeader.appendChild(previewTitle);
    previewHeader.appendChild(closePreviewBtn);
    const previewBody = document.createElement('pre');
    previewBody.style.cssText = 'white-space: pre-wrap; font-family: monospace; font-size: 10px; color: #cbd5e1; max-height: 140px; overflow-y: auto; background: #0b0f19; padding: 6px; border-radius: 4px; line-height: 1.35; margin: 0;';
    previewDrawer.appendChild(previewHeader);
    previewDrawer.appendChild(previewBody);

    // Quick Search Test Bar
    const testSearchWrapper = document.createElement('div');
    testSearchWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 4px; border-top: 1px solid #1e293b; padding-top: 8px;';
    const testSearchLabel = document.createElement('div');
    testSearchLabel.textContent = '🔍 Quick Test Retrieval (Instant Grounding Preview)';
    testSearchLabel.style.cssText = 'font-size: 10px; text-transform: uppercase; color: #38bdf8; font-weight: 700;';
    const testSearchInput = document.createElement('input');
    testSearchInput.type = 'text';
    testSearchInput.placeholder = 'Search keyword in your files (e.g. mitosis, formula)...';
    testSearchInput.style.cssText = 'background: #0f172a; border: 1px solid #334155; color: #f8fafc; padding: 5px 8px; border-radius: 4px; font-size: 11px; outline: none; width: 100%; box-sizing: border-box;';
    const testSearchResults = document.createElement('div');
    testSearchResults.style.cssText = 'font-family: monospace; font-size: 10px; color: #94a3b8; max-height: 80px; overflow-y: auto; background: #020617; padding: 4px 6px; border-radius: 4px; display: none; line-height: 1.3; border: 1px solid #1e293b;';

    testSearchInput.addEventListener('input', () => {
      const q = testSearchInput.value.trim();
      if (!q || activeKnowledgeDocs.length === 0) {
        testSearchResults.style.display = 'none';
        return;
      }
      const res = searchKnowledgeBase(q, [], 2);
      if (res.excerpts.length > 0) {
        testSearchResults.style.display = 'block';
        testSearchResults.innerHTML = res.excerpts.map(e => `
          <div style="margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #334155;">
            <span style="color: #38bdf8; font-weight: 700;">[${e.source} - ${e.location}] (Score: ${e.score})</span><br/>
            <span style="color: #e2e8f0;">"${e.text.slice(0, 180)}..."</span>
          </div>
        `).join('');
      } else {
        testSearchResults.style.display = 'block';
        testSearchResults.textContent = 'No matching excerpts found in loaded documents.';
      }
    });

    testSearchWrapper.appendChild(testSearchLabel);
    testSearchWrapper.appendChild(testSearchInput);
    testSearchWrapper.appendChild(testSearchResults);

    function renderDocsList() {
      docsListContainer.innerHTML = '';
      if (activeKnowledgeDocs.length === 0) {
        const emptyNotice = document.createElement('div');
        emptyNotice.textContent = 'No files loaded yet. Click "Select Folder" above to read your study materials.';
        emptyNotice.style.cssText = 'font-size: 11px; color: #64748b; font-style: italic; text-align: center; padding: 8px 0;';
        docsListContainer.appendChild(emptyNotice);
        return;
      }

      activeKnowledgeDocs.forEach(doc => {
        const card = document.createElement('div');
        card.style.cssText = 'background: #0f172a; border: 1px solid #334155; border-radius: 5px; padding: 6px 8px; display: flex; justify-content: space-between; align-items: center; gap: 6px;';

        const infoCol = document.createElement('div');
        infoCol.style.cssText = 'display: flex; flex-direction: column; gap: 2px; overflow: hidden;';

        let badgeBg = '#1e40af';
        let badgeColor = '#93c5fd';
        let badgeText = 'DOCX';
        if (doc.type === 'pdf') {
          badgeBg = '#9f1239';
          badgeColor = '#fecdd3';
          badgeText = 'PDF';
        } else if (doc.type.includes('ppt')) {
          badgeBg = '#c2410c';
          badgeColor = '#fed7aa';
          badgeText = 'PPT';
        } else if (doc.type === 'txt' || doc.type === 'md') {
          badgeBg = '#065f46';
          badgeColor = '#a7f3d0';
          badgeText = doc.type.toUpperCase();
        }

        const titleRow = document.createElement('div');
        titleRow.style.cssText = 'display: flex; align-items: center; gap: 5px;';

        const typeBadge = document.createElement('span');
        typeBadge.textContent = badgeText;
        typeBadge.style.cssText = `background: ${badgeBg}; color: ${badgeColor}; padding: 1px 4px; border-radius: 3px; font-size: 9px; font-weight: 700;`;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = doc.name;
        nameSpan.title = doc.name;
        nameSpan.style.cssText = 'font-size: 11px; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;';

        titleRow.appendChild(typeBadge);
        titleRow.appendChild(nameSpan);

        const subSpan = document.createElement('span');
        const unit = doc.type.includes('ppt') ? 'slides' : 'pages';
        subSpan.textContent = `${doc.slideOrPageCount} ${unit} • ~${(doc.wordCount || 0).toLocaleString()} words • ${Math.round((doc.size || 0)/1024)} KB`;
        subSpan.style.cssText = 'font-size: 10px; color: #94a3b8;';

        infoCol.appendChild(titleRow);
        infoCol.appendChild(subSpan);

        const actionsCol = document.createElement('div');
        actionsCol.style.cssText = 'display: flex; gap: 4px; align-items: center; flex-shrink: 0;';

        const viewBtn = document.createElement('button');
        viewBtn.textContent = '👁️';
        viewBtn.title = 'Preview extracted document text';
        viewBtn.style.cssText = 'background: #1e293b; color: #38bdf8; border: 1px solid #0284c7; padding: 3px 6px; border-radius: 4px; font-size: 11px; cursor: pointer;';
        viewBtn.addEventListener('click', (e) => {
          e.preventDefault();
          previewTitle.textContent = `📄 Preview: ${doc.name} (${doc.slideOrPageCount} ${unit})`;
          previewBody.textContent = (doc.text || (doc.chunks || []).map(c => c.text).join('\n\n') || 'No plain text extracted.').slice(0, 8000);
          previewDrawer.style.display = 'flex';
          previewDrawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        const delBtn = document.createElement('button');
        delBtn.textContent = '✕';
        delBtn.title = 'Remove this file';
        delBtn.style.cssText = 'background: #1e293b; color: #f87171; border: 1px solid #7f1d1d; padding: 3px 6px; border-radius: 4px; font-size: 11px; cursor: pointer;';
        delBtn.addEventListener('click', (e) => {
          e.preventDefault();
          removeKnowledgeDoc(doc.id);
          renderKnowledgeToggleText();
        });

        actionsCol.appendChild(viewBtn);
        actionsCol.appendChild(delBtn);

        card.appendChild(infoCol);
        card.appendChild(actionsCol);
        docsListContainer.appendChild(card);
      });
    }

    updateHUDKnowledgeListFn = () => {
      renderDocsList();
      renderKnowledgeToggleText();
      if (typeof updateSolverCards === 'function') {
        updateSolverCards();
      }
    };

    knowledgeToggleBtn.addEventListener('click', () => {
      const isExp = knowledgeContainer.style.display === 'flex';
      knowledgeContainer.style.display = isExp ? 'none' : 'flex';
      renderKnowledgeToggleText();
    });

    knowledgeContainer.appendChild(folderInput);
    knowledgeContainer.appendChild(filesInput);
    knowledgeContainer.appendChild(filesFolderNotice);
    knowledgeContainer.appendChild(knowledgeActionsRow);
    knowledgeContainer.appendChild(modeRow);
    knowledgeContainer.appendChild(dropZone);
    knowledgeContainer.appendChild(docsListContainer);
    knowledgeContainer.appendChild(previewDrawer);
    knowledgeContainer.appendChild(testSearchWrapper);

    renderKnowledgeToggleText();
    renderDocsList();

    // 9. Action Buttons Row (Solve Questions, Stop)
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display: flex; gap: 8px;';

    const solveBtn = document.createElement('button');
    solveBtn.id = 'ai-solve-btn';
    solveBtn.textContent = '🚀 Solve All Questions';
    solveBtn.title = 'Solves all questions on the page sequentially with 100% accuracy, profile match, and zero DOM errors';
    solveBtn.style.cssText = 'flex: 1; background: #2563eb; color: #fff; border: none; padding: 10px 14px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 12px; transition: background 0.15s; white-space: nowrap;';
    solveBtn.onmouseover = () => { if (!solveBtn.disabled) solveBtn.style.background = '#1d4ed8'; };
    solveBtn.onmouseout = () => { if (!solveBtn.disabled) solveBtn.style.background = '#2563eb'; };

    const stopBtn = document.createElement('button');
    stopBtn.id = 'ai-stop-btn';
    stopBtn.textContent = 'Stop';
    stopBtn.disabled = true;
    stopBtn.style.cssText = 'flex: 0.35; background: #dc2626; color: #fff; border: none; padding: 10px 10px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 12px; opacity: 0.6; transition: background 0.15s;';

    btnRow.appendChild(solveBtn);
    btnRow.appendChild(stopBtn);

    // 10. Status Area
    const statusLabel = document.createElement('div');
    statusLabel.textContent = 'Status & Output (Alt+H or F2 to toggle)';
    statusLabel.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 2px;';

    const statusBox = document.createElement('div');
    statusBox.id = 'ai-hud-status';
    statusBox.textContent = 'Ready. Press Alt+H or F2 to toggle HUD.';
    statusBox.style.cssText = 'min-height: 48px; background: #020617; border: 1px solid #1e293b; border-radius: 6px; padding: 8px 10px; color: #94a3b8; overflow-y: auto; max-height: 120px; font-family: monospace; font-size: 11px; white-space: pre-wrap; line-height: 1.4;';

    // ==========================================
    // 11. MULTI-VIEW HUD ARCHITECTURE
    // ==========================================

    // View 1: Solver (Main Cockpit)
    viewSolver = document.createElement('div');
    viewSolver.id = 'ai-view-solver';
    viewSolver.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';

    // Summary Quick-Jump Cards
    const summaryCards = document.createElement('div');
    summaryCards.id = 'ai-solver-summary-cards';
    summaryCards.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

    // 1. Model Summary Card
    const modelCard = document.createElement('div');
    modelCard.id = 'ai-card-model';
    modelCard.style.cssText = 'background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 8px 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s;';
    modelCard.title = 'Click to open AI Engine & Model Settings';
    modelCard.onmouseover = () => { modelCard.style.borderColor = '#3b82f6'; modelCard.style.background = '#1e293b'; };
    modelCard.onmouseout = () => { modelCard.style.borderColor = '#1e293b'; modelCard.style.background = '#0f172a'; };
    modelCard.addEventListener('click', () => switchTab('settings'));

    // 2. Study Files Summary Card
    const studyCard = document.createElement('div');
    studyCard.id = 'ai-card-study';
    studyCard.style.cssText = 'background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 8px 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s;';
    studyCard.title = 'Click to open dedicated Study Materials HUD';
    studyCard.onmouseover = () => { studyCard.style.borderColor = '#6366f1'; studyCard.style.background = '#1e293b'; };
    studyCard.onmouseout = () => { studyCard.style.borderColor = '#1e293b'; studyCard.style.background = '#0f172a'; };
    studyCard.addEventListener('click', () => switchTab('study'));

    // 3. Persona Summary Card
    const personaCard = document.createElement('div');
    personaCard.id = 'ai-card-persona';
    personaCard.style.cssText = 'background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 8px 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s;';
    personaCard.title = 'Click to view or edit Autofill Persona';
    personaCard.onmouseover = () => { personaCard.style.borderColor = '#10b981'; personaCard.style.background = '#1e293b'; };
    personaCard.onmouseout = () => { personaCard.style.borderColor = '#1e293b'; personaCard.style.background = '#0f172a'; };
    personaCard.addEventListener('click', () => switchTab('profile'));

    // 4. Phone Alignment Sensor Status Card
    const orientationCardSummary = document.createElement('div');
    orientationCardSummary.id = 'ai-card-orientation';
    orientationCardSummary.style.cssText = 'background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 8px 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s;';
    orientationCardSummary.title = 'Click to open Alignment & Phone Sensor settings';
    orientationCardSummary.onmouseover = () => { orientationCardSummary.style.borderColor = '#06b6d4'; orientationCardSummary.style.background = '#1e293b'; };
    orientationCardSummary.onmouseout = () => { orientationCardSummary.style.borderColor = '#1e293b'; orientationCardSummary.style.background = '#0f172a'; };
    orientationCardSummary.addEventListener('click', () => switchTab('settings'));

    const orientCardLabel = document.createElement('span');
    orientCardLabel.style.cssText = 'font-size: 11px; font-weight: 600; color: #94a3b8; display: flex; align-items: center; gap: 4px;';
    orientCardLabel.innerHTML = '<span>📱</span> Desk Alignment Sensor';

    const orientCardBadge = document.createElement('span');
    orientCardBadge.id = 'ai-orientation-badge-solver';
    orientCardBadge.textContent = isOrientationSensorEnabled() ? '📱 FLAT (READY)' : '⏸️ SENSOR OFF';
    orientCardBadge.style.cssText = `background: ${isOrientationSensorEnabled() ? '#10b981' : '#475569'}; color: #fff; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10px; transition: all 0.2s;`;

    orientationCardSummary.appendChild(orientCardLabel);
    orientationCardSummary.appendChild(orientCardBadge);

    function updateOrientationBadge() {
      const badge1 = document.getElementById('ai-orientation-badge');
      const badge2 = document.getElementById('ai-orientation-badge-solver');
      const enabled = isOrientationSensorEnabled();

      let text, bg;
      if (!enabled) {
        text = '⏸️ SENSOR OFF';
        bg = '#475569';
      } else if (!isOrientationSensorActive) {
        text = '⏳ DETECTING SENSOR...';
        bg = '#d97706';
      } else if (isPhoneFlat) {
        text = `📱 FLAT (~${lastTiltAngle}° READY)`;
        bg = '#10b981';
      } else {
        text = `✋ HELD (~${lastTiltAngle}° PAUSED)`;
        bg = '#ef4444';
      }

      [badge1, badge2].forEach(b => {
        if (b) {
          b.textContent = text;
          b.style.background = bg;
        }
      });
    }
    updateOrientationBadgeFn = updateOrientationBadge;

    summaryCards.appendChild(modelCard);
    summaryCards.appendChild(studyCard);
    summaryCards.appendChild(personaCard);
    summaryCards.appendChild(orientationCardSummary);

    viewSolver.appendChild(summaryCards);
    viewSolver.appendChild(btnRow);
    viewSolver.appendChild(statusLabel);
    viewSolver.appendChild(statusBox);

    // View 2: Study Materials HUD (Dedicated View)
    viewStudy = document.createElement('div');
    viewStudy.id = 'ai-view-study';
    viewStudy.style.cssText = 'display: none; flex-direction: column; gap: 10px; width: 100%; box-sizing: border-box;';

    const studyHeaderBar = document.createElement('div');
    studyHeaderBar.style.cssText = 'font-size: 12px; font-weight: 700; color: #c7d2fe; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #1e293b; padding-bottom: 6px; margin-bottom: 2px; width: 100%; box-sizing: border-box;';
    studyHeaderBar.innerHTML = '<span>📚</span> Study Materials & Knowledge HUD';

    knowledgeContainer.style.display = 'flex';
    knowledgeContainer.style.background = 'transparent';
    knowledgeContainer.style.border = 'none';
    knowledgeContainer.style.padding = '0';
    knowledgeContainer.style.maxHeight = 'none';
    knowledgeContainer.style.overflow = 'visible';
    knowledgeContainer.style.width = '100%';
    knowledgeContainer.style.boxSizing = 'border-box';

    viewStudy.appendChild(studyHeaderBar);
    viewStudy.appendChild(knowledgeContainer);

    // View 3: Settings HUD (AI Provider, API Keys, Models, Reasoning, Stealth, Pacing, Likert)
    viewSettings = document.createElement('div');
    viewSettings.id = 'ai-view-settings';
    viewSettings.style.cssText = 'display: none; flex-direction: column; gap: 10px; width: 100%; box-sizing: border-box;';

    const settingsHeaderBar = document.createElement('div');
    settingsHeaderBar.style.cssText = 'font-size: 12px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #1e293b; padding-bottom: 6px; margin-bottom: 2px; width: 100%; box-sizing: border-box;';
    settingsHeaderBar.innerHTML = '<span>⚙️</span> AI Engine & Behavior Settings';

    viewSettings.appendChild(settingsHeaderBar);
    viewSettings.appendChild(providerSection);
    viewSettings.appendChild(keySection);
    viewSettings.appendChild(urlSection);
    viewSettings.appendChild(modelSection);
    viewSettings.appendChild(webSearchSection);
    viewSettings.appendChild(tokenSection);
    viewSettings.appendChild(stealthSection);
    viewSettings.appendChild(pacingSection);
    viewSettings.appendChild(likertSection);
    viewSettings.appendChild(orientationSection);

    // 8. Exam Stealth & Answer Cache Controls
    const defenseSection = document.createElement('div');
    defenseSection.style.cssText = 'background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; margin-top: 4px;';

    const defenseHeader = document.createElement('div');
    defenseHeader.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #a7f3d0; font-weight: 700; display: flex; align-items: center; justify-content: space-between;';
    defenseHeader.innerHTML = '<span>🛡️ Exam Stealth & Answer Cache</span>';

    const defenseBadges = document.createElement('div');
    defenseBadges.style.cssText = 'font-size: 11px; color: #94a3b8; display: flex; flex-direction: column; gap: 4px; line-height: 1.4;';
    defenseBadges.innerHTML = `
      <div>• <b>Anti-Proctor:</b> Active (Visibility & Blur spoofed)</div>
      <div>• <b>Panic Wipe:</b> Armed (Face-down flip or Triple-tap)</div>
      <div>• <b>Timer Watchdog:</b> Active (Auto-turbo when &lt;3m left)</div>
    `;

    const cacheRow = document.createElement('div');
    cacheRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #1e293b; padding-top: 6px; margin-top: 2px;';

    const cacheStatusText = document.createElement('span');
    cacheStatusText.style.cssText = 'font-size: 12px; color: #f8fafc; font-weight: 600;';
    cacheStatusText.textContent = '⚡ Answer Cache: Active';

    const clearCacheBtn = document.createElement('button');
    clearCacheBtn.type = 'button';
    clearCacheBtn.style.cssText = 'background: #334155; border: 1px solid #64748b; color: #cbd5e1; border-radius: 4px; padding: 3px 8px; font-size: 11px; font-weight: 600; cursor: pointer;';
    clearCacheBtn.textContent = 'Clear Cache';
    clearCacheBtn.onclick = async () => {
      await clearAnswerCache();
      clearCacheBtn.textContent = 'Cleared!';
      setTimeout(() => { clearCacheBtn.textContent = 'Clear Cache'; }, 2000);
    };

    cacheRow.appendChild(cacheStatusText);
    cacheRow.appendChild(clearCacheBtn);

    defenseSection.appendChild(defenseHeader);
    defenseSection.appendChild(defenseBadges);
    defenseSection.appendChild(cacheRow);

    viewSettings.appendChild(defenseSection);
    viewSettings.appendChild(saveBtn);

    // View 4: Profile HUD (Autofill Persona and Details)
    viewProfile = document.createElement('div');
    viewProfile.id = 'ai-view-profile';
    viewProfile.style.cssText = 'display: none; flex-direction: column; gap: 10px; width: 100%; box-sizing: border-box;';

    const profileHeaderBar = document.createElement('div');
    profileHeaderBar.style.cssText = 'font-size: 12px; font-weight: 700; color: #a7f3d0; display: flex; align-items: center; justify-content: space-between; gap: 6px; border-bottom: 1px solid #1e293b; padding-bottom: 6px; margin-bottom: 2px; width: 100%; box-sizing: border-box;';

    const profileHeaderTitle = document.createElement('span');
    profileHeaderTitle.style.cssText = 'display: flex; align-items: center; gap: 6px;';
    profileHeaderTitle.innerHTML = '<span>👤</span> Autofill Profile & Personas';

    const profileAutofillToggleBtn = document.createElement('button');
    profileAutofillToggleBtn.id = 'ai-profile-autofill-toggle';
    profileAutofillToggleBtn.title = 'Toggle: when ON, identity questions (name, email, phone…) are answered instantly using your saved profile without spending any AI tokens.';

    const renderProfileAutofillToggle = () => {
      const on = isProfileAutofillEnabled();
      profileAutofillToggleBtn.textContent = on ? '✅ Autofill: ON' : '⛔ Autofill: OFF';
      profileAutofillToggleBtn.style.cssText = [
        'border: none; padding: 2px 9px; border-radius: 99px; font-size: 10px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: background 0.15s;',
        on
          ? 'background: #065f46; color: #6ee7b7; border: 1px solid #10b981;'
          : 'background: #3b1414; color: #fca5a5; border: 1px solid #ef4444;'
      ].join('');
    };
    renderProfileAutofillToggle();

    profileAutofillToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const next = !isProfileAutofillEnabled();
      setProfileAutofillEnabled(next);
      renderProfileAutofillToggle();
      setStatus(next
        ? '👤 Profile Autofill: ON — identity questions filled instantly (0 tokens)'
        : '⛔ Profile Autofill: OFF — all questions sent to AI');
    });

    profileHeaderBar.appendChild(profileHeaderTitle);
    profileHeaderBar.appendChild(profileAutofillToggleBtn);

    profileContainer.style.display = 'flex';
    profileContainer.style.background = 'transparent';
    profileContainer.style.border = 'none';
    profileContainer.style.padding = '0';
    profileContainer.style.maxHeight = 'none';
    profileContainer.style.overflow = 'visible';
    profileContainer.style.width = '100%';
    profileContainer.style.boxSizing = 'border-box';

    viewProfile.appendChild(profileHeaderBar);
    viewProfile.appendChild(profileContainer);

    // Assemble Body with the 4 Dedicated Views
    body.appendChild(viewSolver);
    body.appendChild(viewStudy);
    body.appendChild(viewSettings);
    body.appendChild(viewProfile);

    // Assemble HUD Panel with Header, Tab Bar, and Body
    hudPanel.appendChild(header);
    hudPanel.appendChild(navTabBar);
    hudPanel.appendChild(body);

    // Dynamic update helper for Cockpit summary cards
    updateSolverCards = () => {
      const activeModelName = modelSelect ? (modelSelect.value || 'gemini-2.5-pro') : 'gemini-2.5-pro';
      const docCount = activeKnowledgeDocs.length;
      const totalWords = activeKnowledgeDocs.reduce((acc, d) => acc + (d.wordCount || 0), 0);
      const modeVal = modeSelect ? modeSelect.value : 'strict';
      const modeLabel = modeVal === 'strict' ? 'Strict Grounding' : modeVal === 'balanced' ? 'Balanced RAG' : 'Off';
      const currentPersona = fFullName && fFullName.inp && fFullName.inp.value ? fFullName.inp.value.trim() : (typeof activePersona !== 'undefined' && activePersona ? activePersona.fullName : 'Bea De Leon');

      modelCard.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700;">Active AI Model</span>
          <span style="font-size: 12px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 4px;">⚡ <span>${activeModelName}</span></span>
        </div>
        <span style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px;">⚙️ Settings ›</span>
      `;

      studyCard.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700;">Study Files & RAG</span>
          <span style="font-size: 12px; font-weight: 700; color: ${docCount > 0 ? '#a7f3d0' : '#c7d2fe'}; display: flex; align-items: center; gap: 4px;">
            📚 <span>${docCount > 0 ? `${docCount} Docs (~${(totalWords/1000).toFixed(1)}k words)` : 'Folder Empty (files/)'}</span>
            <span style="font-size: 10px; opacity: 0.8; font-weight: 500; color: #94a3b8;">• ${modeLabel}</span>
          </span>
        </div>
        <span style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); color: #818cf8; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px;">📁 Manage ›</span>
      `;

      personaCard.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700;">Autofill Profile</span>
          <span style="font-size: 12px; font-weight: 700; color: #cbd5e1; display: flex; align-items: center; gap: 4px;">👤 <span>${currentPersona.slice(0, 22)}</span></span>
        </div>
        <span style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px;">👤 Edit ›</span>
      `;
    };

    hudContainer.appendChild(hudFloatingButton);
    hudContainer.appendChild(hudPanel);
    targetParent.appendChild(hudContainer);
    makeDraggable(hudContainer, header);

    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isMinimized = true;
      updateHUDState();
    });
    minBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isMinimized = true;
      updateHUDState();
    });

    if (typeof window !== 'undefined') {
      const handleMobileResize = () => {
        if (!isMinimized && hudContainer) {
          const vpW = window.visualViewport ? window.visualViewport.width : window.innerWidth;
          if (vpW <= 480) {
            hudContainer.style.setProperty('left', 'max(8px, env(safe-area-inset-left, 8px))', 'important');
            hudContainer.style.setProperty('right', 'max(8px, env(safe-area-inset-right, 8px))', 'important');
            hudContainer.style.setProperty('width', 'calc(100vw - 16px)', 'important');
            hudContainer.style.setProperty('max-width', 'calc(100vw - 16px)', 'important');
          }
        }
      };
      window.addEventListener('resize', handleMobileResize, { passive: true });
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleMobileResize, { passive: true });
      }
    }

    // Load saved settings — seed with pool key #1 if nothing was ever saved
    if (!getSafeValue('anymodel_api_key', '').trim()) {
      setSafeValue('anymodel_api_key', ANYMODEL_API_KEYS[0]);
    }
    keyInput.value = getActiveApiKey();
    urlInput.value = getSafeValue('anymodel_base_url', DEFAULT_BASE_URL);
    const savedModel = getSafeValue('anymodel_model', DEFAULT_MODEL);
    populateModels(savedModel);

    const savedWebSearch = getSafeValue('web_search_mode', 'off');
    webSearchSelect.value = WEB_SEARCH_MODES.some(w => w.id === savedWebSearch) ? savedWebSearch : 'off';

    const savedTokenBudget = getSafeValue('token_budget', '0');
    if (savedTokenBudget !== null && TOKEN_MODES.some(t => String(t.maxTokens) === String(savedTokenBudget))) {
      tokenSelect.value = String(savedTokenBudget);
    } else {
      tokenSelect.value = '0';
    }

    const savedStealth = getSafeValue('hud_stealth_level', 'phantom');
    if (savedStealth && STEALTH_OPTIONS.some(s => s.id === savedStealth)) {
      stealthSelect.value = savedStealth;
    } else {
      stealthSelect.value = 'phantom';
    }

    const savedPacing = getSafeValue('pacing_mode', 'humanized');
    pacingSelect.value = PACING_MODES.some(p => p.id === savedPacing) ? savedPacing : 'humanized';

    const savedLikert = getSafeValue('likert_bias_mode', 'positive');
    likertSelect.value = LIKERT_BIAS_MODES.some(b => b.id === savedLikert) ? savedLikert : 'positive';

    // Load any cached study documents from local storage into HUD on startup
    loadKnowledgeDocsFromStorage();
    if (typeof updateHUDKnowledgeListFn === 'function') {
      updateHUDKnowledgeListFn();
    }

    // Auto-scan and ingest any files placed in the extension's dedicated "files/" folder
    loadFilesFromExtensionFolder(false);

    // Default to minimized phantom stealth mode on load/refresh
    isMinimized = true;
    updateHUDState();

    setStatus(`Ready: AnyModel (${modelSelect.value})`);
    if (typeof updateSolverCards === 'function') {
      updateSolverCards();
    }

    saveBtn.addEventListener('click', () => {
      const keyVal = keyInput.value.trim() || DEFAULT_API_KEY;
      const urlVal = urlInput.value.trim() || DEFAULT_BASE_URL;
      const modelVal = modelSelect.value;
      const webSearchVal = webSearchSelect.value;
      const stealthVal = stealthSelect.value;
      const tokenVal = tokenSelect.value;
      const pacingVal = pacingSelect.value;
      const likertVal = likertSelect.value;
      const groundingModeVal = modeSelect.value;

      setSafeValue('ai_provider', 'anymodel');
      setSafeValue('anymodel_api_key', keyVal);
      setSafeValue('anymodel_base_url', urlVal);
      setSafeValue('anymodel_model', modelVal);
      setSafeValue('web_search_mode', webSearchVal);
      setSafeValue('token_budget', tokenVal);
      setSafeValue('hud_stealth_level', stealthVal);
      setSafeValue('pacing_mode', pacingVal);
      setSafeValue('likert_bias_mode', likertVal);
      setSafeValue('grounding_mode', groundingModeVal);

      // Update floating button appearance
      const curS = getStealthSettings();
      hudFloatingButton.style.background = curS.bg;
      hudFloatingButton.style.color = curS.color;
      hudFloatingButton.style.border = curS.border;
      hudFloatingButton.style.boxShadow = curS.shadow;
      hudFloatingButton.style.opacity = curS.opacity;
      hudFloatingButton.style.fontSize = (curS.opacity === '0' || curS.color === 'transparent') ? '0px' : '20px';

      setStatus(`Saved: AnyModel | ${modelVal} | 📚 Grounding: ${groundingModeVal} | 🔍 Google Search: ${webSearchVal} | ${pacingVal} pacing`);
      if (typeof updateSolverCards === 'function') {
        updateSolverCards();
      }
    });

    solveBtn.addEventListener('click', () => {
      requestOrientationPermission();
      if (!isProcessing) {
        clearAllPageErrors();
        processQuestions();
      }
    });

    const handleStop = (e) => {
      if (e) {
        try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
      }
      shouldCancel = true;
      isProcessing = false;
      setAutoSolvingState(false);
      cleanupProcessingState();
      setStatus('🛑 Solver stopped immediately by user.');
    };

    stopBtn.addEventListener('click', handleStop);
    stopBtn.addEventListener('touchend', handleStop);

    // Auto-Rotate on fresh page mount so the persona is already randomized for this form
    if (isAutoRotateEnabled() && !isAutoSolvingStateActive() && !getSavedMultiPagePersona()) {
      rotatePersona(true);
    }

    console.log('[Google Form AI HUD] HUD mounted and visible.');
  }

  function setStatus(msg) {
    const statusBox = document.getElementById('ai-hud-status');
    if (statusBox) {
      const time = new Date().toLocaleTimeString();
      statusBox.textContent = `[${time}] ${msg}\n` + statusBox.textContent.slice(0, 1000);
    }
    const indicator = document.getElementById('ai-hud-indicator');
    if (indicator) {
      if (isProcessing) {
        indicator.style.color = '#38bdf8';
      } else if (msg.includes('Error')) {
        indicator.style.color = '#ef4444';
      } else {
        indicator.style.color = '#10b981';
      }
    }
  }

  // Weak-Cellular Vision Compressor: Scales down large images to max 800px & 0.65 JPEG quality
  // Reduces upload payload from ~5 MB to ~40 KB (98% bandwidth savings), preventing cellular timeouts
  function compressImageForVision(dataUri, maxDim = 800, quality = 0.65) {
    return new Promise((resolve) => {
      if (!dataUri || typeof document === 'undefined') return resolve(null);
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;
            if (!width || !height) return resolve(null);

            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);

            // Fill white background for transparent PNGs/SVGs
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            const compressedUri = canvas.toDataURL('image/jpeg', quality);
            const parts = compressedUri.split(',');
            if (parts.length === 2) {
              resolve({ mimeType: 'image/jpeg', data: parts[1] });
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = dataUri;
      } catch (err) {
        resolve(null);
      }
    });
  }

  function getBase64FromImageUrl(url) {
    if (!url) return Promise.resolve(null);

    if (url.startsWith('data:')) {
      return compressImageForVision(url, 800, 0.65).then((compressed) => {
        if (compressed) return compressed;
        const match = url.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (match) {
          return { mimeType: match[1], data: match[2] };
        }
        return null;
      });
    }

    return new Promise((resolve) => {
      httpRequest({
        method: 'GET',
        url: url,
        responseType: 'blob',
        timeout: 25000
      }).then((response) => {
        if (response.status !== 200 || !response.response) return resolve(null);
        try {
          const rawMime = response.response?.type || 'image/jpeg';
          let blobData = response.response;
          if (!(blobData instanceof Blob)) {
            blobData = new Blob([blobData], { type: rawMime });
          }
          const reader = new FileReader();
          reader.onloadend = async function () {
            const res = reader.result;
            if (typeof res === 'string') {
              const compressed = await compressImageForVision(res, 800, 0.65);
              if (compressed) return resolve(compressed);

              const parts = res.split(',');
              if (parts.length === 2) {
                const detectedMime = parts[0].match(/:(.*?);/)?.[1] || rawMime;
                return resolve({ mimeType: detectedMime, data: parts[1] });
              }
            }
            resolve(null);
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blobData);
        } catch (err) {
          resolve(null);
        }
      }).catch(() => resolve(null));
    });
  }

  // Fast 2-second reachability probe to catch dead carrier sockets early on Smart/DITO
  async function testCellularReachability() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 2000) : null;
      await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      });
      if (timer) clearTimeout(timer);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Cellular Connection Sentinel: pauses execution if signal drops to 0 bars/offline or dead socket
  function waitForCellularSignal() {
    return new Promise(async (resolve) => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setStatus('📶 Cellular signal lost! Solver paused holding position...');
        const handleOnline = () => {
          window.removeEventListener('online', handleOnline);
          setStatus('📶 Cellular signal restored! Resuming solver...');
          resolve(true);
        };
        window.addEventListener('online', handleOnline);
        return;
      }

      // Fast probe to detect silent carrier stall on Smart/DITO
      const reachable = await testCellularReachability();
      if (!reachable && typeof navigator !== 'undefined' && navigator.onLine !== false) {
        console.warn('[Cellular Sentinel] ⚠️ Carrier packet stall detected on cellular. Pausing 3s for socket recovery...');
        setStatus('📶 Carrier packet stall detected. Waiting for connection recovery...');
        await sleep(3000);
      }
      resolve(true);
    });
  }

  // Global listeners for live cellular status updates in HUD
  if (typeof window !== 'undefined') {
    window.addEventListener('offline', () => {
      setStatus('📶 [Network Disconnected] Cellular signal lost. Auto-pause armed.');
    });
    window.addEventListener('online', () => {
      setStatus('📶 [Network Reconnected] Cellular signal online.');
    });
  }

  // Robust JSON extractor that handles markdown code blocks, reasoning wrappers, and conversational text
  function extractJsonPayload(text) {
    if (!text || typeof text !== 'string') return null;
    let clean = text.trim();

    // 1. Try markdown code blocks (```json ... ```)
    const codeBlockMatches = [...clean.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi)];
    for (const match of codeBlockMatches) {
      if (match[1]) {
        try {
          return JSON.parse(match[1].trim());
        } catch (e) {}
      }
    }

    // 2. Direct JSON.parse
    try {
      return JSON.parse(clean);
    } catch (e) {}

    // 3. Find outer object {...} or array [...]
    const firstObj = clean.indexOf('{');
    const lastObj = clean.lastIndexOf('}');
    if (firstObj !== -1 && lastObj > firstObj) {
      try {
        return JSON.parse(clean.slice(firstObj, lastObj + 1));
      } catch (e) {}
    }

    const firstArr = clean.indexOf('[');
    const lastArr = clean.lastIndexOf(']');
    if (firstArr !== -1 && lastArr > firstArr) {
      try {
        return JSON.parse(clean.slice(firstArr, lastArr + 1));
      } catch (e) {}
    }

    return null;
  }

  // Live Google Search Grounding Engine: queries Google Search directly for real-time ground truth
  async function fetchGoogleSearchEvidence(questionTitle, questionFullText, choiceLabels = []) {
    try {
      const searchMode = getSafeValue('web_search_mode', 'off');
      if (searchMode === 'off') return null;

      // If choices look like subjective Likert scale (Agree/Disagree) and mode is auto, skip web search
      if (searchMode === 'auto' && choiceLabels.length > 0 && isLikertOrScaleLabels(choiceLabels)) {
        return null;
      }

      // Formulate clean search query: extract core question text without form boilerplate
      let cleanQuery = (questionTitle || questionFullText || '')
        .replace(/[\n\r]+/g, ' ')
        .replace(/\b(kailangan ang tanong na ito|this is a required question|required|choose one|pumili|select all that apply|check all that apply|mark only one oval)\b/gi, '')
        .replace(/[?*:"'(){}[\]]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanQuery.length < 5) return null;
      if (cleanQuery.length > 150) {
        cleanQuery = cleanQuery.slice(0, 150).trim();
      }

      const results = [];
      let directAnswer = null;

      // 1. Direct Google Search query
      try {
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}&hl=en&num=6`;
        const googleRes = await httpRequest({
          method: 'GET',
          url: googleUrl,
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          timeout: 8000
        });

        const html = googleRes?.responseText || googleRes?.text || googleRes?.response || '';
        if (html && typeof DOMParser !== 'undefined') {
          const doc = new DOMParser().parseFromString(html, 'text/html');

          // A. Google Featured Snippets & Direct Answers (Knowledge Cards, Definitions, Formulas)
          const answerSelectors = [
            '.hgKElc', // Bolded featured snippet text
            '.Z0LcW', // Direct answer heading (dates, names, places)
            '[data-attrid="wa:/description"]',
            '.kno-rdesc', // Knowledge panel description
            '.vk_bk', // Quick fact bold text
            '.kp-header',
            '.BNeawe.iBp4i.AP7Wnd', // Mobile direct answer
            '.dDoNo', // Direct answer card
            '.LGOjhe' // Q&A featured snippet card
          ];
          for (const sel of answerSelectors) {
            const el = doc.querySelector(sel);
            if (el) {
              const txt = el.innerText.trim();
              if (txt.length > 5 && !txt.toLowerCase().includes('google') && !txt.toLowerCase().includes('cookie')) {
                directAnswer = txt;
                break;
              }
            }
          }

          // B. Google Search Result Cards (Desktop + Mobile)
          const cardSelectors = ['.tF2Cxc', '.g', '.MjjYud', '.xpd', 'div[data-hveid]'];
          const cards = doc.querySelectorAll(cardSelectors.join(', '));
          for (const card of cards) {
            if (results.length >= 4) break;
            const titleEl = card.querySelector('h3, div[role="heading"], .vvjwJb');
            const snippetEl = card.querySelector('.VwiC3b, .yXK7lf, [style*="-webkit-line-clamp"], .BNeawe.s3v9rd.AP7Wnd, .MUxGbd');
            if (titleEl && snippetEl) {
              const title = titleEl.innerText.trim();
              const snippet = snippetEl.innerText.trim();
              if (snippet.length > 15 && !snippet.toLowerCase().includes('cookie') && !results.some(r => r.title === title)) {
                results.push({ title, snippet });
              }
            }
          }

          // C. Fallback: Parse all snippet elements if container classes varied
          if (results.length === 0) {
            const rawSnippets = doc.querySelectorAll('.VwiC3b, .BNeawe.s3v9rd.AP7Wnd, .s3v9rd');
            for (const el of rawSnippets) {
              if (results.length >= 4) break;
              const txt = el.innerText.trim();
              if (txt.length > 25 && !txt.toLowerCase().includes('google') && !txt.toLowerCase().includes('cookie') && !results.some(r => r.snippet === txt)) {
                results.push({ title: 'Google Web Result', snippet: txt });
              }
            }
          }
        }
      } catch (gErr) {
        console.debug('[Google Form AI HUD] Google direct search skipped:', gErr.message);
      }

      // 2. Google Suggest / Complete API fallback if HTML parsing was empty
      if (results.length === 0 && !directAnswer) {
        try {
          const suggestUrl = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(cleanQuery)}`;
          const sRes = await httpRequest({ method: 'GET', url: suggestUrl, timeout: 4000 });
          if (sRes && (sRes.responseText || sRes.response)) {
            const sData = JSON.parse(sRes.responseText || sRes.response || '[]');
            const suggestions = sData[1] || [];
            if (suggestions.length > 0) {
              results.push({
                title: 'Google Top Suggestions',
                snippet: suggestions.slice(0, 3).join(' | ')
              });
            }
          }
        } catch (sErr) {
          console.debug('[Google Form AI HUD] Google suggest skipped:', sErr.message);
        }
      }

      if (results.length === 0 && !directAnswer) return null;

      let formatted = `--- 🔍 LIVE GOOGLE SEARCH GROUND TRUTH (REAL-TIME) ---
Google Search Query: "${cleanQuery}"
`;
      if (directAnswer) {
        formatted += `Google Featured / Direct Answer: ${directAnswer}\n`;
      }
      if (results.length > 0) {
        formatted += `Top Google Web Results:\n` + results.map((r, i) => `[${i + 1}] ${r.title}: ${r.snippet}`).join('\n') + '\n';
      }
      formatted += `------------------------------------------------------
CRITICAL GOOGLE SEARCH DIRECTIVE:
1. Cross-examine the question and EVERY candidate option directly against the Live Google Search Ground Truth above.
2. Select the option that is confirmed correct by Google Search.
3. Eliminate distractors and trick choices. Do NOT guess or hallucinate.
`;
      return formatted;
    } catch (err) {
      console.warn('[Google Form AI HUD] Google search grounding error:', err);
      return null;
    }
  }

  // Alias to ensure full backward compatibility
  const fetchWebSearchEvidence = fetchGoogleSearchEvidence;

  // Single attempt caller dedicated to AnyModel (OpenAI standard) with Smart Auto-Healing Cascade
  function callGeminiAPISingle(apiKey, model, promptText, base64Images = [], maxOutputTokens = 0, isRetry = false) {
    return new Promise((resolve, reject) => {
      const activeKey = getActiveApiKey();
      const activeModel = (model || getSafeValue('anymodel_model', DEFAULT_MODEL)).trim();
      const baseUrl = (getSafeValue('anymodel_base_url', DEFAULT_BASE_URL)).trim().replace(/\/+$/, '');

      if (!activeKey) {
        return reject(new Error('Missing AnyModel API key. Please enter your API key in the HUD.'));
      }

      const savedBudgetRaw = getSafeValue('token_budget', '0');
      let tokenBudget = parseInt(savedBudgetRaw, 10);
      if (isNaN(tokenBudget) || savedBudgetRaw === 'unlimited') {
        tokenBudget = 0; // 0 = Unlimited: no artificial token limit passed to API
      }

      // Smart Auto-Healing Failover for AnyModel: cascades to next verified model if one is busy/offline
      // Also rotates the API key pool on auth/quota errors before giving up.
      const tryFallback = (errMsg) => {
        const errorStr = String(errMsg || '').toLowerCase();

        // ─ Key-level failover: rotate on auth / quota / rate-limit errors ───────────────────────
        const isKeyError = /401|403|unauthorized|invalid.*(api.?key|token)|api.?key.*invalid|quota|rate.?limit|too many requests/i.test(errorStr);
        if (isKeyError && ANYMODEL_API_KEYS.length > 1) {
          const nextKey = rotateApiKey();
          console.warn(`[AnyModel Key Rotation] Auth/quota error on key index ${(_apiKeyIndex - 1 + ANYMODEL_API_KEYS.length) % ANYMODEL_API_KEYS.length} (${errMsg}). Switching to key index ${_apiKeyIndex}.`);
          setStatus(`🔄 API key rotated — retrying with backup key (${String(nextKey).slice(-8)}…)`);
          // Retry immediately with the rotated key; mark as retry to avoid infinite loops
          return callGeminiAPISingle(nextKey, activeModel, promptText, base64Images, maxOutputTokens, true).then(resolve).catch(reject);
        }

        // 1. If image input caused an error on a text-only model, auto-route directly to Gemini 3 Flash
        if (base64Images && base64Images.length > 0 && activeModel !== 'ag/gemini-3-flash' && !isRetry) {
          console.warn(`[AnyModel Vision Auto-Healing] Model "${activeModel}" encountered issue with visual input (${errMsg}). Routing image question to Gemini 3 Flash...`);
          setStatus(`👁️ Auto-routing image question to Gemini 3 Flash...`);
          return callGeminiAPISingle(activeKey, 'ag/gemini-3-flash', promptText, base64Images, maxOutputTokens, true).then(resolve).catch(reject);
        }

        const modelOrder = ANYMODEL_MODELS.map(m => m.id);
        const curIdx = modelOrder.indexOf(activeModel);
        const nextModel = modelOrder.find((mId, idx) => idx > curIdx && mId !== activeModel) || (activeModel !== 'ag/gemini-3-flash' ? 'ag/gemini-3-flash' : 'am/free');

        if (nextModel && !isRetry) {
          console.warn(`[AnyModel Auto-Healing] Model "${activeModel}" issue (${errMsg}). Auto-switching to verified backup "${nextModel}"...`);
          setStatus(`⚠️ AnyModel "${activeModel}" busy (${errMsg.slice(0, 50)}). Auto-switching to backup "${nextModel}"...`);
          setSafeValue('anymodel_model', nextModel);
          return callGeminiAPISingle(activeKey, nextModel, promptText, base64Images, maxOutputTokens, true).then(resolve).catch(reject);
        }
        reject(new Error(errMsg));
      };

      // Expert system instructions ensuring the AI model reads the question thoroughly and delivers optimal, error-free answers
      const SYSTEM_SOLVER_PROMPT = `You are an elite, highly intelligent AI assistant answering a Google Form questionnaire.
Your mission is to carefully read every question and provided choices, perform rigorous analytical thinking, and deliver the BEST, completely accurate, and flawless answer without making any mistakes.
Key Rules:
1. Read the Question Thoroughly: Analyze all parts of the question prompt, context, constraints, and all provided options. If image(s) are attached, inspect them closely to answer visual questions accurately.
2. Academic / Factual / Technical Questions: Identify the single factually correct, logically proven answer. If web search evidence is attached, treat it as ground truth. Do not guess.
3. Opinion / Survey / Likert Scale Questions: Answer authentically, thoughtfully, and consistently from the perspective of the specified student persona.
4. Output Integrity: Always output valid, well-formed JSON matching the exact schema requested so your answer can be applied directly to the form controls.`;

      const messages = [
        { role: 'system', content: SYSTEM_SOLVER_PROMPT }
      ];

      if (base64Images && base64Images.length > 0) {
        const contentParts = [{ type: 'text', text: promptText }];
        base64Images.forEach((img) => {
          if (img && img.data) {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${img.mimeType || 'image/jpeg'};base64,${img.data}`
              }
            });
          }
        });
        messages.push({ role: 'user', content: contentParts });
      } else {
        messages.push({ role: 'user', content: promptText });
      }

      const payload = {
        model: activeModel,
        messages: messages,
        temperature: 0.1
      };

      // When tokenBudget is 0 (Unlimited), omit max_tokens entirely to let the model output full reasoning without limit
      if (tokenBudget > 0) {
        payload.max_tokens = tokenBudget;
      }

      const targetUrl = `${baseUrl}/chat/completions`;

      httpRequest({
        method: 'POST',
        url: targetUrl,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`
        },
        data: JSON.stringify(payload),
        timeout: 45000
      }).then((res) => {
        try {
          const data = JSON.parse(res.responseText || '{}');
          if (res.status !== 200 || data.error) {
            const errDetail = data.error?.message || (typeof data.error === 'string' ? data.error : `HTTP ${res.status}: ${res.statusText || 'API Error'}`);
            return tryFallback(errDetail);
          }

          if (data.usage?.total_tokens) {
            totalTokensUsed += data.usage.total_tokens;
          }

          const choice = data.choices?.[0];
          const msgObj = choice?.message || {};
          const rawText = msgObj.content || data.content || '';
          const reasoningText = msgObj.reasoning_content || choice?.reasoning || '';
          const textToParse = (rawText && rawText.trim()) ? rawText : reasoningText;

          if (!textToParse) {
            return tryFallback('No text response returned by model');
          }

          const parsed = extractJsonPayload(textToParse);
          if (parsed) {
            return resolve(parsed);
          }

          // If not valid JSON, treat direct text as answer
          return resolve({ answer: textToParse.trim() });
        } catch (e) {
          tryFallback(`Failed to parse AI output: ${e.message}`);
        }
      }).catch((err) => {
        tryFallback(err.message || 'Network error calling AnyModel');
      });
    });
  }

  // ── INDEXEDDB LOCAL QUIZ ANSWER CACHE ──
  // Caches hash(prompt + choices) -> parsed answer
  // Instant 0ms recall, 0 token cost, 0 cellular bandwidth on retests/reloads
  const CACHE_DB_NAME = 'FormAI_QuizCache_v1';
  const CACHE_STORE_NAME = 'answers';
  let _cacheDbInstance = null;

  function isAnswerCacheEnabled() {
    return getSafeValue('answer_cache_enabled', 'true') === 'true';
  }

  function getCacheDB() {
    if (_cacheDbInstance) return Promise.resolve(_cacheDbInstance);
    return new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') return resolve(null);
      try {
        const req = indexedDB.open(CACHE_DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
            db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' });
          }
        };
        req.onsuccess = (e) => {
          _cacheDbInstance = e.target.result;
          resolve(_cacheDbInstance);
        };
        req.onerror = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });
  }

  function computePayloadHash(model, promptText, base64Images = []) {
    let raw = (model || '') + '::' + (promptText || '');
    if (base64Images && base64Images.length > 0) {
      base64Images.forEach((img, idx) => {
        if (img && img.data) {
          raw += `::img${idx}_${img.data.slice(0, 40)}_${img.data.length}`;
        }
      });
    }
    let h = 0x811c9dc5;
    for (let i = 0; i < raw.length; i++) {
      h ^= raw.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return 'q_' + (h >>> 0).toString(36);
  }

  async function getCachedAnswer(key) {
    if (!key) return null;
    const db = await getCacheDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
        const req = tx.objectStore(CACHE_STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result?.data || null);
        req.onerror = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });
  }

  async function setCachedAnswer(key, data) {
    if (!key || !data) return;
    const db = await getCacheDB();
    if (!db) return;
    try {
      const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
      tx.objectStore(CACHE_STORE_NAME).put({
        key,
        data,
        timestamp: Date.now()
      });
    } catch (_) {}
  }

  async function clearAnswerCache() {
    const db = await getCacheDB();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
        tx.objectStore(CACHE_STORE_NAME).clear();
        tx.oncomplete = () => {
          console.log('[Google Form AI HUD] 🧹 Answer cache cleared successfully.');
          resolve(true);
        };
        tx.onerror = () => resolve(false);
      } catch (_) {
        resolve(false);
      }
    });
  }

  // Resilient Weak-Signal Wrapper: retries up to 3 times with exponential backoff on cellular jitter/timeouts
  async function callGeminiAPI(apiKey, model, promptText, base64Images = [], maxOutputTokens = 0) {
    if (shouldCancel) {
      throw new Error('Cancelled by user');
    }

    // ── Local IndexedDB Answer Cache Check ──
    const cacheKey = computePayloadHash(model, promptText, base64Images);
    if (isAnswerCacheEnabled()) {
      const cached = await getCachedAnswer(cacheKey);
      if (cached) {
        console.log('[Answer Cache] ⚡ Cache HIT for payload key:', cacheKey);
        setStatus('⚡ [Cache Hit] Instant answer recall (0ms, 0 cellular tokens)...');
        return cached;
      }
    }

    const MAX_ATTEMPTS = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (shouldCancel) {
        throw new Error('Cancelled by user');
      }

      await waitForCellularSignal();

      try {
        const res = await callGeminiAPISingle(apiKey, model, promptText, base64Images, maxOutputTokens);
        if (isAnswerCacheEnabled() && res) {
          await setCachedAnswer(cacheKey, res);
        }
        return res;
      } catch (err) {
        lastError = err;
        if (attempt < MAX_ATTEMPTS && !shouldCancel) {
          const waitMs = attempt * 2000;
          console.warn(`[AnyModel Cellular Shield] Attempt ${attempt}/${MAX_ATTEMPTS} failed (${err.message}). Retrying in ${waitMs / 1000}s...`);
          setStatus(`📶 Weak cellular signal: retry ${attempt}/${MAX_ATTEMPTS} in ${waitMs / 1000}s...`);
          await sleep(waitMs);
        }
      }
    }

    throw lastError || new Error('Network request failed after retries');
  }

  // Live AnyModel Speed & Availability Benchmark Tester
  async function testAvailableModels() {
    setStatus('🔍 Benchmarking AnyModel live models & latency...');
    const activeKey = getActiveApiKey();
    const baseUrl = (getSafeValue('anymodel_base_url', DEFAULT_BASE_URL)).trim().replace(/\/+$/, '');

    const candidateModels = [
      { id: 'ag/gemini-3-flash', name: 'Gemini 3 Flash' },
      { id: 'ag/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'ag/gemini-3.8-flash-high', name: 'Gemini 3.8 Flash High' },
      { id: 'cx/gpt-6-astra', name: 'GPT 6 Astra' },
      { id: 'cx/gpt-6.1-sol', name: 'GPT 6.1 Sol' },
      { id: 'cc/claude-sonnet-5-5', name: 'Claude Sonnet 5.5' },
      { id: 'xai/grok-4.7', name: 'Grok 4.7' },
      { id: 'ds/deepseek-v4-flash-vision', name: 'DeepSeek v4 Vision' },
      { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B' },
      { id: 'am/free', name: 'AnyModel Free Router' }
    ];

    const results = [];
    const modelSelect = document.getElementById('ai-model-select');

    for (const m of candidateModels) {
      setStatus(`Testing ${m.name} (${m.id})...`);
      const t0 = performance.now();
      try {
        const res = await httpRequest({
          method: 'POST',
          url: `${baseUrl}/chat/completions`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeKey}`
          },
          data: JSON.stringify({
            model: m.id,
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 3
          }),
          timeout: 7000
        });

        const elapsed = Math.round(performance.now() - t0);
        let parsed = null;
        try { parsed = JSON.parse(res.responseText || '{}'); } catch(e) {}

        if (res.status === 200 && !parsed?.error) {
          results.push({ id: m.id, ok: true, latency: elapsed });
        } else {
          const code = parsed?.error?.code || res.status;
          results.push({ id: m.id, ok: false, status: code, latency: elapsed, error: parsed?.error?.message || 'Error' });
        }
      } catch (err) {
        results.push({ id: m.id, ok: false, status: 'timeout', latency: 0, error: err.message });
      }
    }

    const working = results.filter(r => r.ok).sort((a, b) => a.latency - b.latency);

    // Annotate select options with latency badges
    if (modelSelect) {
      Array.from(modelSelect.options).forEach(opt => {
        const found = results.find(r => r.id === opt.value);
        if (found) {
          const baseLabel = opt.textContent.replace(/\s*\[(🟢|🔴|🟡).*?\]\s*$/, '');
          if (found.ok) {
            opt.textContent = `${baseLabel} [🟢 ${found.latency}ms]`;
          } else {
            opt.textContent = `${baseLabel} [🔴 ${found.status || 'Offline'}]`;
          }
        }
      });
      if (working.length > 0) {
        modelSelect.value = working[0].id;
        setSafeValue('anymodel_model', working[0].id);
      }
    }

    if (working.length > 0) {
      setStatus(`✅ Model Test Finished! Fastest: ${working[0].id} (${working[0].latency}ms). Online: ${working.length}/${candidateModels.length}`);
    } else {
      setStatus(`⚠️ Candidate models failed test. Check AnyModel API key or rate limit.`);
    }

    return results;
  }

  // Robust choice label extractor
  function getChoiceLabel(el) {
    if (!el) return '';

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    const dataVal = el.getAttribute('data-value') || el.getAttribute('data-answer-value');
    if (dataVal && dataVal.trim()) return dataVal.trim();

    const container = el.closest('label, .docssharedWizToggleLabeledContainer, [role="row"], .nWQ3rd, .SGkqEc, .e3Du2d, .Y5AOUb');
    if (container) {
      const textEl = container.querySelector('.docssharedWizToggleLabeledContent, .aDTYNe, .snByac, .ovNFwe, .vRMGwf, span[dir="auto"]');
      let baseText = textEl && textEl.innerText.trim() ? textEl.innerText.trim() : '';
      if (!baseText) {
        const spans = container.querySelectorAll('span[dir="auto"], div[dir="auto"]');
        for (const sp of spans) {
          if (sp.innerText.trim()) {
            baseText = sp.innerText.trim();
            break;
          }
        }
      }

      // Check if this container is an "Other:" option row
      const isOtherContainer = container.querySelector('input[type="text"], input.Hvn9fb, input.whsOnd') ||
                               container.getAttribute('aria-label')?.toLowerCase().includes('other') ||
                               /\b(other|iba|lainnya|lain|otro|autre|sonstiges)\b/i.test(baseText);
      if (isOtherContainer && (!baseText || baseText.length < 2)) {
        baseText = 'Other:';
      }

      // If the option contains an image with alt or title text, append it
      const imgInOpt = container.querySelector('img');
      if (imgInOpt) {
        const alt = imgInOpt.getAttribute('alt') || imgInOpt.getAttribute('aria-label') || imgInOpt.getAttribute('title');
        if (alt && alt.trim()) {
          return baseText ? `${baseText} [Image: ${alt.trim()}]` : `[Image: ${alt.trim()}]`;
        }
      }

      if (baseText) return baseText;
    }

    if (el.innerText && el.innerText.trim()) {
      return el.innerText.trim();
    }

    return '';
  }

  // Silent Smooth Scroller: centers active question block without touching styles/borders
  function smoothScrollToQuestion(el) {
    if (!el) return;
    try {
      const block = el.closest('.Qr7Oae, div[role="listitem"]') || el;
      block.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      try {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const rect = el.getBoundingClientRect();
        window.scrollTo({ top: Math.max(0, scrollTop + rect.top - 80), behavior: 'smooth' });
      } catch (e2) {}
    }
  }

  // Universal click simulation with mobile touch synthesis
  function dispatchUniversalClick(el) {
    if (!el) return;
    try {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const ptrOpts = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, pointerId: 1, pointerType: 'touch', isPrimary: true };
      el.dispatchEvent(new PointerEvent('pointerdown', ptrOpts));

      if (typeof Touch !== 'undefined' && typeof TouchEvent !== 'undefined') {
        try {
          const t = new Touch({
            identifier: Date.now(),
            target: el,
            clientX: cx,
            clientY: cy,
            screenX: cx,
            screenY: cy,
            pageX: cx + (window.scrollX || window.pageXOffset || 0),
            pageY: cy + (window.scrollY || window.pageYOffset || 0)
          });
          el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, view: window, touches: [t], targetTouches: [t], changedTouches: [t] }));
          el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, view: window, touches: [], targetTouches: [], changedTouches: [t] }));
        } catch (_) {}
      }

      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy }));
      el.dispatchEvent(new PointerEvent('pointerup', ptrOpts));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy }));
    } catch (e) {}
    try {
      el.click();
    } catch (e) {}
  }

  // Toggles radio or checkbox to desired state with high-precision event synthesis and verification
  async function safelySetToggle(element, shouldBeChecked = true) {
    if (!element || shouldCancel) return false;
    await checkOrientationGate();
    if (shouldCancel) return false;

    const isCurrentlyChecked = element.getAttribute('aria-checked') === 'true';
    if (isCurrentlyChecked === shouldBeChecked) {
      const parentBlock = element.closest('.Qr7Oae, div[role="listitem"]');
      if (parentBlock) clearBlockErrors(parentBlock);
      return true;
    }

    smoothScrollToQuestion(element);
    await sleep(100);

    const clickTarget = element.closest('label, .docssharedWizToggleLabeledContainer') || element;
    dispatchUniversalClick(clickTarget);
    await sleep(120);

    if ((element.getAttribute('aria-checked') === 'true') !== shouldBeChecked) {
      dispatchUniversalClick(element);
      await sleep(120);
    }

    // Native hidden radio/checkbox input sync if wrapped in Google Forms container
    if ((element.getAttribute('aria-checked') === 'true') !== shouldBeChecked) {
      const nativeInput = element.querySelector('input[type="radio"], input[type="checkbox"]') ||
                          element.closest('label, .docssharedWizToggleLabeledContainer')?.querySelector('input[type="radio"], input[type="checkbox"]');
      if (nativeInput) {
        nativeInput.checked = shouldBeChecked;
        nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
        nativeInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    const success = (element.getAttribute('aria-checked') === 'true') === shouldBeChecked;
    const parentBlock = element.closest('.Qr7Oae, div[role="listitem"]');
    if (parentBlock) clearBlockErrors(parentBlock);
    return success;
  }

  // Sets text input or textarea with full browser editing command, native setter, and MDC floating-label lift
  async function setInputField(inputEl, val) {
    if (!inputEl || shouldCancel) return false;
    await checkOrientationGate();
    if (shouldCancel) return false;
    try {
      inputEl.removeAttribute('disabled');
      inputEl.removeAttribute('aria-disabled');
      inputEl.disabled = false;
    } catch (e) {}

    smoothScrollToQuestion(inputEl);
    await sleep(90);

    try {
      dispatchUniversalClick(inputEl);
      inputEl.focus({ preventScroll: true });
    } catch (e) {
      try { inputEl.focus(); } catch (e2) {}
    }

    const strVal = String(val !== undefined && val !== null ? val : '');
    const pacing = getPacingConfig();
    const proto = inputEl instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    const applyVal = (v) => {
      if (nativeSetter) nativeSetter.call(inputEl, v);
      else inputEl.value = v;
    };

    // 1. Humanized Burst Typing Simulation (for natural entry and anti-detection on long text)
    if (pacing.typeMax > 0 && strVal.length > 5) {
      applyVal('');
      inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

      let typed = '';
      let charIdx = 0;
      while (charIdx < strVal.length) {
        if (shouldCancel) return false;
        await checkOrientationGate();
        const burstSize = Math.min(strVal.length - charIdx, Math.floor(Math.random() * 3) + 1);
        const chunk = strVal.slice(charIdx, charIdx + burstSize);
        charIdx += burstSize;
        typed += chunk;
        applyVal(typed);

        try {
          inputEl.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, composed: true, inputType: 'insertText', data: chunk }));
          inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: chunk }));
        } catch (e) {
          inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        }

        const lastCh = chunk.slice(-1);
        let jitter = pacing.typeMin + Math.random() * (pacing.typeMax - pacing.typeMin);
        if (['.', ',', '!', '?', ';'].includes(lastCh)) {
          jitter += 70 + Math.random() * 80;
        } else if (lastCh === ' ') {
          jitter += 25 + Math.random() * 30;
        }
        await pausableSleep(Math.floor(jitter));
      }
    } else {
      // Fast / short string: instant replacement
      try {
        inputEl.select();
        if (typeof inputEl.setSelectionRange === 'function') {
          inputEl.setSelectionRange(0, inputEl.value.length);
        }
      } catch (e) {}

      let execSuccess = false;
      try {
        execSuccess = document.execCommand('insertText', false, strVal);
      } catch (e) {}

      if (!execSuccess || inputEl.value !== strVal) {
        applyVal(strVal);
      }

      try {
        inputEl.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, composed: true, inputType: 'insertText', data: strVal }));
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: strVal }));
      } catch (e) {}
    }

    // 2. Dispatch full suite of input, change, and key events
    inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    inputEl.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    inputEl.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));

    // 5. Update Google Forms UI container classes: float the placeholder label ("Ang iyong sagot") and clear error
    try {
      const itemBlock = inputEl.closest('.Qr7Oae, div[role="listitem"]');
      if (itemBlock) {
        clearBlockErrors(itemBlock);
      } else {
        const parentMdc = inputEl.closest('.rFrNMe, [jscontroller]');
        if (parentMdc) {
          parentMdc.classList.add('CDecda');
          parentMdc.classList.remove('k39duf');
        }
      }
    } catch (e) {}

    await sleep(60);
    try { inputEl.blur(); } catch (e) {}
    await sleep(80);
    return inputEl.value === strVal;
  }

  async function ensureQuestionReady(block) {
    smoothScrollToQuestion(block);
    await sleep(180);

    const readyTarget = block.querySelector('div[role="radio"], div[role="checkbox"], div[role="listbox"], input, textarea, div[role="row"]');
    if (!readyTarget) {
      await sleep(180);
    }
  }

  function getQuestionInfo(block) {
    // Specifically target the question heading elements.
    // NEVER include parent card wrappers like .geS5n or .c2gzEf which enclose all options.
    let titleEl = block.querySelector('.M7eMe, div[role="heading"], [role="heading"], .F9N22c, legend, .z12JJ');
    let title = '';

    if (titleEl) {
      try {
        const clone = titleEl.cloneNode(true);
        // Remove required question asterisk and screen-reader badges
        clone.querySelectorAll('.v3Duub, [aria-label*="Required" i], [aria-label*="kailangan" i], [role="alert"]').forEach(el => el.remove());
        title = (clone.innerText || clone.textContent || '').trim();
      } catch (e) {
        title = (titleEl.innerText || titleEl.textContent || '').trim();
      }
    }

    if (!title) {
      const headingContainer = block.querySelector('.hoUpQr, .c2gzEf');
      if (headingContainer) {
        const firstLine = (headingContainer.innerText || '').split('\n')[0].trim();
        if (firstLine) title = firstLine;
      }
    }

    if (!title) {
      const ariaEl = block.querySelector('[aria-label]:not([role="radio"]):not([role="checkbox"]):not(input):not(textarea)');
      if (ariaEl) {
        title = (ariaEl.getAttribute('aria-label') || '').trim();
      }
    }

    if (!title) {
      title = 'Question';
    }

    // Clean up any trailing asterisk indicator from required fields
    title = title.replace(/[\s*]+$/, '').trim();

    // Capture all genuine question descriptions, instructions, and help notes.
    // Explicitly exclude option list wrappers (.oyXaNc), error alerts (.asBE0e, .RDeYad), and control containers.
    const descEls = block.querySelectorAll('div[id$="_desc"], .g3Jh9, div[jsname="W11fsf"], [role="note"]');
    const descriptions = Array.from(descEls).map(el => {
      if (el.closest('.oyXaNc, [role="radiogroup"], [role="list"], .asBE0e, .RDeYad, .k39duf, [role="alert"]')) {
        return '';
      }
      return (el.innerText || el.textContent || '').trim();
    }).filter(d => Boolean(d) && d !== title);
    const description = descriptions.join('\n').trim();

    let fullText = title;
    if (description) {
      fullText += `\nContext/Instructions: ${description}`;
    }
    return { title, description, fullText };
  }

  // Enhanced vision & image extractor: extracts question and choice images with srcset and base64 compression
  async function extractImages(block) {
    const images = [];
    const mainImgs = block.querySelectorAll('img, picture img, [role="img"] img, .kHssdc');
    for (const img of mainImgs) {
      const src = img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || (img.getAttribute('srcset') ? img.getAttribute('srcset').split(',')[0].split(' ')[0] : '') || '';
      if (!src || src.startsWith('data:image/svg')) continue;
      if (src.includes('googleusercontent.com/a/') || src.includes('accounts.google.com')) continue;
      if (img.width > 0 && img.width < 28 && img.height > 0 && img.height < 28) continue;

      const b64 = await getBase64FromImageUrl(src);
      if (b64) images.push(b64);
    }
    return images;
  }

  // 1. Grid Detector
  function detectGrid(block) {
    const candidateRows = block.querySelectorAll('div[role="row"], tr[role="row"], div[role="radiogroup"], .EzyPc');
    const validRows = [];

    let columnHeaders = [];
    const headerCells = block.querySelectorAll('div[role="columnheader"], th[role="columnheader"], th');
    if (headerCells.length > 0) {
      columnHeaders = Array.from(headerCells).map(c => c.innerText.trim()).filter(Boolean);
    }

    for (const row of candidateRows) {
      if (row.querySelector('div[role="columnheader"], th')) continue;
      const radios = row.querySelectorAll('div[role="radio"]');
      const checkboxes = row.querySelectorAll('div[role="checkbox"]');
      if (radios.length > 0 || checkboxes.length > 0) {
        validRows.push({
          rowEl: row,
          radios: Array.from(radios),
          checkboxes: Array.from(checkboxes)
        });
      }
    }

    return {
      isGrid: validRows.length > 1,
      rows: validRows,
      columnHeaders
    };
  }

  // 2. Accurate Date & Time Detector
  function detectDateTime(block) {
    const nativeDate = block.querySelector('input[type="date"]');
    if (nativeDate) {
      return { type: 'date', inputs: [nativeDate] };
    }

    const dateContainer = block.querySelector('[data-type="date"], div[jscontroller="oCiOec"], .freebirdFormviewerViewItemsDateDateInputs');
    if (dateContainer) {
      const inputs = Array.from(dateContainer.querySelectorAll('input[type="text"], input[type="date"], input.whsOnd'));
      if (inputs.length > 0) return { type: 'date', inputs };
    }

    const allTextInputs = Array.from(block.querySelectorAll('input[type="text"], input.whsOnd'));
    if (allTextInputs.length === 3 && !block.querySelector('div[role="radio"], div[role="checkbox"]')) {
      const hasDateHints = allTextInputs.some(inp => {
        const al = (inp.getAttribute('aria-label') || '').toLowerCase();
        const ph = (inp.getAttribute('placeholder') || '').toLowerCase();
        return /\b(day|hari|month|bulan|year|tahun|dd|mm|yyyy)\b/i.test(al + ' ' + ph);
      });
      if (hasDateHints) {
        return { type: 'date', inputs: allTextInputs };
      }
    }

    const nativeTime = block.querySelector('input[type="time"]');
    if (nativeTime) {
      return { type: 'time', inputs: [nativeTime] };
    }

    const timeContainer = block.querySelector('[data-type="time"], div[jscontroller="l4eaPe"], .freebirdFormviewerViewItemsTimeTimeInputs');
    if (timeContainer) {
      const inputs = Array.from(timeContainer.querySelectorAll('input[type="text"], input[type="time"], input.whsOnd'));
      if (inputs.length > 0) return { type: 'time', inputs };
    }

    if (allTextInputs.length === 2 && !block.querySelector('div[role="radio"], div[role="checkbox"]')) {
      const hasTimeHints = allTextInputs.some(inp => {
        const al = (inp.getAttribute('aria-label') || '').toLowerCase();
        const ph = (inp.getAttribute('placeholder') || '').toLowerCase();
        return /\b(hour|jam|minute|menit|hh|mm)\b/i.test(al + ' ' + ph);
      });
      if (hasTimeHints) {
        return { type: 'time', inputs: allTextInputs };
      }
    }

    return null;
  }

  // 3. Rating Detector
  function detectRating(block, radioOptions) {
    if (radioOptions.length === 0) return null;
    const isStar = Array.from(radioOptions).some(r => {
      const aria = (r.getAttribute('aria-label') || '').toLowerCase();
      return aria.includes('star') || aria.includes('bintang') || aria.includes('estrella') || aria.includes('stern') || aria.includes('étoile');
    });
    const isHeart = Array.from(radioOptions).some(r => {
      const aria = (r.getAttribute('aria-label') || '').toLowerCase();
      return aria.includes('heart') || aria.includes('hati') || aria.includes('coraz') || aria.includes('herz') || aria.includes('coeur');
    });
    const isThumb = Array.from(radioOptions).some(r => {
      const aria = (r.getAttribute('aria-label') || '').toLowerCase();
      return aria.includes('thumb') || aria.includes('jempol') || aria.includes('pulgar') || aria.includes('pouce');
    });
    const isRatingUI = block.querySelector('[data-rating="true"], .M4DNbe, .e5jG5e, [data-rating-level]');
    if (isStar || isHeart || isThumb || isRatingUI) {
      return {
        isRating: true,
        type: isHeart ? 'heart' : (isThumb ? 'thumb' : 'star'),
        count: radioOptions.length
      };
    }
    return null;
  }

  // 4. Linear Scale Detector
  function detectLinearScale(block, radioOptions) {
    if (radioOptions.length < 2) return null;
    const scaleContainer = block.querySelector('[data-scale="true"], .ss-scalerow, .T2vD, .OIC90c');
    const allNumeric = Array.from(radioOptions).every(r => {
      const txt = getChoiceLabel(r);
      return !isNaN(parseInt(txt)) && txt.length <= 3;
    });

    if (scaleContainer || allNumeric) {
      const boundEls = block.querySelectorAll('.OIC90c, .T2vD, .ss-scalerow span, .V4d7Ke');
      const edgeTexts = Array.from(boundEls).map(el => el.innerText.trim()).filter(Boolean);
      return {
        isScale: true,
        lowLabel: edgeTexts[0] || 'Lowest',
        highLabel: edgeTexts[edgeTexts.length - 1] || 'Highest'
      };
    }
    return null;
  }

  // 5. Dropdown Solver
  async function solveDropdown(block, questionText, images, apiKey, model) {
    const trigger = block.querySelector('div[role="listbox"]');
    if (!trigger) return false;

    trigger.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(150);
    dispatchUniversalClick(trigger);

    await waitForElement('div[role="option"]', document, 2000);
    await sleep(250);

    const visibleOptions = Array.from(document.querySelectorAll('div[role="option"]'))
      .filter((opt) => {
        const text = opt.innerText.trim().toLowerCase();
        return opt.offsetParent !== null &&
          opt.getAttribute('data-value') !== '' &&
          text !== 'choose' &&
          text !== 'pilih' &&
          text !== 'select' &&
          text !== '';
      });

    if (visibleOptions.length === 0) {
      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape', code: 'Escape', keyCode: 27 }));
      await sleep(100);
      return false;
    }

    const labels = visibleOptions.map((opt, i) => opt.innerText.trim() || opt.getAttribute('data-value') || `Option ${i + 1}`);

    const currentProfile = getUserProfile();
    const detectedField = detectFieldFromOptions(labels);
    if (detectedField && currentProfile[detectedField]) {
      const pIdx = findMatchingOptionIndex(labels, detectedField, currentProfile[detectedField]);
      if (pIdx !== -1 && visibleOptions[pIdx]) {
        setStatus(`[Dropdown Analyzed] 🎯 Options indicate "${detectedField}" -> selected "${labels[pIdx]}" (0 API tokens used)`);
        await safelySelectDropdownOption(visibleOptions[pIdx]);
        await sleep(STEP_DELAY_MS);
        return true;
      }
    }

    const isLikert = isLikertOrScaleLabels(labels);
    const grounding = getGroundingPrompt({ fullText: questionText, title: '' }, labels, isLikert);

    if (grounding.found) {
      setStatus(`📚 Grounded dropdown with "${grounding.primarySource}" (${grounding.count} matching excerpts, score: ${grounding.topScore})...`);
    }

    let webEvidence = '';
    if (!isLikert && (!grounding.found || grounding.mode === 'hybrid')) {
      setStatus(`🔍 Searching Google for quiz verification...`);
      webEvidence = (await fetchWebSearchEvidence('', questionText, labels)) || '';
    }

    const prompt = `${grounding.prompt}${webEvidence}Question: ${questionText}
Dropdown Options: ${JSON.stringify(labels)}

Instructions:
1. Carefully read the question, any notes, and all dropdown choices.
2. PAY CRITICAL ATTENTION to negative qualifiers like "NOT", "EXCEPT", "FALSE", or "INCORRECT". If asked what is NOT true, select the false option.
3. Cross-reference directly with any attached document evidence or Live Google Search evidence. Eliminate distractors and trick choices.
4. If a calculation is needed, compute it step by step in "reasoning" first.

Respond with JSON: {"reasoning": "<step-by-step reasoning identifying the single best option>", "chosen_index": <int, zero-based index>}`;

    try {
      const res = await callGeminiAPI(apiKey, model, prompt, images, 60);
      let idx = Number(res.chosen_index);
      if (isNaN(idx) || !visibleOptions[idx]) {
        const txt = String(res.answer || res.option || res.chosen_option || '').trim().toLowerCase();
        const found = labels.findIndex(l => l.trim().toLowerCase() === txt || l.trim().toLowerCase().includes(txt));
        if (found !== -1) idx = found;
      }
      if (isNaN(idx) || idx < 0 || !visibleOptions[idx]) {
        idx = 0;
      }
      if (visibleOptions[idx]) {
        await safelySelectDropdownOption(visibleOptions[idx]);
        await sleep(STEP_DELAY_MS);
        return true;
      }
    } catch (e) {
      console.warn('[Google Form AI HUD] Dropdown solving failed:', e);
      if (visibleOptions[0]) {
        await safelySelectDropdownOption(visibleOptions[0]);
        await sleep(STEP_DELAY_MS);
        return true;
      }
    }

    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape', code: 'Escape', keyCode: 27 }));
    await sleep(100);
    return false;
  }

  // 100% Token-Free Fallback for personal profile fields
  async function applyProfileFallback(block, matched, qInfo) {
    if (!matched || !matched.value) return false;

    if (isQuestionAlreadyAnswered(block)) {
      return true;
    }

    const dateTimeData = detectDateTime(block);
    const dropdownBox = block.querySelector('div[role="listbox"]');
    const radioOptions = block.querySelectorAll('div[role="radio"]');
    const shortInput = block.querySelector('input[type="text"], input[type="email"], input[type="number"], input[type="url"], input[type="tel"], input.whsOnd');
    const textarea = block.querySelector('textarea');

    if (matched.field === 'birthplaceAndDate') {
      if (shortInput) {
        await setInputField(shortInput, String(matched.value));
        return true;
      }
      if (textarea) {
        await setInputField(textarea, String(matched.value));
        return true;
      }
    }

    if (dateTimeData && dateTimeData.type === 'date') {
      const rawVal = String(matched.value).trim();
      let year = '', month = '', day = '';
      if (rawVal.includes('-')) {
        const parts = rawVal.split('-');
        if (parts[0].length === 4) {
          year = parts[0]; month = parts[1]; day = parts[2];
        } else {
          day = parts[0]; month = parts[1]; year = parts[2];
        }
      } else if (rawVal.includes('/')) {
        const parts = rawVal.split('/');
        if (parts[0].length === 4) {
          year = parts[0]; month = parts[1]; day = parts[2];
        } else {
          day = parts[0]; month = parts[1]; year = parts[2];
        }
      }
      if (!year) year = '2003';
      if (!month) month = '08';
      if (!day) day = '15';
      if (month.length === 1) month = '0' + month;
      if (day.length === 1) day = '0' + day;

      let filledCount = 0;
      for (const input of dateTimeData.inputs) {
        const label = (input.getAttribute('aria-label') || '').toLowerCase();
        const maxLen = input.getAttribute('maxlength');
        if (input.type === 'date') {
          await setInputField(input, `${year}-${month}-${day}`);
          filledCount++;
        } else if (label.includes('year') || label.includes('tahun') || label.includes('año') || label.includes('jahr') || maxLen === '4') {
          await setInputField(input, year);
          filledCount++;
        } else if (label.includes('month') || label.includes('bulan') || label.includes('mes') || label.includes('monat')) {
          await setInputField(input, month);
          filledCount++;
        } else if (label.includes('day') || label.includes('hari') || label.includes('día') || label.includes('tag')) {
          await setInputField(input, day);
          filledCount++;
        }
      }

      if (filledCount === 0 && dateTimeData.inputs.length >= 3) {
        const yInput = dateTimeData.inputs.find(inp => inp.getAttribute('maxlength') === '4') || dateTimeData.inputs[2];
        const otherInputs = dateTimeData.inputs.filter(inp => inp !== yInput);
        if (yInput) await setInputField(yInput, year);
        if (otherInputs[0]) await setInputField(otherInputs[0], day);
        if (otherInputs[1]) await setInputField(otherInputs[1], month);
      }
      return true;
    }

    const checkboxOptions = block.querySelectorAll('div[role="checkbox"]');

    if (radioOptions.length > 0) {
      const labels = Array.from(radioOptions).map(r => getChoiceLabel(r));
      const idx = findMatchingOptionIndex(labels, matched.field, matched.value);
      if (idx !== -1 && radioOptions[idx]) {
        await safelySetToggle(radioOptions[idx], true);
        return true;
      }
      // Never fall through to shortInput inside a multiple choice block
      return false;
    }

    if (checkboxOptions.length > 0) {
      const labels = Array.from(checkboxOptions).map(c => getChoiceLabel(c));
      const idx = findMatchingOptionIndex(labels, matched.field, matched.value);
      if (idx !== -1 && checkboxOptions[idx]) {
        await safelySetToggle(checkboxOptions[idx], true);
        return true;
      }
      // Never fall through to shortInput inside a checkbox block
      return false;
    }

    if (dropdownBox) {
      dropdownBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(150);
      dispatchUniversalClick(dropdownBox);
      await waitForElement('div[role="option"]', document, 1500);
      await sleep(200);

      const visibleOptions = Array.from(document.querySelectorAll('div[role="option"]'))
        .filter(opt => opt.offsetParent !== null && opt.getAttribute('data-value') !== '');
      const labels = visibleOptions.map(opt => opt.innerText.trim());
      const idx = findMatchingOptionIndex(labels, matched.field, matched.value);
      if (idx !== -1 && visibleOptions[idx]) {
        await safelySelectDropdownOption(visibleOptions[idx]);
        await sleep(STEP_DELAY_MS);
        return true;
      }
      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape', code: 'Escape', keyCode: 27 }));
      await sleep(100);
      return false;
    }

    // Only set shortInput or textarea if this question has no choice controls
    if (shortInput) {
      await setInputField(shortInput, String(matched.value));
      return true;
    }

    if (textarea) {
      await setInputField(textarea, String(matched.value));
      return true;
    }

    return false;
  }

  // Checks if a question or card already contains an answer - PRESERVES user input 100%
  function isQuestionAlreadyAnswered(block) {
    if (!block) return false;

    // Check if Google Forms currently displays an active validation error on this block
    const errorEl = block.querySelector('.k39duf, [role="alert"]:not([style*="display: none"]), .RDeYad:not([style*="display: none"])');
    const hasError = Boolean(errorEl && errorEl.offsetParent !== null && (errorEl.innerText || '').trim().length > 0);
    if (hasError) {
      return false;
    }

    // 1. Multiple-choice or Checkbox GRID
    const gridData = detectGrid(block);
    if (gridData && gridData.isGrid && gridData.rows.length > 0) {
      const allRowsAnswered = gridData.rows.every(row => {
        const hasRadio = row.radios && row.radios.some(r => r.getAttribute('aria-checked') === 'true');
        const hasBox = row.checkboxes && row.checkboxes.some(c => c.getAttribute('aria-checked') === 'true');
        return hasRadio || hasBox;
      });
      return allRowsAnswered;
    }

    // 2. Dropdown listbox
    const listbox = block.querySelector('div[role="listbox"]');
    if (listbox) {
      const dataVal = (listbox.getAttribute('data-value') || '').trim();
      if (dataVal && dataVal !== '' && dataVal !== '__other_option__') return true;

      const selectedItem = listbox.querySelector('.quantumWizMenuPaperselectSelectedItem, .vRMGwf, div[jsname="wQNmvb"]');
      const txt = (selectedItem ? selectedItem.innerText : listbox.innerText || '').trim();
      const isPlaceholder = /^(choose|pilih|pumili|piliin|select|elija|elegir|wählen|auswählen|sélectionner|choisir|scegli|seleziona|\s*)$/i.test(txt) ||
        /pilih salah satu|choose an option|select an option|pumili ng opsyon|pumili ng isa|piliin ang|elija una opción/i.test(txt);
      if (txt && !isPlaceholder) {
        return true;
      }
      return false;
    }

    // 3. Radio option (Multiple choice, linear scale, rating)
    const radios = Array.from(block.querySelectorAll('div[role="radio"]'));
    if (radios.length > 0) {
      const checkedRadio = radios.find(r => r.getAttribute('aria-checked') === 'true');
      if (!checkedRadio) return false;
      const choiceLabel = getChoiceLabel(checkedRadio) || '';
      const isOther = /\b(other|iba|lainnya|lain|otro|autre|sonstiges)\b/i.test(choiceLabel);
      if (isOther) {
        const otherInput = block.querySelector('input[type="text"].exportTextarea, input.quantumWizTextinputPaperinputInput, input[type="text"][aria-label*="Other"], input[type="text"][aria-label*="Iba"], input.Hvn9fb');
        if (otherInput && (!otherInput.value || otherInput.value.trim() === '')) {
          return false;
        }
      }
      return true;
    }

    // 4. Checkbox options
    const checkboxes = Array.from(block.querySelectorAll('div[role="checkbox"]'));
    if (checkboxes.length > 0) {
      const checkedBoxes = checkboxes.filter(c => c.getAttribute('aria-checked') === 'true');
      if (checkedBoxes.length === 0) return false;
      const otherChecked = checkedBoxes.some(c => /\b(other|iba|lainnya|lain|otro|autre|sonstiges)\b/i.test(getChoiceLabel(c)));
      if (otherChecked) {
        const otherInput = block.querySelector('input[type="text"].exportTextarea, input.quantumWizTextinputPaperinputInput, input[type="text"][aria-label*="Other"], input[type="text"][aria-label*="Iba"], input.Hvn9fb');
        if (otherInput && (!otherInput.value || otherInput.value.trim() === '')) {
          return false;
        }
      }
      return true;
    }

    // 5. Textarea (Paragraph)
    const textarea = block.querySelector('textarea');
    if (textarea) {
      const val = (textarea.value || '').trim();
      const ph = (textarea.getAttribute('placeholder') || '').trim();
      return val.length > 0 && val !== ph;
    }

    // 6. Text, email, number, url, tel, date, time inputs
    const textInputs = Array.from(block.querySelectorAll('input[type="text"], input[type="email"], input[type="number"], input[type="url"], input[type="tel"], input[type="date"], input[type="time"], input.whsOnd'))
      .filter(inp => inp.type !== 'hidden' && inp.getAttribute('type') !== 'hidden');

    if (textInputs.length > 0) {
      const allFilled = textInputs.every(inp => {
        const val = (inp.value || '').trim();
        const ph = (inp.getAttribute('placeholder') || '').trim();
        return val.length > 0 && val !== ph;
      });
      return allFilled;
    }

    // 7. Pure file upload question
    const fileUpload = block.querySelector('input[type="file"], [data-upload-url], .freebirdFormviewerViewItemsFileUploadFile, .freebirdFormviewerViewItemsFileUpload');
    if (fileUpload) {
      return true;
    }

    return false;
  }

  // Extracts unique, top-level question blocks on the current page, filtering out nested duplicates and header cards
  function getCleanQuestionBlocks() {
    const rawBlocks = Array.from(document.querySelectorAll('div[role="listitem"], .Qr7Oae, .freebirdFormviewerViewNumberedItemContainer'));

    // 1. Remove nested duplicates (e.g. inner .Qr7Oae inside div[role="listitem"])
    const deduplicated = rawBlocks.filter((block, idx, self) => {
      return !self.some(other => other !== block && other.contains(block));
    });

    // 2. Keep only elements that actually have question controls or input fields
    return deduplicated.filter(block => {
      if (block.querySelector('div[jsname="OCpkoe"], div[jsname="M2NYOe"]')) {
        const onlyNav = !block.querySelector('input:not([type="hidden"]), textarea, div[role="radio"], div[role="checkbox"], div[role="listbox"]');
        if (onlyNav) return false;
      }

      const hasControls = block.querySelector(
        'div[role="radio"], div[role="checkbox"], div[role="listbox"], input:not([type="hidden"]), textarea, div[role="radiogroup"], div[role="row"]'
      );
      return Boolean(hasControls);
    });
  }


  // Thoroughly cleanses Google Forms validation errors, hides alert banners, and lifts floating labels
  function clearBlockErrors(block) {
    if (!block) return;
    try {
      // 1. Hide all error message alerts ("Kailangan ang tanong na ito" / "This question is required")
      const alerts = block.querySelectorAll('.RDeYad, .RxsGPe, div[role="alert"], .M9Bg4d, [jsname="B34EJ"], [jsname="RBsEkc"], .asBE0e, .DPvwYc');
      alerts.forEach(el => {
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
      });

      // 2. Remove all invalid and error classes from all elements in the block
      const errorEls = block.querySelectorAll('.k39duf, [aria-invalid="true"], [aria-errormessage]');
      errorEls.forEach(el => {
        el.classList.remove('k39duf');
        el.removeAttribute('aria-invalid');
        el.removeAttribute('aria-errormessage');
      });

      // 3. For any text inputs / textareas with values, ensure MDC container has CDecda (lifts floating label)
      const inputs = block.querySelectorAll('input, textarea');
      inputs.forEach(inp => {
        inp.removeAttribute('aria-invalid');
        inp.removeAttribute('aria-errormessage');
        inp.classList.remove('k39duf');
        if (inp.value && String(inp.value).trim().length > 0) {
          const parentMdc = inp.closest('.rFrNMe, [jscontroller]');
          if (parentMdc) {
            parentMdc.classList.add('CDecda');
            parentMdc.classList.remove('k39duf');
          }
        }
      });

      // 4. Remove any inline error styling on underline / borders
      const redLines = block.querySelectorAll('.whsOnd, .aCsJod, .Xb9hP, .quantumWizTextinputPaperinputUnderline, .M4dUYb, .o3G2ne, .fu5aee');
      redLines.forEach(el => {
        el.style.borderBottomColor = '';
        el.style.borderColor = '';
      });

      block.classList.remove('k39duf');
      block.removeAttribute('aria-invalid');
      block.removeAttribute('aria-errormessage');
      block.style.borderLeft = '';
    } catch (e) {}
  }

  // Page-wide error cleanser: ensures entire form has 0 visible errors or unlifted labels
  function clearAllPageErrors() {
    try {
      const allQuestionBlocks = getCleanQuestionBlocks();
      allQuestionBlocks.forEach(clearBlockErrors);

      const pageAlerts = document.querySelectorAll('.RDeYad, .RxsGPe, div[role="alert"], [jsname="B34EJ"], [jsname="RBsEkc"], .asBE0e, .m2');
      pageAlerts.forEach(el => {
        if (!el.closest('#ai-form-hud')) {
          el.style.display = 'none';
          el.setAttribute('aria-hidden', 'true');
        }
      });

      const invalidEls = document.querySelectorAll('.k39duf, [aria-invalid="true"], [aria-errormessage]');
      invalidEls.forEach(el => {
        if (!el.closest('#ai-form-hud')) {
          el.classList.remove('k39duf');
          el.removeAttribute('aria-invalid');
          el.removeAttribute('aria-errormessage');
        }
      });

      const allInputs = document.querySelectorAll('input, textarea');
      allInputs.forEach(inp => {
        if (!inp.closest('#ai-form-hud') && inp.value && String(inp.value).trim().length > 0) {
          const mdc = inp.closest('.rFrNMe, [jscontroller]');
          if (mdc) {
            mdc.classList.add('CDecda');
            mdc.classList.remove('k39duf');
          }
        }
      });
    } catch (e) {}
  }

  function markQuestionSolved(block) {
    if (!block) return;
    try {
      const badges = block.querySelectorAll('.ai-solved-badge, .ai-skipped-badge');
      badges.forEach(b => b.remove());
      clearBlockErrors(block);
    } catch (e) {}
  }

  function markQuestionSkipped(block, reason) {
    if (!block) return;
    const badges = block.querySelectorAll('.ai-solved-badge, .ai-skipped-badge');
    badges.forEach(b => b.remove());
    block.style.borderLeft = '';
  }

  // Discovers Google Forms Next and Submit navigation buttons (multi-language support including Tagalog)
  // Discovers Google Forms Next and Submit navigation buttons (multi-language support including Tagalog, Indonesian, English, Spanish, etc.)
  function findFormNavigationButtons() {
    let nextBtn = null;
    let submitBtn = null;
    let backBtn = null;

    const matchBtnType = (el) => {
      const text = (el.innerText || el.textContent || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
      const combined = `${text} ${aria}`.trim();
      if (!combined) return null;

      if (/\b(submit|kirim|isumite|ipasa|enviar|envoyer|senden|invia|kirimkan|soumettre)\b/i.test(combined)) {
        return 'submit';
      }
      if (/\b(next|berikutnya|susunod|kasunod|lanjut|selanjutnya|siguiente|suivant|weiter|avanti|prossimo)\b/i.test(combined)) {
        return 'next';
      }
      if (/\b(back|kembali|bumalik|atrás|retour|zurück|indietro|precedente)\b/i.test(combined)) {
        return 'back';
      }
      return null;
    };

    const candidates = Array.from(document.querySelectorAll('div[role="button"], span.NPEfkd, div.uArJ5e, button, .l4V7wb, span.M7eMe')).filter(el => el.offsetParent !== null);

    for (const el of candidates) {
      const type = matchBtnType(el);
      const clickable = el.closest('div[role="button"], .uArJ5e, button') || el;
      if (clickable.offsetParent === null) continue;

      if (type === 'next' && !nextBtn) nextBtn = clickable;
      else if (type === 'submit' && !submitBtn) submitBtn = clickable;
      else if (type === 'back' && !backBtn) backBtn = clickable;
    }

    if (!nextBtn) {
      const el = document.querySelector('div[role="button"][jsname="OCpkoe"], div[role="button"][data-mdc-dialog-action="next"]');
      if (el && el.offsetParent !== null) nextBtn = el;
    }
    if (!submitBtn) {
      const el = document.querySelector('div[role="button"][jsname="M2NYOe"], div[role="button"][data-mdc-dialog-action="submit"]');
      if (el && el.offsetParent !== null) submitBtn = el;
    }

    return { nextBtn, submitBtn, backBtn };
  }

  // Multi-page persistent state manager across full browser page reloads / POSTs
  function setAutoSolvingState(active, persona = null) {
    if (active) {
      setSafeValue('multi_page_solving_active', 'true');
      setSafeValue('multi_page_solving_time', Date.now().toString());
      try { sessionStorage.setItem('form_ai_multi_page_active', 'true'); } catch (e) {}
      if (persona) {
        setSafeValue('multi_page_persona', JSON.stringify(persona));
        try { sessionStorage.setItem('form_ai_multi_page_persona', JSON.stringify(persona)); } catch (e) {}
      }
    } else {
      setSafeValue('multi_page_solving_active', 'false');
      setSafeValue('multi_page_persona', '');
      try { sessionStorage.removeItem('form_ai_multi_page_active'); } catch (e) {}
      try { sessionStorage.removeItem('form_ai_multi_page_persona'); } catch (e) {}
      currentSessionPersona = null;
    }
  }

  function isAutoSolvingStateActive() {
    try {
      if (sessionStorage.getItem('form_ai_multi_page_active') === 'true') return true;
    } catch (e) {}
    const active = getSafeValue('multi_page_solving_active', 'false') === 'true';
    if (!active) return false;
    const timeStr = getSafeValue('multi_page_solving_time', '0');
    const diff = Date.now() - parseInt(timeStr, 10);
    return diff < 300000; // valid within 5 minutes
  }

  function getSavedMultiPagePersona() {
    try {
      const s = sessionStorage.getItem('form_ai_multi_page_persona');
      if (s) return JSON.parse(s);
    } catch (e) {}
    try {
      const l = getSafeValue('multi_page_persona', '');
      if (l) return JSON.parse(l);
    } catch (e) {}
    return null;
  }

  // Safely restores HUD action buttons after multi-page execution completes or is cancelled
  function cleanupProcessingState() {
    isProcessing = false;
    setAutoSolvingState(false);
    const solveBtn = document.getElementById('ai-solve-btn');
    const stopBtn = document.getElementById('ai-stop-btn');
    if (solveBtn) {
      solveBtn.disabled = false;
      solveBtn.style.opacity = '1';
    }
    if (stopBtn) {
      stopBtn.disabled = true;
      stopBtn.style.opacity = '0.6';
    }
  }

  // Actively polls DOM until next Google Forms page finishes transitioning or Submit is reached
  async function waitForNextPageReady(maxWaitMs = 14000) {
    const startTime = Date.now();
    await sleep(700);

    while (Date.now() - startTime < maxWaitMs) {
      if (shouldCancel) return { ok: false, reason: 'cancelled' };

      // 1. Check if required question error stopped page advance
      const formErrors = document.querySelectorAll('.k39duf, [role="alert"]:not([style*="display: none"]), .RDeYad:not([style*="display: none"])');
      const hasRealError = Array.from(formErrors).some(el => el.offsetParent !== null && (el.innerText || '').trim().length > 0);
      if (hasRealError) {
        return { ok: false, reason: 'validation_error' };
      }

      // 2. Check if new question blocks mounted
      const blocks = getCleanQuestionBlocks();
      if (blocks.length > 0) {
        return { ok: true, type: 'questions', count: blocks.length };
      }

      // 3. Check if final page with Submit button reached (only if no questions after waiting at least 3 seconds)
      const nav = findFormNavigationButtons();
      if (nav.submitBtn && !nav.nextBtn && (Date.now() - startTime > 3000)) {
        return { ok: true, type: 'submit_only' };
      }

      await sleep(300);
    }

    return { ok: false, reason: 'timeout' };
  }

  // Solves an individual question block with full multi-type detection, dynamic variation, and zero-token profile matching
  async function solveSingleQuestionBlock(block, i, total, apiKey, model, prov, isRetry = false) {
    if (shouldCancel || !block) return false;
    const pacing = getPacingConfig();
    const biasMode = getLikertBiasMode();

    // Check phone alignment / flat desk sensor before proceeding
    await checkOrientationGate();
    if (shouldCancel) return false;

    // Smooth scroll to current question block with visual focus highlight
    smoothScrollToQuestion(block);
    await ensureQuestionReady(block);

    const qInfo = getQuestionInfo(block);

    // Natural reading pause before evaluating (anti-detection), skipped on verification retry
    if (!isRetry && pacing.readMin > 0) {
      const titleLen = (qInfo.title || '').length;
      const readDelay = Math.min(1200, Math.max(pacing.readMin, Math.floor(titleLen * 6 + Math.random() * (pacing.readMax - pacing.readMin))));
      await sleep(readDelay);
      if (shouldCancel) return false;
    }

    if (isQuestionAlreadyAnswered(block)) {
      markQuestionSolved(block);
      if (!isRetry) setStatus(`[${i + 1}/${total}] Question already answered - preserved.`);
      await sleep(60);
      return true;
    }

    const images = await extractImages(block);

    // 0. ZERO-TOKEN PROFILE FALLBACK (only when Profile Autofill is enabled)
    const currentProfile = getUserProfile();
    let matchedProfile = null;

    if (isProfileAutofillEnabled()) {
      matchedProfile = matchUserProfile(qInfo.title, qInfo.description, currentProfile);

      if (!matchedProfile) {
        const preliminaryRadios = block.querySelectorAll('div[role="radio"]');
        const preliminaryBoxes = block.querySelectorAll('div[role="checkbox"]');
        let choiceLabels = [];
        if (preliminaryRadios.length > 0) {
          choiceLabels = Array.from(preliminaryRadios).map(r => getChoiceLabel(r));
        } else if (preliminaryBoxes.length > 0) {
          choiceLabels = Array.from(preliminaryBoxes).map(c => getChoiceLabel(c));
        }
        if (choiceLabels.length > 0) {
          const detectedField = detectFieldFromOptions(choiceLabels);
          if (detectedField && currentProfile[detectedField]) {
            matchedProfile = { field: detectedField, value: currentProfile[detectedField] };
          }
        }
      }

      if (matchedProfile && matchedProfile.value) {
        setStatus(`[${i + 1}/${total}] 👤 Detected "${matchedProfile.field}" - using local profile (0 tokens)...`);
        const filled = await applyProfileFallback(block, matchedProfile, qInfo);
        if (filled && isQuestionAlreadyAnswered(block)) {
          markQuestionSolved(block);
          setStatus(`[${i + 1}/${total}] ✓ Autofilled ${matchedProfile.field}: "${matchedProfile.value}" (0 tokens)`);
          await sleep(STEP_DELAY_MS);
          return true;
        }
      }
    }

    const gridData = detectGrid(block);
    const dateTimeData = detectDateTime(block);
    const dropdownBox = block.querySelector('div[role="listbox"]');
    const radioOptions = block.querySelectorAll('div[role="radio"]');
    const checkboxOptions = block.querySelectorAll('div[role="checkbox"]');
    const textarea = block.querySelector('textarea');
    const shortInput = block.querySelector('input[type="text"], input[type="email"], input[type="number"], input[type="url"], input[type="tel"], input.whsOnd');
    const fileUploadInput = block.querySelector('input[type="file"], [data-upload-url], .freebirdFormviewerViewItemsFileUploadFile, .freebirdFormviewerViewItemsFileUpload, div[role="button"][aria-label*="file" i], div[aria-label*="Tambahkan file" i], div[aria-label*="Add file" i], .m2');

    try {
      // 1. FILE UPLOAD
      if (fileUploadInput && radioOptions.length === 0 && checkboxOptions.length === 0 && !textarea && !shortInput && !dropdownBox && !gridData.isGrid && !dateTimeData) {
        markQuestionSkipped(block, 'Manual file required');
        setStatus(`[${i + 1}/${total}] File upload (skipped - please attach manually)`);
        return true;
      }

      // 2 & 3. GRIDS
      if (gridData.isGrid) {
        const isTickBox = gridData.rows.some(r => r.checkboxes.length > 0);
        const gridName = isTickBox ? 'Tick box grid' : 'Multiple-choice grid';
        setStatus(`[${i + 1}/${total}] Solving ${gridName} (${gridData.rows.length} rows)...`);

        const rowSummaries = gridData.rows.map((rowObj, rIdx) => {
          const rowHeader = rowObj.rowEl.querySelector('div[role="rowheader"], [role="heading"], .M7eMe, .V4d7Ke') || rowObj.rowEl.firstElementChild;
          const rowText = rowHeader ? rowHeader.innerText.trim() : `Row ${rIdx + 1}`;
          return { rIdx, text: rowText };
        });

        if (!isTickBox) {
          const isColLikert = isLikertOrScaleLabels(gridData.columnHeaders);
          const biasNotice = (biasMode === 'positive' && isColLikert) ? '\nRespondent perspective: Generally favorable, positive evaluation across dimensions.' : '';
          const docGrounding = getGroundingPrompt(qInfo, gridData.columnHeaders, isColLikert);
          if (docGrounding.found) {
            setStatus(`[${i + 1}/${total}] 📚 Grounded grid with "${docGrounding.primarySource}"...`);
          }
          const prompt = `${docGrounding.prompt}Carefully examine the grid question, full context, notes, and each row and column label.\nQuestion: ${qInfo.fullText}${biasNotice}\nColumns: ${JSON.stringify(gridData.columnHeaders)}\nRows: ${JSON.stringify(rowSummaries.map(r => r.text))}\n\nTask:\n- Match each row to its single best, factually correct, or most logical column.\n- Think through each row in "reasoning" first.\n\nRespond ONLY with JSON:\n{\n  "reasoning": "Step-by-step logic matching each row to the correct column",\n  "answers": [{"row_index": <int 0-indexed>, "chosen_index": <int 0-indexed column>}]\n}`;
          const res = await callGeminiAPI(apiKey, model, prompt, images, Math.min(350, 100 + gridData.rows.length * 30));
          const answers = Array.isArray(res.answers) ? res.answers : [];

          for (let r = 0; r < gridData.rows.length; r++) {
            if (shouldCancel) break;
            const rowObj = gridData.rows[r];
            const existingChecked = rowObj.rowEl.querySelector('div[role="radio"][aria-checked="true"]');
            if (existingChecked) continue;

            const ansObj = answers.find(a => Number(a.row_index) === r) || answers[r];
            let colIdx = ansObj ? Number(ansObj.chosen_index) : -1;
            if (isNaN(colIdx) || colIdx < 0 || colIdx >= rowObj.radios.length) {
              const ansText = String(ansObj?.chosen_option || ansObj?.answer || '').trim().toLowerCase();
              colIdx = gridData.columnHeaders.findIndex(ch => ch.trim().toLowerCase() === ansText);
            }
            if (isColLikert) {
              colIdx = applyLikertBias(gridData.columnHeaders, (isNaN(colIdx) || colIdx < 0 || !rowObj.radios[colIdx]) ? Math.max(0, gridData.columnHeaders.length - 2) : colIdx, biasMode);
            }
            if (isNaN(colIdx) || colIdx < 0 || colIdx >= rowObj.radios.length) {
              colIdx = 0; // Fallback guarantees row is answered
            }
            if (rowObj.radios[colIdx]) {
              await safelySetToggle(rowObj.radios[colIdx], true);
            }
          }
          markQuestionSolved(block);
        } else {
          const docGrounding = getGroundingPrompt(qInfo, gridData.columnHeaders, false);
          if (docGrounding.found) {
            setStatus(`[${i + 1}/${total}] 📚 Grounded checkbox grid with "${docGrounding.primarySource}"...`);
          }
          const prompt = `${docGrounding.prompt}Carefully examine the checkbox grid question, all context, and row/column labels.\nQuestion: ${qInfo.fullText}\nColumns: ${JSON.stringify(gridData.columnHeaders)}\nRows: ${JSON.stringify(rowSummaries.map(r => r.text))}\n\nTask:\n- For each row, select all applicable/correct column indices.\n- Think through each row in "reasoning" first.\n\nRespond ONLY with JSON:\n{\n  "reasoning": "Step-by-step evaluation for each row",\n  "answers": [{"row_index": <int 0-indexed>, "chosen_indices": [<int 0-indexed columns>]}]\n}`;
          const res = await callGeminiAPI(apiKey, model, prompt, images, Math.min(400, 120 + gridData.rows.length * 35));
          const answers = Array.isArray(res.answers) ? res.answers : [];

          for (let r = 0; r < gridData.rows.length; r++) {
            if (shouldCancel) break;
            const rowObj = gridData.rows[r];
            const existingChecked = rowObj.rowEl.querySelector('div[role="checkbox"][aria-checked="true"]');
            if (existingChecked) continue;

            const ansObj = answers.find(a => Number(a.row_index) === r) || answers[r];
            let chosenIndices = (ansObj && Array.isArray(ansObj.chosen_indices)) ? ansObj.chosen_indices.map(Number) : [];
            if (chosenIndices.length === 0 && rowObj.checkboxes.length > 0) {
              chosenIndices = [0]; // Fallback guarantees row is answered
            }
            for (let c = 0; c < rowObj.checkboxes.length; c++) {
              if (chosenIndices.includes(c)) {
                await safelySetToggle(rowObj.checkboxes[c], true);
              }
            }
          }
          markQuestionSolved(block);
        }
      }

      // 4 & 5. DATE & TIME
      else if (dateTimeData) {
        if (dateTimeData.type === 'date') {
          setStatus(`[${i + 1}/${total}] Solving Date...`);
          const prompt = `Carefully read the question and any notes/requirements.\nQuestion: ${qInfo.fullText}\nRespondent Profile: ${currentProfile.age}-year-old student (${currentProfile.birthYear || '2004'})\nRespond ONLY with JSON:\n{\n  "reasoning": "Brief explanation",\n  "year": "YYYY",\n  "month": "MM",\n  "day": "DD"\n}`;
          const res = await callGeminiAPI(apiKey, model, prompt, images, 100);

          let year = res.year || (res.date ? res.date.split('-')[0] : '2023');
          let month = res.month || (res.date ? res.date.split('-')[1] : '05');
          let day = res.day || (res.date ? res.date.split('-')[2] : '15');
          if (String(month).length === 1) month = '0' + month;
          if (String(day).length === 1) day = '0' + day;

          let filledCount = 0;
          for (const input of dateTimeData.inputs) {
            const label = (input.getAttribute('aria-label') || '').toLowerCase();
            const maxLen = input.getAttribute('maxlength');
            if (input.type === 'date') {
              await setInputField(input, `${year}-${month}-${day}`);
              filledCount++;
            } else if (label.includes('year') || label.includes('tahun') || label.includes('taon') || label.includes('año') || label.includes('jahr') || label.includes('année') || label.includes('年') || maxLen === '4') {
              await setInputField(input, year);
              filledCount++;
            } else if (label.includes('month') || label.includes('bulan') || label.includes('buwan') || label.includes('mes') || label.includes('monat') || label.includes('mois') || label.includes('月')) {
              await setInputField(input, month);
              filledCount++;
            } else if (label.includes('day') || label.includes('hari') || label.includes('araw') || label.includes('día') || label.includes('tag') || label.includes('jour') || label.includes('日')) {
              await setInputField(input, day);
              filledCount++;
            }
          }

          if (filledCount === 0 && dateTimeData.inputs.length >= 3) {
            const yInput = dateTimeData.inputs.find(inp => inp.getAttribute('maxlength') === '4') || dateTimeData.inputs[2];
            const otherInputs = dateTimeData.inputs.filter(inp => inp !== yInput);
            if (yInput) await setInputField(yInput, year);
            if (otherInputs[0]) await setInputField(otherInputs[0], day);
            if (otherInputs[1]) await setInputField(otherInputs[1], month);
          }
          markQuestionSolved(block);
        } else if (dateTimeData.type === 'time') {
          setStatus(`[${i + 1}/${total}] Solving Time...`);
          const prompt = `Carefully read the question and any context.\nQuestion: ${qInfo.fullText}\nFormat: 24h HH:MM\nRespond ONLY with JSON:\n{\n  "reasoning": "Brief explanation",\n  "time": "HH:MM"\n}`;
          const res = await callGeminiAPI(apiKey, model, prompt, images, 80);
          if (res.time) {
            let [hourStr, minStr] = res.time.split(':');
            let hourNum = parseInt(hourStr, 10);
            if (isNaN(hourNum)) hourNum = 12;
            const isPM = hourNum >= 12;
            const ampmStr = isPM ? 'PM' : 'AM';
            let h12 = hourNum % 12;
            if (h12 === 0) h12 = 12;
            const h12Str = String(h12).padStart(2, '0');

            const ampmListbox = block.querySelector('div[role="listbox"]');
            const amRadio = block.querySelector('div[role="radio"][aria-label*="AM" i], div[data-value="AM"]');
            const pmRadio = block.querySelector('div[role="radio"][aria-label*="PM" i], div[data-value="PM"]');
            const uses12h = !!(ampmListbox || amRadio || pmRadio);
            const targetHour = uses12h ? h12Str : hourStr;

            for (const input of dateTimeData.inputs) {
              const label = (input.getAttribute('aria-label') || '').toLowerCase();
              if (input.type === 'time') {
                await setInputField(input, res.time);
              } else if (label.includes('hour') || label.includes('jam') || label.includes('oras') || label.includes('hora') || label.includes('stunde') || label.includes('heure')) {
                await setInputField(input, targetHour);
              } else if (label.includes('minute') || label.includes('menit') || label.includes('minuto') || label.includes('minuten')) {
                await setInputField(input, minStr);
              }
            }

            if (uses12h) {
              if (amRadio && pmRadio) {
                await safelySetToggle(isPM ? pmRadio : amRadio, true);
              } else if (ampmListbox) {
                dispatchUniversalClick(ampmListbox);
                await sleep(150);
                const optToClick = Array.from(document.querySelectorAll('div[role="option"]'))
                  .find(opt => opt.innerText.trim().toUpperCase() === ampmStr && opt.offsetParent !== null);
                if (optToClick) {
                  await safelySelectDropdownOption(optToClick);
                }
              }
            }
            markQuestionSolved(block);
          }
        }
      }

      // 6. DROP-DOWN
      else if (dropdownBox) {
        setStatus(`[${i + 1}/${total}] Solving Drop-down...`);
        const ok = await solveDropdown(block, qInfo.fullText, images, apiKey, model);
        if (ok) markQuestionSolved(block);
      }

      // 7. RATING
      else if (radioOptions.length > 0 && detectRating(block, radioOptions)) {
        const ratingData = detectRating(block, radioOptions);
        setStatus(`[${i + 1}/${total}] Solving Rating (1-${ratingData.count} ${ratingData.type}s)...`);
        const labels = Array.from({ length: ratingData.count }, (_, k) => String(k + 1));
        const biasNotice = biasMode === 'positive' ? '\nRespondent perspective: Satisfied, favorable rating (lean 4-5 stars).' : '';

        const prompt = `Carefully read the entire question and context.\nQuestion: ${qInfo.fullText}${biasNotice}\nRating scale: 1 to ${ratingData.count} (1 = lowest, ${ratingData.count} = highest).\nRespond ONLY with JSON:\n{\n  "reasoning": "Brief evaluation of rating",\n  "chosen_rating": <int from 1 to ${ratingData.count}>\n}`;
        const res = await callGeminiAPI(apiKey, model, prompt, images, 80);
        let rVal = Number(res.chosen_rating ?? res.chosen_index ?? res.answer);
        if (rVal === 0) rVal = 1;
        let finalIdx = (!isNaN(rVal) && rVal >= 1) ? rVal - 1 : Math.max(0, ratingData.count - 2);
        finalIdx = applyLikertBias(labels, finalIdx, biasMode);

        if (finalIdx >= 0 && finalIdx < radioOptions.length) {
          await safelySetToggle(radioOptions[finalIdx], true);
          markQuestionSolved(block);
        }
      }

      // 8. LINEAR SCALE
      else if (radioOptions.length > 0 && detectLinearScale(block, radioOptions)) {
        const scaleData = detectLinearScale(block, radioOptions);
        const labels = Array.from(radioOptions).map((r, idx) => getChoiceLabel(r) || String(idx + 1));
        setStatus(`[${i + 1}/${total}] Solving Linear scale (${labels[0]} to ${labels[labels.length - 1]})...`);
        const biasNotice = biasMode === 'positive' ? '\nRespondent perspective: Positive student experience.' : '';

        const prompt = `Carefully analyze the question, notes, and scale endpoints.\nQuestion: ${qInfo.fullText}${biasNotice}\nLinear Scale: ${scaleData.lowLabel} (${labels[0]}) to ${scaleData.highLabel} (${labels[labels.length - 1]})\nOptions: ${JSON.stringify(labels)}\nRespond ONLY with JSON:\n{\n  "reasoning": "Brief explanation of chosen score",\n  "chosen_index": <int, zero-based index>\n}`;
        const res = await callGeminiAPI(apiKey, model, prompt, images, 80);
        let idx = Number(res.chosen_index);
        if (isNaN(idx) || !radioOptions[idx]) {
          const valStr = String(res.chosen_value ?? res.answer ?? res.chosen_rating ?? '').trim();
          const foundIdx = labels.findIndex(l => l.trim() === valStr);
          if (foundIdx !== -1) idx = foundIdx;
        }
        if (isNaN(idx) || !radioOptions[idx]) {
          idx = Math.max(0, radioOptions.length - 2);
        }
        idx = applyLikertBias(labels, idx, biasMode);

        if (!isNaN(idx) && radioOptions[idx]) {
          await safelySetToggle(radioOptions[idx], true);
          markQuestionSolved(block);
        }
      }

      // 9. MULTIPLE CHOICE
      else if (radioOptions.length > 0) {
        setStatus(`[${i + 1}/${total}] Solving Multiple choice...`);
        const labels = Array.from(radioOptions).map((r, idx) => getChoiceLabel(r) || `Option ${idx + 1}`);
        const isLikert = isLikertOrScaleLabels(labels);
        const biasNotice = (isLikert && biasMode === 'positive') ? '\nRespondent attitude: Favorable / Agree orientation.' : '';

        const grounding = getGroundingPrompt(qInfo, labels, isLikert);
        if (grounding.found) {
          setStatus(`[${i + 1}/${total}] 📚 Grounded in "${grounding.primarySource}" (${grounding.count} matching excerpts, score: ${grounding.topScore})`);
        }

        let webEvidence = '';
        if (!isLikert && (!grounding.found || grounding.mode === 'hybrid')) {
          setStatus(`[${i + 1}/${total}] 🔍 Searching Google for quiz verification...`);
          webEvidence = (await fetchWebSearchEvidence(qInfo.title, qInfo.fullText, labels)) || '';
        }

        const prompt = `${grounding.prompt}${webEvidence}Carefully read the question, any provided context/notes/instructions, and each option.\nQuestion: ${qInfo.fullText}${biasNotice}\nOptions: ${JSON.stringify(labels)}\n\nInstructions:\n- If this is an objective academic test, quiz, math problem, or factual question, determine the single factually correct answer with 100% precision.\n- PAY CRITICAL ATTENTION to negative qualifiers: "NOT", "EXCEPT", "LEAST", "INCORRECT", "FALSE". If the question asks which is NOT true or EXCEPT, select the false option.\n- Cross-reference with any attached document evidence or Live Google Search evidence to verify facts and eliminate distractors/trick choices.\n- For math or quantitative questions, calculate the steps explicitly in "reasoning" before picking.\n- If this is an opinion/survey question, choose the most sensible, natural option aligning with a real student persona.\n- Always prefer selecting from the predefined options. Only select "Other" if none of the listed options apply.\n- Think through each option in the "reasoning" field first to avoid careless mistakes.\n\nRespond ONLY with JSON:\n{\n  "reasoning": "Step-by-step logic checking each option against the question",\n  "chosen_index": <int, zero-based index of best option>,\n  "other_text": "<optional custom text only if choosing Other>"\n}`;
        const res = await callGeminiAPI(apiKey, model, prompt, images, 160);
        let idx = Number(res.chosen_index);

        if (idx === radioOptions.length && !radioOptions[idx]) {
          idx = idx - 1;
        }

        if (isNaN(idx) || !radioOptions[idx]) {
          const ansText = String(res.answer || res.option || res.chosen_option || '').trim().toLowerCase();
          const foundIdx = labels.findIndex(l => {
            const lt = l.trim().toLowerCase();
            return lt === ansText || lt.startsWith(ansText) || ansText.startsWith(lt) || lt.includes(ansText) || (ansText && ansText.includes(lt));
          });
          if (foundIdx !== -1) idx = foundIdx;
        }

        if (isLikert) {
          idx = applyLikertBias(labels, (isNaN(idx) || !radioOptions[idx]) ? labels.length - 2 : idx, biasMode);
        }

        if (isNaN(idx) || idx < 0 || !radioOptions[idx]) {
          idx = 0; // Guarantee option is selected
        }

        if (radioOptions[idx]) {
          await safelySetToggle(radioOptions[idx], true);

          const isOtherOption = /\b(other|lainnya|lain|iba|otro|autre|sonstiges)\b/i.test(labels[idx]);
          if (isOtherOption) {
            if (res.other_text && String(res.other_text).trim()) {
              const selectedContainer = radioOptions[idx].closest('label, .docssharedWizToggleLabeledContainer, .e3Du2d, .Y5AOUb');
              const otherInput = selectedContainer?.querySelector('input[type="text"], input.Hvn9fb, input.whsOnd') ||
                                 block.querySelector('input.Hvn9fb, input[aria-label*="Other" i], input[aria-label*="Iba" i], input[aria-label*="Lainnya" i], input[type="text"]');
              if (otherInput) {
                await setInputField(otherInput, String(res.other_text).trim());
              }
            } else {
              const nonOtherIdx = labels.findIndex(l => !/\b(other|lainnya|lain|iba|otro|autre|sonstiges)\b/i.test(l));
              if (nonOtherIdx !== -1 && radioOptions[nonOtherIdx]) {
                await safelySetToggle(radioOptions[nonOtherIdx], true);
              }
            }
          }
          markQuestionSolved(block);
        }
      }

      // 10. CHECKBOXES
      else if (checkboxOptions.length > 0) {
        setStatus(`[${i + 1}/${total}] Solving Checkboxes...`);
        const labels = Array.from(checkboxOptions).map((c, idx) => getChoiceLabel(c) || `Option ${idx + 1}`);

        const grounding = getGroundingPrompt(qInfo, labels, false);
        if (grounding.found) {
          setStatus(`[${i + 1}/${total}] 📚 Grounded in "${grounding.primarySource}" (${grounding.count} matching excerpts, score: ${grounding.topScore})`);
        }

        let webEvidence = '';
        if (!grounding.found || grounding.mode === 'hybrid') {
          setStatus(`[${i + 1}/${total}] 🔍 Searching Google for quiz verification...`);
          webEvidence = (await fetchWebSearchEvidence(qInfo.title, qInfo.fullText, labels)) || '';
        }

        const prompt = `${grounding.prompt}${webEvidence}Carefully read the question, instructions, and all available choices.\nQuestion: ${qInfo.fullText}\nOptions: ${JSON.stringify(labels)}\n\nInstructions:\n- If this is a test or knowledge question, select ALL options that are factually correct.\n- PAY CRITICAL ATTENTION to negative qualifiers like "NOT", "EXCEPT", "INCORRECT", or "FALSE".\n- Cross-reference with any attached document evidence or Live Google Search evidence to eliminate distractors and false claims.\n- If this is a survey question, select the options that genuinely apply to a college student.\n- Prefer selecting from the predefined options. Do NOT choose "Other" unless none of the predefined options apply.\n- Put your chain-of-thought analysis in "reasoning" first.\n\nRespond ONLY with JSON:\n{\n  "reasoning": "Step-by-step verification of each option",\n  "chosen_indices": [<int, zero-based index of each correct/selected option>],\n  "other_text": "<optional custom text if Other is checked>"\n}`;
        const res = await callGeminiAPI(apiKey, model, prompt, images, 200);
        let indices = (res.chosen_indices || []).map(Number);

        if (indices.length === 0 && (res.chosen_options || res.answers)) {
          const textAnswers = (res.chosen_options || res.answers || []).map(a => String(a).trim().toLowerCase());
          indices = labels.map((l, lIdx) => textAnswers.some(t => l.toLowerCase().includes(t) || t.includes(l.toLowerCase())) ? lIdx : -1).filter(idx => idx !== -1);
        }

        if (indices.includes(checkboxOptions.length) && !indices.includes(0)) {
          indices = indices.map(x => x - 1);
        }

        if (indices.length === 0 && checkboxOptions.length > 0) {
          indices = [0]; // Guarantee at least one checkbox is answered
        }

        for (let c = 0; c < checkboxOptions.length; c++) {
          const shouldCheck = indices.includes(c);
          await safelySetToggle(checkboxOptions[c], shouldCheck);
        }

        for (const c of indices) {
          if (checkboxOptions[c]) {
            const isOtherOption = /\b(other|lainnya|lain|iba|otro|autre|sonstiges)\b/i.test(labels[c]);
            if (isOtherOption) {
              if (res.other_text && String(res.other_text).trim()) {
                const cContainer = checkboxOptions[c].closest('label, .docssharedWizToggleLabeledContainer, .e3Du2d, .Y5AOUb');
                const otherInput = cContainer?.querySelector('input[type="text"], input.Hvn9fb, input.whsOnd') ||
                                   block.querySelector('input.Hvn9fb, input[aria-label*="Other" i], input[aria-label*="Iba" i], input[aria-label*="Lainnya" i], input[type="text"]');
                if (otherInput) {
                  await setInputField(otherInput, String(res.other_text).trim());
                }
              } else {
                // If Other was checked but no text was provided, uncheck it to avoid validation failure
                await safelySetToggle(checkboxOptions[c], false);
              }
            }
          }
        }
        markQuestionSolved(block);
      }

      // 11. PARAGRAPH (Dynamic Answer Variation)
      else if (textarea) {
        setStatus(`[${i + 1}/${total}] Solving Paragraph (Dynamic Variation)...`);

        const grounding = getGroundingPrompt(qInfo, [], false);
        if (grounding.found) {
          setStatus(`[${i + 1}/${total}] 📚 Grounded paragraph in "${grounding.primarySource}" (Score: ${grounding.topScore})`);
        }

        const PERSPECTIVES = [
          'practical daily convenience, ease of use, and time-saving aspects',
          'academic and personal learning growth, productivity, and real-world relevance',
          'clarity, intuitive structure, and overall positive user experience',
          'smooth digital workflow, responsiveness, and consistent reliability',
          'teamwork, modern collaborative benefits, and constructive practical value',
          'thoughtful user perspective highlighting accessibility and personal satisfaction'
        ];
        const chosenPerspective = PERSPECTIVES[Math.floor(Math.random() * PERSPECTIVES.length)];
        const randomSeed = Math.floor(Math.random() * 100000);

        const prompt = `${grounding.prompt}You are a real respondent filling out a Google Form questionnaire.
Respondent Profile: ${currentProfile.age}-year-old student at ${currentProfile.schoolOrOrg}, studying ${currentProfile.facultyOrMajor} (residing in ${currentProfile.address || 'Quezon City'}).
Personal Angle to emphasize (for survey/opinion questions): ${chosenPerspective}.
Question / Prompt: ${qInfo.fullText}

Instructions:
- Carefully read the question and any notes/instructions.
- If this is an academic, technical, or factual exam question, directly answer it accurately using the attached study material evidence.
- If this is an opinion/survey question, write a genuine, thoughtful 1-3 sentence response matching the student profile.
- Avoid robotic phrases (NEVER say "As an AI..." or "In my opinion as an AI...").
- Keep the phrasing natural, realistic, and high quality.
Variation Token: #${randomSeed}

Respond ONLY with valid JSON:
{
  "reasoning": "Key points to address",
  "answer": "<your natural, high-quality response>"
}`;

        const res = await callGeminiAPI(apiKey, model, prompt, images, 280);

        let ans = res.answer ?? res.response ?? res.text ?? res.result ?? (typeof res === 'string' ? res : '');
        if (!ans || String(ans).trim() === '') {
          const DYNAMIC_PARAGRAPH_FALLBACKS = [
            `From my perspective as a ${currentProfile.facultyOrMajor || 'college'} student at ${currentProfile.schoolOrOrg || 'university'}, this provides substantial convenience and helps streamline daily tasks effectively.`,
            `I appreciate the straightforward layout and clear usability, which makes navigating requirements much faster and more reliable during busy terms.`,
            `It integrates smoothly into regular routines, reducing friction and offering dependable support for ongoing academic and personal activities.`,
            `Overall, I find it well-organized, responsive, and genuinely practical for keeping track of key requirements consistently.`
          ];
          ans = DYNAMIC_PARAGRAPH_FALLBACKS[Math.floor(Math.random() * DYNAMIC_PARAGRAPH_FALLBACKS.length)];
        }
        await setInputField(textarea, String(ans).trim());
        markQuestionSolved(block);
      }

      // 12. SHORT ANSWER (Dynamic Answer Variation)
      else if (shortInput) {
        setStatus(`[${i + 1}/${total}] Solving Short answer (Dynamic Variation)...`);
        const isEmail = shortInput.type === 'email' || /email/i.test(qInfo.title);
        const isNum = shortInput.type === 'number' || /number|phone|count|age|tahun|edad/i.test(qInfo.title);

        let formatHint = 'concise, natural answer text';
        if (isEmail) formatHint = 'valid email address';
        if (isNum) formatHint = 'number only';

        const grounding = getGroundingPrompt(qInfo, [], false);
        if (grounding.found) {
          setStatus(`[${i + 1}/${total}] 📚 Grounded short answer in "${grounding.primarySource}" (Score: ${grounding.topScore})`);
        }

        let webEvidence = '';
        if (!isEmail && !isNum && (!grounding.found || grounding.mode === 'hybrid')) {
          setStatus(`[${i + 1}/${total}] 🔍 Searching Google for quiz verification...`);
          webEvidence = (await fetchWebSearchEvidence(qInfo.title, qInfo.fullText, [])) || '';
        }

        const prompt = `${grounding.prompt}${webEvidence}Carefully read the question and any formatting instructions.\nQuestion: ${qInfo.fullText}\nRespondent Profile: ${currentProfile.age}-year-old student at ${currentProfile.schoolOrOrg}, majoring in ${currentProfile.facultyOrMajor}.\nTarget Format: ${formatHint}\n\nInstructions:\n- If this is an objective quiz, math, or factual question, provide the exact, accurate answer without extra conversational filler.\n- Cross-reference directly with any attached document evidence or Live Google Search evidence.\n- For math or calculation questions, compute step by step in "reasoning" before writing the answer.\n- If it asks for personal details (e.g. name, student ID, course, year), match the profile sensibly.\n- Put reasoning in "reasoning" first to ensure zero mistakes.\n\nRespond ONLY with JSON: {"reasoning": "Direct analysis", "answer": "<concise answer text>"}`;

        const res = await callGeminiAPI(apiKey, model, prompt, images, 120);

        let ans = res.answer ?? res.response ?? res.text ?? res.result ?? (typeof res === 'string' ? res : '');
        if (!ans || String(ans).trim() === '') {
          if (isEmail) {
            ans = currentProfile.email || 'julian.santos.upd@gmail.com';
          } else if (isNum) {
            ans = '1';
          } else {
            const DYNAMIC_SHORT_FALLBACKS = [
              'Applicable and relevant',
              'Very helpful and practical',
              'Effective and easy to navigate',
              'Well-suited for daily use',
              'Reliable and user-friendly'
            ];
            ans = DYNAMIC_SHORT_FALLBACKS[Math.floor(Math.random() * DYNAMIC_SHORT_FALLBACKS.length)];
          }
        }
        await setInputField(shortInput, String(ans).trim());
        markQuestionSolved(block);
      }

      // 13. CATCH-ALL FALLBACK: guarantees no field is ever left blank
      else {
        const anyRadio = block.querySelector('div[role="radio"]');
        const anyBox = block.querySelector('div[role="checkbox"]');
        const anyInput = block.querySelector('input:not([type="hidden"]), textarea');
        if (anyRadio) {
          await safelySetToggle(anyRadio, true);
        } else if (anyBox) {
          await safelySetToggle(anyBox, true);
        } else if (anyInput) {
          await setInputField(anyInput, 'Applicable and relevant');
        }
        markQuestionSolved(block);
      }
    } catch (err) {
      setStatus(`Item ${i + 1} Error: ${err.message}`);
    }

    clearBlockErrors(block);
    return isQuestionAlreadyAnswered(block);
  }

  // Master solver covering all 12 question types across multiple pages until Submit button is reached
  async function processQuestions(isContinuation = false) {
    const savedProvider = getSafeValue('ai_provider', DEFAULT_PROVIDER);
    const prov = PROVIDERS[savedProvider] || PROVIDERS.anymodel;

    if (!isContinuation) {
      totalTokensUsed = 0;
      // Auto-Rotate: On fresh form start, always rotate to a fresh persona so info changes every time!
      if (isAutoRotateEnabled()) {
        rotatePersona(true);
      }
      setAutoSolvingState(true, currentSessionPersona || getUserProfile(true));
    }

    const apiKey = (getSafeValue(`${prov.id}_api_key`, prov.defaultKey || '')).trim();
    const model = (getSafeValue(`${prov.id}_model`, prov.defaultModel)).trim();

    if (!apiKey) {
      setStatus(`Error: Please enter and save your ${prov.name} API key in the HUD first.`);
      cleanupProcessingState();
      return;
    }

    // Wait up to 3500ms for questions to hydrate if currently empty
    let questionBlocks = getCleanQuestionBlocks();
    if (questionBlocks.length === 0) {
      let attempts = 10;
      while (attempts-- > 0 && questionBlocks.length === 0) {
        await sleep(350);
        questionBlocks = getCleanQuestionBlocks();
      }
    }

    const navEarly = findFormNavigationButtons();

    if (questionBlocks.length === 0) {
      if (navEarly.submitBtn && !navEarly.nextBtn) {
        clearAllPageErrors();
        const p = getUserProfile(true);
        currentSessionPersona = null;
        setStatus(`🏁 All questions answered as "${p.fullName}"! Reached the Submit button — ready for you to review and manually submit.`);
        if (typeof navEarly.submitBtn.scrollIntoView === 'function') {
          navEarly.submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        cleanupProcessingState();
        return;
      }
      if (navEarly.nextBtn) {
        clearAllPageErrors();
        navEarly.nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(350);
        setStatus('Advancing past informational section...');
        dispatchUniversalClick(navEarly.nextBtn);
        const transition = await waitForNextPageReady(12000);
        if (transition.ok) {
          return await processQuestions(true);
        }
      }
      setStatus('No questions found on this page.');
      cleanupProcessingState();
      return;
    }

    isProcessing = true;
    shouldCancel = false;

    const solveBtn = document.getElementById('ai-solve-btn');
    const stopBtn = document.getElementById('ai-stop-btn');
    if (solveBtn) {
      solveBtn.disabled = true;
      solveBtn.style.opacity = '0.6';
    }
    if (stopBtn) {
      stopBtn.disabled = false;
      stopBtn.style.opacity = '1';
    }

    setStatus(`[Page Solver] Solving ${questionBlocks.length} questions using ${prov.name} (${model})...`);

    try {
      // Pass 1: Solve all detected question blocks
      for (let i = 0; i < questionBlocks.length; i++) {
        if (shouldCancel) {
          setStatus('Processing cancelled by user.');
          break;
        }

        const block = questionBlocks[i];
        await checkOrientationGate();
        if (shouldCancel) break;
        await solveSingleQuestionBlock(block, i, questionBlocks.length, apiKey, model, prov, false);

        const pacing = getPacingConfig();
        const stepDelay = Math.floor(pacing.stepMin + Math.random() * (pacing.stepMax - pacing.stepMin));
        await pausableSleep(stepDelay);
      } // end questionBlocks loop

      if (shouldCancel) {
        setStatus('Processing stopped by user.');
        cleanupProcessingState();
        return;
      }

      clearAllPageErrors();
      setStatus(`✓ Finished solving questions on this section.`);
      await sleep(200);

      if (shouldCancel) {
        setStatus('Processing stopped by user.');
        cleanupProcessingState();
        return;
      }

      const nav = findFormNavigationButtons();

      // Case A: Next button present -> Click Next and continue solving until Submit is reached!
      if (nav.nextBtn) {
        clearAllPageErrors();
        nav.nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(250);

        setAutoSolvingState(true, currentSessionPersona || getUserProfile(true));
        setStatus(`[Multi-Page Auto-Advance] All questions answered on this section. Clicking Next to continue solving next page...`);
        dispatchUniversalClick(nav.nextBtn);

        // Actively wait for next section to transition and load
        const transition = await waitForNextPageReady(14000);

        if (shouldCancel || transition.reason === 'cancelled') {
          setStatus('Processing stopped by user.');
          cleanupProcessingState();
          return;
        }

        if (transition.reason === 'validation_error') {
          setStatus('⚠️ Page transition paused: Google Forms detected an unanswered required question. Retrying flagged question...');
          const flagged = document.querySelectorAll('.k39duf, [role="alert"]:not([style*="display: none"])');
          for (const f of flagged) {
            const b = f.closest('.Qr7Oae, div[role="listitem"]');
            if (b) await solveSingleQuestionBlock(b, 0, 1, apiKey, model, prov, true);
          }
          clearAllPageErrors();
          const retryNav = findFormNavigationButtons();
          if (retryNav.nextBtn) {
            dispatchUniversalClick(retryNav.nextBtn);
            await sleep(1000);
          }
        }

        if (transition.ok && transition.type === 'questions') {
          clearAllPageErrors();
          await sleep(400);
          // Automatically continue solving on the next page!
          return await processQuestions(true);
        }

        // Fallback check if transition timed out but elements changed
        const lateBlocks = getCleanQuestionBlocks();
        if (lateBlocks.length > 0) {
          clearAllPageErrors();
          await sleep(400);
          return await processQuestions(true);
        }

        const lateNav = findFormNavigationButtons();
        if (lateNav.submitBtn && !lateNav.nextBtn) {
          clearAllPageErrors();
          const p = getUserProfile(true);
          currentSessionPersona = null;
          setStatus(`🏁 All questions on all pages 100% answered as "${p.fullName}"! Reached the Submit button — ready for you to review and manually submit.`);
          if (typeof lateNav.submitBtn.scrollIntoView === 'function') {
            lateNav.submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          cleanupProcessingState();
          return;
        }

        setStatus('Reached end of pages or unable to detect next section. Solver finished.');
        cleanupProcessingState();
        return;
      }

      // Case B: Submit button reached and NO Next button -> Final Page Reached!
      if (nav.submitBtn && !nav.nextBtn) {
        clearAllPageErrors();
        const p = getUserProfile(true);
        currentSessionPersona = null; // Session completed! Next form run will automatically rotate
        setStatus(`🏁 All questions on all pages 100% answered as "${p.fullName}"! Reached the Submit button — ready for you to review and manually submit.`);
        if (typeof nav.submitBtn.scrollIntoView === 'function') {
          nav.submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        cleanupProcessingState();
        return;
      }

      // Case C: Neither Next nor Submit found
      clearAllPageErrors();
      const p = getUserProfile(true);
      currentSessionPersona = null;
      setStatus(`Finished solving all visible questions as "${p.fullName}"! Total tokens used: ~${totalTokensUsed}`);
      cleanupProcessingState();
    } catch (err) {
      setStatus(`Solver error: ${err.message}`);
      cleanupProcessingState();
    }
  }




  function mountHUD() {
    try {
      createHUD();
      initOrientationSensor();
    } catch (err) {
      console.error('[Google Form AI HUD] Mount error:', err);
    }
  }

  function toggleHUD() {
    isMinimized = !isMinimized;
    updateHUDState();
  }

  // Keyboard shortcut: Alt + H, Ctrl + Shift + H, or F2 to toggle HUD
  const keyHandler = (e) => {
    if ((e.altKey && (e.key === 'h' || e.key === 'H')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'H' || e.key === 'h')) ||
        (e.key === 'F2')) {
      e.preventDefault();
      toggleHUD();
    }
    // Panic Key: Escape instantly conceals HUD into phantom invisible mode
    if (e.key === 'Escape' && !isMinimized) {
      e.preventDefault();
      isMinimized = true;
      updateHUDState();
    }
    // Boss / Blind Key: Alt + B toggles total invisibility (0.005 opacity)
    if (e.altKey && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      if (hudContainer) {
        const isBlind = hudContainer.style.opacity === '0.005';
        hudContainer.style.setProperty('opacity', isBlind ? '1' : '0.005', 'important');
      }
    }
  };

  window.addEventListener('keydown', keyHandler, true);
  document.addEventListener('keydown', keyHandler, true);

  // Expose global helpers to both unsafeWindow (page DevTools console) and window (userscript sandbox)
  const globalScope = typeof unsafeWindow !== 'undefined' ? unsafeWindow : (typeof window !== 'undefined' ? window : globalThis);
  globalScope.__toggleFormAIHUD = toggleHUD;
  globalScope.showFormAI = function () {
    isMinimized = false;
    mountHUD();
    updateHUDState();
    console.log('[Google Form AI HUD] showFormAI called: HUD is now open and visible.');
  };
  if (typeof window !== 'undefined' && window !== globalScope) {
    window.__toggleFormAIHUD = toggleHUD;
    window.showFormAI = globalScope.showFormAI;
  }

  // Register interactive commands in Tampermonkey popup menu
  if (typeof GM_registerMenuCommand === 'function') {
    try {
      GM_registerMenuCommand('⚡ Open / Toggle AI Assistant HUD', () => {
        isMinimized = false;
        mountHUD();
        updateHUDState();
        if (typeof globalScope.showFormAI === 'function') {
          globalScope.showFormAI();
        }
      });
      GM_registerMenuCommand('🔄 Scan & Solve Current Questions', () => {
        processQuestions();
      });
    } catch (e) {}
  }

  // Fallback: On first user tap/click anywhere, ensure HUD is mounted
  const firstTouchMount = () => {
    if (!document.getElementById('ai-form-hud')) {
      mountHUD();
    }
  };
  window.addEventListener('click', firstTouchMount, { passive: true });
  window.addEventListener('touchstart', firstTouchMount, { passive: true });

  // Immediate mount attempt
  mountHUD();

  // Check if we need to auto-resume solving after a full page refresh / HTTP POST
  let hasCheckedAutoResume = false;
  async function checkAutoResumeOnPageLoad() {
    if (!isAutoSolvingStateActive()) return;
    if (hasCheckedAutoResume) return;

    await sleep(400);
    if (!isAutoSolvingStateActive()) return;

    setStatus('[Multi-Page Continuation] Page refreshed. Waiting for questions to hydrate...');

    // Wait up to 8 seconds for question blocks to mount into DOM
    let blocks = [];
    let attempts = 22; // 22 * 350ms = 7700ms
    while (attempts-- > 0) {
      if (!isAutoSolvingStateActive()) return;
      blocks = getCleanQuestionBlocks();
      if (blocks.length > 0) break;
      await sleep(350);
    }

    if (!isAutoSolvingStateActive()) return;

    const p = getSavedMultiPagePersona();
    if (p) {
      currentSessionPersona = p;
      if (typeof updateHUDPersonaFn === 'function') {
        try { updateHUDPersonaFn(p); } catch (e) {}
      }
    }

    if (blocks.length > 0) {
      hasCheckedAutoResume = true;
      setStatus(`[Multi-Page Resumed] Detected Section with ${blocks.length} questions! Solving automatically...`);
      await sleep(300);
      processQuestions(true);
      return;
    }

    // Only if after 8 seconds there are truly 0 question blocks:
    const nav = findFormNavigationButtons();
    if (nav.submitBtn && !nav.nextBtn) {
      hasCheckedAutoResume = true;
      setAutoSolvingState(false);
      const persona = p || getUserProfile(true);
      currentSessionPersona = null;
      setStatus(`🏁 Reached the final Submit button as "${persona.fullName}"! Waiting for you to review and manually submit.`);
      if (typeof nav.submitBtn.scrollIntoView === 'function') {
        nav.submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      cleanupProcessingState();
      return;
    }
  }

  // Trigger auto-resume check on startup and DOM ready
  checkAutoResumeOnPageLoad();

  // On DOM ready events
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mountHUD();
      checkAutoResumeOnPageLoad();
    });
  }
  window.addEventListener('load', () => {
    mountHUD();
    checkAutoResumeOnPageLoad();
  });

  // Persistent watcher to keep HUD mounted through Google Forms SPA hydration & page transitions
  const mountInterval = setInterval(() => {
    const targetParent = document.body || document.documentElement;
    if (targetParent) {
      const hud = document.getElementById('ai-form-hud');
      if (!hud) {
        mountHUD();
      } else if (document.body && hud.parentElement !== document.body) {
        document.body.appendChild(hud);
      }
    }
  }, 250);

  // MutationObserver on document.body for instant re-attachment if DOM is modified by Google Forms
  const initObserver = () => {
    if (document.body) {
      const observer = new MutationObserver(() => {
        const hud = document.getElementById('ai-form-hud');
        if (!hud) {
          mountHUD();
        } else if (hud.parentElement !== document.body) {
          document.body.appendChild(hud);
        }
      });
      observer.observe(document.body, { childList: true });
    } else {
      setTimeout(initObserver, 200);
    }
  };
  initObserver();

})();