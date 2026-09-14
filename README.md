# Google Forms Universal AI Assistant HUD

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Local RAG](https://img.shields.io/badge/Knowledge%20RAG-DOCX%20%7C%20PDF%20%7C%20PPTX-orange.svg)](#document-knowledge-grounding-local-rag)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Client--Side-brightgreen.svg)](#privacy-security-and-storage)
[![Zero API Keys](https://img.shields.io/badge/Security-Zero%20Hardcoded%20Keys-blueviolet.svg)](#privacy-security-and-storage)

An autonomous, client-side browser extension built on Manifest V3 specifically for Google Forms. The assistant parses, analyzes, and answers all 12 native Google Form question structures using multimodal vision and frontier language models, featuring **local document knowledge grounding (RAG for DOCX, PDF, and PPT/PPTX)**, live Google Web Search integration, human-paced input simulation, and demographic persona generation.

The extension contains **zero hardcoded API keys**, making it completely safe to clone, fork, and push to public GitHub repositories. Users supply their personal API credentials via the HUD settings panel, which are saved strictly to private local browser storage.

---

## Table of Contents

1. [Overview and Architecture](#overview-and-architecture)
2. [Document Knowledge Grounding (Local RAG)](#document-knowledge-grounding-local-rag)
3. [Installation Guide](#installation-guide)
   - [Desktop Browsers](#1-desktop-browsers-chrome-edge-brave-opera-arc)
   - [Android Setup](#2-android-setup-kiwi-browser)
   - [iOS and iPadOS Setup](#3-ios-and-ipados-setup-orion-browser)
4. [Quick Start](#quick-start)
5. [AI Provider Configuration (AnyModel Multi-Model Directory)](#ai-provider-configuration)
6. [Supported Question Types and Analysis Logic](#supported-question-types-and-analysis-logic)
7. [Demographic Personas and Survey Calibration](#demographic-personas-and-survey-calibration)
8. [Anti-Detection and Pacing Engine](#anti-detection-and-pacing-engine)
9. [Keyboard Shortcuts and HUD Controls](#keyboard-shortcuts-and-hud-controls)
10. [Privacy, Security, and Storage](#privacy-security-and-storage)
11. [Troubleshooting and FAQ](#troubleshooting-and-faq)
12. [Repository Structure](#repository-structure)
13. [License and Disclaimer](#license-and-disclaimer)

---

## Overview and Architecture

The extension operates entirely within the client's browser environment without intermediary proxy servers:

- **Content Script (`google_form.js`):** Injected into Google Forms pages (`docs.google.com/forms/*`, `forms.gle/*`). Directly interacts with the Document Object Model (DOM) to inspect question blocks, extract attached diagrams and images, parse study documents, render the interactive HUD, and simulate natural human user interaction.
- **Background Service Worker (`background.js`):** Handles network requests asynchronously via `chrome.runtime.sendMessage`, bypassing webpage Cross-Origin Resource Sharing (CORS) and Content Security Policy (CSP) limitations. Also manages reading package documents from the `files/` folder and converting them to base64 buffers for in-browser extraction.
- **Manifest V3 Specification:** Complies with current Chromium security standards, utilizing declarative permissions, isolated script contexts, and web-accessible resources.

---

## Document Knowledge Grounding (Local RAG)

The assistant features an in-browser Retrieval-Augmented Generation (RAG) engine that allows you to ground question answers directly in your own lecture slides, notes, syllabi, or exam reviewers.

### Supported File Formats
- **Microsoft Word:** `.docx`, `.doc`
- **Adobe PDF:** `.pdf`
- **PowerPoint Presentations:** `.pptx`, `.ppt`
- **Text & Notes:** `.txt`, `.md`

### How to Use Local Knowledge Files

1. **Place Study Documents in `files/`:**
   Drop your lecture slides, PDFs, Word documents, or notes directly into the `files/` folder located in the extension root directory.
2. **Synchronize the File Manifest:**
   - **One-time Sync:** Double-click `sync_files.bat` (or run `./sync_files.ps1` in PowerShell). This updates `files/files.json` so the extension knows which documents to load.
   - **Real-Time Watcher:** Double-click `watch_files.bat` (or run `./watch_files.ps1`). This background script automatically detects any added, renamed, or modified files and synchronizes them on the fly.
3. **Automatic Ingestion:**
   When you open any Google Form, the HUD automatically scans and extracts the text and structural content of all files in `files/`. When solving questions, the AI will prioritize answers explicitly grounded in your uploaded documents!
4. **Interactive HUD File Manager:**
   You can also click **"🔄 Reload files/ Folder"** or drag and drop files directly onto the HUD to inspect loaded documents in real time.

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
6. Confirm that **"Google Forms Universal AI Assistant HUD"** appears in your active extensions list.

---

### 2. Android Setup (Kiwi Browser)

Chromium extensions can be loaded on Android devices using Kiwi Browser, which provides full Manifest V3 extension developer support:

1. Install **Kiwi Browser** from the Google Play Store.
2. Download or transfer this repository folder onto your Android device.
3. Open Kiwi Browser and navigate to:
   ```text
   chrome://extensions
   ```
4. Enable **Developer mode** via the toggle switch in the top right corner.
5. Tap **+ (from .zip / .crx / folder)**.
6. Open your file manager and select either the downloaded project folder or its `.zip` archive.
7. Open any Google Form link (`docs.google.com/forms/...`). The assistant interface will initialize on the page.

---

### 3. iOS and iPadOS Setup (Orion Browser)

iOS and iPadOS do not support desktop Chrome extensions in Safari or standard Chrome due to WebKit engine policies. However, **Orion Browser by Kagi** implements a desktop WebExtension API layer that supports Manifest V3 extensions on mobile Apple devices:

1. Transfer this project folder to your iPhone or iPad (via AirDrop, iCloud Drive, or the native Files app).
2. Install **Orion Browser** from the Apple App Store.
3. Launch Orion Browser, tap the menu icon (three dots or gear icon), and select **Settings**.
4. Scroll down to **Advanced** and toggle on both **Develop menu** and **Extension Developer options**.
5. Navigate to the Extensions section within Orion's settings and tap **Install from Disk** (or **Load Unpacked**).
6. Use the Files picker to select the extension directory.
7. Open any Google Form. The floating trigger button and HUD will appear on the form.

---

## Quick Start

1. **Obtain an AnyModel API Key:**
   - Register for an account at [anymodel.org](https://anymodel.org).
   - Generate your personal API key from your AnyModel dashboard.
2. **Open a Google Form:**
   - Navigate to any quiz, exam, or survey on `docs.google.com/forms` or `forms.gle`.
3. **Enter Your Key in Settings (⚙️):**
   - Click the floating ⚡ button in the bottom right corner (or press `Alt + H` / `F2`).
   - Switch to the **Settings (⚙️)** tab.
   - Paste your AnyModel API key into the password field and click **Save Settings**.
4. **Scan & Solve:**
   - Switch to the **Solver** tab and click **"⚡ Scan & Solve All Questions"** (or solve individual items one by one).

---

## AI Provider Configuration

The assistant uses **AnyModel.org** as its unified OpenAI-compatible routing engine, granting direct access to frontier models across Google Gemini, Anthropic Claude, and OpenAI GPT with multimodal vision and smart failover:

### Verified Live Model Directory

| Provider / Family | Model ID | Description |
| :--- | :--- | :--- |
| **Google Gemini** | `ag/gemini-3.7-flash-high` | **Top Pick:** High reasoning, vision support & fastest problem solving. |
| **Google Gemini** | `ag/gemini-3.7-flash-low` | Ultra-fast, lightweight & rock-solid for simple quizzes. |
| **Google Gemini** | `ag/gemini-2.5-flash` | Balanced speed and multimodal vision processing. |
| **Anthropic Claude** | `ag/claude-sonnet-4-6` | Deep contextual analysis, qualitative nuance & essay generation. |
| **Anthropic Claude** | `cc/claude-sonnet-4-6` | Ultra high-fidelity reasoning variant. |
| **Anthropic Claude** | `cc/claude-opus-4-6` | Complex academic reasoning & advanced logic proofs. |
| **Anthropic Claude** | `cc/claude-sonnet-5` | Next-generation frontier preview. |
| **OpenAI GPT** | `cx/gpt-6-astra` | Next-generation frontier intelligence. |
| **OpenAI GPT** | `cx/gpt-5.5` | Flagship general knowledge & academic evaluation. |
| **OpenAI GPT** | `cx/gpt-5.6-luna` | Fast, concise factual and technical evaluations. |
| **OpenAI GPT** | `cx/gpt-5.6-terra` | Quantitative logic & mathematics specialist. |
| **OpenAI GPT** | `am/gpt-oss-20b` | Lightweight open-weights model. |
| **Auto-Router** | `am/free` | Automated fallback to free community routing tiers. |

### Smart Auto-Healing Failover Cascade
If a chosen model is temporarily busy or encounters an issue with complex vision inputs, the assistant automatically cascades to `ag/gemini-3.7-flash-high` or the next verified backup model without interrupting your form session.

---

## Supported Question Types and Analysis Logic

The assistant recognizes all 12 Google Form question configurations:

| Number | Question Classification | Resolution Strategy |
| :---: | :--- | :--- |
| 1 | **Multiple Choice** | Evaluates options against question context and document knowledge, dispatching simulated pointer events to target radio elements. |
| 2 | **Checkboxes** | Identifies all applicable answers for multi-select constraints and toggles corresponding checkbox elements. |
| 3 | **Dropdown Menus** | Interacts with custom Google Form popovers, scrolls to match the target label, and executes natural selection. |
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
- **Likert Scale Calibration Modes:**
  - `Realistic Positive (Lean 4–5)`: Natural satisfaction tendencies with anti-straight-lining logic.
  - `Balanced Bell-Curve (Center 3–4)`: Centers selections around normal distribution midpoints.
  - `Varied Mixed`: Heterogeneous distributions across sequential evaluation questions.
  - `Pure AI`: Dispatches unadjusted, objective model decisions directly.

---

## Anti-Detection and Pacing Engine

Automated submission scripts that fill fields instantaneously can trigger platform bot heuristics. The extension includes an anti-detection pacing engine:

- **Keystroke Simulation:** Text is inserted using sequential keyboard events (`keydown`, `keypress`, `input`, `keyup`) with randomized inter-character intervals (15 ms to 35 ms).
- **Cognitive Read Delays:** Introduces human-like cognitive pauses before selecting answers based on question text length.
- **Pacing Presets:**
  - `Humanized` (Recommended): 350 ms – 700 ms read delay, natural keystrokes.
  - `Fast`: Immediate input for speed.
  - `Ultra Stealth`: Extended delays (800 ms – 1600 ms) for supervised environments.
- **Visual Concealment Options:**
  - `100% Phantom`: 0.005% opacity (invisible to casual observers, responsive to clicks and shortcuts).
  - `Ghost`: 3% faint outline.
  - `Low Profile`: 15% opacity.
  - `Subtle`: 35% opacity.
  - `Solid`: Fully visible blue interface.

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

- **Zero Hardcoded Keys:** The repository contains no API keys or tokens. It is completely safe to commit and push to public GitHub repositories.
- **Local Storage Only:** API keys, selected model choices, and document embeddings are stored exclusively in client-side storage (`chrome.storage.local`).
- **No Telemetry:** The extension contains zero tracking scripts, analytics libraries, or external telemetry databases.
- **Direct Communication:** All network traffic travels strictly between your browser and the declared AnyModel API endpoint via standard HTTPS.

---

## Troubleshooting and FAQ

#### 1. "Please enter your AnyModel API Key in Settings" message appears
Open the HUD (`Alt + H` or click the floating ⚡ button), switch to the **Settings (⚙️)** tab, paste your AnyModel API key, and click **Save Settings**.

#### 2. How do I add my lecture slides or study guides?
Drop your `.docx`, `.pdf`, or `.pptx` files into the `files/` folder inside the extension directory, then double-click `sync_files.bat`. In Google Forms, the HUD will immediately detect and ground answers in your materials.

#### 3. The floating button is not visible
If Stealth Concealment is set to Phantom, the button is rendered at 0.005 opacity. Click the lower right corner of your browser window or press `Alt + H` / `F2` to open the panel.

#### 4. Multi-page forms do not continue
The assistant automatically detects the "Next" button and continues solving once the subsequent page's DOM elements hydrate. Ensure you have not clicked the "Stop Solver" button.

---

## Repository Structure

```text
Google-Forms-Universal-AI-Assistant/
├── files/
│   ├── README.txt        # Guide on dropping study materials & documents
│   └── files.json        # Manifest of synced knowledge documents
├── background.js         # Manifest V3 service worker (CORS fetch & file reader)
├── google_form.js        # Core content script (HUD, RAG parser, solver engine)
├── manifest.json         # Extension manifest with permissions & web accessible resources
├── sync_files.bat        # Windows shortcut to synchronize files/ into files.json
├── sync_files.ps1        # PowerShell script scanning files/ for supported documents
├── watch_files.bat       # Windows shortcut to run real-time file watcher
├── watch_files.ps1       # Real-time watcher auto-syncing documents on change
├── LICENSE               # MIT License declaration
├── .gitignore            # Git exclusion rules (prevents committing personal study files)
└── README.md             # Technical documentation and user guide
```

---

## License and Disclaimer

### License
This project is licensed under the terms of the [MIT License](LICENSE).

### Disclaimer
This software is provided for accessibility testing, academic research, and educational development. Users are responsible for ensuring compliance with the terms of service of third-party platforms, academic integrity codes, and institutional policies governing automated form interactions.
