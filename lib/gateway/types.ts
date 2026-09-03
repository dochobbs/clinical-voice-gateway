export type ProvenanceType =
  | "provider-reported"
  | "deterministically derived"
  | "model-inferred"
  | "unavailable"
  | "simulated";

export interface ASRWord {
  word: string;
  startMs?: number;
  endMs?: number;
  score?: number;
}

export interface ASRProviderResult {
  provider: "google_chirp_3" | "openai_whisper" | "deepgram_nova_3" | "speechmatics" | "simulated";
  providerLabel: string;
  model: string;
  transcript: string;
  detectedLocale: string;
  vendorScore: number | null;
  vendorScoreMeaning: string;
  words: ASRWord[];
  latencyMs: number;
  requestId: string;
  status: "live" | "unavailable" | "error" | "simulated";
  errorMessage?: string;
  provenance: ProvenanceType;
}

export interface ClinicalConcept {
  name: string;
  category: "symptom" | "medication" | "dose" | "age" | "timing" | "allergy" | "negation" | "other";
  status: "present" | "absent" | "resolved" | "uncertain";
  provenance: ProvenanceType;
}

export interface UncertainSpan {
  span: string;
  reason: string;
  startMs?: number;
  endMs?: number;
  critical: boolean;
  provenance: ProvenanceType;
}

export interface ProbabilisticVariety {
  status: "certain" | "uncertain" | "inferred";
  likely: Array<{ name: string; probability: number }>;
  notes?: string;
}

export interface CodeSwitchSegment {
  start: string; // e.g. "00:00"
  end: string;   // e.g. "00:14"
  text: string;
  language: string;
  register?: string;
}

export interface SpeechQualityAssessment {
  noise: "low" | "moderate" | "high";
  intelligibility: "excellent" | "good" | "fair" | "poor";
  packetLoss?: string;
}

export interface ResponseFidelityCheck {
  passed: boolean;
  score: number; // 0.0 - 1.0
  dosageConsistent: boolean;
  medicationConsistent: boolean;
  noHallucinatedContraindications: boolean;
  fidelityNotes: string[];
  provenance: ProvenanceType;
}

export type AccommodationLevel = 1 | 2 | 3 | 4 | 5;

export interface ClinicalVoicePacket {
  packetId: string;
  createdAt: string;
  audioRef?: string;
  audioDurationSec?: number;
  reportedLocales: Record<string, string>;
  likelyLanguage: {
    language: string;
    variety: string;
    evidence: string;
    calibrated: boolean;
    provenance: ProvenanceType;
  };
  varietyBreakdown?: ProbabilisticVariety;
  speechQuality?: SpeechQualityAssessment;
  accommodationLevel?: AccommodationLevel;
  transcriptCandidates: ASRProviderResult[];
  canonicalTranscript: {
    text: string;
    sourceProvider: string;
    provenance: ProvenanceType;
  };
  codeSwitchedSpans: Array<{
    span: string;
    language: string;
    evidence: string;
    provenance: ProvenanceType;
  }>;
  codeSwitchTimeline?: CodeSwitchSegment[];
  patientAge: {
    value: string | null;
    provenance: ProvenanceType;
  };
  symptoms: Array<{
    name: string;
    status: "present" | "absent" | "resolved" | "uncertain";
    provenance: ProvenanceType;
  }>;
  medications: Array<{
    spoken: string;
    normalized: string;
    provenance: ProvenanceType;
  }>;
  doseCandidates: Array<{
    raw: string;
    normalized: string;
    isResolved: boolean;
    provenance: ProvenanceType;
  }>;
  allergies: Array<{
    substance: string;
    provenance: ProvenanceType;
  }>;
  chronology: Array<{
    event: string;
    timing: string;
    provenance: ProvenanceType;
  }>;
  severity: {
    level: string;
    provenance: ProvenanceType;
  };
  laterality: {
    site: string;
    provenance: ProvenanceType;
  };
  uncertainSpans: UncertainSpan[];
  checksumResults: Record<
    string,
    {
      passed: boolean;
      note: string;
      provenance: ProvenanceType;
    }
  >;
  routingStatus: "safe" | "clarification_required" | "blocked";
  routingReasons: string[];
  clarification?: {
    question: string;
    questionGloss: string;
    targetDoseOptions?: string[];
  };
}

export interface MedicalModelConclusion {
  modelId: "medgemma_4b" | "medgemma_27b" | "gpt4o" | "simulated";
  modelLabel: string;
  triage: string;
  clarifyingQuestions: string[];
  medicationAdvice: string;
  unsupportedAssumptions: string[];
  safetyNetInstructions: string;
  patientFacingAnswer: string;
  ttsAudioUrl?: string;
  fidelityCheck?: ResponseFidelityCheck;
  latencyMs: number;
  status: "live" | "unavailable" | "error" | "simulated";
  errorMessage?: string;
  provenance: ProvenanceType;
}

export interface GatewayStatusResponse {
  providers: {
    google_chirp_3: {
      available: boolean;
      projectId?: string;
      message: string;
    };
    openai_whisper: {
      available: boolean;
      message: string;
    };
    deepgram_nova_3: {
      available: boolean;
      message: string;
    };
    medgemma_local: {
      available: boolean;
      baseUrl: string;
      message: string;
    };
  };
}
