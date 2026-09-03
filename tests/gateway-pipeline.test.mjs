import assert from "node:assert/strict";
import test from "node:test";
import { buildClinicalVoicePacket } from "../lib/gateway/packet-builder.ts";
import { runMedicalModels } from "../lib/gateway/medical-models.ts";

test("Clinical Voice Packet flags dose ambiguity and holds routing", () => {
  const candidates = [
    {
      provider: "google_chirp_3",
      providerLabel: "Google Cloud Speech-to-Text V2",
      model: "chirp_3",
      transcript: "ابني حرارته عاليه واعطيته بنادول اعطيته 15 لا يمكن 5 مل",
      detectedLocale: "ar-JO",
      vendorScore: null,
      vendorScoreMeaning: "Google Chirp 3 uncalibrated score",
      words: [],
      latencyMs: 1200,
      requestId: "test_1",
      status: "live",
      provenance: "provider-reported",
    },
    {
      provider: "openai_whisper",
      providerLabel: "OpenAI Whisper",
      model: "whisper-1",
      transcript: "إبني حرارته عالية وأعطيته Panadol، أعطيته خمسة عشر، لا، يمكن خمسة مل",
      detectedLocale: "ar-JO",
      vendorScore: null,
      vendorScoreMeaning: "Whisper logprob",
      words: [],
      latencyMs: 1400,
      requestId: "test_2",
      status: "live",
      provenance: "provider-reported",
    },
  ];

  const packet = buildClinicalVoicePacket(candidates);

  assert.equal(packet.routingStatus, "clarification_required");
  assert.equal(packet.doseCandidates.length, 2);
  assert.equal(packet.uncertainSpans.length > 0, true);
  assert.equal(packet.checksumResults["Dose"].passed, false);
  assert.equal(packet.checksumResults["Uncertainty"].passed, false);
  assert.ok(packet.clarification?.question);
});

test("Medical models are strictly blocked when routing status is not safe", async () => {
  const packet = {
    packetId: "test_blocked",
    createdAt: new Date().toISOString(),
    reportedLocales: {},
    likelyLanguage: { language: "Arabic", variety: "Jordanian", evidence: "", calibrated: false, provenance: "deterministically derived" },
    transcriptCandidates: [],
    canonicalTranscript: { text: "test", sourceProvider: "test", provenance: "simulated" },
    codeSwitchedSpans: [],
    patientAge: { value: "Child", provenance: "deterministically derived" },
    symptoms: [],
    medications: [],
    doseCandidates: [],
    allergies: [],
    chronology: [],
    severity: { level: "Moderate", provenance: "deterministically derived" },
    laterality: { site: "N/A", provenance: "deterministically derived" },
    uncertainSpans: [{ span: "15 vs 5", reason: "Conflicting dose", critical: true, provenance: "deterministically derived" }],
    checksumResults: {},
    routingStatus: "clarification_required",
    routingReasons: ["Unresolved dose: 15 vs 5 mL"],
    clarification: { question: "5 or 15?", questionGloss: "5 or 15?" },
  };

  const conclusions = await runMedicalModels({
    packet,
    requestedModels: ["gpt4o", "medgemma_4b", "medgemma_27b"],
  });

  assert.equal(conclusions.length, 3);
  for (const c of conclusions) {
    assert.equal(c.triage, "BLOCKED");
    assert.equal(c.status, "error");
    assert.match(c.errorMessage, /Blocked by gateway/);
  }
});

test("Probabilistic variety outputs calibrated likelihoods without rigid labeling", () => {
  const genericArabic = buildClinicalVoicePacket([
    {
      provider: "google_chirp_3",
      providerLabel: "Google Cloud",
      model: "chirp_3",
      transcript: "عندي استشارة طبية بخصوص ابني",
      detectedLocale: "ar",
      vendorScore: null,
      vendorScoreMeaning: "Score",
      words: [],
      latencyMs: 800,
      requestId: "t_ar",
      status: "live",
      provenance: "provider-reported",
    },
  ]);

  assert.ok(genericArabic.varietyBreakdown);
  assert.equal(genericArabic.varietyBreakdown.likely.length >= 2, true);
  const totalProb = genericArabic.varietyBreakdown.likely.reduce((sum, v) => sum + v.probability, 0);
  assert.ok(Math.abs(totalProb - 1.0) < 0.05);

  const hausaPacket = buildClinicalVoicePacket([
    {
      provider: "google_chirp_3",
      providerLabel: "Google Cloud",
      model: "chirp_3",
      transcript: "Yarana mai shekaru 2 tana numfashi da sauri tun daren jiya",
      detectedLocale: "ha-NG",
      vendorScore: null,
      vendorScoreMeaning: "Score",
      words: [],
      latencyMs: 900,
      requestId: "t_ha",
      status: "live",
      provenance: "provider-reported",
    },
  ]);

  assert.equal(hausaPacket.likelyLanguage.language, "Hausa");
  assert.equal(hausaPacket.varietyBreakdown?.likely[0].name.includes("Kano"), true);
});

test("Code-switch timeline captures timestamped transitions", () => {
  const codeSwitchPacket = buildClinicalVoicePacket([
    {
      provider: "google_chirp_3",
      providerLabel: "Google Cloud",
      model: "chirp_3",
      transcript: "Tiene ronchas desde anoche después de empezar amoxicillin pero no le cuesta respirar",
      detectedLocale: "es-MX",
      vendorScore: null,
      vendorScoreMeaning: "Score",
      words: [],
      latencyMs: 900,
      requestId: "t_cs",
      status: "live",
      provenance: "provider-reported",
    },
  ]);

  assert.ok(codeSwitchPacket.codeSwitchTimeline);
  assert.equal(codeSwitchPacket.codeSwitchTimeline.length >= 3, true);
  assert.equal(codeSwitchPacket.codeSwitchTimeline[1].text.includes("amoxicillin"), true);
});
