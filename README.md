# ⚡ Google Forms Universal AI Assistant HUD

[![Version](https://img.shields.io/badge/version-6.5.0-blue.svg)](https://github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-success.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Userscript](https://img.shields.io/badge/Userscript-Tampermonkey%20%7C%20Violentmonkey-darkgreen.svg)](https://www.tampermonkey.net/)
[![AI Provider](https://img.shields.io/badge/Primary%20AI-Google%20Gemini%20Native-blueviolet.svg)](https://aistudio.google.com/app/apikey)
[![Zero Telemetry](https://img.shields.io/badge/Privacy-100%25%20Client--Side-brightgreen.svg)](#-privacy-and-security)

An ultra-modern, cross-platform autonomous AI Assistant HUD engineered specifically for **Google Forms**. Solves all **12 Google Form question types** with multimodal vision analysis, intelligent reasoning, authentic human-like pacing, and demographic persona generation.

Works both as an **Unpacked Chrome Extension (Manifest V3)** and a **Userscript** for Tampermonkey / Violentmonkey on desktop and mobile browsers.

---

## ⚡ Quick Start: 2-Minute Setup

> **🔑 API Key Notice:** This extension runs **100% client-side** and contains **no hardcoded API keys**. To start solving forms with AI, you simply need a free API key from an AI provider.

### Step 1: Get Your Free Primary API Key (Google Gemini)
The recommended primary provider is **Google Gemini Native**, which offers a **100% free tier with no credit card required**:

1. Open **[Google AI Studio (aistudio.google.com/app/apikey)](https://aistudio.google.com/app/apikey)** in your browser.
2. Sign in with any standard Google account.
3. Click the blue **"Create API key"** button.
4. Copy your generated key (starts with `AIzaSy...`).

---

### Step 2: Install the Assistant

#### Option A: Chrome Extension (Recommended)
1. Download or clone this repository to your computer.
2. Open Chrome (or Brave, Edge, Opera, Arc) and go to `chrome://extensions/`.
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select this project folder (`Google-Forms-Universal-AI-Assistant`).

#### Option B: Userscript (Tampermonkey / Violentmonkey)
1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Create a new script in your userscript manager dashboard.
3. Copy the entire contents of [`google_form.user.js`](google_form.user.js) and paste it into the editor.
4. Save the script (`Ctrl + S`).

---

### Step 3: Open Any Google Form
1. Navigate to any Google Form (`docs.google.com/forms/...` or `forms.gle/...`).
2. On your first visit, an interactive **Setup Prompt** will automatically appear welcoming you and prompting for your API key.
3. Paste your API key into the input box and click **Save & Activate AI Assistant ⚡**.
4. Click **Scan & Solve Current Questions** (or press `Alt + H` / `F2` to toggle the HUD panel at any time)!

---

## 🌐 Supported AI Providers & Key Portals

You can switch AI providers at any time directly in the HUD panel or setup modal:

| Provider | Status | Key Portal | Free Tier? | Multimodal Vision | Recommended Model |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Google Gemini Native** | 🌟 **Primary / Top Pick** | [Google AI Studio](https://aistudio.google.com/app/apikey) | ✅ 100% Free | 👁️ Yes | `gemini-2.5-flash` |
| **Groq Cloud LPU** | ⚡ Ultra-Fast | [Groq Console](https://console.groq.com/keys) | ✅ 100% Free | ❌ Text | `llama-3.3-70b-versatile` |
| **AnyModel.org** | 🌐 Multi-Model Router | [AnyModel Portal](https://anymodel.org) | 🔄 Freemium | 👁️ Yes | `ag/gemini-3.7-flash-high` |
| **Mistral AI** | 🧠 High Reasoning | [Mistral Console](https://console.mistral.ai/api-keys/) | 🔄 Free Trial | 👁️ Yes | `codestral-latest` |
| **OpenRouter** | 🔀 Universal Gateway | [OpenRouter Keys](https://openrouter.ai/keys) | ✅ Free Models | 👁️ Yes | `google/gemini-2.0-flash-exp:free` |
| **NaraRouter** | 🚀 High-Speed Proxy | [NaraRouter Portal](https://router.bynara.id) | ✅ Free Tiers | 👁️ Yes | `agnes-2.5-flash` |

---

## 🎯 All 12 Google Form Question Types Supported

The assistant handles all 12 native Google Form question structures:

| # | Question Type | Assistant Solving Logic |
| :-: | :--- | :--- |
| **1** | **Multiple Choice** | Analyzes prompt, detects correct radio button, and simulates natural human tap. |
| **2** | **Checkboxes** | Handles multi-selection logic, checking all valid answer boxes based on criteria. |
| **3** | **Dropdown Menus** | Opens Google Form dropdown popover, scrolls to the target item, and selects it. |
| **4** | **Linear Scales (1–5, 1–10)** | Uses demographic persona sentiment or Likert bias curve (e.g. realistic positive lean). |
| **5** | **Multiple Choice Grids** | Solves 2D matrix questionnaires row-by-row with authentic opinion distributions. |
| **6** | **Checkbox Grids** | Matrix grid supporting multiple selections per row. |
| **7** | **Short Answer** | Types concise, intelligent responses with authentic randomized keystroke cadence. |
| **8** | **Paragraph / Long Text** | Formulates thorough, grammatically polished long-form explanations. |
| **9** | **Date Pickers** | Generates valid dates conforming to Google Form format requirements. |
| **10** | **Time Pickers** | Inserts realistic hour and minute inputs. |
| **11** | **Rating / Star Scales** | Evaluates satisfaction and product rating questions with nuanced feedback. |
| **12** | **Image / Diagram Questions** | **Multimodal Vision:** Extracts attached images, diagrams, charts, and math equations, passing them to the AI vision pipeline for visual comprehension. |

---

## 🎭 Persona & Demographic Autofill

Eliminate repetitive survey demographic entry with hyper-realistic persona simulation:

- **Built-in Personas:** Detailed profiles including Name, Nickname, Email, Student ID, Phone, City, Province, Age, Gender, Religion, School/Faculty, Major, Year Level, and Hobbies.
- **Infinite Generator:** Click **Generate Infinite QC Profile** to dynamically construct unique, statistically authentic respondent personas.
- **Auto-Rotation:** Toggle auto-rotation on to automatically switch personas on each new form iteration or survey submission.
- **Multi-Page Persistence:** Persona memory persists throughout multi-section forms, ensuring name and demographic consistency from Section 1 through submission.

---

## 📊 Likert Scale & Rating Sentiment Profiles

Control how the AI responds to subjective survey questions:

- **⭐ Realistic Positive (Lean 4–5):** Replicates natural human survey satisfaction tendencies (mostly 4s and 5s with occasional 3s, incorporating anti-straight-lining algorithms).
- **⚖️ Balanced Bell-Curve (Center 3–4):** Normal statistical distribution centered around neutral/agree.
- **🔀 Varied Mixed:** Dynamic varied opinions across consecutive survey items.
- **🤖 Pure AI Choice:** Unadjusted, objective model output.

---

## 👤 Anti-Detection & Humanized Pacing

Avoid automated bot-detection flags on survey platforms:

- **Randomized Keystroke Latency:** Realistic typing cadence with character-by-character intervals rather than instant programmatic value assignment.
- **Read Delays:** Simulates realistic human eye-tracking and comprehension pauses between reading a question and clicking an answer.
- **Selectable Pacing Speeds:**
  - `👤 Humanized` *(Default & Recommended)*: Realistic read intervals (350–700ms) and natural typing (15–35ms).
  - `⚡ Fast`: Rapid instant filling for self-paced testing.
  - `🐢 Ultra Stealth`: Deliberate, relaxed timing (800–1600ms) for high-stakes evaluations.

---

## 🕶️ Stealth Concealment Levels

When minimized, the floating trigger button can adjust its visibility to suit your environment:

- **👻 100% Phantom:** 0.005% opacity — completely invisible to the naked eye. Still clickable in the lower-right corner, or openable via hotkey!
- **🌫️ Ultra Ghost:** 3% faint outline.
- **🕶️ Low Profile:** 15% opacity.
- **🔘 Subtle:** 35% opacity.
- **⚡ Solid Visible:** Full vibrant blue button.

> **💡 First-Time User Safety:** If no API key is configured yet, the floating button automatically stays visible with a pulsing amber setup badge so you never lose track of it before completing setup.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`Alt + H`** | Toggle HUD visibility (Show Panel / Minimize / Phantom) |
| **`F2`** | Alternate quick toggle for HUD panel |
| **`Alt + B`** | **Boss / Blind Mode:** Instantly toggles total transparency (0.005 opacity) |
| **`Escape`** | **Panic Conceal:** Instantly closes open modals and hides the HUD |

---

## 📱 Mobile Browser Support

You can run this assistant on mobile devices and tablets:

### Android
1. Install **[Kiwi Browser](https://kiwibrowser.com/)** from the Google Play Store (supports desktop Chrome extensions).
2. Install the **Tampermonkey** extension from the Chrome Web Store inside Kiwi.
3. Add `google_form.user.js` to Tampermonkey.
4. Open any Google Form — the touch-friendly floating ⚡ button and HUD will appear!

### iOS & iPadOS
1. Install **[Orion Browser](https://kagi.com/orion/)** from the App Store (supports Chrome & Firefox extensions).
2. Install Tampermonkey in Orion and import `google_form.user.js`.
3. Open any Google Form.

---

## 🔒 Privacy and Security

- **Zero Data Collection:** This assistant does not collect, log, or transmit any user information, form responses, or browsing history to any tracking or telemetry server.
- **Local Sandbox Storage:** All API keys, settings, and persona choices are stored strictly in your browser's private local storage (`localStorage` / `GM_setValue`).
- **Direct Provider Connection:** API calls travel directly from your browser to the respective provider endpoint (`generativelanguage.googleapis.com`, `api.groq.com`, etc.) via the Manifest V3 background service worker, ensuring CORS compliance without exposing keys to middlemen.

---

## 🛠️ Troubleshooting & FAQ

<details>
<summary><strong>Q: Where do I get an API key? Is it really free?</strong></summary>

Yes! Google provides a generous free tier for Google Gemini models via **[Google AI Studio](https://aistudio.google.com/app/apikey)**. You can create a free key in under a minute with any Google account without entering a credit card. Groq also offers free API keys with high token allowances at **[console.groq.com](https://console.groq.com/keys)**.
</details>

<details>
<summary><strong>Q: How do I open the HUD if it's minimized or invisible?</strong></summary>

Simply press **`Alt + H`** or **`F2`** on your keyboard. You can also click the bottom-right corner of the webpage where the floating ⚡ button resides.
</details>

<details>
<summary><strong>Q: Does it support multi-page Google Forms?</strong></summary>

Yes! The assistant detects multi-page sections. When solving finishes on page 1, clicking Next will retain your solver state and persona, allowing seamless continuation across all sections until the final Submit button is reached.
</details>

<details>
<summary><strong>Q: How does multimodal vision work on image questions?</strong></summary>

When a Google Form question includes an attached image, chart, or diagram, the assistant extracts the image element, converts it to base64, and sends it alongside the question prompt to the multimodal vision endpoint (`gemini-2.5-flash`, `pixtral`, etc.).
</details>

---

## 📁 Repository Structure

```text
├── background.js         # Manifest V3 Background Service Worker (CORS & network handling)
├── google_form.js        # Content script for unpacked Chrome Extension
├── google_form.user.js   # Standalone userscript for Tampermonkey / Violentmonkey
├── manifest.json         # Chrome Extension Manifest V3 configuration
├── LICENSE               # MIT License
└── README.md             # Documentation, setup guide, and provider directory
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## ⚠️ Disclaimer

This tool is created for educational, research, and accessibility testing purposes. Always comply with relevant terms of service, institutional academic integrity guidelines, and ethical survey research standards.
