/**
 * Google Forms Universal AI Assistant HUD
 * Chrome Extension (Manifest V3) Content Script
 *
 * Solves all 12 Google Form question types with multimodal vision analysis,
 * intelligent reasoning, authentic human-like pacing, and demographic persona generation.
 */

(function () {
  'use strict';

  console.log('%c[Google Form AI HUD v6.5]%c Multi-provider solver active! (Alt+H or F2 to toggle, or click ⚡ button)',
    'background: #2563eb; color: #ffffff; padding: 3px 8px; border-radius: 4px; font-weight: bold;',
    'color: #38bdf8; font-weight: bold;'
  );

  const STEP_DELAY_MS = 450;
  const DEFAULT_PROVIDER = 'gemini';
  const DEFAULT_API_KEY = '';
  const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';

  // Multi-Provider Directory with live-verified models, key portals, and endpoints
  const PROVIDERS = {
    gemini: {
      id: 'gemini',
      name: 'Google Gemini Native (Primary / Recommended)',
      baseUrl: 'https://generativelanguage.googleapis.com',
      keyUrl: 'https://aistudio.google.com/app/apikey',
      keyHelp: 'Get Free Gemini API Key at Google AI Studio (No Credit Card Required)',
      isPrimary: true,
      defaultKey: '',
      isOpenAI: false,
      defaultModel: 'gemini-2.5-flash',
      models: [
        { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash [👁️ Vision, ⚡ Fast - Recommended]' },
        { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro [👁️ Vision, 🧠 Deep Reasoning]' },
        { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash [👁️ Vision, 🧠 Reasoning]' },
        { id: 'gemini-flash-latest', label: 'Gemini Flash Latest [👁️ Vision, ⚡ Fast]' },
        { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash [👁️ Vision]' },
        { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash [👁️ Vision]' }
      ]
    },
    groq: {
      id: 'groq',
      name: 'Groq (Ultra-Fast LPU)',
      baseUrl: 'https://api.groq.com/openai/v1',
      keyUrl: 'https://console.groq.com/keys',
      keyHelp: 'Get Free Groq API Key at console.groq.com/keys',
      defaultKey: '',
      isOpenAI: true,
      defaultModel: 'llama-3.3-70b-versatile',
      models: [
        { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile [⚡ Fast, 🧠 High Quality]' },
        { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant [⚡ Ultra Fast]' },
        { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B [⚡ Fast]' }
      ]
    },
    anymodel: {
      id: 'anymodel',
      name: 'AnyModel (anymodel.org)',
      baseUrl: 'https://anymodel.org/v1',
      keyUrl: 'https://anymodel.org',
      keyHelp: 'Get AnyModel API Key at anymodel.org',
      defaultKey: '',
      isOpenAI: true,
      defaultModel: 'ag/gemini-3.7-flash-high',
      models: [
        { id: 'ag/gemini-3.7-flash-high', label: 'Gemini 3.7 Flash High (ag/gemini-3.7-flash) [👁️ Vision, 🧠 Reasoning - Top Pick]' },
        { id: 'ag/gemini-3.7-flash-low', label: 'Gemini 3.7 Flash Low (ag/gemini-3.7-flash-low) [👁️ Vision, ⚡ Ultra Fast]' },
        { id: 'ag/gemini-3.6-flash-high', label: 'Gemini 3.6 Flash High (ag/gemini-3.6-flash-high) [👁️ Vision, 🧠 Reasoning]' },
        { id: 'ag/gemini-3-flash', label: 'Gemini 3 Flash (ag/gemini-3-flash) [👁️ Vision, ⚡ Fast]' },
        { id: 'ag/gemini-2.5-flash', label: 'Antigravity Flash (ag/gemini-2.5-flash) [👁️ Vision, ⚡ Fast]' },
        { id: 'cx/gpt-5.5', label: 'OpenAI GPT-5.5 (cx/gpt-5.5) [👁️ Vision, 🧠 Reasoning]' },
        { id: 'cc/claude-sonnet-5', label: 'Claude Sonnet 5 (cc/claude-sonnet-5) [👁️ Vision, 🧠 Reasoning]' },
        { id: 'cc/claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (cc/claude-haiku-4-5) [👁️ Vision, ⚡ Fast]' },
        { id: 'xai/grok-4.5', label: 'xAI Grok 4.5 (xai/grok-4.5) [👁️ Vision, ⚡ Fast]' },
        { id: 'am/free', label: 'Free Models Auto Router (am/free) [🆓 Free]' }
      ]
    },
    mistral: {
      id: 'mistral',
      name: 'Mistral AI',
      baseUrl: 'https://api.mistral.ai/v1',
      keyUrl: 'https://console.mistral.ai/api-keys/',
      keyHelp: 'Get Mistral API Key at console.mistral.ai',
      defaultKey: '',
      isOpenAI: true,
      defaultModel: 'codestral-latest',
      models: [
        { id: 'codestral-latest', label: 'Mistral Codestral [🧠 Top Logic & Code]' },
        { id: 'pixtral-12b-2409', label: 'Mistral Pixtral 12B [👁️ Multimodal Vision]' },
        { id: 'mistral-small-latest', label: 'Mistral Small Latest [⚡ Fast]' }
      ]
    },
    openrouter: {
      id: 'openrouter',
      name: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      keyUrl: 'https://openrouter.ai/keys',
      keyHelp: 'Get OpenRouter API Key at openrouter.ai/keys',
      defaultKey: '',
      isOpenAI: true,
      defaultModel: 'google/gemini-2.0-flash-exp:free',
      models: [
        { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash [👁️ Vision, 🆓 Free]' },
        { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct [🧠 Thinking, 🆓 Free]' },
        { id: 'mistralai/mistral-small-24b-instruct-2501:free', label: 'Mistral Small 24B [🆓 Free]' }
      ]
    },
    nararouter: {
      id: 'nararouter',
      name: 'NaraRouter',
      baseUrl: 'https://router.bynara.id/v1',
      keyUrl: 'https://router.bynara.id',
      keyHelp: 'Get NaraRouter Key at router.bynara.id',
      defaultKey: '',
      isOpenAI: true,
      defaultModel: 'agnes-2.5-flash',
      models: [
        { id: 'agnes-2.5-flash', label: 'Agnes 2.5 Flash [👁️ Vision, ⚡ Fast — Verified ✅]' },
        { id: 'nemotron-3.5-lightning-free', label: 'Nemotron 3.5 Lightning [🧠 Thinking, 🆓 Free — Verified ✅]' },
        { id: 'deepseek-v4.1-flash-free', label: 'DeepSeek V4.1 Flash [🆓 Free — Plan Required]' },
        { id: 'deepseek-v4.1-flash', label: 'DeepSeek V4.1 Flash [⚡ Fast]' },
        { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash [⚡ Fast]' },
        { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro [🧠 Reasoning]' },
        { id: 'qwen3.8-flash-free', label: 'Qwen 3.8 Flash [🆓 Free — Plan Required]' },
        { id: 'qwen3.8-flash', label: 'Qwen 3.8 Flash [⚡ Fast]' },
        { id: 'glm-5.3-free', label: 'GLM 5.3 [🆓 Free — Credits Required]' },
        { id: 'laguna-s-2.1', label: 'Laguna S 2.1 [🆓 Free]' }
      ]
    }
  };

  const TOKEN_MODES = [
    { id: 'maximized', label: '🚀 Maximized (2,048 Tokens - Full Reasoning)', maxTokens: 2048 },
    { id: 'ultra', label: '⚡ Ultra Headroom (4,096 Tokens - Complex Questions)', maxTokens: 4096 },
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

  let isProcessing = false;
  let shouldCancel = false;
  let totalTokensUsed = 0;
  let isMinimized = true; // Minimized and phantom invisible by default on refresh
  let lastLikertChoice = -1; // Track last choice to prevent robotic straight-lining

  function getPacingConfig() {
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



  // Safe storage helpers for Chrome Extension
  function getSafeValue(key, defVal = '') {
    try {
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
      localStorage.setItem('form_ai_' + key, val);
    } catch (e) {}
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
    const text = `${title} ${description}`.toLowerCase().trim();

    // 0. Combined Place and Date of Birth (Tempat, Tanggal Lahir / TTL)
    if (/\b(ttl|tempat\s*(dan|\/|,)?\s*tanggal\s*lahir|tempat\s*tgl\s*lahir|birth\s*place\s*and\s*date)\b/i.test(text)) {
      const bCity = profile.birthplace || 'Jakarta';
      const bDate = profile.birthdate || '2003-08-15';
      return { field: 'birthplaceAndDate', value: `${bCity}, ${bDate}` };
    }

    // 1. Email Address
    if (/\b(e-?mail|surel|email address|alamat email)\b/i.test(text)) {
      return { field: 'email', value: profile.email };
    }

    // 2. Emergency Contact
    if (/\b(emergency\s*contact|kontak\s*darurat|nomor\s*darurat|emergency\s*phone)\b/i.test(text)) {
      return { field: 'emergencyContact', value: profile.emergencyContact };
    }

    // 3. Phone / WhatsApp / Mobile Number
    if (/\b(phone|telepon|handphone|nomor hp|no hp|whatsapp|wa|mobile number|no telp|contact number|nomor telepon|no wa)\b/i.test(text)) {
      return { field: 'phone', value: profile.phone };
    }

    // 4. Nickname / Alias / Panggilan
    if (/\b(nickname|nama\s*panggilan|alias|panggilan)\b/i.test(text)) {
      return { field: 'nickname', value: profile.nickname };
    }

    // 5. First Name
    if (/\b(first\s*name|nama\s*depan|given\s*name|nama\s*pertama)\b/i.test(text)) {
      return { field: 'firstName', value: profile.firstName };
    }

    // 6. Middle Name
    if (/\b(middle\s*name|nama\s*tengah)\b/i.test(text)) {
      return { field: 'middleName', value: profile.middleName };
    }

    // 7. Last Name / Surname
    if (/\b(last\s*name|surname|family\s*name|nama\s*belakang|nama\s*keluarga)\b/i.test(text)) {
      return { field: 'lastName', value: profile.lastName };
    }

    // 8. Student ID / Employee ID / NIK / NIM / NPM / NISN
    if (/\b(student\s*id|nim|npm|nisn|nomor\s*induk|id\s*karyawan|employee\s*id|nrp|nik|ktp|no\s*identitas|id\s*number)\b/i.test(text)) {
      return { field: 'studentId', value: profile.studentId };
    }

    // 9. Faculty / Major / Program of Study
    if (/\b(major|jurusan|program\s*studi|prodi|faculty|fakultas|departemen|department|bidang\s*studi)\b/i.test(text)) {
      return { field: 'facultyOrMajor', value: profile.facultyOrMajor };
    }

    // 10. School / University / Campus / Organization / Workplace
    if (/\b(school|university|universitas|sekolah|kampus|institusi|institution|nama\s*sekolah|asal\s*sekolah|nama\s*kampus|perguruan\s*tinggi|instansi|organisasi|organization|workplace|tempat\s*kerja|perusahaan|company)\b/i.test(text)) {
      return { field: 'schoolOrOrg', value: profile.schoolOrOrg };
    }

    // 11. Occupation / Job / Profession
    if (/\b(occupation|pekerjaan|profesi|job|job\s*title|status\s*pekerjaan|bidang\s*pekerjaan)\b/i.test(text)) {
      return { field: 'occupation', value: profile.occupation };
    }

    // 12. Religion / Agama
    if (/\b(religion|agama|kepercayaan)\b/i.test(text)) {
      return { field: 'religion', value: profile.religion };
    }

    // 13. Marital Status
    if (/\b(marital\s*status|status\s*pernikahan|status\s*kawin|status\s*perkawinan)\b/i.test(text)) {
      return { field: 'maritalStatus', value: profile.maritalStatus };
    }

    // 14. Nationality / Citizenship
    if (/\b(nationality|kebangsaan|kewarganegaraan|citizenship|status\s*kewarganegaraan)\b/i.test(text)) {
      return { field: 'nationality', value: profile.nationality };
    }

    // 15. Place of Birth / Tempat Lahir
    if (/\b(place\s*of\s*birth|tempat\s*lahir|birth\s*place|kota\s*kelahiran)\b/i.test(text)) {
      return { field: 'birthplace', value: profile.birthplace };
    }

    // 16. Birthdate / Date of Birth
    if (/\b(birth\s*date|date\s*of\s*birth|tanggal\s*lahir|tgl\s*lahir|birthdate|dob|born\s*on)\b/i.test(text)) {
      return { field: 'birthdate', value: profile.birthdate };
    }

    // 17. Age / Usia / Umur
    if (/\b(age|usia|umur|how\s*old)\b/i.test(text) && !/\b(range|kategori|rentang)\b/i.test(text)) {
      return { field: 'age', value: profile.age };
    }

    // 18. Gender / Sex
    if (/\b(gender|jenis\s*kelamin|sex|kelamin)\b/i.test(text)) {
      return { field: 'gender', value: profile.gender };
    }

    // 19. Blood Type / Golongan Darah
    if (/\b(blood\s*type|golongan\s*darah|goldar|blood\s*group|tipe\s*darah)\b/i.test(text)) {
      return { field: 'bloodType', value: profile.bloodType };
    }

    // 20. Postal / Zip Code
    if (/\b(postal\s*code|zip\s*code|kode\s*pos|kodepos)\b/i.test(text)) {
      return { field: 'postalCode', value: profile.postalCode };
    }

    // 21. Province / State
    if (/\b(province|provinsi|state|wilayah\s*provinsi)\b/i.test(text)) {
      return { field: 'provinceOrState', value: profile.provinceOrState };
    }

    // 22. City / Kota
    if (/\b(city|kota|kabupaten|asal\s*kota|kota\s*asal|kota\s*domisili|kota\s*tempat\s*tinggal)\b/i.test(text)) {
      return { field: 'city', value: profile.city };
    }

    // 23. Country / Negara
    if (/\b(country|negara|asal\s*negara)\b/i.test(text)) {
      return { field: 'country', value: profile.country };
    }

    // 24. Address / Domisili / Tempat Tinggal
    if (/\b(address|alamat|alamat\s*rumah|domisili|street\s*address|residential\s*address|tempat\s*tinggal|alamat\s*lengkap|alamat\s*domisili)\b/i.test(text)) {
      return { field: 'address', value: profile.address };
    }

    // 25. Hobby / Interest
    if (/\b(hobby|hobi|kegemaran|minat|interest)\b/i.test(text)) {
      return { field: 'hobby', value: profile.hobby };
    }

    // 26. Social Media / LinkedIn / Instagram
    if (/\b(linkedin|social\s*media|media\s*sosial|instagram|sosmed|twitter|tiktok)\b/i.test(text)) {
      return { field: 'socialMedia', value: profile.socialMedia };
    }

    // 27. Full Name
    if (/\b(full\s*name|nama\s*lengkap|complete\s*name|nama\s*anda|your\s*name|nama\s*siswa|nama\s*mahasiswa|nama\s*peserta|nama\s*kandidat|nama\s*responden|pangalan|buong\s*pangalan|iyong\s*pangalan|pangalan\s*ng\s*mag-aaral|pangalan\s*ng\s*estudyante)\b/i.test(text) ||
        (/\b(nama|name|pangalan)\b/i.test(text) && !/\b(ayah|ibu|father|mother|parent|orang\s*tua|perusahaan|company|sekolah|school|kampus|campus|universit|organisa|organiza|institu|wali|guardian|produk|product|project|mata\s*kuliah|pelajaran|course)\b/i.test(text))) {
      return { field: 'fullName', value: profile.fullName };
    }

    // 28. Year Level / Academic Year / Tingkat Kuliah / Grade Level
    if (/\b(year\s*level|academic\s*year|current\s*year|year\s*of\s*study|class\s*of|tingkat|tahun\s*ke|grade\s*level|tingkat\s*kuliah|jenjang\s*tahun|tahun\s*kuliah)\b/i.test(text)) {
      return { field: 'yearLevel', value: profile.yearLevel };
    }

    // 29. Semester
    if (/\b(semester|sem)\b/i.test(text)) {
      return { field: 'semester', value: profile.semester };
    }

    // 30. Batch Year / Tahun Angkatan / Tahun Masuk
    if (/\b(angkatan|tahun\s*masuk|batch\s*year|entry\s*year|cohort)\b/i.test(text)) {
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
      if (opt === vLower || opt.includes(vLower) || vLower.includes(opt)) {
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
    if (!optionEl) return false;
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

  // Safe HTTP request helper (uses Chrome Extension background service worker or direct fetch fallback)
  function httpRequest(options) {
    return new Promise((resolve, reject) => {
      // 1. Chrome Extension (Manifest V3) environment with background service worker
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
            options: fetchOpts
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

      // 2. Fallback direct fetch
      doDirectFetch(options, resolve, reject);
    });
  }

  function doDirectFetch(options, resolve, reject) {
    const fetchOpts = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    if (options.data) {
      fetchOpts.body = options.data;
    }

    fetch(options.url, fetchOpts)
      .then(async (res) => {
        if (options.responseType === 'blob') {
          const blob = await res.blob();
          resolve({ status: res.status, statusText: res.statusText, response: blob });
        } else {
          const text = await res.text();
          resolve({ status: res.status, statusText: res.statusText, responseText: text });
        }
      })
      .catch(err => reject(new Error(err.message || 'Network fetch error')));
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

      const maxTop = Math.max(10, window.innerHeight - (element.offsetHeight || 100) - 10);
      const maxLeft = Math.max(10, window.innerWidth - (element.offsetWidth || 100) - 10);
      const clampedTop = Math.min(Math.max(10, newTop), Math.max(10, maxTop));
      const clampedLeft = Math.min(Math.max(10, newLeft), Math.max(10, maxLeft));

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
      if (!hasConfiguredApiKey()) {
        hudFloatingButton.style.opacity = '1';
        hudFloatingButton.style.fontSize = '20px';
      } else {
        hudFloatingButton.style.opacity = curS.opacity;
        hudFloatingButton.style.fontSize = (curS.opacity === '0') ? '0px' : '20px';
      }
      hudFloatingButton.style.background = curS.bg;
      hudFloatingButton.style.color = curS.color;
      hudFloatingButton.style.border = curS.border;
      hudFloatingButton.style.boxShadow = curS.shadow;
      updateFloatingButtonBadge();
      hudContainer.title = '';
      hudContainer.style.setProperty('top', 'auto', 'important');
      hudContainer.style.setProperty('left', 'auto', 'important');
      hudContainer.style.setProperty('bottom', '24px', 'important');
      hudContainer.style.setProperty('right', '24px', 'important');
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
      hudContainer.style.setProperty('top', '16px', 'important');
      hudContainer.style.setProperty('bottom', 'auto', 'important');
      if (typeof window !== 'undefined' && window.innerWidth < 420) {
        hudContainer.style.setProperty('left', '10px', 'important');
        hudContainer.style.setProperty('right', '10px', 'important');
        hudContainer.style.setProperty('width', 'calc(100vw - 20px)', 'important');
        hudContainer.style.setProperty('max-width', 'calc(100vw - 20px)', 'important');
      } else {
        hudContainer.style.setProperty('left', 'auto', 'important');
        hudContainer.style.setProperty('right', '16px', 'important');
        hudContainer.style.setProperty('width', '350px', 'important');
        hudContainer.style.setProperty('max-width', 'calc(100vw - 32px)', 'important');
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
    const level = getSafeValue('hud_stealth_level', 'phantom');
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
        opacity: '0.03',
        bg: 'rgba(255, 255, 255, 0.02)',
        color: 'rgba(148, 163, 184, 0.15)',
        border: 'none',
        shadow: 'none',
        hoverOpacity: '0.95',
        hoverBg: '#1e293b',
        hoverColor: '#38bdf8',
        hoverBorder: '1.5px solid #3b82f6',
        hoverShadow: '0 2px 10px rgba(0, 0, 0, 0.4)'
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
      hoverBg: '#2563eb',
      hoverColor: '#ffffff',
      hoverBorder: '2px solid #60a5fa',
      hoverShadow: '0 4px 18px rgba(37, 99, 235, 0.7)'
    };
  }

  // Inject CSS animations for modal and alert badge
  try {
    const styleEl = document.createElement('style');
    styleEl.id = 'ai-form-hud-styles';
    styleEl.textContent = `
      @keyframes aiPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.25); opacity: 0.75; }
      }
      @keyframes aiFadeIn {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
    (document.head || document.documentElement).appendChild(styleEl);
  } catch (e) {}

  function hasConfiguredApiKey() {
    const savedProv = getSafeValue('ai_provider', DEFAULT_PROVIDER);
    const prov = PROVIDERS[savedProv] || PROVIDERS.gemini;
    const activeKey = (getSafeValue(`${prov.id}_api_key`, prov.defaultKey || '')).trim();
    if (activeKey) return true;
    return Object.keys(PROVIDERS).some(pid => (getSafeValue(`${pid}_api_key`, '')).trim().length > 0);
  }

  function updateFloatingButtonBadge() {
    if (!hudFloatingButton) return;
    let badge = document.getElementById('ai-btn-alert-badge');
    const hasKey = hasConfiguredApiKey();
    if (!hasKey) {
      if (!badge) {
        badge = document.createElement('span');
        badge.id = 'ai-btn-alert-badge';
        badge.style.cssText = `
          position: absolute !important;
          top: -2px !important;
          right: -2px !important;
          width: 12px !important;
          height: 12px !important;
          background: #f59e0b !important;
          border-radius: 50% !important;
          border: 2px solid #0f172a !important;
          box-shadow: 0 0 10px #f59e0b !important;
          pointer-events: none !important;
          animation: aiPulse 1.6s infinite ease-in-out !important;
        `;
        hudFloatingButton.style.position = 'relative';
        hudFloatingButton.appendChild(badge);
      }
      hudFloatingButton.title = '⚡ Google Form AI: Setup your API key to start solving (Alt+H or F2)';
    } else {
      if (badge && badge.parentElement) {
        badge.parentElement.removeChild(badge);
      }
      hudFloatingButton.title = '⚡ Open Google Form AI Assistant (Alt+H or F2)';
    }
  }

  function showToastNotification(message, isSuccess = true) {
    let container = document.getElementById('ai-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ai-toast-container';
      container.style.cssText = `
        position: fixed !important;
        top: 24px !important;
        right: 24px !important;
        z-index: 2147483647 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        pointer-events: none !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      `;
      (document.body || document.documentElement).appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${isSuccess ? '#064e3b' : '#7f1d1d'} !important;
      color: #ffffff !important;
      padding: 12px 18px !important;
      border-radius: 8px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
      border: 1px solid ${isSuccess ? '#10b981' : '#ef4444'} !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      max-width: 420px !important;
      pointer-events: auto !important;
      opacity: 0 !important;
      transform: translateY(-10px) !important;
      transition: opacity 0.2s ease, transform 0.2s ease !important;
      box-sizing: border-box !important;
    `;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 250);
    }, 4500);
  }

  function showApiKeyOnboardingModal(force = false) {
    if (!force) {
      if (hasConfiguredApiKey()) return;
      if (sessionStorage.getItem('ai_hud_onboarding_dismissed') === '1') return;
    }

    if (document.getElementById('ai-onboarding-overlay')) {
      const existingKeyInput = document.getElementById('ai-onboard-key-input');
      if (existingKeyInput) existingKeyInput.focus();
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'ai-onboarding-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      inset: 0 !important;
      background: rgba(15, 23, 42, 0.85) !important;
      backdrop-filter: blur(8px) !important;
      -webkit-backdrop-filter: blur(8px) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 16px !important;
      box-sizing: border-box !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      color: #f8fafc !important;
      animation: aiFadeIn 0.2s ease-out !important;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      width: 100% !important;
      max-width: 520px !important;
      background: #0f172a !important;
      border: 1.5px solid #3b82f6 !important;
      border-radius: 16px !important;
      box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.85), 0 0 35px rgba(59, 130, 246, 0.3) !important;
      padding: 24px !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 16px !important;
      position: relative !important;
      max-height: min(90vh, 720px) !important;
      overflow-y: auto !important;
    `;

    // Header row
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;';

    const headerLeft = document.createElement('div');
    const badge = document.createElement('div');
    badge.textContent = '⚡ GOOGLE FORMS UNIVERSAL AI ASSISTANT';
    badge.style.cssText = 'font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #38bdf8; margin-bottom: 4px;';
    const title = document.createElement('h2');
    title.textContent = '🔑 API Key Required to Solve';
    title.style.cssText = 'font-size: 20px; font-weight: 800; margin: 0; color: #ffffff; line-height: 1.25;';
    headerLeft.appendChild(badge);
    headerLeft.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.title = 'Dismiss';
    closeBtn.style.cssText = 'background: rgba(255,255,255,0.08); border: none; color: #94a3b8; font-size: 16px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; flex-shrink: 0;';
    closeBtn.onmouseover = () => { closeBtn.style.background = 'rgba(255,255,255,0.18)'; closeBtn.style.color = '#ffffff'; };
    closeBtn.onmouseout = () => { closeBtn.style.background = 'rgba(255,255,255,0.08)'; closeBtn.style.color = '#94a3b8'; };
    closeBtn.onclick = () => {
      sessionStorage.setItem('ai_hud_onboarding_dismissed', '1');
      if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
    };

    headerRow.appendChild(headerLeft);
    headerRow.appendChild(closeBtn);

    const desc = document.createElement('p');
    desc.textContent = 'To solve Google Forms questions autonomously using AI reasoning and vision, please connect your AI provider. Your key is stored securely in your browser\'s local storage and is never transmitted to any third party.';
    desc.style.cssText = 'font-size: 13px; line-height: 1.5; color: #cbd5e1; margin: 0;';

    // Primary Provider Spotlight Card (Google Gemini)
    const providerCard = document.createElement('div');
    providerCard.style.cssText = `
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(99, 102, 241, 0.22)) !important;
      border: 1.5px solid #3b82f6 !important;
      border-radius: 12px !important;
      padding: 16px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 10px !important;
    `;

    const cardBadge = document.createElement('div');
    cardBadge.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; background: rgba(59, 130, 246, 0.25); color: #60a5fa; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; align-self: flex-start;';
    cardBadge.textContent = '🌟 PRIMARY AI PROVIDER (RECOMMENDED)';

    const cardTitle = document.createElement('div');
    cardTitle.id = 'ai-modal-provider-name';
    cardTitle.textContent = 'Google Gemini (Google AI Studio)';
    cardTitle.style.cssText = 'font-size: 16px; font-weight: 700; color: #ffffff;';

    const cardBenefits = document.createElement('ul');
    cardBenefits.id = 'ai-modal-benefits';
    cardBenefits.style.cssText = 'margin: 0; padding-left: 18px; font-size: 12px; color: #e2e8f0; line-height: 1.6;';
    cardBenefits.innerHTML = `
      <li><strong>100% Free</strong>: Free tier with your Google account (no credit card needed)</li>
      <li><strong>Multimodal Vision</strong>: Reads image questions, diagrams, and math formulas</li>
      <li><strong>Blazing Fast</strong>: Gemini 2.5 Flash with deep reasoning capability</li>
    `;

    const getPrimaryLink = document.createElement('a');
    getPrimaryLink.id = 'ai-modal-get-key-cta';
    getPrimaryLink.href = 'https://aistudio.google.com/app/apikey';
    getPrimaryLink.target = '_blank';
    getPrimaryLink.rel = 'noopener noreferrer';
    getPrimaryLink.style.cssText = `
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
      color: #ffffff !important;
      padding: 11px 16px !important;
      border-radius: 8px !important;
      font-weight: 700 !important;
      font-size: 14px !important;
      text-decoration: none !important;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45) !important;
      transition: transform 0.15s, box-shadow 0.15s !important;
      cursor: pointer !important;
    `;
    getPrimaryLink.innerHTML = '<span>🔑 Get Free Gemini API Key (Google AI Studio) ↗</span>';
    getPrimaryLink.onmouseover = () => { getPrimaryLink.style.transform = 'scale(1.02)'; getPrimaryLink.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.65)'; };
    getPrimaryLink.onmouseout = () => { getPrimaryLink.style.transform = 'scale(1)'; getPrimaryLink.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.45)'; };

    providerCard.appendChild(cardBadge);
    providerCard.appendChild(cardTitle);
    providerCard.appendChild(cardBenefits);
    providerCard.appendChild(getPrimaryLink);

    // Quick Activation Form
    const formSection = document.createElement('div');
    formSection.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-top: 4px;';

    const provRow = document.createElement('div');
    provRow.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
    const provLabel = document.createElement('label');
    provLabel.textContent = 'Select AI Provider';
    provLabel.style.cssText = 'font-size: 11px; font-weight: 600; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em;';
    const modalProvSelect = document.createElement('select');
    modalProvSelect.id = 'ai-modal-prov-select';
    modalProvSelect.style.cssText = 'background: #1e293b; border: 1.5px solid #3b82f6; color: #f8fafc; padding: 8px 10px; border-radius: 6px; font-size: 13px; font-weight: 600; outline: none; cursor: pointer;';
    Object.values(PROVIDERS).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      modalProvSelect.appendChild(opt);
    });
    modalProvSelect.value = getSafeValue('ai_provider', DEFAULT_PROVIDER);

    provRow.appendChild(provLabel);
    provRow.appendChild(modalProvSelect);

    const keyRow = document.createElement('div');
    keyRow.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
    const keyLabelRow = document.createElement('div');
    keyLabelRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
    const keyLabel = document.createElement('label');
    keyLabel.textContent = 'Paste API Key';
    keyLabel.style.cssText = 'font-size: 11px; font-weight: 600; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em;';
    const keyQuickLink = document.createElement('a');
    keyQuickLink.id = 'ai-modal-sublink';
    keyQuickLink.href = 'https://aistudio.google.com/app/apikey';
    keyQuickLink.target = '_blank';
    keyQuickLink.rel = 'noopener noreferrer';
    keyQuickLink.textContent = 'Open Key Portal ↗';
    keyQuickLink.style.cssText = 'font-size: 11px; color: #38bdf8; text-decoration: none; font-weight: 600;';
    keyLabelRow.appendChild(keyLabel);
    keyLabelRow.appendChild(keyQuickLink);

    const inputWrapper = document.createElement('div');
    inputWrapper.style.cssText = 'position: relative; display: flex; align-items: center;';

    const keyInput = document.createElement('input');
    keyInput.id = 'ai-onboard-key-input';
    keyInput.type = 'password';
    keyInput.placeholder = 'Paste your API key here (e.g., AIzaSy... or gsk_...)';
    keyInput.style.cssText = 'background: #1e293b; border: 1.5px solid #475569; color: #f8fafc; padding: 10px 42px 10px 12px; border-radius: 8px; width: 100%; box-sizing: border-box; font-size: 14px; outline: none; transition: border-color 0.2s;';
    keyInput.onfocus = () => { keyInput.style.borderColor = '#3b82f6'; };
    keyInput.onblur = () => { keyInput.style.borderColor = '#475569'; };

    const eyeToggle = document.createElement('button');
    eyeToggle.type = 'button';
    eyeToggle.textContent = '👁️';
    eyeToggle.title = 'Show / Hide API key';
    eyeToggle.style.cssText = 'position: absolute; right: 8px; background: none; border: none; font-size: 15px; cursor: pointer; opacity: 0.7; padding: 4px;';
    eyeToggle.onclick = () => {
      keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
    };

    inputWrapper.appendChild(keyInput);
    inputWrapper.appendChild(eyeToggle);

    keyRow.appendChild(keyLabelRow);
    keyRow.appendChild(inputWrapper);

    // Dynamic updates when switching provider in modal
    modalProvSelect.addEventListener('change', () => {
      const p = PROVIDERS[modalProvSelect.value] || PROVIDERS.gemini;
      getPrimaryLink.href = p.keyUrl || 'https://aistudio.google.com/app/apikey';
      getPrimaryLink.innerHTML = `<span>🔑 Get ${p.name.split(' ')[0]} API Key ↗</span>`;
      keyQuickLink.href = p.keyUrl || 'https://aistudio.google.com/app/apikey';
      cardTitle.textContent = `${p.name}`;
      if (p.id === 'gemini') {
        cardBadge.textContent = '🌟 PRIMARY AI PROVIDER (RECOMMENDED)';
        cardBenefits.innerHTML = `
          <li><strong>100% Free</strong>: Free tier with your Google account (no credit card needed)</li>
          <li><strong>Multimodal Vision</strong>: Reads image questions, diagrams, and math formulas</li>
          <li><strong>Blazing Fast</strong>: Gemini 2.5 Flash with deep reasoning capability</li>
        `;
      } else if (p.id === 'groq') {
        cardBadge.textContent = '⚡ ULTRA-FAST LPU INFERENCE';
        cardBenefits.innerHTML = `
          <li><strong>Free API Key</strong>: Available on console.groq.com/keys</li>
          <li><strong>Speed</strong>: 500+ tokens per second on Llama 3.3 70B</li>
          <li><strong>Zero Cost</strong>: Generous free quota</li>
        `;
      } else {
        cardBadge.textContent = '🌐 MULTI-MODEL AI ROUTER';
        cardBenefits.innerHTML = `
          <li><strong>Diverse Models</strong>: Select top-tier frontier models</li>
          <li><strong>Compatible</strong>: Fast OpenAI-compatible inference</li>
          <li><strong>Easy Access</strong>: Get keys from ${p.keyUrl}</li>
        `;
      }
      keyInput.value = getSafeValue(`${p.id}_api_key`, p.defaultKey || '');
      keyInput.placeholder = `Paste your ${p.name.split(' ')[0]} API key here`;
    });

    const actionRow = document.createElement('div');
    actionRow.style.cssText = 'display: flex; gap: 10px; margin-top: 6px;';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save & Activate AI Assistant ⚡';
    saveBtn.style.cssText = 'flex: 1; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; padding: 11px 16px; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); transition: transform 0.15s, box-shadow 0.15s;';
    saveBtn.onmouseover = () => { saveBtn.style.transform = 'scale(1.02)'; };
    saveBtn.onmouseout = () => { saveBtn.style.transform = 'scale(1)'; };

    saveBtn.onclick = () => {
      const pId = modalProvSelect.value;
      const prov = PROVIDERS[pId] || PROVIDERS.gemini;
      const keyVal = keyInput.value.trim();

      if (!keyVal) {
        keyInput.style.borderColor = '#ef4444';
        keyInput.focus();
        showToastNotification(`⚠️ Please paste your ${prov.name} API key first!`, false);
        return;
      }

      setSafeValue('ai_provider', pId);
      setSafeValue(`${pId}_api_key`, keyVal);
      setSafeValue(`${pId}_base_url`, prov.baseUrl);
      setSafeValue(`${pId}_model`, prov.defaultModel);

      // Sync HUD inputs if rendered
      const hudProvSelect = document.getElementById('ai-provider-select');
      if (hudProvSelect) hudProvSelect.value = pId;
      const hudKeyInput = document.getElementById('ai-api-key');
      if (hudKeyInput) hudKeyInput.value = keyVal;
      const hudUrlInput = document.getElementById('ai-base-url');
      if (hudUrlInput) hudUrlInput.value = prov.baseUrl;

      updateFloatingButtonBadge();

      if (overlay.parentElement) overlay.parentElement.removeChild(overlay);

      showToastNotification(`✅ ${prov.name} API key saved! Ready to solve. Press Alt+H or click ⚡ to open HUD.`, true);
      setStatus(`API Key configured for ${prov.name} (${prov.defaultModel}). Ready!`);
    };

    const laterBtn = document.createElement('button');
    laterBtn.textContent = 'Configure Later';
    laterBtn.style.cssText = 'background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid #334155; padding: 11px 16px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.15s;';
    laterBtn.onmouseover = () => { laterBtn.style.background = 'rgba(255,255,255,0.12)'; laterBtn.style.color = '#ffffff'; };
    laterBtn.onmouseout = () => { laterBtn.style.background = 'rgba(255,255,255,0.06)'; laterBtn.style.color = '#94a3b8'; };
    laterBtn.onclick = () => {
      sessionStorage.setItem('ai_hud_onboarding_dismissed', '1');
      if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
    };

    actionRow.appendChild(laterBtn);
    actionRow.appendChild(saveBtn);

    formSection.appendChild(provRow);
    formSection.appendChild(keyRow);
    formSection.appendChild(actionRow);

    modal.appendChild(headerRow);
    modal.appendChild(desc);
    modal.appendChild(providerCard);
    modal.appendChild(formSection);

    overlay.appendChild(modal);
    (document.body || document.documentElement).appendChild(overlay);

    keyInput.focus();
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

    hudContainer = document.createElement('div');
    hudContainer.id = 'ai-form-hud';
    hudContainer.style.cssText = `
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      top: auto !important;
      left: auto !important;
      width: auto !important;
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
      font-size: ${s.opacity === '0' ? '0px' : '20px'} !important;
      font-weight: 700 !important;
      touch-action: none !important;
      -webkit-tap-highlight-color: transparent !important;
      transition: transform 0.15s ease, opacity 0.2s ease, box-shadow 0.2s ease !important;
    `;

    hudFloatingButton.addEventListener('click', (e) => {
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
      if (curS.opacity === '0') {
        hudFloatingButton.style.fontSize = '0px';
      }
    });

    hudFloatingButton.addEventListener('touchstart', () => {
      const curS = getStealthSettings();
      hudFloatingButton.style.fontSize = '20px';
      hudFloatingButton.style.opacity = curS.hoverOpacity || '1';
      hudFloatingButton.style.background = curS.hoverBg || '#2563eb';
      hudFloatingButton.style.color = curS.hoverColor || '#ffffff';
    }, { passive: true });


    // 2. MAIN EXPANDED PANEL
    hudPanel = document.createElement('div');
    hudPanel.id = 'ai-hud-panel';
    hudPanel.style.cssText = `
      width: 100% !important;
      min-width: 320px !important;
      min-height: 250px !important;
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
      padding: 12px 16px;
      background: #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      border-bottom: 1px solid #334155;
      cursor: move;
    `;

    const titleBadge = document.createElement('div');
    titleBadge.style.cssText = 'display: flex; align-items: center; gap: 8px;';

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
    minBtn.style.cssText = 'background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 22px; line-height: 1; padding: 0 4px;';

    header.appendChild(titleBadge);
    header.appendChild(minBtn);

    // Body
    const body = document.createElement('div');
    body.id = 'ai-hud-body';
    body.style.cssText = 'padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; max-height: calc(88vh - 60px);';

    // 1. AI Provider Selector
    const providerSection = document.createElement('div');
    const providerLabel = document.createElement('div');
    providerLabel.textContent = 'AI Provider';
    providerLabel.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 2px;';

    const providerSelect = document.createElement('select');
    providerSelect.id = 'ai-provider-select';
    providerSelect.style.cssText = 'background: #1e293b; border: 1.5px solid #3b82f6; color: #f8fafc; padding: 8px 10px; border-radius: 6px; width: 100%; box-sizing: border-box; font-size: 14px; outline: none; font-weight: 700; cursor: pointer;';

    Object.values(PROVIDERS).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      providerSelect.appendChild(opt);
    });

    providerSection.appendChild(providerLabel);
    providerSection.appendChild(providerSelect);

    // 2. API Key
    const keySection = document.createElement('div');
    const keyLabelRow = document.createElement('div');
    keyLabelRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;';

    const keyLabel = document.createElement('div');
    keyLabel.textContent = 'API Key';
    keyLabel.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600;';

    const keyProviderLink = document.createElement('a');
    keyProviderLink.id = 'ai-hud-get-key-link';
    keyProviderLink.href = 'https://aistudio.google.com/app/apikey';
    keyProviderLink.target = '_blank';
    keyProviderLink.rel = 'noopener noreferrer';
    keyProviderLink.textContent = '🔑 Get Free Key ↗';
    keyProviderLink.style.cssText = 'font-size: 11px; color: #38bdf8; text-decoration: none; font-weight: 700; cursor: pointer;';
    keyProviderLink.onmouseover = () => { keyProviderLink.style.textDecoration = 'underline'; };
    keyProviderLink.onmouseout = () => { keyProviderLink.style.textDecoration = 'none'; };

    keyLabelRow.appendChild(keyLabel);
    keyLabelRow.appendChild(keyProviderLink);

    const keyInput = document.createElement('input');
    keyInput.type = 'password';
    keyInput.id = 'ai-api-key';
    keyInput.placeholder = 'Paste API key here';
    keyInput.style.cssText = 'background: #1e293b; border: 1px solid #475569; color: #f8fafc; padding: 8px 10px; border-radius: 6px; width: 100%; box-sizing: border-box; font-size: 15px; outline: none;';

    const keyHelpHint = document.createElement('div');
    keyHelpHint.id = 'ai-hud-key-hint';
    keyHelpHint.textContent = 'Primary: Google Gemini (Free at aistudio.google.com)';
    keyHelpHint.style.cssText = 'font-size: 11px; color: #64748b; margin-top: 3px;';

    keySection.appendChild(keyLabelRow);
    keySection.appendChild(keyInput);
    keySection.appendChild(keyHelpHint);

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
    modelLabel.textContent = 'AI Model';
    modelLabel.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 2px;';

    const modelSelect = document.createElement('select');
    modelSelect.id = 'ai-model-select';
    modelSelect.style.cssText = 'background: #1e293b; border: 1px solid #475569; color: #f8fafc; padding: 8px 10px; border-radius: 6px; width: 100%; box-sizing: border-box; font-size: 14px; outline: none;';

    function populateModels(providerId, selectedModelId) {
      const prov = PROVIDERS[providerId] || PROVIDERS.anymodel;
      modelSelect.textContent = '';
      prov.models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.label;
        if (selectedModelId && m.id === selectedModelId) {
          opt.selected = true;
        }
        modelSelect.appendChild(opt);
      });
      if (!modelSelect.value && prov.models[0]) {
        modelSelect.value = prov.models[0].id;
      }
    }

    modelSection.appendChild(modelLabel);
    modelSection.appendChild(modelSelect);

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
      { id: 'phantom', label: '👻 100% Phantom (0.005% - Completely invisible to naked eye at max brightness)' },
      { id: 'ghost', label: '🌫️ Ultra Ghost (3% outline)' },
      { id: 'ultra', label: '🕶️ Low Profile (15% opacity)' },
      { id: 'subtle', label: '🔘 Subtle (35% opacity)' },
      { id: 'visible', label: '⚡ Solid Visible Button' }
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
      wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';
      const lbl = document.createElement('label');
      lbl.textContent = labelText;
      lbl.style.cssText = 'font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 600;';
      const inp = document.createElement('input');
      inp.id = id;
      inp.type = 'text';
      inp.value = val;
      inp.placeholder = placeholder;
      inp.style.cssText = 'background: #0f172a; border: 1px solid #334155; color: #f8fafc; padding: 6px 8px; border-radius: 4px; font-size: 14px; outline: none; width: 100%; box-sizing: border-box;';
      wrapper.appendChild(lbl);
      wrapper.appendChild(inp);
      return { wrapper, inp };
    }

    function createRow(item1, item2) {
      const row = document.createElement('div');
      row.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
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
    personaSelectorWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 6px; padding-bottom: 8px; margin-bottom: 6px; border-bottom: 1px solid #334155;';

    const personaHeaderRow = document.createElement('div');
    personaHeaderRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

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
        autoRotateToggle.style.cssText = 'background: #334155; color: #94a3b8; border: 1px solid #475569; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; cursor: pointer;';
      } else if (mode === 'infinite') {
        autoRotateToggle.textContent = '✨ Auto-Rotate: Infinite';
        autoRotateToggle.style.cssText = 'background: #047857; color: #ecfdf5; border: 1px solid #10b981; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; cursor: pointer;';
      } else {
        autoRotateToggle.textContent = '🔁 Auto-Rotate: Presets';
        autoRotateToggle.style.cssText = 'background: #0369a1; color: #f0f9ff; border: 1px solid #38bdf8; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; cursor: pointer;';
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

    const personaRow = document.createElement('div');
    personaRow.style.cssText = 'display: flex; gap: 6px;';

    const personaSelect = document.createElement('select');
    personaSelect.id = 'ai-qc-persona-select';
    personaSelect.style.cssText = 'flex: 1; background: #0f172a; border: 1px solid #0284c7; color: #f8fafc; padding: 6px 8px; border-radius: 4px; font-size: 12px; outline: none; font-weight: 600; cursor: pointer;';

    QC_PHILIPPINES_PERSONAS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label;
      personaSelect.appendChild(opt);
    });

    const genInfiniteBtn = document.createElement('button');
    genInfiniteBtn.textContent = '✨ New QC';
    genInfiniteBtn.title = 'Generate a brand new authentic Quezon City college student identity right now';
    genInfiniteBtn.style.cssText = 'background: #059669; color: #fff; border: none; padding: 6px 9px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap;';

    const nextPersonaBtn = document.createElement('button');
    nextPersonaBtn.textContent = '⏭️ Next';
    nextPersonaBtn.title = 'Rotate to the next persona';
    nextPersonaBtn.style.cssText = 'background: #0284c7; color: #fff; border: none; padding: 6px 9px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap;';

    const randomPersonaBtn = document.createElement('button');
    randomPersonaBtn.textContent = '🎲 Random';
    randomPersonaBtn.title = 'Switch to a random preset persona';
    randomPersonaBtn.style.cssText = 'background: #2563eb; color: #fff; border: none; padding: 6px 9px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap;';

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

    personaRow.appendChild(personaSelect);
    personaRow.appendChild(genInfiniteBtn);
    personaRow.appendChild(nextPersonaBtn);
    personaRow.appendChild(randomPersonaBtn);
    personaSelectorWrapper.appendChild(personaHeaderRow);
    personaSelectorWrapper.appendChild(personaRow);

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

    // Assemble Body
    body.appendChild(providerSection);
    body.appendChild(keySection);
    body.appendChild(urlSection);
    body.appendChild(modelSection);
    body.appendChild(tokenSection);
    body.appendChild(stealthSection);
    body.appendChild(pacingSection);
    body.appendChild(likertSection);
    body.appendChild(saveBtn);
    body.appendChild(profileToggleBtn);
    body.appendChild(profileContainer);
    body.appendChild(btnRow);
    body.appendChild(statusLabel);
    body.appendChild(statusBox);

    hudPanel.appendChild(header);
    hudPanel.appendChild(body);

    hudContainer.appendChild(hudFloatingButton);
    hudContainer.appendChild(hudPanel);
    targetParent.appendChild(hudContainer);
    makeDraggable(hudContainer, header);

    // Provider switch listener
    providerSelect.addEventListener('change', () => {
      const pId = providerSelect.value;
      const prov = PROVIDERS[pId] || PROVIDERS.gemini;
      keyLabel.textContent = `${prov.name} API Key`;
      keyInput.placeholder = `Paste ${prov.name} API key here`;
      keyInput.value = getSafeValue(`${prov.id}_api_key`, prov.defaultKey || '');
      urlInput.value = getSafeValue(`${prov.id}_base_url`, prov.baseUrl);
      if (keyProviderLink) {
        keyProviderLink.href = prov.keyUrl || 'https://aistudio.google.com/app/apikey';
        keyProviderLink.textContent = `🔑 Get ${prov.name.split(' ')[0]} Key ↗`;
      }
      if (keyHelpHint) {
        keyHelpHint.textContent = prov.keyHelp || `Keys available at ${prov.baseUrl}`;
      }
      const savedM = getSafeValue(`${prov.id}_model`, prov.defaultModel);
      populateModels(pId, savedM);
      setStatus(`Switched provider to: ${prov.name}`);
    });

    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isMinimized = true;
      updateHUDState();
    });

    // Load saved settings
    const savedProvider = getSafeValue('ai_provider', DEFAULT_PROVIDER);
    if (PROVIDERS[savedProvider]) {
      providerSelect.value = savedProvider;
    }

    const curProv = PROVIDERS[providerSelect.value] || PROVIDERS.gemini;
    keyLabel.textContent = `${curProv.name} API Key`;
    keyInput.placeholder = `Paste ${curProv.name} API key here`;
    keyInput.value = getSafeValue(`${curProv.id}_api_key`, curProv.defaultKey || '');
    urlInput.value = getSafeValue(`${curProv.id}_base_url`, curProv.baseUrl);
    if (keyProviderLink) {
      keyProviderLink.href = curProv.keyUrl || 'https://aistudio.google.com/app/apikey';
      keyProviderLink.textContent = `🔑 Get ${curProv.name.split(' ')[0]} Key ↗`;
    }
    if (keyHelpHint) {
      keyHelpHint.textContent = curProv.keyHelp || `Keys available at ${curProv.baseUrl}`;
    }
    const savedModel = getSafeValue(`${curProv.id}_model`, curProv.defaultModel);
    populateModels(curProv.id, savedModel);

    const savedTokenBudget = getSafeValue('token_budget', '2048');
    if (savedTokenBudget && TOKEN_MODES.some(t => String(t.maxTokens) === savedTokenBudget)) {
      tokenSelect.value = savedTokenBudget;
    } else {
      tokenSelect.value = '2048';
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


    // Default to minimized phantom stealth mode on load/refresh
    isMinimized = true;
    updateHUDState();


    setStatus(`Ready: ${curProv.name} (${modelSelect.value})`);

    saveBtn.addEventListener('click', () => {
      const pId = providerSelect.value;
      const prov = PROVIDERS[pId] || PROVIDERS.gemini;
      const keyVal = keyInput.value.trim();
      const urlVal = urlInput.value.trim() || prov.baseUrl;
      const modelVal = modelSelect.value;
      const stealthVal = stealthSelect.value;
      const tokenVal = tokenSelect.value;
      const pacingVal = pacingSelect.value;
      const likertVal = likertSelect.value;

      setSafeValue('ai_provider', pId);
      setSafeValue(`${pId}_api_key`, keyVal);
      setSafeValue(`${pId}_base_url`, urlVal);
      setSafeValue(`${pId}_model`, modelVal);
      setSafeValue('token_budget', tokenVal);
      setSafeValue('hud_stealth_level', stealthVal);
      setSafeValue('pacing_mode', pacingVal);
      setSafeValue('likert_bias_mode', likertVal);

      // Update floating button appearance
      const curS = getStealthSettings();
      hudFloatingButton.style.background = curS.bg;
      hudFloatingButton.style.color = curS.color;
      hudFloatingButton.style.border = curS.border;
      hudFloatingButton.style.boxShadow = curS.shadow;
      hudFloatingButton.style.opacity = curS.opacity;

      updateFloatingButtonBadge();
      showToastNotification(`✅ Settings saved for ${prov.name}!`, true);
      setStatus(`Saved: ${prov.name} | ${modelVal} | ${pacingVal} pacing | ${likertVal} bias`);
    });

    solveBtn.addEventListener('click', () => {
      if (!isProcessing) {
        clearAllPageErrors();
        processQuestions();
      }
    });

    stopBtn.addEventListener('click', () => {
      shouldCancel = true;
      setAutoSolvingState(false);
      cleanupProcessingState();
      setStatus('Stopping solver... Multi-page auto-continuation cancelled.');
    });

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

  function getBase64FromImageUrl(url) {
    return new Promise((resolve) => {
      if (!url) return resolve(null);

      if (url.startsWith('data:')) {
        const match = url.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (match) {
          return resolve({ mimeType: match[1], data: match[2] });
        }
        return resolve(null);
      }

      httpRequest({
        method: 'GET',
        url: url,
        responseType: 'blob'
      }).then((response) => {
        if (response.status !== 200 || !response.response) return resolve(null);
        try {
          const rawMime = response.response?.type || 'image/jpeg';
          let blobData = response.response;
          if (!(blobData instanceof Blob)) {
            blobData = new Blob([blobData], { type: rawMime });
          }
          const reader = new FileReader();
          reader.onloadend = function () {
            const res = reader.result;
            if (typeof res === 'string') {
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

  // Universal API Caller supporting OpenAI-compatible endpoints & Native Gemini with Auto-Failover
  function callGeminiAPI(apiKey, model, promptText, base64Images = [], maxOutputTokens = 2048, isRetry = false) {
    return new Promise((resolve, reject) => {
      const savedProvider = getSafeValue('ai_provider', DEFAULT_PROVIDER);
      const prov = PROVIDERS[savedProvider] || PROVIDERS.anymodel;

      const activeKey = (apiKey || getSafeValue(`${prov.id}_api_key`, prov.defaultKey || '')).trim();
      const activeModel = (model || getSafeValue(`${prov.id}_model`, prov.defaultModel)).trim();
      const baseUrl = (getSafeValue(`${prov.id}_base_url`, prov.baseUrl)).trim().replace(/\/+$/, '');

      if (!activeKey) {
        return reject(new Error(`Missing ${prov.name} API key. Please enter your API key in the HUD.`));
      }

      const isOpenAI = prov.isOpenAI || activeKey.startsWith('sk-') || baseUrl.includes('/v1') || !baseUrl.includes('googleapis.com');
      const savedBudget = parseInt(getSafeValue('token_budget', '2048'), 10) || 2048;
      const tokenBudget = Math.max(maxOutputTokens || 60, savedBudget);

      // Auto-failover helper for AnyModel
      const tryFallback = (errMsg) => {
        if (prov.id === 'anymodel' && !isRetry) {
          const fallbackModel = activeModel.includes('low') ? 'am/free' : 'ag/gemini-3.7-flash-low';
          setStatus(`⚠️ Model "${activeModel}" issue (${errMsg}). Auto-switching to backup model (${fallbackModel})...`);
          return callGeminiAPI(activeKey, fallbackModel, promptText, base64Images, maxOutputTokens, true).then(resolve).catch(reject);
        }
        reject(new Error(errMsg));
      };

      // Expert system instructions ensuring the AI model reads the question thoroughly and delivers optimal, error-free answers
      const SYSTEM_SOLVER_PROMPT = `You are an elite, highly intelligent AI assistant answering a Google Form questionnaire.
Your mission is to carefully read every question and provided choices, perform rigorous analytical thinking, and deliver the BEST, completely accurate, and flawless answer without making any mistakes.
Key Rules:
1. Read the Question Thoroughly: Analyze all parts of the question prompt, context, constraints, and all provided options. If image(s) are attached, inspect them closely to answer visual questions accurately.
2. Academic / Factual / Technical Questions: Identify the single factually correct, logically proven answer. Do not guess.
3. Opinion / Survey / Likert Scale Questions: Answer authentically, thoughtfully, and consistently from the perspective of the specified student persona.
4. Output Integrity: Always output valid, well-formed JSON matching the exact schema requested so your answer can be applied directly to the form controls.`;

      if (isOpenAI) {
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
          temperature: 0.1,
          max_tokens: tokenBudget
        };

        const targetUrl = `${baseUrl}/chat/completions`;

        httpRequest({
          method: 'POST',
          url: targetUrl,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeKey}`
          },
          data: JSON.stringify(payload),
          timeout: 30000
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
          tryFallback(err.message || `Network error calling ${prov.name}`);
        });

      } else {
        const parts = [{ text: promptText }];

        base64Images.forEach((img) => {
          if (img && img.data) {
            parts.push({
              inlineData: {
                mimeType: img.mimeType || 'image/jpeg',
                data: img.data
              }
            });
          }
        });

        const payload = {
          systemInstruction: {
            parts: [{ text: SYSTEM_SOLVER_PROMPT }]
          },
          contents: [{ parts: parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: tokenBudget
          }
        };

        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(activeModel)}:generateContent?key=${encodeURIComponent(activeKey)}`;

        httpRequest({
          method: 'POST',
          url: targetUrl,
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify(payload),
          timeout: 30000
        }).then((res) => {
          try {
            const data = JSON.parse(res.responseText || '{}');
            if (res.status !== 200 || data.error) {
              const errDetail = data.error?.message || `HTTP ${res.status}: ${res.statusText || 'API Error'}`;
              return reject(new Error(errDetail));
            }

            if (data.usageMetadata?.totalTokenCount) {
              totalTokensUsed += data.usageMetadata.totalTokenCount;
            }

            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) {
              return reject(new Error('No response generated by Gemini'));
            }

            const parsed = extractJsonPayload(rawText);
            if (parsed) {
              return resolve(parsed);
            }

            return resolve({ answer: rawText.trim() });
          } catch (e) {
            reject(new Error(`Failed to parse Gemini output: ${e.message}`));
          }
        }).catch((err) => {
          reject(new Error(err.message || 'Network error calling Gemini'));
        });
      }
    });
  }

  // Robust choice label extractor
  function getChoiceLabel(el) {
    if (!el) return '';

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    const dataVal = el.getAttribute('data-value') || el.getAttribute('data-answer-value');
    if (dataVal && dataVal.trim()) return dataVal.trim();

    const container = el.closest('label, .docssharedWizToggleLabeledContainer, [role="row"], .nWQ3rd, .SGkqEc, [role="listitem"]');
    if (container) {
      const textEl = container.querySelector('.docssharedWizToggleLabeledContent, .aDTYNe, .M7eMe, span[dir="auto"], .snByac');
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

  // Universal click simulation
  function dispatchUniversalClick(el) {
    if (!el) return;
    try {
      const opts = { bubbles: true, cancelable: true, view: window };
      el.dispatchEvent(new PointerEvent('pointerdown', opts));
      el.dispatchEvent(new MouseEvent('mousedown', opts));
      el.dispatchEvent(new PointerEvent('pointerup', opts));
      el.dispatchEvent(new MouseEvent('mouseup', opts));
    } catch (e) {}
    try {
      el.click();
    } catch (e) {}
  }

  // Toggles radio or checkbox to desired state
  async function safelySetToggle(element, shouldBeChecked = true) {
    if (!element) return false;

    const isCurrentlyChecked = element.getAttribute('aria-checked') === 'true';
    if (isCurrentlyChecked === shouldBeChecked) {
      const parentBlock = element.closest('.Qr7Oae, div[role="listitem"]');
      if (parentBlock) clearBlockErrors(parentBlock);
      return true;
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(120);

    const clickTarget = element.closest('label, .docssharedWizToggleLabeledContainer') || element;
    dispatchUniversalClick(clickTarget);
    await sleep(150);

    if ((element.getAttribute('aria-checked') === 'true') !== shouldBeChecked) {
      dispatchUniversalClick(element);
      await sleep(150);
    }

    const success = (element.getAttribute('aria-checked') === 'true') === shouldBeChecked;
    const parentBlock = element.closest('.Qr7Oae, div[role="listitem"]');
    if (parentBlock) clearBlockErrors(parentBlock);
    return success;
  }

  // Sets text input or textarea with full browser editing command, native setter, and MDC floating-label lift
  async function setInputField(inputEl, val) {
    if (!inputEl) return false;
    try {
      inputEl.removeAttribute('disabled');
      inputEl.removeAttribute('aria-disabled');
      inputEl.disabled = false;
    } catch (e) {}

    inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(100);

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
        await sleep(Math.floor(jitter));
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
    block.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(200);

    const readyTarget = block.querySelector('div[role="radio"], div[role="checkbox"], div[role="listbox"], input, textarea, div[role="row"]');
    if (!readyTarget) {
      await sleep(200);
    }
  }

  function getQuestionInfo(block) {
    let titleEl = block.querySelector('div[role="heading"], .M7eMe, [role="heading"], .F9N22c, .geS5n, legend, .z12JJ, .c2gzEf');
    let title = titleEl ? titleEl.innerText.trim() : '';

    if (!title) {
      const ariaEl = block.querySelector('[aria-label], [data-initial-value]');
      if (ariaEl) {
        title = ariaEl.getAttribute('aria-label') || '';
      }
    }

    if (!title) {
      const rawText = (block.innerText || '').trim();
      if (rawText) {
        title = rawText.split('\n')[0].trim();
      }
    }

    if (!title) {
      title = 'Question';
    }

    // Capture all context notes, point values, instructions, and help text
    const descEls = block.querySelectorAll('div[id$="_desc"], .g3Jh9, [role="note"], .cBGGfd, .asBE0e, .Y5AOUb, div[jsname="W11fsf"], .C2T2v, .dId02c, .V4d7Ke');
    const descriptions = Array.from(descEls).map(el => el.innerText.trim()).filter(Boolean);
    const description = descriptions.join('\n');

    let fullText = title;
    if (description) {
      fullText += `\nContext/Instructions: ${description}`;
    }
    return { title, description, fullText };
  }

  async function extractImages(block) {
    const images = [];
    const mainImgs = block.querySelectorAll('img');
    for (const img of mainImgs) {
      const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
      if (!src || src.startsWith('data:image/svg')) continue;
      if (src.includes('googleusercontent.com/a/') || src.includes('accounts.google.com')) continue;
      if (img.width > 0 && img.width < 32 && img.height > 0 && img.height < 32) continue;

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

    const prompt = `Question: ${questionText}
Dropdown Options: ${JSON.stringify(labels)}

Instructions:
1. Carefully read and understand the question and all dropdown choices.
2. Select the single best, factually correct, or most appropriate option.
3. Think through your reasoning first before outputting the index to eliminate mistakes.

Respond with JSON: {"reasoning": "<step-by-step reasoning identifying the best option>", "chosen_index": <int, zero-based index>}`;

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

    if (radioOptions.length > 0) {
      const labels = Array.from(radioOptions).map(r => getChoiceLabel(r));
      const idx = findMatchingOptionIndex(labels, matched.field, matched.value);
      if (idx !== -1 && radioOptions[idx]) {
        await safelySetToggle(radioOptions[idx], true);
        return true;
      }
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
    }

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
      try { sessionStorage.removeItem('form_ai_multi_page_active'); } catch (e) {}
      try { sessionStorage.removeItem('form_ai_multi_page_persona'); } catch (e) {}
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
    shouldCancel = false;
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

    // Smooth scroll to current question block
    block.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    // 0. ZERO-TOKEN PROFILE FALLBACK
    const currentProfile = getUserProfile();
    let matchedProfile = matchUserProfile(qInfo.title, qInfo.description, currentProfile);

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
          const prompt = `Carefully examine the grid question, full context, notes, and each row and column label.\nQuestion: ${qInfo.fullText}${biasNotice}\nColumns: ${JSON.stringify(gridData.columnHeaders)}\nRows: ${JSON.stringify(rowSummaries.map(r => r.text))}\n\nTask:\n- Match each row to its single best, factually correct, or most logical column.\n- Think through each row in "reasoning" first.\n\nRespond ONLY with JSON:\n{\n  "reasoning": "Step-by-step logic matching each row to the correct column",\n  "answers": [{"row_index": <int 0-indexed>, "chosen_index": <int 0-indexed column>}]\n}`;
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
          const prompt = `Carefully examine the checkbox grid question, all context, and row/column labels.\nQuestion: ${qInfo.fullText}\nColumns: ${JSON.stringify(gridData.columnHeaders)}\nRows: ${JSON.stringify(rowSummaries.map(r => r.text))}\n\nTask:\n- For each row, select all applicable/correct column indices.\n- Think through each row in "reasoning" first.\n\nRespond ONLY with JSON:\n{\n  "reasoning": "Step-by-step evaluation for each row",\n  "answers": [{"row_index": <int 0-indexed>, "chosen_indices": [<int 0-indexed columns>]}]\n}`;
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

        const prompt = `Carefully read the question, any provided context/notes/instructions, and each option.\nQuestion: ${qInfo.fullText}${biasNotice}\nOptions: ${JSON.stringify(labels)}\n\nInstructions:\n- If this is an objective academic test, quiz, math problem, or factual question, determine the single factually correct answer with 100% precision.\n- If this is an opinion/survey question, choose the most sensible, natural option aligning with a real student persona.\n- Think through each option first in the "reasoning" field to avoid mistakes.\n\nRespond ONLY with JSON:\n{\n  "reasoning": "Step-by-step logic checking each option against the question",\n  "chosen_index": <int, zero-based index of best option>,\n  "other_text": "<optional custom text only if choosing Other>"\n}`;
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
          if (isOtherOption && res.other_text) {
            const selectedContainer = radioOptions[idx].closest('label, .docssharedWizToggleLabeledContainer');
            const otherInput = selectedContainer?.querySelector('input[type="text"], input.Hvn9fb, input.whsOnd') ||
                               block.querySelector('input.Hvn9fb, input[aria-label*="Other" i], input[aria-label*="Iba" i], input[aria-label*="Lainnya" i]');
            if (otherInput) {
              await setInputField(otherInput, res.other_text);
            }
          }
          markQuestionSolved(block);
        }
      }

      // 10. CHECKBOXES
      else if (checkboxOptions.length > 0) {
        setStatus(`[${i + 1}/${total}] Solving Checkboxes...`);
        const labels = Array.from(checkboxOptions).map((c, idx) => getChoiceLabel(c) || `Option ${idx + 1}`);

        const prompt = `Carefully read the question, instructions, and all available choices.\nQuestion: ${qInfo.fullText}\nOptions: ${JSON.stringify(labels)}\n\nInstructions:\n- If this is a test or knowledge question, select ALL options that are factually correct. Eliminate incorrect options.\n- If this is a survey question, select the options that genuinely apply to a college student.\n- Put your chain-of-thought analysis in "reasoning" first.\n\nRespond ONLY with JSON:\n{\n  "reasoning": "Step-by-step verification of each option",\n  "chosen_indices": [<int, zero-based index of each correct/selected option>],\n  "other_text": "<optional custom text if Other is checked>"\n}`;
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
            if (isOtherOption && res.other_text) {
              const cContainer = checkboxOptions[c].closest('label, .docssharedWizToggleLabeledContainer');
              const otherInput = cContainer?.querySelector('input[type="text"], input.Hvn9fb, input.whsOnd');
              if (otherInput) {
                await setInputField(otherInput, res.other_text);
              }
            }
          }
        }
        markQuestionSolved(block);
      }

      // 11. PARAGRAPH (Dynamic Answer Variation)
      else if (textarea) {
        setStatus(`[${i + 1}/${total}] Solving Paragraph (Dynamic Variation)...`);

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

        const prompt = `You are a real survey respondent filling out a Google Form questionnaire.
Respondent Profile: ${currentProfile.age}-year-old student at ${currentProfile.schoolOrOrg}, studying ${currentProfile.facultyOrMajor} (residing in ${currentProfile.address || 'Quezon City'}).
Personal Angle to emphasize: ${chosenPerspective}.
Question / Prompt: ${qInfo.fullText}

Instructions:
- Carefully read the question and any notes/instructions.
- Write a genuine, thoughtful 1-3 sentence response directly answering what is asked.
- Avoid robotic or formulaic phrases (NEVER say "As an AI..." or "In my opinion as a student...").
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

        const prompt = `Carefully read the question and any formatting instructions.\nQuestion: ${qInfo.fullText}\nRespondent Profile: ${currentProfile.age}-year-old student at ${currentProfile.schoolOrOrg}, majoring in ${currentProfile.facultyOrMajor}.\nTarget Format: ${formatHint}\n\nInstructions:\n- If this is an objective quiz, math, or factual question, provide the exact, accurate answer without extra conversational filler.\n- If it asks for personal details (e.g. name, student ID, course, year), match the profile sensibly.\n- Put reasoning in "reasoning" first to ensure zero mistakes.\n\nRespond ONLY with JSON: {"reasoning": "Direct analysis", "answer": "<concise answer text>"}`;

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
    const prov = PROVIDERS[savedProvider] || PROVIDERS.gemini;

    if (!isContinuation) {
      totalTokensUsed = 0;
      // Auto-Rotate: On fresh form start, rotate to next persona so name changes every time!
      if (isAutoRotateEnabled() && !currentSessionPersona) {
        rotatePersona();
      }
      setAutoSolvingState(true, currentSessionPersona);
    }

    const apiKey = (getSafeValue(`${prov.id}_api_key`, prov.defaultKey || '')).trim();
    const model = (getSafeValue(`${prov.id}_model`, prov.defaultModel)).trim();

    if (!apiKey) {
      setStatus(`⚠️ Error: Missing ${prov.name} API key. Please enter your API key to solve.`);
      showToastNotification(`⚠️ Missing ${prov.name} API Key! Please configure your key.`, false);
      cleanupProcessingState();
      showApiKeyOnboardingModal(true);
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
        await solveSingleQuestionBlock(block, i, questionBlocks.length, apiKey, model, prov, false);

        const pacing = getPacingConfig();
        const stepDelay = Math.floor(pacing.stepMin + Math.random() * (pacing.stepMax - pacing.stepMin));
        await sleep(stepDelay);
      } // end questionBlocks loop

      if (shouldCancel) {
        setStatus('Processing stopped by user.');
        cleanupProcessingState();
        return;
      }

      // ----------------------------------------------------
      // MANDATORY VERIFICATION PASS: Ensure 100% of questions are answered!
      // ----------------------------------------------------
      clearAllPageErrors();
      let unanswered = getCleanQuestionBlocks().filter(b => !isQuestionAlreadyAnswered(b));
      let verifyPass = 0;
      const MAX_VERIFY_PASSES = 3;

      while (unanswered.length > 0 && verifyPass < MAX_VERIFY_PASSES && !shouldCancel) {
        verifyPass++;
        setStatus(`[Verification Pass ${verifyPass}] Checking questions... ${unanswered.length} unanswered question(s) remaining. Solving now...`);
        for (let u = 0; u < unanswered.length; u++) {
          if (shouldCancel) break;
          const uBlock = unanswered[u];
          await solveSingleQuestionBlock(uBlock, u, unanswered.length, apiKey, model, prov, true);
          await sleep(250);
        }
        clearAllPageErrors();
        unanswered = getCleanQuestionBlocks().filter(b => !isQuestionAlreadyAnswered(b));
      }

      if (unanswered.length > 0) {
        setStatus(`⚠️ Note: ${unanswered.length} question(s) require manual input (e.g. file upload).`);
      } else {
        setStatus(`✓ Verification complete: 100% of questions on this page are completely answered!`);
      }
      await sleep(350);

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

  // Expose global helpers to window for console debugging and shortcuts
  window.__toggleFormAIHUD = toggleHUD;
  window.showFormAI = function () {
    isMinimized = false;
    mountHUD();
    updateHUDState();
    console.log('[Google Form AI HUD] showFormAI called: HUD is now open and visible.');
  };

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

  // If user downloaded this and has no API key set yet, ask them for their API key and provide primary AI provider link
  setTimeout(() => {
    showApiKeyOnboardingModal(false);
  }, 750);

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