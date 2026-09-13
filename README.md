# Google Forms Universal AI Assistant HUD

[![Version](https://img.shields.io/badge/version-6.5.0-blue.svg)](https://github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Architecture](https://img.shields.io/badge/Type-Chrome%20Extension-blueviolet.svg)](#installation-guide)
[![Client-Side](https://img.shields.io/badge/Privacy-100%25%20Client--Side-brightgreen.svg)](#privacy-security-and-storage)

An autonomous, client-side browser extension built on Manifest V3 specifically for Google Forms. The assistant parses, analyzes, and answers all 12 native Google Form question structures using multimodal vision and frontier language models, featuring human-paced input simulation and demographic persona generation.

The extension is installed directly using the "Load unpacked" workflow across Chromium desktop browsers as well as compatible mobile environments on Android and iOS.

---

## Table of Contents

1. [Overview and Architecture](#overview-and-architecture)
2. [Installation Guide](#installation-guide)
   - [Desktop Browsers](#1-desktop-browsers-chrome-edge-brave-opera-arc)
   - [Android Setup](#2-android-setup-kiwi-browser)
   - [iOS and iPadOS Setup](#3-ios-and-ipados-setup-orion-browser)
3. [Quick Start](#quick-start)
4. [AI Provider Configuration Summaries](#ai-provider-configuration-summaries)
   - [Google Gemini Native (Primary)](#1-google-gemini-native-primary--recommended)
   - [AnyModel.org](#2-anymodelorg)
   - [Groq Cloud LPU](#3-groq-cloud-lpu)
   - [Mistral AI](#4-mistral-ai)
   - [OpenRouter](#5-openrouter)
   - [NaraRouter](#6-nararouter)
   - [Provider Matrix](#provider-matrix)
5. [Supported Question Types and Analysis Logic](#supported-question-types-and-analysis-logic)
6. [Demographic Personas and Survey Calibration](#demographic-personas-and-survey-calibration)
7. [Anti-Detection and Pacing Engine](#anti-detection-and-pacing-engine)
8. [Keyboard Shortcuts and HUD Controls](#keyboard-shortcuts-and-hud-controls)
9. [Privacy, Security, and Storage](#privacy-security-and-storage)
10. [Troubleshooting and FAQ](#troubleshooting-and-faq)
11. [Repository Structure](#repository-structure)
12. [License and Disclaimer](#license-and-disclaimer)

---

## Overview and Architecture

The extension operates entirely within the client's browser environment without intermediary proxy servers:

- **Content Script (`google_form.js`):** Injected into Google Forms pages (`docs.google.com/forms/*`, `forms.gle/*`). Directly interacts with the Document Object Model (DOM) to inspect form fields, extract attached imagery, render the heads-up display (HUD), and simulate natural user interaction.
- **Background Service Worker (`background.js`):** Handles network requests asynchronously via `chrome.runtime.sendMessage`, bypassing webpage Cross-Origin Resource Sharing (CORS) and Content Security Policy (CSP) limitations.
- **Manifest V3 Specification:** Complies with current Chromium security standards, utilizing declarative permissions and isolated script contexts.

---

## Installation Guide

### 1. Desktop Browsers (Chrome, Edge, Brave, Opera, Arc)

The extension is installed via Developer Mode in any Chromium-based desktop browser:

1. Clone or download this repository to your local machine:
   ```bash
   git clone https://github.com/Julian/Google-Forms-Universal-AI-Assistant.git
   ```
   *(Alternatively, download and extract the ZIP archive).*
2. Open your browser and navigate to the Extensions management page:
   - Google Chrome / Brave / Arc / Opera: `chrome://extensions/`
   - Microsoft Edge: `edge://extensions/`
3. Enable the **Developer mode** toggle switch (typically located in the upper right corner).
4. Click the **Load unpacked** button (located in the upper left header).
5. Select the root folder of this project (`Google-Forms-Universal-AI-Assistant`).
6. Confirm that "Google Forms Universal AI Assistant HUD" appears in your active extensions list.

---

### 2. Android Setup (Kiwi Browser)

Chromium extensions can be loaded on Android devices using Kiwi Browser, which provides full Manifest V3 extension developer support:

1. Install **Kiwi Browser** from the Google Play Store.
2. Download this repository onto your Android device (as a folder or `.zip` file).
3. Open Kiwi Browser and navigate to:
   ```text
   chrome://extensions
   ```
4. Enable **Developer mode** via the toggle switch in the top right corner.
5. Tap **+ (from .zip / .crx / folder)**.
6. Open your file manager and select either the downloaded project folder or the `.zip` archive.
7. Open any Google Form link (`docs.google.com/forms/...`). The assistant interface will initialize on the page.

---

### 3. iOS and iPadOS Setup (Orion Browser)

iOS and iPadOS do not support desktop Chrome extensions in Safari or standard Chrome due to WebKit engine policies. However, **Orion Browser by Kagi** implements a desktop WebExtension API layer that supports Manifest V3 extensions on mobile Apple devices:

1. Transfer this project folder to your iPhone or iPad (via AirDrop, iCloud Drive, or the native Files app). Alternatively, compress the folder into a `.zip` archive.
2. Install **Orion Browser** from the Apple App Store.
3. Launch Orion Browser, tap the menu icon (three dots or gear icon), and select **Settings**.
4. Scroll down to **Advanced** and toggle on both **Develop menu** and **Extension Developer options**.
5. Navigate to the Extensions section within Orion's settings and tap **Install from Disk** (or **Load Unpacked**).
6. Use the Files picker to select the extension directory or `.zip` file.
7. Open any Google Form. The floating trigger button and HUD will appear on the lower right corner of the form.

---

## Quick Start

1. **Obtain an API Key:** Acquire an API key from your preferred provider (Google Gemini is recommended and free; see below).
2. **Open a Google Form:** Navigate to any form on `docs.google.com/forms` or `forms.gle`.
3. **Onboarding Prompt:** On your first visit, a configuration dialog will appear automatically.
4. **Save Key:** Select your provider, paste your API key, and click **Save & Activate AI Assistant**.
5. **Execute Solver:** Click **Scan & Solve Current Questions** or press `Alt + H` to open the control panel.

---

## AI Provider Configuration Summaries

The assistant connects directly to third-party language model endpoints. Below is the setup procedure for each supported provider:

### 1. Google Gemini Native (Primary / Recommended)

Google Gemini Native is the default provider. It offers multimodal image recognition, low latency, and a free tier suitable for regular usage.

- **Account Portal:** [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Base Endpoint:** `https://generativelanguage.googleapis.com`
- **Cost:** Free tier available (15 requests per minute, 1 million tokens per minute; no credit card required).
- **Recommended Models:**
  - `gemini-2.5-flash`: Balanced latency and multimodal vision (Recommended).
  - `gemini-2.5-pro`: Deep analytical reasoning for technical and mathematical evaluations.
  - `gemini-3.8-flash`: Latest generation reasoning model.
- **Setup Instructions:**
  1. Navigate to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
  2. Sign in with any personal or institutional Google account.
  3. Click **Create API key**.
  4. Copy the generated key (`AIzaSy...`) and paste it into the HUD.

---

### 2. AnyModel.org

AnyModel provides unified routing across multiple frontier models including Claude, GPT, Grok, and Gemini via an OpenAI-compatible endpoint.

- **Account Portal:** [AnyModel Portal](https://anymodel.org)
- **Base Endpoint:** `https://anymodel.org/v1`
- **Cost:** Freemium / Credit-based.
- **Recommended Models:**
  - `ag/gemini-3.7-flash-high`: High reasoning with vision support.
  - `cx/gpt-5.5`: General text comprehension.
  - `cc/claude-sonnet-5`: Analytical and nuanced qualitative responses.
  - `am/free`: Automated fallback to free community routing tiers.
- **Setup Instructions:**
  1. Register an account at [anymodel.org](https://anymodel.org).
  2. Navigate to your dashboard and generate an API key.
  3. Enter the key into the HUD and verify that the Base URL is set to `https://anymodel.org/v1`.

---

### 3. Groq Cloud LPU

Groq provides specialized hardware inference (LPU) capable of text generation speeds exceeding 500 tokens per second.

- **Account Portal:** [Groq Console](https://console.groq.com/keys)
- **Base Endpoint:** `https://api.groq.com/openai/v1`
- **Cost:** Free tier available with generous rate quotas.
- **Recommended Models:**
  - `llama-3.3-70b-versatile`: General evaluation, factual analysis, and long-form prose.
  - `llama-3.1-8b-instant`: Ultra-low latency responses for basic surveys.
  - `mixtral-8x7b-32768`: Large context window processing.
- **Setup Instructions:**
  1. Create a free account at [console.groq.com](https://console.groq.com/keys).
  2. Click **Create API Key**.
  3. Copy the key (`gsk_...`) into the HUD under the Groq provider selection.

---

### 4. Mistral AI

Mistral AI provides frontier models developed in Europe, including native code generation models and multimodal vision models.

- **Account Portal:** [Mistral Console](https://console.mistral.ai/api-keys/)
- **Base Endpoint:** `https://api.mistral.ai/v1`
- **Cost:** Free trial credits upon verification, followed by pay-as-you-go.
- **Recommended Models:**
  - `codestral-latest`: Technical, mathematical, and logical problem solving.
  - `pixtral-12b-2409`: Dedicated multimodal vision processing for image-based items.
  - `mistral-small-latest`: Fast, lightweight text responses.
- **Setup Instructions:**
  1. Sign in to [console.mistral.ai](https://console.mistral.ai/api-keys/).
  2. Go to **API Keys** and generate a new key.
  3. Paste the key into the HUD under the Mistral provider selection.

---

### 5. OpenRouter

OpenRouter is an API aggregator providing access to dozens of proprietary and open-source models with unified key management.

- **Account Portal:** [OpenRouter Account](https://openrouter.ai/keys)
- **Base Endpoint:** `https://openrouter.ai/api/v1`
- **Cost:** Free models available (`:free` tags); pay-as-you-go for commercial tiers.
- **Recommended Models:**
  - `google/gemini-2.0-flash-exp:free`: Vision support on zero-cost tier.
  - `meta-llama/llama-3.3-70b-instruct:free`: High-parameter open model.
  - `mistralai/mistral-small-24b-instruct-2501:free`: Instruction-tuned lightweight model.
- **Setup Instructions:**
  1. Sign up at [openrouter.ai/keys](https://openrouter.ai/keys).
  2. Click **Create Key**.
  3. Copy the generated token (`sk-or-v1-...`) into the HUD.

---

### 6. NaraRouter

NaraRouter is an optimized regional routing service offering high-availability access to verified models.

- **Account Portal:** [NaraRouter Console](https://router.bynara.id)
- **Base Endpoint:** `https://router.bynara.id/v1`
- **Cost:** Plan-based and free verified endpoints.
- **Recommended Models:**
  - `agnes-2.5-flash`: Fast vision-enabled model.
  - `nemotron-3.5-lightning-free`: High-throughput reasoning.
  - `deepseek-v4.1-flash`: Fast structured output.
- **Setup Instructions:**
  1. Access [router.bynara.id](https://router.bynara.id).
  2. Generate an authorization token.
  3. Select NaraRouter in the HUD and input the credentials.

---

### Provider Matrix

| Provider | Primary Role | Key Acquisition URL | Free Tier | Vision Capable | Protocol |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Gemini Native** | Recommended Default | [aistudio.google.com](https://aistudio.google.com/app/apikey) | Yes | Yes | Native REST |
| **Groq Cloud LPU** | Ultra-Fast Text | [console.groq.com](https://console.groq.com/keys) | Yes | No | OpenAI Compatible |
| **AnyModel.org** | Multi-Model Hub | [anymodel.org](https://anymodel.org) | Freemium | Yes | OpenAI Compatible |
| **Mistral AI** | Code and Vision | [console.mistral.ai](https://console.mistral.ai/api-keys/) | Trial | Yes | OpenAI Compatible |
| **OpenRouter** | Gateway / Aggregator | [openrouter.ai](https://openrouter.ai/keys) | Yes | Yes | OpenAI Compatible |
| **NaraRouter** | High-Speed Proxy | [router.bynara.id](https://router.bynara.id) | Yes | Yes | OpenAI Compatible |

---

## Supported Question Types and Analysis Logic

The assistant recognizes all 12 Google Form question configurations:

| Number | Question Classification | Resolution Strategy |
| :--- | :--- | :--- |
| 1 | **Multiple Choice** | Evaluates options against the question context and dispatches a simulated pointer event to the target radio element. |
| 2 | **Checkboxes** | Identifies all applicable answers for multi-select constraints and toggles corresponding checkbox elements. |
| 3 | **Dropdown Menus** | Interacts with the custom Google Form popover container, scrolls to match the target label, and executes selection. |
| 4 | **Linear Scales (1–5, 1–10)** | Maps numerical scales to selected Likert distribution curves or persona-based sentiment scores. |
| 5 | **Multiple Choice Grids** | Solves two-dimensional matrix questionnaires row by row, ensuring independent evaluation per sub-item. |
| 6 | **Checkbox Grids** | Processes matrix grids permitting multiple selections per row. |
| 7 | **Short Answer** | Generates concise, contextually accurate answers and inputs text via character-by-character keyboard simulation. |
| 8 | **Paragraph Text** | Produces structured, comprehensive prose answers for subjective or analytical essay fields. |
| 9 | **Date Inputs** | Formats valid dates according to the form's localization rules (MM/DD/YYYY or DD/MM/YYYY). |
| 10 | **Time Inputs** | Populates hour and minute fields within realistic operational ranges. |
| 11 | **Rating / Star Scales** | Analyzes sentiment prompts and applies corresponding star or numerical ratings. |
| 12 | **Image Questions** | Extracts `<img>` elements, reads image data into base64 format, and transmits the payload to multimodal vision endpoints. |

---

## Demographic Personas and Survey Calibration

To satisfy survey demographic requirements across multi-page forms, the extension includes demographic profile memory:

- **Built-in Personas:** Pre-configured authentic student and professional identities (Full Name, Student ID, Email, Phone, Address, Major, Year Level, Gender, Age).
- **Dynamic Identity Generation:** Generates coherent, randomized persona data with consistent demographic attributes.
- **Session Continuity:** Persona identity remains consistent across multiple form pages until final submission.
- **Auto-Rotation:** Automatically cycles to a new persona on subsequent submissions when executing repetitive survey runs.

### Likert Scale Calibration Modes

Survey evaluations can be adjusted to replicate human statistical distributions:

- **Realistic Positive (Lean 4–5):** Replicates natural human survey satisfaction tendencies (predominantly 4 and 5 ratings, occasional neutral 3 ratings, with anti-straight-lining logic).
- **Balanced Bell-Curve (Center 3–4):** Centers selections around normal distribution midpoints.
- **Varied Mixed:** Generates heterogeneous responses across sequential evaluation questions.
- **Pure AI:** Dispatches unadjusted, objective model decisions directly.

---

## Anti-Detection and Pacing Engine

Automated submission scripts that fill fields instantaneously can trigger platform rate-limits or bot heuristics. The extension includes an anti-detection pacing engine:

- **Keystroke Simulation:** Text is inserted using sequential keyboard events (`keydown`, `keypress`, `input`, `keyup`) with randomized inter-character intervals (15 ms to 35 ms).
- **Read Delays:** Introduces human-like cognitive pauses before selecting answers based on question text length.
- **Pacing Presets:**
  - `Humanized` (Recommended): 350 ms – 700 ms read delay, natural keystrokes.
  - `Fast`: Immediate input for internal testing.
  - `Ultra Stealth`: Extended delays (800 ms – 1600 ms) for supervised testing environments.
- **Visual Concealment Options:**
  - `100% Phantom`: 0.005% opacity (invisible to observers, responsive to clicks and shortcuts).
  - `Ghost`: 3% faint outline.
  - `Low Profile`: 15% opacity.
  - `Subtle`: 35% opacity.
  - `Solid`: Fully opaque blue interface.

---

## Keyboard Shortcuts and HUD Controls

| Shortcut | Description |
| :--- | :--- |
| `Alt + H` | Toggle HUD visibility between Expanded Panel and Minimized Trigger |
| `F2` | Alternate hotkey to toggle HUD visibility |
| `Alt + B` | **Boss / Blind Mode:** Immediately forces total transparency (0.005 opacity) |
| `Escape` | **Panic Conceal:** Closes active modal overlays and returns HUD to minimized state |

---

## Privacy, Security, and Storage

- **Local Storage Only:** API keys, selected options, and persona settings are stored exclusively in client-side storage (`window.localStorage`).
- **No Telemetry:** The extension contains zero tracking scripts, analytics libraries, or external database connections.
- **Direct Communication:** All network traffic travels strictly between your browser and the declared API provider endpoint via standard HTTPS.
- **No Hardcoded Credentials:** The source code contains no pre-configured API keys.

---

## Troubleshooting and FAQ

#### 1. "Missing API Key" error message appears
Open the HUD (`Alt + H` or click the floating trigger button), select your provider, paste a valid key, and click **Save Settings**. Alternatively, reload the page to bring up the first-run onboarding prompt.

#### 2. The floating button is not visible
If Stealth Concealment is set to Phantom, the button is rendered at 0.005 opacity. Click the lower right corner of the browser window or press `Alt + H` / `F2` to open the panel. If no API key has been saved, the button automatically remains visible with an amber indicator.

#### 3. Image questions fail to solve
Verify that your selected provider and model support multimodal vision (e.g., Google Gemini `gemini-2.5-flash`, Mistral `pixtral-12b-2409`, or AnyModel vision models). Pure text models like Groq Llama cannot process images.

#### 4. Multi-page forms do not continue
The assistant automatically detects the "Next" button and continues solving once the subsequent page's DOM elements hydrate. Ensure you have not clicked the "Stop Solver" button.

---

## Repository Structure

```text
Google-Forms-Universal-AI-Assistant/
├── background.js         # Manifest V3 background service worker (CORS handler)
├── google_form.js        # Core content script injected into Google Forms
├── manifest.json         # Extension manifest defining permissions and entry points
├── LICENSE               # MIT License declaration
└── README.md             # Technical documentation and user guide
```

---

## License and Disclaimer

### License
This project is licensed under the terms of the [MIT License](LICENSE).

### Disclaimer
This software is provided for accessibility testing, academic research, and educational development. Users are responsible for ensuring compliance with the terms of service of third-party platforms, academic integrity codes, and institutional policies governing automated form interactions.
