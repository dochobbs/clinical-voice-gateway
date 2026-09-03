# Clinical Voice Gateway (MedScout)

> **Offline-First Voice Gateway for LMIC Community Health Workers:** Multi-witness speech recognition, deterministic clinical safety gate, and local edge MedGemma triage.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![Ollama](https://img.shields.io/badge/Ollama-MedGemma_4B_%2F_27B-orange.svg)](https://ollama.com/)

---

## The Problem: The Medicine Gets Lost in Translation

In Low-and-Middle-Income Countries (LMICs), over 1.4 billion people rely on frontline Community Health Workers (CHWs / ASHAs / HEWs). When clinics attempt to deploy AI medical decision support, standard speech pipelines:
1. Force patients through an **English text translation bottleneck**, stripping colloquial disease descriptions, pediatric nuances, and culturally specific idioms.
2. Rely on a **single ASR engine** that easily mishears critical dosages (e.g. confusing *"15 mL"* with *"5 mL"*).
3. Suffer from high telephony latencies (>1,200 ms), leading callers to believe the call was disconnected.

---

## The Solution: Clinical Voice Interoperability

```text
                       INBOUND CALLER VOICE
                     (e.g., Hausa, Darija, Swahili)
                                 │
              ┌──────────────────┴──────────────────┐
              │      MULTI-WITNESS ASR ROUTER       │
              ├──────────────────┬──────────────────┤
              │ ⚡ Deepgram       │ 🌍 Google Chirp  │ 🛡️ OpenAI
              │   Nova-3 (<300ms)│   Speech V2 (2B) │   Whisper-1
              └──────────────────┴──────────────────┘
                                 │
                   CLINICAL VOICE PACKET (CVP)
                                 │
                                 ▼
             ┌─────────────────────────────────────────┐
             │  DETERMINISTIC CLINICAL SAFETY GATE     │
             │  • 11 Invariant Checksums               │
             │  • Dose / Negation Ambiguity Detection  │
             │  • WHO IMCI Red-Flag Rules              │
             └───────────────────┬─────────────────────┘
                                 │
                  Safe? ─────────┴───────── Ambiguous / Red Flag?
                    │                                   │
                    ▼                                   ▼
         LEVEL 2: MULTILINGUAL AI               LEVEL 4: CLARIFICATION LOOP
         • Local MedGemma 4B / 27B              • Freeze Medical AI
         • Native Dialect Voice Back            • Synthesize Verification Question
```

---

## Core Capabilities

### 1. Multi-Witness ASR Architecture
Never trust a single acoustic model with a child's clinical dosage. The gateway streams identical audio to three independent witnesses:
- **Deepgram Nova-3**: Real-time conversational streaming (<300 ms), voice activity detection (VAD), and mid-sentence code-switching.
- **Google Chirp 2 (GA) / Chirp 3 (Preview)**: Broadest dialect coverage across 100+ low-resource global languages.
- **OpenAI Whisper-1**: High-context acoustic defense against noisy phone lines, cellular compression, and clinic chatter.

### 2. Deterministic 11-Point Semantic Checksum
Before any medical AI model is permitted to execute, a deterministic rule engine verifies:
1. **Age extraction & units** (e.g., 2 years vs 2 months)
2. **Symptom validity**
3. **Explicit negation** (*"no trouble breathing"*)
4. **Medications & brand names** (*Panadol, Ventolin, Amoxicillin*)
5. **Dose numbers & units** (*5 mL vs 15 mL*)
6. **Chronology & onset** (*since yesterday*)
7. **Severity & progression**
8. **Laterality** (left vs right)
9. **Allergy mentions**
10. **Critical uncertainty holds**
11. **WHO IMCI Danger Signs** (Chest indrawing, convulsions, lethargy, vomiting everything)

### 3. Edge-First Medical Reasoning (Offline MedGemma)
Evaluates pediatric triage guidelines 100% locally on Apple Silicon (M-series) or local GPUs via **Ollama**:
- **MedGemma 4B**: Ultra-fast edge triage (~800 ms).
- **MedGemma 27B**: Deep differential diagnosis and safety netting (~2,100 ms).
- **Frontier Fallback (GPT-4o)**: Dual-run cross-verification when cloud connectivity is available.

### 4. Low-Latency Telephony Comfort Backchannels (<250 ms)
To prevent callers from hanging up during clinical AI inference:
- Gateway detects end-of-turn acoustic silence (<200 ms).
- Instantly plays a pre-synthesized, localized acoustic filler in the caller's dialect:
  - *Hausa:* `“To, na ji ka... bari in duba.”`
  - *Moroccan Darija:* `“Wakhe, fhemtek... d9i9a nchouf m3ak.”`
  - *Swahili:* `“Sawa, nimekusikia... subiri kidogo niangalie taarifa hizi.”`
  - *Hindi/Bhojpuri:* `“हाँ, हम सुन लीं... एक मिनट रुकीं, हम जांच करत बानी।”`
- Maintains a continuous background comfort noise presence (-45 dB hum) so the phone line never sounds dead.

### 5. The 5-Level Accommodation Pipeline
A deterministic fallback matrix ensuring patient safety:
- **Level 1**: Direct Speech ↔ Speech (Zero-text acoustic neural translation).
- **Level 2**: Native Multilingual AI + Voice Back (Reasoning directly in patient dialect; no English pivot).
- **Level 3**: English Clinical Semantic Pivot (Normalized FHIR/SNOMED JSON for ultra-low-resource dialects).
- **Level 4**: Constrained Clarification Loop (Freezes AI; resolves ambiguities before advice).
- **Level 5**: Human Clinical Escalation (Automated SIP transfer to human Community Health Worker on critical hypoxia or trauma).

---

## Top 10 Supported Global LMIC Languages

| # | Language / Dialect | Geography | Speakers | WHO IMCI Clinical Focus |
| :-: | :--- | :--- | :-: | :--- |
| 1 | **Hausa** *(Kano / Northern)* | Nigeria, Niger, Chad | ~85M | Pediatric tachypnea (pneumonia), malaria. |
| 2 | **Hindi & Bhojpuri** | Northern & Rural India | ~600M | ASHA triage: measles rash screening, conjunctivitis. |
| 3 | **Bengali & Sylheti** | Bangladesh, West Bengal | ~300M | BRAC CHWs: neonatal jaundice & fever in 5-day-old. |
| 4 | **Swahili (Kiswahili)** | Tanzania, Kenya, DRC | ~150M | Dispensary triage: infant watery diarrhea & ORS/Zinc. |
| 5 | **Yoruba** | SW Nigeria, Benin | ~45M | Febrile illness, sickle cell crises, child nutrition. |
| 6 | **Moroccan Darija (Arabizi)** | Morocco, Maghreb | ~35M | Pediatric asthma, Ventolin vs ER escalation, Arabizi. |
| 7 | **Tagalog & Ilocano** | Rural Philippines | ~85M | Barangay Health Workers: dengue warning signs. |
| 8 | **Vietnamese** | Vietnam (Communes) | ~95M | Commune Health Stations: hand-foot-mouth, fever. |
| 9 | **Amharic & Oromo** | Ethiopia, Horn of Africa | ~60M | Health Extension Workers: chest indrawing, stridor. |
| 10 | **Guatemalan Spanish (K'iche')** | Guatemala Highlands | ~18M | Rural low-literacy: severe acute hypoxia (**SpO2 88%**). |

---

## Quick Start

### Prerequisites
- Node.js `>=20`
- [Ollama](https://ollama.com/) (optional for local MedGemma; will use cloud frontier if offline)

### 1. Clone & Install
```bash
git clone https://github.com/dochobbs/clinical-voice-gateway.git
cd clinical-voice-gateway
npm install
```

### 2. Configure Environment (Optional for API Providers)
Create `.env.local`:
```bash
# Deepgram Nova-3
DEEPGRAM_API_KEY=your_key_here

# OpenAI Whisper-1 / GPT-4o
OPENAI_API_KEY=your_key_here

# Local Edge Models (Ollama)
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

### 3. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## Interactive Pages & Documentation

- **`/`**: Live Voice Gateway with real microphone input, Multi-Witness ASR, and Phone Call Simulator.
- **`/#phone`**: Interactive Phone Simulator with multi-turn clinical triage, localized comfort backchannels, and English subtitles.
- **`/overview`**: Architecture Decoded interactive guide, including:
  - System Flow & SVG Pipeline Flowchart
  - Deepgram vs. AssemblyAI vs. Google Chirp 2/3 Benchmark Matrix
  - Annotated Clinical Voice Packet (CVP) Schema
  - 5 Formal Architecture Decision Records (ADRs)
  - 20+ Plain-Language Acronym Glossary (IMCI, ASHA, CVP, Arabizi, etc.)

---

## Running Tests

```bash
npm test
```
Runs unit tests validating the Clinical Voice Packet schema, safety gate holds, code-switch detection, and probabilistic variety inference.
