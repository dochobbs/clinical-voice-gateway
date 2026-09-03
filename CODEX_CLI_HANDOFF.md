# Clinical Voice Gateway — Codex CLI Handoff

## Mission

Convert the existing interaction prototype into a genuinely live demonstration of:

**Any phone. Any language. Any medical AI.**

The product is a clinical voice interoperability and safety layer. It must preserve three linked representations:

1. Original audio
2. Original-language transcript
3. Normalized clinical representation

English translation is optional and must never become the canonical source.

## Demo moment

A person speaks a multilingual clinical question. The interface shows real ASR results, identifies clinical concepts and uncertainty, creates a Clinical Voice Packet, and either blocks all medical models for clarification or sends the verified packet to multiple medical models.

The showcase case contains a self-corrected acetaminophen/Panadol dose: 15 mL versus 5 mL. No medical model may be called until the dose is resolved.

## Live model lanes

### Speech

- Primary: Google Cloud Speech-to-Text V2, chirp_3
- Independent witness: OpenAI transcription or Speechmatics
- Optional specialist: Deepgram Nova-3/Flux for supported code-switching pairs
- Later long-tail lane: Whisper/MMS

### Medical reasoning

- Primary: MedGemma 27B text
- Edge comparison: MedGemma 1.5 4B
- Comparator: one frontier general model

### Speech output

- Real multilingual TTS selected by locale

## Provider contract

Each ASR result must preserve: provider, model, original transcript, detected language/locale, vendor score and its meaning, word timestamps when available, word scores when available, latency, and a request identifier.

Each medical-model adapter accepts the same Clinical Voice Packet and returns structured conclusions, clarification needs, triage, medication advice, safety net, unsupported assumptions, latency, and a patient-facing answer.

Do not normalize provider outputs into a fake shared confidence score.

## Clinical Voice Packet

Include:

- packet ID and creation time
- reference to immutable original audio
- reported language/locale from every provider
- likely language and variety, with evidence and explicit calibration status
- all transcript candidates
- selected canonical original-language transcript
- code-switched spans with evidence
- patient age
- symptoms with present, absent, resolved, or uncertain status
- medications as spoken and normalized
- dose candidates and whether resolved
- allergies
- chronology
- severity
- laterality
- clinically material uncertain spans linked to audio timestamps when available
- fidelity results for age, symptoms, negation, medications, dose, numbers/units, chronology, severity, laterality, allergies, and uncertainty
- routing status: safe, clarification_required, or blocked
- routing reasons

## Safety behavior

Use deterministic parsing wherever practical for numbers, units, dose candidates, medication lexicon matching, explicit negation markers, dates, and relative timing.

Use structured model extraction for meaning, but do not let a single model erase disagreement. Critical ASR disagreement becomes uncertainty.

Hold routing when unresolved uncertainty could change triage, medication identity, dose, allergy, age-dependent guidance, laterality, symptom presence/absence, timing, or severity.

## Interface changes

Preserve the call-centric visual direction. Add:

- prominent LIVE versus SIMULATED status for every stage
- actual provider/model labels
- per-stage latency
- an Evidence drawer with raw ASR candidates
- clinical-concept agreement rather than generic transcript similarity
- medical-model selector
- structured comparison of model conclusions
- audio-linked uncertain spans where timestamps exist
- a clarification loop that records a second utterance and repairs the packet

Do not turn the main experience into a developer dashboard. Reveal technical evidence progressively.

## Chirp 3 requirements

- Use Speech-to-Text V2 and chirp_3
- Start with short synchronous recognition for demo reliability
- Use language_codes auto where supported
- Preserve the returned locale exactly
- Support optional locale hints
- Use phrase adaptation for medications and units
- Do not present Chirp's word-level value as calibrated confidence
- Record latency and request identifiers

Initial showcase locales: ar-JO, bn-BD, sw, and es-MX.

Haitian Creole needs a fallback because it is not currently listed for Chirp 3.

## MedGemma requirements

- Implement an OpenAI-compatible local adapter so 4B and 27B deployments can be swapped
- Start with MedGemma 1.5 4B locally for end-to-end plumbing
- Add MedGemma 27B after its inference server is available
- Supply the normalized packet plus the original transcript
- Never silently translate and discard the source transcript
- Require structured output and a separate response-fidelity pass
- Label outputs as prototype, non-validated clinical guidance

## Secrets

Never put API keys or service-account JSON in the client bundle, repository, logs, screenshots, or prompts.

Expected local environment variables:

    GOOGLE_CLOUD_PROJECT=
    GOOGLE_APPLICATION_CREDENTIALS=
    OPENAI_API_KEY=
    SPEECHMATICS_API_KEY=
    DEEPGRAM_API_KEY=
    MEDGEMMA_BASE_URL=http://127.0.0.1:8001/v1
    MEDGEMMA_MODEL=

Only selected providers require credentials.

## Implementation order

1. Replace fake microphone behavior with MediaRecorder and audio preview.
2. Add a local orchestration endpoint and Chirp 3 adapter.
3. Display real transcript, locale, latency, and provenance.
4. Add a second ASR adapter and run both concurrently.
5. Implement structured clinical extraction.
6. Implement deterministic critical-field checks.
7. Implement ambiguity blocking and a real clarification turn.
8. Connect MedGemma 1.5 4B.
9. Connect MedGemma 27B and one frontier comparator.
10. Implement response-fidelity verification and multilingual TTS.
11. Test desktop and mobile.

## Acceptance tests

- Microphone audio is actually recorded and sent to enabled ASR providers.
- No canned transcript appears during Live mode.
- Every displayed value exposes whether it is reported, derived, inferred, or simulated.
- Arabic 15 mL versus 5 mL ambiguity blocks all medical-model calls.
- A clarification recording resolves the dose and re-opens routing.
- The same verified packet can be sent to at least two medical models.
- Models receive the original transcript and normalized representation.
- Fidelity checking detects a changed medication, dose, negation, age, or timing value.
- No secret reaches browser JavaScript.
- Existing scenarios remain available in clearly labeled Guided mode.
- The interface works at phone and desktop widths.

## Codex CLI master prompt

Work in this repository and implement the Clinical Voice Gateway described in CODEX_CLI_HANDOFF.md. Preserve the existing design, but convert it from canned behavior to a real hybrid local demo.

Start with the smallest end-to-end live slice: browser MediaRecorder → local server endpoint → Chirp 3 transcription → real language, transcript, and latency display. Then add the second ASR witness, clinical packet extraction, deterministic safety checks, clarification loop, MedGemma adapters, model comparison, fidelity verification, and TTS in the stated order.

Never fabricate confidence values or model results. Clearly label unavailable providers and simulated Guided mode. Keep credentials server-side. Run the application, exercise the live and guided flows, visually inspect desktop and mobile layouts, and report which components are live, unavailable, or simulated.

If credentials or model access are missing, complete the adapter and configuration work, keep the provider visibly unavailable, and continue all independent implementation rather than replacing it with fabricated output.
