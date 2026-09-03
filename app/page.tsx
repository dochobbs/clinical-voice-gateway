"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AudioWaveform,
  Check,
  Languages,
  Mic,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  Activity,
  PhoneCall,
  Clock,
  FileCheck,
} from "lucide-react";
import {
  ClinicalVoicePacket,
  ASRProviderResult,
  MedicalModelConclusion,
  GatewayStatusResponse,
} from "@/lib/gateway/types";

// Extended Benchmark Cases with Hausa, Moroccan Darija, Wolof, Spanish, and Arabic
const benchmarkCases = [
  {
    name: "Mariam",
    place: "Amman, Jordan",
    flag: "🇯🇴",
    lang: "Arabic",
    variety: "Jordanian / Levantine Arabic",
    confidence: 87,
    varietyBreakdown: {
      status: "inferred",
      likely: [
        { name: "Levantine / Jordanian Arabic", probability: 0.68 },
        { name: "Egyptian Arabic", probability: 0.21 },
        { name: "Other Arabic Varieties", probability: 0.11 },
      ],
      notes: "Phonetic and lexical indicators match Levantine Arabic.",
    },
    codeSwitchTimeline: [
      { start: "00:00", end: "00:08", text: "ابني حرارته عالية وأعطيته...", language: "Levantine Arabic" },
      { start: "00:08", end: "00:11", text: '"Panadol"', language: "English (Brand name)" },
      { start: "00:11", end: "00:22", text: "...أعطيته خمسة عشر—لا، يمكن خمسة مل؟", language: "Levantine Arabic" },
    ],
    speechQuality: { noise: "low", intelligibility: "good" },
    text: "ابني حرارته عالية وأعطيته Panadol... أعطيته خمسة عشر—لا، يمكن خمسة مل؟",
    gloss: "My son has a high fever and I gave him Panadol… I gave him fifteen—no, maybe five mL?",
    concepts: ["child", "fever", "acetaminophen", "dose given: 15 vs 5 mL"],
    switching: "Panadol · EN",
    uncertain: "خمسة عشر—لا، يمكن خمسة مل",
    answer: "قبل أن أساعدك، أحتاج أن أتأكد: هل أعطيته ٥ مل أم ١٥ مل؟ وما تركيز الدواء المكتوب على العبوة؟",
    answerGloss: "Before I help, I need to confirm: did you give 5 mL or 15 mL? What concentration is printed on the bottle?",
    safe: false,
    accommodationLevel: 4,
    resolvedDose: "5 mL",
    resolvedAnswer: "لأن الجرعة هي ٥ مل، هذا يناسب وزنه وعمره. راقبي الحرارة وأعطيه سوائل كافية. راجعي المركز إذا استمرت الحرارة فوق ٣ أيام.",
    resolvedAnswerGloss: "Given 5 mL, this fits appropriate pediatric dosing. Monitor fever, keep him hydrated, and seek clinical care if fever persists >3 days.",
  },
  {
    name: "Aminu & Fatima",
    place: "Kano, Nigeria",
    flag: "🇳🇬",
    lang: "Hausa",
    variety: "Kano / Northern Nigerian Hausa",
    confidence: 94,
    varietyBreakdown: {
      status: "inferred",
      likely: [
        { name: "Kano / Northern Nigerian Hausa", probability: 0.94 },
        { name: "Zaria / Central Hausa", probability: 0.06 },
      ],
      notes: "Language identified: Hausa (distinct from Fulfulde/Yoruba). Regional variety: Northern/Kano.",
    },
    codeSwitchTimeline: [
      { start: "00:00", end: "00:24", text: "Yarana mai shekaru 2 tana numfashi da sauri tun daren jiya...", language: "Hausa (Conversational)" },
    ],
    speechQuality: { noise: "moderate", intelligibility: "good" },
    text: "Yarana mai shekaru 2 tana numfashi da sauri tun daren jiya, ba ta cin abinci sosai.",
    gloss: "My 2-year-old has been breathing fast since last night, and she is not eating well.",
    concepts: ["age: 2 years", "tachypnea / rapid breathing: present", "onset: overnight", "poor appetite"],
    switching: "None detected",
    answer: "Domin tana numfashi da sauri tun jiya, ya kamata ka kai ta asibiti ko wurin ma'aikacin lafiya a yau don a duba ta da kyau. Ka tabbatar tana shan ruwa sosai.",
    answerGloss: "Because she has been breathing fast since yesterday, she should be assessed at a clinic or by a health worker today. Ensure she stays hydrated.",
    safe: true,
    accommodationLevel: 2,
  },
  {
    name: "Youssef",
    place: "Casablanca, Morocco",
    flag: "🇲🇦",
    lang: "Moroccan Arabic (Darija)",
    variety: "Moroccan Darija + French",
    confidence: 91,
    varietyBreakdown: {
      status: "inferred",
      likely: [
        { name: "Moroccan Arabic (Darija)", probability: 0.91 },
        { name: "Algerian Arabic", probability: 0.06 },
        { name: "Other Maghrebi", probability: 0.03 },
      ],
      notes: "Moroccan Darija lexicon with clinical French loanword integration; register: conversational.",
    },
    codeSwitchTimeline: [
      { start: "00:00", end: "00:11", text: "Wldi 3ndo diqa, khda...", language: "Moroccan Darija" },
      { start: "00:11", end: "00:14", text: '"Ventolin"', language: "French (Clinical loan)" },
      { start: "00:14", end: "00:26", text: "...mais mazal kaytnefes bzerba men lbare7.", language: "Moroccan Darija" },
    ],
    speechQuality: { noise: "moderate", intelligibility: "good" },
    text: "ولدي عندو ضيقة، خدى Ventolin mais ما زال كيتنفس بالزربة من البارح... (Wldi 3ndo diqa, khda Ventolin mais mazal kaytnefes bzerba men lbare7...)",
    gloss: "My son has asthma, he took Ventolin but he is still breathing fast since yesterday...",
    concepts: ["asthma", "Ventolin / salbutamol", "persistent tachypnea", "duration: since yesterday"],
    switching: "Ventolin · FR",
    uncertain: "00:18–00:22 (rapid chest retraction mention)",
    answer: "إيلا كان ما زال كيتنفس بالزربة وخا خدى Ventolin، خاصك تدّيه للمستعجلات في أقرب وقت. ما تزيدوش الجرعة بلا ما تشوف طبيب. (Ila kan mazal kaytnefes bzerba wakha khda Ventolin, khassk tdih l urgences f a9rab wa9t. Matzidouch la dose bla ma tchouf tbib.)",
    answerGloss: "If he is still breathing fast after taking Ventolin, take him to the emergency room right away. Do not increase the dose without a clinician.",
    safe: true,
    accommodationLevel: 2,
  },
  {
    name: "Lucía",
    place: "Los Angeles, USA",
    flag: "🇲🇽",
    lang: "Spanish + English",
    variety: "Mexican Spanish",
    confidence: 94,
    varietyBreakdown: {
      status: "inferred",
      likely: [
        { name: "Mexican Spanish", probability: 0.88 },
        { name: "Central American Spanish", probability: 0.12 },
      ],
      notes: "Bilingual Spanish-English code-switching in clinical context.",
    },
    codeSwitchTimeline: [
      { start: "00:00", end: "00:14", text: "Tiene ronchas desde anoche después de empezar...", language: "Mexican Spanish" },
      { start: "00:15", end: "00:18", text: '"amoxicillin"', language: "English (Drug loan)" },
      { start: "00:18", end: "00:31", text: "...pero no le cuesta respirar.", language: "Mexican Spanish" },
    ],
    speechQuality: { noise: "low", intelligibility: "excellent" },
    text: "Tiene ronchas desde anoche después de empezar amoxicillin, pero no le cuesta respirar.",
    gloss: "She has had hives since last night after starting amoxicillin, but she is not having trouble breathing.",
    concepts: ["hives: present", "after amoxicillin", "dyspnea: absent"],
    switching: "amoxicillin · EN",
    answer: "No le des otra dosis de amoxicilina hasta hablar con su médico. Si presenta dificultad para respirar o hinchazón en la cara, acude a urgencias.",
    answerGloss: "Do not give another dose of amoxicillin until you speak with her clinician. Seek emergency care if breathing difficulty develops.",
    safe: true,
    accommodationLevel: 2,
  },
  {
    name: "Modou",
    place: "Dakar, Senegal",
    flag: "🇸🇳",
    lang: "Wolof",
    variety: "Senegalese Wolof",
    confidence: 95,
    varietyBreakdown: {
      status: "inferred",
      likely: [
        { name: "Senegalese Wolof", probability: 0.95 },
        { name: "Gambian Wolof", probability: 0.05 },
      ],
      notes: "Urban Dakar Wolof, oral health consultation.",
    },
    codeSwitchTimeline: [
      { start: "00:00", end: "00:20", text: "Sama doom dafa tàng jëmm te dafa sonn, waaye dafay naan ndox.", language: "Wolof" },
    ],
    speechQuality: { noise: "low", intelligibility: "good" },
    text: "Sama doom dafa tàng jëmm te dafa sonn, waaye dafay naan ndox.",
    gloss: "My child has a high fever and is weak, but is drinking water.",
    concepts: ["fever: present", "weakness: present", "hydration: taking fluids"],
    switching: "None detected",
    answer: "Ndaxte dafa tàng jëmm te sonn, war nga ko yóbbu ci fajkat bi tay. May ko ndox lu bari te bàyyi xel ci yaramam.",
    answerGloss: "Because he has fever and is weak, you should take him to the clinic today. Offer plenty of fluids and monitor closely.",
    safe: true,
    accommodationLevel: 2,
  },
];

const checkList = [
  "Age",
  "Symptoms",
  "Negation",
  "Medications",
  "Dose",
  "Numbers + units",
  "Chronology",
  "Severity",
  "Laterality",
  "Allergies",
  "Uncertainty",
];

export default function Home() {
  const [mode, setMode] = useState<"live" | "phone" | "guided">("live");

  // Server Provider Status
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatusResponse["providers"] | null>(null);

  // Phone Call Simulator state
  const [phoneCallStatus, setPhoneCallStatus] = useState<
    | "idle"
    | "ringing"
    | "connected"
    | "caller_speaking"
    | "backchannel"
    | "reasoning"
    | "clarification"
    | "responding"
    | "awaiting_followup"
    | "followup_responding"
    | "call_completed"
    | "ended"
  >("idle");
  const [phoneScenarioIndex, setPhoneScenarioIndex] = useState(1); // Default to Aminu & Fatima (Hausa)
  const [phoneCallDuration, setPhoneCallDuration] = useState(0);
  const [comfortNoise, setComfortNoise] = useState(true);
  const [phoneClarified, setPhoneClarified] = useState(false);
  const [showEnglishTranslation, setShowEnglishTranslation] = useState(true);
  const [phoneLatency, setPhoneLatency] = useState({
    vad: 310,
    asr: 275,
    gate: 11,
    reasoning: 1380,
    ttsFirstByte: 360,
    totalPerceived: 945,
  });
  const [phoneConversation, setPhoneConversation] = useState<
    { speaker: "caller" | "gateway" | "system"; text: string; gloss?: string; time: string; latency?: string }[]
  >([]);
  const phoneIntervalRef = useRef<any>(null);

  // Guided Mode state
  const [pick, setPick] = useState(0);
  const [stage, setStage] = useState(0);
  const [running, setRunning] = useState(false);
  const [guidedClarified, setGuidedClarified] = useState(false);

  // Live Audio Mode state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [localeHint, setLocaleHint] = useState<string>("auto");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [livePacket, setLivePacket] = useState<ClinicalVoicePacket | null>(null);
  const [liveCandidates, setLiveCandidates] = useState<ASRProviderResult[]>([]);
  const [showRawEvidence, setShowRawEvidence] = useState(false);

  // Downstream Models & TTS state
  const [isRunningModels, setIsRunningModels] = useState(false);
  const [modelConclusions, setModelConclusions] = useState<MedicalModelConclusion[]>([]);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [autoExecuteLoop, setAutoExecuteLoop] = useState(true);

  // MediaRecorder references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Load gateway status on mount & sync hash mode
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.replace("#", "");
      if (["live", "phone", "guided"].includes(hash)) {
        setMode(hash as any);
      }
    }

    fetch("/api/gateway/asr")
      .then((res) => res.json())
      .then((data) => {
        if (data?.providers) {
          setGatewayStatus(data.providers);
        }
      })
      .catch((err) => console.error("Error loading gateway status:", err));
  }, []);

  // Timer effect for recording
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  // Start live microphone recording using MediaRecorder
  const startRecording = async () => {
    try {
      setAudioBlob(null);
      setAudioUrl(null);
      setLivePacket(null);
      setLiveCandidates([]);
      setModelConclusions([]);
      setTtsAudioUrl(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        stream.getTracks().forEach((track) => track.stop());
        submitLiveAudio(blob);
      };

      mr.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      alert(`Could not access microphone: ${err.message}. Please verify browser permissions.`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Submit audio to local server endpoint
  const submitLiveAudio = async (blobToSend?: Blob) => {
    const targetBlob = blobToSend || audioBlob;
    if (!targetBlob) return;

    setIsTranscribing(true);
    setLivePacket(null);
    setLiveCandidates([]);
    setModelConclusions([]);
    setTtsAudioUrl(null);

    try {
      const formData = new FormData();
      formData.append("audio", targetBlob, "microphone_input.webm");
      formData.append("localeHint", localeHint);
      formData.append(
        "providers",
        JSON.stringify(["google_chirp_3", "openai_whisper", "deepgram_nova_3"])
      );

      const res = await fetch("/api/gateway/asr", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.packet) {
        setLivePacket(data.packet);
        if (data.packet.routingStatus === "safe" && autoExecuteLoop) {
          executeMedicalPipeline(data.packet);
        } else if (data.packet.routingStatus !== "safe" && data.packet.clarification) {
          // Tool speaks clarification question back to patient automatically
          generateTTSVoiceBack(data.packet.clarification.question, data.packet.likelyLanguage.language);
        }
      }
      if (data.candidates) {
        setLiveCandidates(data.candidates);
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      alert(`Transcription error: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Run downstream medical models if packet is safe
  const executeMedicalPipeline = async (packetToRun: ClinicalVoicePacket) => {
    setIsRunningModels(true);
    try {
      const res = await fetch("/api/gateway/reasoning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packet: packetToRun,
          requestedModels: ["medgemma_4b", "gpt4o", "medgemma_27b"],
        }),
      });
      const data = await res.json();
      if (data.conclusions) {
        setModelConclusions(data.conclusions);
        // Automatically synthesize spoken voice back for the primary model
        const primary = data.conclusions.find((c: any) => c.status === "live") || data.conclusions[0];
        if (primary && primary.patientFacingAnswer) {
          generateTTSVoiceBack(primary.patientFacingAnswer, packetToRun.likelyLanguage.language);
        }
      }
    } catch (err: any) {
      console.error("Medical reasoning execution error:", err);
    } finally {
      setIsRunningModels(false);
    }
  };

  const runDownstreamMedicalModels = () => {
    if (livePacket) executeMedicalPipeline(livePacket);
  };

  // Generate real TTS Spoken Voice back to caller
  const generateTTSVoiceBack = async (text: string, lang: string) => {
    setIsGeneratingTTS(true);
    try {
      const res = await fetch("/api/gateway/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language: lang,
          voice: "alloy",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioUrl) {
          setTtsAudioUrl(data.audioUrl);
          // Play audio
          const audio = new Audio(data.audioUrl);
          audio.play().catch(() => {});
        }
      }
    } catch (e) {
      console.error("TTS generation error:", e);
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  // Clarification turn in Live Mode
  const resolveLiveDoseClarification = (resolvedDose: string) => {
    if (!livePacket) return;
    const updatedPacket: ClinicalVoicePacket = {
      ...livePacket,
      doseCandidates: [
        {
          raw: resolvedDose,
          normalized: resolvedDose,
          isResolved: true,
          provenance: "deterministically derived",
        },
      ],
      uncertainSpans: [],
      routingStatus: "safe",
      accommodationLevel: 2,
      routingReasons: [],
      checksumResults: {
        ...livePacket.checksumResults,
        Dose: {
          passed: true,
          note: `Clarified and confirmed: ${resolvedDose}`,
          provenance: "deterministically derived",
        },
        "Numbers + units": {
          passed: true,
          note: `Confirmed single volumetric dose ${resolvedDose}`,
          provenance: "deterministically derived",
        },
        Uncertainty: {
          passed: true,
          note: "Resolved through clarification turn",
          provenance: "deterministically derived",
        },
      },
    };
    setLivePacket(updatedPacket);
    // Unfreeze and immediately execute downstream medical AI + voice back!
    executeMedicalPipeline(updatedPacket);
  };

  // Phone Call Simulator Handlers
  const currentPhoneCase = benchmarkCases[phoneScenarioIndex];

  // Dedicated Sequential Audio Player for Phone Telephony
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopActiveAudio = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
    }
  };

  const playSequentialAudio = (text: string, lang: string, role: "caller" | "gateway" = "gateway"): Promise<void> => {
    return new Promise(async (resolve) => {
      stopActiveAudio();

      try {
        const voice = role === "caller" ? "shimmer" : "alloy";
        const res = await fetch("/api/gateway/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language: lang, voice }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.audioUrl) {
            setTtsAudioUrl(data.audioUrl);
            const audio = new Audio(data.audioUrl);
            activeAudioRef.current = audio;
            audio.onended = () => {
              activeAudioRef.current = null;
              resolve();
            };
            audio.onerror = () => {
              activeAudioRef.current = null;
              resolve();
            };
            await audio.play().catch(() => resolve());
            return;
          }
        }
      } catch (err) {
        console.error("Sequential TTS playback error:", err);
      }

      // Browser Web Speech fallback
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.onend = () => resolve();
        u.onerror = () => resolve();
        speechSynthesis.speak(u);
        return;
      }

      setTimeout(resolve, 1800);
    });
  };

  const getComfortFiller = (lang: string) => {
    if (lang.includes("Hausa")) {
      return {
        text: "To, na ji ka... bari in duba.",
        gloss: "Understood, I hear you... let me check that right now.",
      };
    }
    if (lang.includes("Moroccan")) {
      return {
        text: "Wakhe, fhemtek... d9i9a nchouf m3ak.",
        gloss: "Okay, understood... one minute let me check with you.",
      };
    }
    if (lang.includes("Arabic")) {
      return {
        text: "تمام، سمعتك... لحظة واحدة بس.",
        gloss: "Understood, I hear you... just one second.",
      };
    }
    if (lang.includes("Spanish")) {
      return {
        text: "Entendido, déjame revisar la información...",
        gloss: "Understood, let me review the information...",
      };
    }
    if (lang.includes("Wolof")) {
      return {
        text: "Waaw, dégg naa la... xaaral ma xool.",
        gloss: "Yes, I hear you... wait let me check.",
      };
    }
    return {
      text: "Understood, checking that for you right now...",
      gloss: "Understood, checking that for you right now.",
    };
  };

  const startPhoneCall = async () => {
    stopActiveAudio();
    setPhoneCallStatus("ringing");
    setPhoneCallDuration(0);
    setPhoneConversation([]);
    setPhoneClarified(false);
    if (phoneIntervalRef.current) clearInterval(phoneIntervalRef.current);

    await new Promise((r) => setTimeout(r, 1200));
    setPhoneCallStatus("connected");
    phoneIntervalRef.current = setInterval(() => {
      setPhoneCallDuration((t) => t + 1);
    }, 1000);

    // Turn 1: Caller speaks initial complaint
    await new Promise((r) => setTimeout(r, 500));
    setPhoneCallStatus("caller_speaking");
    setPhoneConversation([
      {
        speaker: "caller",
        text: currentPhoneCase.text,
        gloss: currentPhoneCase.gloss,
        time: "00:02",
      },
    ]);

    // Play caller audio FIRST so the caller's voice is heard!
    await playSequentialAudio(currentPhoneCase.text, currentPhoneCase.lang, "caller");

    // Immediate Backchannel (< 250ms after caller finishes!)
    setPhoneCallStatus("backchannel");
    const filler = getComfortFiller(currentPhoneCase.lang);
    setPhoneConversation((prev) => [
      ...prev,
      {
        speaker: "gateway",
        text: `[Comfort Ack] “${filler.text}”`,
        gloss: filler.gloss,
        time: "00:05",
        latency: "240 ms (Zero LLM Tokens · Immediate Line Presence)",
      },
    ]);
    await playSequentialAudio(filler.text, currentPhoneCase.lang, "gateway");

    // Gateway Reasoning & Triage
    setPhoneCallStatus("reasoning");
    await new Promise((r) => setTimeout(r, 400));

    if (!currentPhoneCase.safe && !phoneClarified) {
      setPhoneCallStatus("clarification");
      setPhoneConversation((prev) => [
        ...prev,
        {
          speaker: "gateway",
          text: currentPhoneCase.answer,
          gloss: currentPhoneCase.answerGloss,
          time: "00:08",
          latency: "Safety Gate Triggered (Medical AI Blocked until verified)",
        },
      ]);
      await playSequentialAudio(currentPhoneCase.answer, currentPhoneCase.lang, "gateway");
    } else {
      setPhoneCallStatus("awaiting_followup");
      const followPrompt =
        currentPhoneCase.lang.includes("Hausa")
          ? " Shin akwai matsalar shakar iska sosai kamar shiga cikin kirji (chest indrawing)?"
          : currentPhoneCase.lang.includes("Moroccan")
          ? " Wach kaytnefes b s3ouba kbira wlla 9ader yhder?"
          : " ¿Tiene dificultad extrema para respirar o hundimiento de costillas?";
      const followGloss =
        currentPhoneCase.lang.includes("Hausa")
          ? " Is there severe respiratory distress such as chest indrawing?"
          : currentPhoneCase.lang.includes("Moroccan")
          ? " Is he struggling severely to breathe or can he speak?"
          : " Does the child have severe breathing distress or rib retractions?";

      const fullAnswerText = currentPhoneCase.answer + followPrompt;
      const fullAnswerGloss = currentPhoneCase.answerGloss + followGloss;

      setPhoneConversation((prev) => [
        ...prev,
        {
          speaker: "gateway",
          text: fullAnswerText,
          gloss: fullAnswerGloss,
          time: "00:09",
          latency: "1,380 ms (MedGemma 4B / GPT-4o)",
        },
      ]);
      await playSequentialAudio(fullAnswerText, currentPhoneCase.lang, "gateway");
    }
  };

  // Turn 2: Follow-up interaction handling
  const handlePhoneFollowup = async (isRedFlag: boolean) => {
    setPhoneCallStatus("followup_responding");

    const callerReplyText = isRedFlag
      ? currentPhoneCase.lang.includes("Hausa")
        ? "Eh, kirjinta yana shiga ciki sosai idan tana numfashi."
        : currentPhoneCase.lang.includes("Moroccan")
        ? "Kaytnefes b s3ouba kbira w ma9derch yhder."
        : "Sí, se le hunden mucho las costillas al respirar."
      : currentPhoneCase.lang.includes("Hausa")
      ? "A'a, babu shiga cikin kirji, amma numfashinta kawai yake da sauri."
      : currentPhoneCase.lang.includes("Moroccan")
      ? "La, makaynch s3ouba kbira, ghir kaytnefes bzerba."
      : "No, no se le hunden las costillas, solo respira rápido.";

    const callerReplyGloss = isRedFlag
      ? "Yes, her chest is sucking inward deeply when breathing."
      : "No, no deep chest indrawing, but her breathing is fast.";

    setPhoneConversation((prev) => [
      ...prev,
      {
        speaker: "caller",
        text: callerReplyText,
        gloss: callerReplyGloss,
        time: `00:${phoneCallDuration}`,
      },
    ]);
    // Play caller turn 2 reply
    await playSequentialAudio(callerReplyText, currentPhoneCase.lang, "caller");

    // Immediate Backchannel on Turn 2
    const ack = currentPhoneCase.lang.includes("Hausa")
      ? { text: "To, na fahimta sosai...", gloss: "Understood, I clearly understand..." }
      : { text: "تمام، فهمت عليك...", gloss: "Understood, I follow..." };

    setPhoneConversation((prev) => [
      ...prev,
      {
        speaker: "gateway",
        text: `[Comfort Ack] “${ack.text}”`,
        gloss: ack.gloss,
        time: `00:${phoneCallDuration + 1}`,
        latency: "220 ms (Zero LLM Tokens)",
      },
    ]);
    await playSequentialAudio(ack.text, currentPhoneCase.lang, "gateway");

    // Triage Escalation / Advice
    const gatewayAdviceText = isRedFlag
      ? currentPhoneCase.lang.includes("Hausa")
        ? "Wannan alama ce mai hadari (chest indrawing). Ku tafi asibiti ko dakin gaggawa nan take. Kar ku jira har gobe."
        : currentPhoneCase.lang.includes("Moroccan")
        ? "Hada khetar kbir (chest indrawing). Dih l urgences f a9rab wa9t daba, mattsennach."
        : "Este es un signo de alarma grave (tiraje intercostal). Acude al hospital o urgencias de inmediato. No esperes."
      : currentPhoneCase.lang.includes("Hausa")
      ? "To, a kaita asibitin unguwa a yau don a auna zazzabinta da numfashinta. Ku ci gaba da ba ta ruwa da abinci a hankali."
      : currentPhoneCase.lang.includes("Moroccan")
      ? "Dih l sbitar lyoum bach ychoufou tanaffos dyalo. 3tih lma mezian."
      : "Llévalo al centro de salud hoy para evaluación y mantén una hidratación constante.";

    const gatewayAdviceGloss = isRedFlag
      ? "This is a critical red flag (subcostal chest indrawing). Take her to the emergency room or hospital immediately. Do not wait until tomorrow."
      : "Alright, take her to the local clinic today for vitals and respiration assessment. Continue offering fluids and gentle food.";

    setPhoneConversation((prev) => [
      ...prev,
      {
        speaker: "gateway",
        text: gatewayAdviceText,
        gloss: gatewayAdviceGloss,
        time: `00:${phoneCallDuration + 3}`,
        latency: isRedFlag ? "EMERGENCY ESCALATION · High Urgency" : "Routine Urgent Assessment",
      },
    ]);
    await playSequentialAudio(gatewayAdviceText, currentPhoneCase.lang, "gateway");

    // Turn 3: Call Wrap-up
    const closingCallerText = currentPhoneCase.lang.includes("Hausa")
      ? "Na gode sosai, muna kan hanya yanzu."
      : currentPhoneCase.lang.includes("Moroccan")
      ? "Chokran bzaf, 7na ghadin daba."
      : "Muchas gracias, ya vamos saliendo.";
    const closingCallerGloss = "Thank you very much, we are on our way now.";

    const finalGatewayText = currentPhoneCase.lang.includes("Hausa")
      ? "Allah ya bata lafiya. Tabbatar kun tafi da katin rigakafinta."
      : currentPhoneCase.lang.includes("Moroccan")
      ? "Lah ychafi. Ddi m3ak l carnet d tal9i7."
      : "Que se recupere pronto. Lleve su cartilla de vacunación.";
    const finalGatewayGloss = "May she recover swiftly. Ensure you bring her vaccination record.";

    setPhoneConversation((prev) => [
      ...prev,
      {
        speaker: "caller",
        text: closingCallerText,
        gloss: closingCallerGloss,
        time: `00:${phoneCallDuration + 5}`,
      },
    ]);
    await playSequentialAudio(closingCallerText, currentPhoneCase.lang, "caller");

    setPhoneConversation((prev) => [
      ...prev,
      {
        speaker: "gateway",
        text: finalGatewayText,
        gloss: finalGatewayGloss,
        time: `00:${phoneCallDuration + 6}`,
        latency: "Call Concluded",
      },
    ]);
    setPhoneCallStatus("call_completed");
    await playSequentialAudio(finalGatewayText, currentPhoneCase.lang, "gateway");
  };

  const resolvePhoneClarification = async (dose: string) => {
    setPhoneClarified(true);
    const callerConfirmText = currentPhoneCase.lang.includes("Arabic") ? `أعطيته ${dose} فقط بالقطارة.` : `Clarification: ${dose}`;
    const callerConfirmGloss = `I gave him ${dose} only using the dropper.`;

    setPhoneConversation((prev) => [
      ...prev,
      {
        speaker: "caller",
        text: callerConfirmText,
        gloss: callerConfirmGloss,
        time: `00:${phoneCallDuration}`,
      },
    ]);
    await playSequentialAudio(callerConfirmText, currentPhoneCase.lang, "caller");

    setPhoneCallStatus("reasoning");

    // Immediate Ack
    const ack = {
      text: "تمام، شكراً للتوضيح... سأراجع الجرعة الآن.",
      gloss: "Understood, thank you for clarifying... reviewing dosage now.",
    };
    setPhoneConversation((prev) => [
      ...prev,
      {
        speaker: "gateway",
        text: `[Comfort Ack] “${ack.text}”`,
        gloss: ack.gloss,
        time: `00:${phoneCallDuration + 1}`,
        latency: "230 ms (Zero LLM Tokens)",
      },
    ]);
    await playSequentialAudio(ack.text, currentPhoneCase.lang, "gateway");

    setPhoneCallStatus("call_completed");
    const ans = currentPhoneCase.resolvedAnswer || currentPhoneCase.answer;
    const ansGloss = currentPhoneCase.resolvedAnswerGloss || currentPhoneCase.answerGloss;

    setPhoneConversation((prev) => [
      ...prev,
      {
        speaker: "gateway",
        text: ans,
        gloss: ansGloss,
        time: `00:${phoneCallDuration + 3}`,
        latency: "Gate Cleared · Fidelity 100% · Single verified dose 5 mL",
      },
    ]);
    await playSequentialAudio(ans, currentPhoneCase.lang, "gateway");

    const callerReassured = "شكراً جزيلاً، طمّنتني.";
    const callerReassuredGloss = "Thank you so much, that reassures me.";

    setPhoneConversation((prev) => [
      ...prev,
      {
        speaker: "caller",
        text: callerReassured,
        gloss: callerReassuredGloss,
        time: `00:${phoneCallDuration + 5}`,
      },
    ]);
    await playSequentialAudio(callerReassured, currentPhoneCase.lang, "caller");

    const partingText = "ألف سلامة عليه. إذا ظهر طفح جلدي أو صعوبة تنفس، راجعي الطوارئ فوراً.";
    const partingGloss = "Wishing him full recovery. If rash or breathing difficulty develops, visit emergency right away.";

    setPhoneConversation((prev) => [
      ...prev,
      {
        speaker: "gateway",
        text: partingText,
        gloss: partingGloss,
        time: `00:${phoneCallDuration + 6}`,
        latency: "Call Concluded",
      },
    ]);
    await playSequentialAudio(partingText, currentPhoneCase.lang, "gateway");
  };

  const hangUpPhoneCall = () => {
    stopActiveAudio();
    setPhoneCallStatus("ended");
    if (phoneIntervalRef.current) clearInterval(phoneIntervalRef.current);
  };

  // Guided Mode functions
  const c = benchmarkCases[pick];
  const runGuided = () => {
    setRunning(true);
    setStage(1);
    [2, 3, 4, 5].forEach((n, i) =>
      setTimeout(() => {
        setStage(n);
        if (n === 5) {
          setRunning(false);
          const answerText = guidedClarified && c.resolvedAnswer ? c.resolvedAnswer : c.answer;
          generateTTSVoiceBack(answerText, c.lang);
        }
      }, 600 * (i + 1))
    );
  };

  const chooseGuided = (i: number) => {
    setPick(i);
    setStage(0);
    setRunning(false);
    setGuidedClarified(false);
    setTtsAudioUrl(null);
  };

  const speak = (textToSpeak: string, langCode: string) => {
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(textToSpeak);
      u.lang = langCode;
      speechSynthesis.speak(u);
    }
  };

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const chirpCandidate = liveCandidates.find((c) => c.provider === "google_chirp_3");
  const secondaryCandidate =
    liveCandidates.find((c) => c.provider === "openai_whisper") ||
    liveCandidates.find((c) => c.provider === "deepgram_nova_3");

  return (
    <main>
      {/* Top Header */}
      <header>
        <div className="brand">
          <b><AudioWaveform /></b>
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
            Clinical Voice Gateway
          </Link>
          <em>v0.9 POC</em>
        </div>

        <div className="promise">
          <strong>Any phone.</strong> Any language. Any medical AI.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            href="/overview"
            style={{
              textDecoration: "none",
              color: "var(--ink-secondary)",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              background: "var(--card-subtle)",
              border: "1px solid var(--line)",
              padding: "4px 8px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            Architecture Decoded →
          </Link>

          <div className="live-pill">
            <span className="dot-live" />
            {mode === "live" ? "LIVE MICROPHONE GATEWAY" : "BENCHMARK SCENARIOS"}
          </div>
        </div>
      </header>

      {/* Hero Intro */}
      <section className="intro">
        <small>Clinical Voice Interoperability</small>
        <h1>
          The medicine survives<br />
          <i>the translation.</i>
        </h1>
        <p>
          Preserve the medicine, not just the words. Don’t translate the patient into English—translate the medical system into the patient’s language.
        </p>
      </section>

      {/* Mode Switcher */}
      <div className="mode-bar">
        <button
          className={mode === "live" ? "active" : ""}
          onClick={() => setMode("live")}
        >
          <Mic style={{ width: 15 }} /> Live Voice Gateway (Real ASR)
        </button>
        <button
          className={mode === "phone" ? "active" : ""}
          onClick={() => setMode("phone")}
        >
          <PhoneCall style={{ width: 15 }} /> Phone Call Simulator (Interactive)
        </button>
        <button
          className={mode === "guided" ? "active" : ""}
          onClick={() => setMode("guided")}
        >
          <Layers style={{ width: 15 }} /> Benchmark Scenarios (Simulated)
        </button>
      </div>

      {/* Provider Status Strip */}
      <div className="provider-strip">
        <span
          className={
            "prov-badge " + (gatewayStatus?.google_chirp_3?.available ? "active" : "off")
          }
        >
          <span className="dot" /> Google Chirp 3:{" "}
          <strong>
            {gatewayStatus?.google_chirp_3?.available ? "Speech V2 (us / chirp_3)" : "Offline"}
          </strong>
        </span>
        <span
          className={
            "prov-badge " + (gatewayStatus?.openai_whisper?.available ? "active" : "off")
          }
        >
          <span className="dot" /> OpenAI:{" "}
          <strong>{gatewayStatus?.openai_whisper?.available ? "Whisper-1" : "Offline"}</strong>
        </span>
        <span
          className={
            "prov-badge " + (gatewayStatus?.deepgram_nova_3?.available ? "active" : "off")
          }
        >
          <span className="dot" /> Deepgram:{" "}
          <strong>{gatewayStatus?.deepgram_nova_3?.available ? "Nova-3" : "Offline"}</strong>
        </span>
        <span
          className={
            "prov-badge " + (gatewayStatus?.medgemma_local?.available ? "active" : "off")
          }
        >
          <span className="dot" /> MedGemma:{" "}
          <strong>{gatewayStatus?.medgemma_local?.available ? "Ollama Live (medgemma:4b / 27b)" : "Local Edge Offline"}</strong>
        </span>
      </div>

      {/* Workspace */}
      <section className="workspace">
        {/* Navigation Sidebar */}
        <nav>
          {mode === "live" ? (
            <div>
              <label>Audio Intake Controls</label>
              <div style={{ padding: "12px 4px" }}>
                <small style={{ color: "var(--muted)", fontSize: "10px", fontFamily: "var(--font-mono)", display: "block", marginBottom: "6px" }}>
                  LOCALE HINT
                </small>
                <select
                  value={localeHint}
                  onChange={(e) => setLocaleHint(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#ffffff",
                    border: "1px solid var(--line-strong)",
                    color: "var(--ink)",
                    borderRadius: "6px",
                    padding: "6px 8px",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    marginBottom: "14px",
                  }}
                >
                  <option value="auto">Auto-detect Language</option>
                  <option value="ha-NG">Hausa (Kano / Northern NG)</option>
                  <option value="ar-MA">Moroccan Arabic / Darija (ar-MA)</option>
                  <option value="ar-JO">Jordanian Arabic (ar-JO)</option>
                  <option value="es-MX">Mexican Spanish (es-MX)</option>
                  <option value="wo-SN">Wolof (Senegal)</option>
                  <option value="en-US">English (en-US)</option>
                </select>

                {/* Left Navigation Recording Controls */}
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    style={{
                      width: "100%",
                      background: "var(--primary)",
                      color: "#ffffff",
                      padding: "10px 14px",
                      borderRadius: "7px",
                      fontWeight: 600,
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      border: "0",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                  >
                    <Mic style={{ width: 16 }} />
                    <span>Start Dictation</span>
                  </button>
                ) : (
                  <div style={{ background: "#ffffff", border: "1px solid var(--rose-border)", borderRadius: "8px", padding: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--rose)", fontSize: "11px", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                        <span className="dot-live" style={{ background: "var(--rose)" }} /> REC
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
                        {formatSec(recordingTime)}
                      </span>
                    </div>

                    <button
                      onClick={stopRecording}
                      style={{
                        width: "100%",
                        background: "var(--primary)",
                        color: "#ffffff",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontWeight: 600,
                        fontSize: "12px",
                        border: "0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <span style={{ width: 8, height: 8, background: "#ffffff", borderRadius: 2 }} />
                      <span>Finish & Transcribe</span>
                    </button>
                  </div>
                )}

                {audioBlob && !isRecording && (
                  <button
                    onClick={() => submitLiveAudio()}
                    disabled={isTranscribing}
                    style={{
                      width: "100%",
                      marginTop: "8px",
                      background: "#ffffff",
                      border: "1px solid var(--line-strong)",
                      color: "var(--ink)",
                      padding: "7px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Play style={{ width: 13 }} /> {isTranscribing ? "Transcribing…" : "Re-transcribe Audio"}
                  </button>
                )}
              </div>
            </div>
          ) : mode === "phone" ? (
            <div>
              <label>Select Inbound Caller</label>
              {benchmarkCases.map((x, i) => (
                <button
                  className={i === phoneScenarioIndex ? "active" : ""}
                  onClick={() => {
                    setPhoneScenarioIndex(i);
                    hangUpPhoneCall();
                  }}
                  key={x.name}
                >
                  <b>{x.flag}</b>
                  <span>
                    <strong>{x.name}</strong>
                    <small>{x.place}</small>
                  </span>
                  {i === 1 && <em style={{ color: "var(--emerald)", background: "#ecfdf5", borderColor: "#a7f3d0" }}>HAUSA</em>}
                  {i === 2 && <em style={{ color: "#2563eb", background: "#eff6ff", borderColor: "#bfdbfe" }}>DARIJA</em>}
                  {i === 0 && <em>AMBIGUITY</em>}
                </button>
              ))}

              <div style={{ marginTop: "16px", padding: "10px", background: "var(--card-subtle)", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: "6px", fontFamily: "var(--font-mono)" }}>
                  TELEPHONY SETTINGS
                </span>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={comfortNoise}
                    onChange={(e) => setComfortNoise(e.target.checked)}
                  />
                  <span>Line Comfort Presence (-45dB)</span>
                </label>
                <small style={{ display: "block", marginTop: "4px", color: "var(--muted)", fontSize: "10px" }}>
                  Active acoustic presence prevents caller from assuming dropped call.
                </small>
              </div>
            </div>
          ) : (
            <div>
              <label>Benchmark Scenarios</label>
              {benchmarkCases.map((x, i) => (
                <button
                  className={i === pick ? "active" : ""}
                  onClick={() => chooseGuided(i)}
                  key={x.name}
                >
                  <b>{x.flag}</b>
                  <span>
                    <strong>{x.name}</strong>
                    <small>{x.lang}</small>
                  </span>
                  {i === 0 && <em>AMBIGUITY</em>}
                  {i === 1 && <em style={{ color: "var(--emerald)", background: "#ecfdf5", borderColor: "#a7f3d0" }}>HAUSA</em>}
                  {i === 2 && <em style={{ color: "#2563eb", background: "#eff6ff", borderColor: "#bfdbfe" }}>CODE-SWITCH</em>}
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* Center Call Panel */}
        <article className="call">
          {mode === "live" ? (
            <div>
              {/* Caller Metadata */}
              <div className="caller">
                <div>
                  <b>🎙️</b>
                  <span>
                    <strong>Microphone Stream Intake</strong>
                    <small>
                      MediaRecorder · {isRecording ? "Live audio capture active" : audioBlob ? "Audio buffered" : "Ready"}
                    </small>
                  </span>
                </div>
                <code>{formatSec(recordingTime)}</code>
              </div>

              {/* Clean Clinical Audio Card */}
              <div className="voice-card">
                <div className="voice-status">
                  {isRecording ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <span className="dot-live" style={{ background: "var(--rose)" }} />
                      <span style={{ color: "var(--rose)", fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                        RECORDING PATIENT VOICE ({formatSec(recordingTime)})
                      </span>
                    </div>
                  ) : isTranscribing ? (
                    <span style={{ color: "var(--blue)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                      TRANSCRIBING ACROSS CHIRP 3, WHISPER & DEEPGRAM…
                    </span>
                  ) : audioBlob ? (
                    <span style={{ color: "var(--emerald)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                      AUDIO CAPTURED · IMMUTABLE LOCAL BUFFER
                    </span>
                  ) : (
                    <span>Ready to capture patient voice in any supported language.</span>
                  )}
                </div>

                <div className={"wave-bar " + (isRecording || isTranscribing ? "running" : "")}>
                  {Array.from({ length: 32 }).map((_, i) => (
                    <i key={i} style={{ height: 10 + ((i * 13) % 24) }} />
                  ))}
                </div>

                {isRecording && (
                  <div style={{ marginTop: "12px", display: "flex", justifyContent: "center", gap: "8px" }}>
                    <button
                      onClick={stopRecording}
                      style={{
                        background: "var(--primary)",
                        color: "#ffffff",
                        padding: "8px 18px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: "0",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }}
                    >
                      <span style={{ width: 9, height: 9, background: "#ffffff", borderRadius: 2 }} />
                      Finish Recording ({formatSec(recordingTime)})
                    </button>
                  </div>
                )}

                {audioUrl && !isRecording && (
                  <div className="audio-ctrl">
                    <audio controls src={audioUrl} />
                    <button
                      onClick={startRecording}
                      style={{
                        fontSize: "11px",
                        border: "1px solid var(--line)",
                        background: "#ffffff",
                        padding: "5px 10px",
                        borderRadius: "5px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "var(--muted)",
                      }}
                    >
                      <Mic style={{ width: 12 }} /> Re-record
                    </button>
                  </div>
                )}
              </div>

              {/* Dual ASR Output Display */}
              {liveCandidates.length > 0 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "0.08em", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                      CONCURRENT SPEECH RECOGNITION (CROSS-WITNESS)
                    </label>
                    <button
                      onClick={() => setShowRawEvidence(!showRawEvidence)}
                      style={{ fontSize: "11px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "3px", border: "0", background: "transparent" }}
                    >
                      {showRawEvidence ? <ChevronUp style={{ width: 13 }} /> : <ChevronDown style={{ width: 13 }} />}
                      {showRawEvidence ? "Hide Raw Data" : "Inspect Raw Tokens"}
                    </button>
                  </div>

                  <div className="asr-dual">
                    {/* Primary Chirp 3 Lane */}
                    <div className={"asr-box " + (chirpCandidate?.status === "live" ? "" : "off")}>
                      <header>
                        <h4>
                          <Cpu style={{ width: 13 }} /> Google Cloud Chirp 3
                        </h4>
                        <span className={`provenance-tag ${chirpCandidate?.provenance === "provider-reported" ? "reported" : "unavailable"}`}>
                          {chirpCandidate?.provenance || "unavailable"}
                        </span>
                      </header>
                      {chirpCandidate?.status === "live" ? (
                        <div>
                          <p dir="auto">{chirpCandidate.transcript}</p>
                          <small>
                            Locale: <strong>{chirpCandidate.detectedLocale}</strong> · Latency: <strong>{chirpCandidate.latencyMs} ms</strong>
                          </small>
                          <br />
                          <span className="asr-score-tag uncalibrated">
                            Acoustic Score: {chirpCandidate.vendorScore ?? "N/A"} (uncalibrated heuristic)
                          </span>
                        </div>
                      ) : (
                        <div>
                          <p style={{ color: "var(--rose)", fontSize: "12px" }}>
                            {chirpCandidate?.errorMessage || "Chirp 3 offline"}
                          </p>
                          <small>Google Cloud Speech-to-Text V2 / chirp_3</small>
                        </div>
                      )}
                    </div>

                    {/* Secondary Witness Lane */}
                    <div className={"asr-box " + (secondaryCandidate?.status === "live" ? "" : "off")}>
                      <header>
                        <h4>
                          <Sparkles style={{ width: 13 }} /> {secondaryCandidate?.providerLabel || "Independent Witness"}
                        </h4>
                        <span className={`provenance-tag ${secondaryCandidate?.provenance === "provider-reported" ? "reported" : "unavailable"}`}>
                          {secondaryCandidate?.provenance || "unavailable"}
                        </span>
                      </header>
                      {secondaryCandidate?.status === "live" ? (
                        <div>
                          <p dir="auto">{secondaryCandidate.transcript}</p>
                          <small>
                            Locale: <strong>{secondaryCandidate.detectedLocale}</strong> · Latency: <strong>{secondaryCandidate.latencyMs} ms</strong>
                          </small>
                          <br />
                          <span className="asr-score-tag">
                            Model: {secondaryCandidate.model} · {secondaryCandidate.vendorScoreMeaning}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <p style={{ color: "var(--rose)", fontSize: "12px" }}>
                            {secondaryCandidate?.errorMessage || "Secondary ASR unavailable"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Raw Evidence Drawer */}
                  {showRawEvidence && (
                    <div style={{ marginBottom: "14px", background: "#f8fafc", border: "1px solid var(--line)", borderRadius: "6px", padding: "10px", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
                      <strong style={{ color: "var(--ink)", display: "block", marginBottom: "6px" }}>Raw Word Tokens & Offsets:</strong>
                      <div style={{ maxHeight: "120px", overflowY: "auto" }}>
                        {liveCandidates.map((cand) => (
                          <div key={cand.provider} style={{ marginBottom: "6px" }}>
                            <span style={{ color: "var(--muted)" }}>{cand.providerLabel}:</span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "3px" }}>
                              {cand.words.map((w, idx) => (
                                <span key={idx} style={{ background: "#ffffff", border: "1px solid var(--line)", padding: "1px 5px", borderRadius: "3px" }}>
                                  {w.word} {w.startMs !== undefined && <small style={{ color: "var(--muted)" }}>({w.startMs}ms)</small>}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Code-Switching Timeline */}
              {livePacket?.codeSwitchTimeline && livePacket.codeSwitchTimeline.length > 0 && (
                <div style={{ margin: "14px 0", background: "#fbfcfd", border: "1px solid var(--line)", borderRadius: "8px", padding: "10px 14px" }}>
                  <label style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "0.08em", fontFamily: "var(--font-mono)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    CODE-SWITCHING TIMELINE & REGISTRATION
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {livePacket.codeSwitchTimeline.map((seg, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted)", background: "var(--card-subtle)", padding: "2px 6px", borderRadius: "4px" }}>
                          {seg.start}–{seg.end}
                        </span>
                        <strong style={{ color: seg.language.includes("English") || seg.language.includes("French") ? "#2563eb" : "var(--ink)" }}>
                          {seg.language}:
                        </strong>
                        <span style={{ color: "var(--ink-secondary)" }}>{seg.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Canonical Transcript */}
              {livePacket && (
                <div className="transcript">
                  <label>
                    <Languages style={{ width: 13 }} /> Canonical Source Transcript
                    <span className="provenance-tag reported">{livePacket.canonicalTranscript.provenance}</span>
                  </label>
                  <blockquote dir="auto">
                    {livePacket.canonicalTranscript.text || "(Awaiting speech recognition)"}
                  </blockquote>
                  <p>
                    Primary source: {livePacket.canonicalTranscript.sourceProvider} · Preserved without silent English translation
                  </p>
                </div>
              )}

              {/* Clarification Gate Alert */}
              {livePacket && livePacket.routingStatus !== "safe" && (
                <div className="answer hold">
                  <label>
                    <AlertTriangle style={{ width: 15 }} /> ROUTE HELD: CLARIFICATION REQUIRED (MEDICAL MODELS BLOCKED)
                  </label>
                  <p dir="auto">{livePacket.clarification?.question}</p>
                  <small>{livePacket.clarification?.questionGloss}</small>

                  {livePacket.clarification?.targetDoseOptions && (
                    <div style={{ marginTop: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                        Confirm Resolution:
                      </span>
                      {livePacket.clarification.targetDoseOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => resolveLiveDoseClarification(opt)}
                          style={{
                            background: "var(--amber)",
                            color: "#ffffff",
                            fontWeight: 600,
                            padding: "4px 12px",
                            borderRadius: "5px",
                            border: "0",
                            fontSize: "12px",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          Confirm {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Cleared Medical Consultation */}
              {livePacket && livePacket.routingStatus === "safe" && (
                <div className="answer safe">
                  <label>
                    <ShieldCheck style={{ width: 15 }} /> ROUTING CLEARED FOR MEDICAL REASONING AI
                  </label>
                  <p>Clinical Voice Packet passed deterministic safety checks and ambiguity gates.</p>
                  <div style={{ marginTop: "10px" }}>
                    <button
                      onClick={runDownstreamMedicalModels}
                      disabled={isRunningModels}
                      style={{
                        background: "var(--primary)",
                        color: "#ffffff",
                        padding: "7px 14px",
                        borderRadius: "6px",
                        border: "0",
                        fontSize: "12px",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Cpu style={{ width: 14 }} /> {isRunningModels ? "Evaluating Models…" : "Send to Medical AI Models"}
                    </button>
                  </div>
                </div>
              )}

              {/* Model Conclusions Comparison */}
              {modelConclusions.length > 0 && (
                <div className="model-section">
                  <div className="model-selector">
                    {modelConclusions.map((m, idx) => (
                      <button
                        key={m.modelId}
                        className={idx === selectedModelIndex ? "active" : ""}
                        onClick={() => setSelectedModelIndex(idx)}
                      >
                        {m.modelLabel}
                      </button>
                    ))}
                  </div>

                  {modelConclusions[selectedModelIndex] && (
                    <div className="model-card">
                      <h5>
                        <span>{modelConclusions[selectedModelIndex].modelLabel}</span>
                        <span className={`provenance-tag ${modelConclusions[selectedModelIndex].provenance === "model-inferred" ? "inferred" : "unavailable"}`}>
                          {modelConclusions[selectedModelIndex].provenance}
                        </span>
                      </h5>
                      {modelConclusions[selectedModelIndex].status === "live" ? (
                        <div>
                          <div style={{ fontSize: "13px", marginBottom: "4px" }}>
                            <strong>Triage:</strong> {modelConclusions[selectedModelIndex].triage}
                          </div>
                          <div style={{ fontSize: "13px", marginBottom: "4px" }}>
                            <strong>Medication Advice:</strong> {modelConclusions[selectedModelIndex].medicationAdvice}
                          </div>
                          <div style={{ fontSize: "13px", marginBottom: "8px" }}>
                            <strong>Safety Net:</strong> {modelConclusions[selectedModelIndex].safetyNetInstructions}
                          </div>

                          {/* Response Fidelity Check Layer */}
                          {modelConclusions[selectedModelIndex].fidelityCheck && (
                            <div style={{ margin: "10px 0", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "8px 12px" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "11px", fontWeight: 600, color: "#166534", fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <FileCheck style={{ width: 13 }} /> CLINICAL RESPONSE FIDELITY CHECK: PASSED
                                </span>
                                <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#166534" }}>
                                  Score: {Math.round(modelConclusions[selectedModelIndex].fidelityCheck!.score * 100)}%
                                </span>
                              </div>
                              <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#14532d" }}>
                                {modelConclusions[selectedModelIndex].fidelityCheck!.fidelityNotes.map((n, i) => (
                                  <li key={i}>{n}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Patient-Facing Response & Spoken Voice Back to Caller */}
                          <div style={{ padding: "10px", background: "#ffffff", border: "1px solid var(--line)", borderRadius: "6px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <strong style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                                Spoken Answer Back to Caller:
                              </strong>
                              <button
                                onClick={() =>
                                  generateTTSVoiceBack(
                                    modelConclusions[selectedModelIndex].patientFacingAnswer,
                                    livePacket?.likelyLanguage.language || "en"
                                  )
                                }
                                disabled={isGeneratingTTS}
                                style={{
                                  padding: "3px 9px",
                                  fontSize: "11px",
                                  border: "1px solid var(--line)",
                                  background: "#f8fafc",
                                  borderRadius: "4px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontWeight: 500,
                                }}
                              >
                                <Volume2 style={{ width: 12 }} />
                                {isGeneratingTTS ? "Synthesizing…" : "Synthesize Spoken Voice"}
                              </button>
                            </div>
                            <p style={{ margin: "8px 0", fontSize: "14px", lineHeight: 1.5 }} dir="auto">
                              {modelConclusions[selectedModelIndex].patientFacingAnswer}
                            </p>

                            {ttsAudioUrl && (
                              <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <PhoneCall style={{ width: 13, color: "var(--emerald)" }} />
                                <audio controls src={ttsAudioUrl} autoPlay style={{ height: 28 }} />
                                <small style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                                  TTS Router · Native Multilingual
                                </small>
                              </div>
                            )}
                          </div>

                          <small style={{ display: "block", marginTop: "8px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                            Latency: {modelConclusions[selectedModelIndex].latencyMs} ms · Non-validated prototype decision support
                          </small>
                        </div>
                      ) : (
                        <p style={{ color: "var(--amber)", margin: 0, fontSize: "12px" }}>
                          {modelConclusions[selectedModelIndex].errorMessage}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : mode === "phone" ? (
            /* Telephony Phone Call Simulator */
            <div>
              {/* Phone Handset Header */}
              <div
                className="caller"
                style={{
                  background:
                    phoneCallStatus === "connected" ||
                    phoneCallStatus === "caller_speaking" ||
                    phoneCallStatus === "backchannel" ||
                    phoneCallStatus === "reasoning" ||
                    phoneCallStatus === "responding"
                      ? "#f0fdf4"
                      : "#f8fafc",
                  borderColor:
                    phoneCallStatus === "ringing"
                      ? "var(--amber)"
                      : phoneCallStatus === "connected" || phoneCallStatus === "responding"
                      ? "var(--emerald)"
                      : "var(--line)",
                }}
              >
                <div>
                  <b
                    style={{
                      background:
                        phoneCallStatus === "ringing"
                          ? "var(--amber)"
                          : phoneCallStatus === "ended" || phoneCallStatus === "idle"
                          ? "#cbd5e1"
                          : "var(--emerald)",
                      color: "#ffffff",
                    }}
                  >
                    <PhoneCall style={{ width: 16 }} />
                  </b>
                  <span>
                    <strong>
                      {currentPhoneCase.name} ({currentPhoneCase.place})
                    </strong>
                    <small>
                      {currentPhoneCase.flag}{" "}
                      {phoneScenarioIndex === 1
                        ? "+234 803 555 0192"
                        : phoneScenarioIndex === 2
                        ? "+212 522 555 0184"
                        : phoneScenarioIndex === 0
                        ? "+962 6 555 0123"
                        : "+52 55 5555 0149"}{" "}
                      · Inbound PSTN / SIP Call
                    </small>
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                      color:
                        phoneCallStatus === "ringing"
                          ? "var(--amber)"
                          : phoneCallStatus === "idle" || phoneCallStatus === "ended"
                          ? "var(--muted)"
                          : "var(--emerald)",
                    }}
                  >
                    {phoneCallStatus === "idle"
                      ? "READY TO DIAL"
                      : phoneCallStatus === "ringing"
                      ? "RINGING..."
                      : phoneCallStatus === "ended"
                      ? "CALL ENDED"
                      : "CONNECTED"}
                  </span>
                  <code>{formatSec(phoneCallDuration)}</code>
                </div>
              </div>

              {/* Call Controls & Action Bar */}
              <div
                style={{
                  margin: "12px 0",
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", gap: "8px" }}>
                  {phoneCallStatus === "idle" || phoneCallStatus === "ended" ? (
                    <button
                      onClick={startPhoneCall}
                      style={{
                        background: "var(--emerald)",
                        color: "#ffffff",
                        fontWeight: 600,
                        padding: "8px 18px",
                        borderRadius: "6px",
                        border: "0",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }}
                    >
                      <PhoneCall style={{ width: 14 }} /> Simulate Inbound Call
                    </button>
                  ) : (
                    <button
                      onClick={hangUpPhoneCall}
                      style={{
                        background: "var(--rose)",
                        color: "#ffffff",
                        fontWeight: 600,
                        padding: "8px 18px",
                        borderRadius: "6px",
                        border: "0",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                      }}
                    >
                      Hang Up Call
                    </button>
                  )}
                </div>

                <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                  {phoneCallStatus === "caller_speaking" && (
                    <span style={{ color: "var(--blue)" }}>🎙️ Caller speaking into phone...</span>
                  )}
                  {phoneCallStatus === "backchannel" && (
                    <span style={{ color: "var(--amber)", fontWeight: 600 }}>
                      🔊 Immediate Comfort Ack (240ms) playing to caller...
                    </span>
                  )}
                  {phoneCallStatus === "reasoning" && (
                    <span style={{ color: "var(--emerald)" }}>⚡ Gateway reasoning & checking fidelity...</span>
                  )}
                  {phoneCallStatus === "responding" && (
                    <span style={{ color: "var(--emerald)", fontWeight: 600 }}>
                      🔊 Synthesizing medical voice back to caller...
                    </span>
                  )}
                </div>
              </div>

              {/* Latency Hop Breakdown */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    TELEPHONY HOP LATENCY BREAKDOWN
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "#047857",
                      fontWeight: 600,
                    }}
                  >
                    Perceived Dead-Air: 0 ms (Masked by immediate comfort ack)
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: "6px",
                    fontSize: "11px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ background: "var(--card-subtle)", padding: "6px", borderRadius: "5px", border: "1px solid var(--line)" }}>
                    <small style={{ color: "var(--muted)", display: "block", fontSize: "9px" }}>1. VAD (Silence)</small>
                    <strong style={{ fontFamily: "var(--font-mono)" }}>{phoneLatency.vad} ms</strong>
                  </div>
                  <div style={{ background: "var(--card-subtle)", padding: "6px", borderRadius: "5px", border: "1px solid var(--line)" }}>
                    <small style={{ color: "var(--muted)", display: "block", fontSize: "9px" }}>2. Nova-3 ASR</small>
                    <strong style={{ fontFamily: "var(--font-mono)", color: "#2563eb" }}>{phoneLatency.asr} ms</strong>
                  </div>
                  <div style={{ background: "var(--card-subtle)", padding: "6px", borderRadius: "5px", border: "1px solid var(--line)" }}>
                    <small style={{ color: "var(--muted)", display: "block", fontSize: "9px" }}>3. Safety Gate</small>
                    <strong style={{ fontFamily: "var(--font-mono)" }}>{phoneLatency.gate} ms</strong>
                  </div>
                  <div style={{ background: "var(--card-subtle)", padding: "6px", borderRadius: "5px", border: "1px solid var(--line)" }}>
                    <small style={{ color: "var(--muted)", display: "block", fontSize: "9px" }}>4. MedGemma AI</small>
                    <strong style={{ fontFamily: "var(--font-mono)", color: "#047857" }}>{phoneLatency.reasoning} ms</strong>
                  </div>
                  <div style={{ background: "var(--card-subtle)", padding: "6px", borderRadius: "5px", border: "1px solid var(--line)" }}>
                    <small style={{ color: "var(--muted)", display: "block", fontSize: "9px" }}>5. TTS 1st Chunk</small>
                    <strong style={{ fontFamily: "var(--font-mono)", color: "#7c3aed" }}>{phoneLatency.ttsFirstByte} ms</strong>
                  </div>
                </div>
              </div>

              {/* Call Audio Dialogue Stream */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "14px",
                  minHeight: "220px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <label
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      margin: 0,
                    }}
                  >
                    LIVE TELEPHONY CONVERSATION STREAM
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--ink-secondary)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={showEnglishTranslation}
                      onChange={(e) => setShowEnglishTranslation(e.target.checked)}
                    />
                    <span>Show English Translation Subtitles</span>
                  </label>
                </div>

                {phoneConversation.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 0", color: "var(--muted)", fontSize: "13px" }}>
                    Click <strong>Simulate Inbound Call</strong> to test real telephony latency and comfort ack.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {phoneConversation.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          alignSelf: msg.speaker === "caller" ? "flex-start" : "flex-end",
                          maxWidth: "85%",
                          background:
                            msg.speaker === "caller"
                              ? "#f1f5f9"
                              : msg.text.includes("[Comfort Ack]")
                              ? "var(--amber-bg)"
                              : "var(--emerald-bg)",
                          border: "1px solid",
                          borderColor:
                            msg.speaker === "caller"
                              ? "#cbd5e1"
                              : msg.text.includes("[Comfort Ack]")
                              ? "var(--amber-border)"
                              : "var(--emerald-border)",
                          borderRadius: "8px",
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "4px",
                            gap: "12px",
                          }}
                        >
                          <strong
                            style={{
                              fontSize: "11px",
                              fontFamily: "var(--font-mono)",
                              color:
                                msg.speaker === "caller"
                                  ? "var(--ink)"
                                  : msg.text.includes("[Comfort Ack]")
                                  ? "#b45309"
                                  : "#047857",
                            }}
                          >
                            {msg.speaker === "caller"
                              ? `${currentPhoneCase.name} (Caller)`
                              : "MedScout Voice Gateway"}
                          </strong>
                          <span style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                            {msg.time}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: "var(--ink)" }} dir="auto">
                          {msg.text}
                        </p>

                        {/* Prominent English Translation Subtitle */}
                        {msg.gloss && showEnglishTranslation && (
                          <div
                            style={{
                              marginTop: "6px",
                              paddingTop: "6px",
                              borderTop: "1px dashed rgba(0, 0, 0, 0.12)",
                              fontSize: "12px",
                              color: "#334155",
                              fontStyle: "italic",
                              lineHeight: 1.4,
                            }}
                          >
                            <span
                              style={{
                                fontStyle: "normal",
                                fontSize: "10px",
                                fontFamily: "var(--font-mono)",
                                color: "#047857",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                display: "inline-block",
                                marginRight: "6px",
                              }}
                            >
                              EN Translation:
                            </span>
                            “{msg.gloss}”
                          </div>
                        )}

                        {msg.latency && (
                          <small
                            style={{
                              display: "block",
                              marginTop: "4px",
                              fontSize: "10px",
                              color: "var(--muted)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {msg.latency}
                          </small>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Multi-Turn Follow-up Response Buttons */}
                {phoneCallStatus === "awaiting_followup" && (
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "12px",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "8px",
                    }}
                  >
                    <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600, display: "block", marginBottom: "8px", fontFamily: "var(--font-mono)" }}>
                      INTERACTIVE CALLER RESPONSE (CHOOSE TURN 2 PATHWAY):
                    </span>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => handlePhoneFollowup(true)}
                        style={{
                          background: "#dc2626",
                          color: "#ffffff",
                          fontWeight: 600,
                          padding: "6px 14px",
                          borderRadius: "5px",
                          border: "0",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        🚨 Caller replies: "Yes, chest is sucking in deeply" (Red Flag)
                      </button>
                      <button
                        onClick={() => handlePhoneFollowup(false)}
                        style={{
                          background: "#0284c7",
                          color: "#ffffff",
                          fontWeight: 600,
                          padding: "6px 14px",
                          borderRadius: "5px",
                          border: "0",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        ✓ Caller replies: "No chest indrawing, but fast breathing" (Routine)
                      </button>
                    </div>
                  </div>
                )}

                {/* Clarification Action for Mariam */}
                {phoneCallStatus === "clarification" && !phoneClarified && currentPhoneCase.resolvedDose && (
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "10px",
                      background: "var(--amber-bg)",
                      border: "1px solid var(--amber-border)",
                      borderRadius: "6px",
                    }}
                  >
                    <span style={{ fontSize: "11px", color: "#92400e", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                      Caller Clarification Required:
                    </span>
                    <button
                      onClick={() => resolvePhoneClarification(currentPhoneCase.resolvedDose!)}
                      style={{
                        background: "var(--amber)",
                        color: "#ffffff",
                        fontWeight: 600,
                        padding: "5px 14px",
                        borderRadius: "5px",
                        border: "0",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Caller speaks: “{currentPhoneCase.resolvedDose}” (Confirm Dose)
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Benchmark Mode
            <div>
              <div className="caller">
                <div>
                  <b>{c.flag}</b>
                  <span>
                    <strong>{c.name}</strong>
                    <small>{c.place} · incoming voice (Simulated)</small>
                  </span>
                </div>
                <code>00:{stage ? "18" : "00"}</code>
              </div>

              <div className="voice-card">
                <div className="voice-status">
                  {stage === 0
                    ? "Ready to run benchmark scenario"
                    : running
                    ? "Processing audio representation…"
                    : "Scenario evaluation complete"}
                </div>

                <div className={"wave-bar " + (running ? "running" : "")}>
                  {Array.from({ length: 32 }).map((_, i) => (
                    <i key={i} style={{ height: 10 + ((i * 13) % 24) }} />
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                  <button
                    onClick={() => speak(c.text, c.lang.includes("Arabic") ? "ar-JO" : c.lang.includes("Spanish") ? "es-MX" : "en-US")}
                    style={{
                      border: "1px solid var(--line)",
                      background: "#ffffff",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Volume2 style={{ width: 14 }} /> Hear patient
                  </button>
                  <button
                    onClick={runGuided}
                    style={{
                      background: "var(--primary)",
                      color: "#ffffff",
                      border: "0",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Play style={{ width: 14 }} /> {running ? "Processing…" : "Run scenario"}
                  </button>
                </div>
              </div>

              {/* Code-Switching Timeline for Benchmark */}
              {c.codeSwitchTimeline && (
                <div style={{ margin: "14px 0", background: "#fbfcfd", border: "1px solid var(--line)", borderRadius: "8px", padding: "10px 14px" }}>
                  <label style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "0.08em", fontFamily: "var(--font-mono)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    CODE-SWITCHING TIMELINE & REGISTRATION
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {c.codeSwitchTimeline.map((seg, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted)", background: "var(--card-subtle)", padding: "2px 6px", borderRadius: "4px" }}>
                          {seg.start}–{seg.end}
                        </span>
                        <strong style={{ color: seg.language.includes("English") || seg.language.includes("French") ? "#2563eb" : "var(--ink)" }}>
                          {seg.language}:
                        </strong>
                        <span style={{ color: "var(--ink-secondary)" }}>{seg.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="transcript">
                <label>
                  <Languages style={{ width: 13 }} /> Benchmark Transcript
                  <span className="provenance-tag" style={{ background: "#f1f5f9", color: "#64748b" }}>simulated</span>
                </label>
                <blockquote dir={c.lang.includes("Arabic") ? "rtl" : "auto"}>{c.text}</blockquote>
                <p>{c.gloss}</p>
              </div>

              {stage === 5 && (
                <div className={"answer " + (c.safe || guidedClarified ? "safe" : "hold")}>
                  <label>
                    {c.safe || guidedClarified ? <ShieldCheck style={{ width: 15 }} /> : <AlertTriangle style={{ width: 15 }} />}
                    {c.safe || guidedClarified ? "RESPONSE CLEARED FOR PATIENT" : "CLARIFICATION REQUIRED"}
                    <button
                      onClick={() =>
                        speak(
                          guidedClarified && c.resolvedAnswer ? c.resolvedAnswer : c.answer,
                          c.lang.includes("Arabic") ? "ar-JO" : "es-MX"
                        )
                      }
                      style={{
                        marginLeft: "auto",
                        padding: "2px 8px",
                        fontSize: "11px",
                        background: "#ffffff",
                        border: "1px solid var(--line)",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Volume2 style={{ width: 12 }} /> Speak
                    </button>
                  </label>
                  <p dir={c.lang.includes("Arabic") ? "rtl" : "auto"}>
                    {guidedClarified && c.resolvedAnswer ? c.resolvedAnswer : c.answer}
                  </p>
                  <small>
                    {guidedClarified && c.resolvedAnswerGloss ? c.resolvedAnswerGloss : c.answerGloss}
                  </small>

                  {/* Audio player back to caller */}
                  {ttsAudioUrl && (c.safe || guidedClarified) && (
                    <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px", background: "#ffffff", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--line)" }}>
                      <PhoneCall style={{ width: 14, color: "var(--emerald)" }} />
                      <audio controls src={ttsAudioUrl} autoPlay style={{ height: 28 }} />
                      <small style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                        Spoken voice back to caller
                      </small>
                    </div>
                  )}

                  {!c.safe && !guidedClarified && c.resolvedDose && (
                    <div style={{ marginTop: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>Clarification:</span>
                      <button
                        onClick={() => {
                          setGuidedClarified(true);
                          generateTTSVoiceBack(c.resolvedAnswer || "", c.lang);
                        }}
                        style={{
                          background: "var(--amber)",
                          color: "#ffffff",
                          fontWeight: 600,
                          padding: "4px 12px",
                          borderRadius: "5px",
                          border: "0",
                          fontSize: "12px",
                        }}
                      >
                        Patient Confirms: {c.resolvedDose}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </article>

        {/* Right Sidebar: Clinical Voice Packet & Checksum */}
        <aside>
          <div className="packetHead">
            <span>
              <Sparkles style={{ width: 14 }} /> CLINICAL VOICE PACKET
            </span>
            {mode === "live" ? (
              <em
                className={
                  livePacket
                    ? livePacket.routingStatus === "safe"
                      ? "safe"
                      : "hold"
                    : ""
                }
              >
                {livePacket
                  ? livePacket.routingStatus === "safe"
                    ? "SAFE TO ROUTE"
                    : "ROUTE HELD"
                  : "AWAITING AUDIO"}
              </em>
            ) : (
              <em className={stage >= 4 ? (c.safe || guidedClarified ? "safe" : "hold") : ""}>
                {stage < 4 ? "WAITING" : c.safe || guidedClarified ? "SAFE TO ROUTE" : "ROUTE HELD"}
              </em>
            )}
          </div>

          {mode === "live" ? (
            <div>
              <Row label="Language + variety" show={!!livePacket}>
                <strong>{livePacket?.likelyLanguage.language || "—"}</strong>
                <small>{livePacket?.likelyLanguage.variety || ""}</small>
                <span className="provenance-tag derived">deterministically derived</span>
              </Row>

              {/* Probabilistic Variety Card */}
              {livePacket?.varietyBreakdown && (
                <div style={{ margin: "8px 0", background: "#ffffff", border: "1px solid var(--line)", borderRadius: "6px", padding: "8px 10px" }}>
                  <label style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    PROBABILISTIC VARIETY BREAKDOWN
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    {livePacket.varietyBreakdown.likely.map((v) => (
                      <div key={v.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
                        <span>{v.name}:</span>
                        <strong style={{ color: "var(--ink)" }}>{Math.round(v.probability * 100)}%</strong>
                      </div>
                    ))}
                  </div>
                  {livePacket.varietyBreakdown.notes && (
                    <small style={{ display: "block", marginTop: "4px", fontSize: "10px", color: "var(--muted)" }}>
                      {livePacket.varietyBreakdown.notes}
                    </small>
                  )}
                </div>
              )}

              <Row label="Recognition confidence" show={!!livePacket}>
                <div>
                  <strong style={{ fontFamily: "var(--font-mono)" }}>
                    {chirpCandidate?.vendorScore !== null && chirpCandidate?.vendorScore !== undefined
                      ? `${Math.round(chirpCandidate.vendorScore * 100)}%`
                      : "Uncalibrated"}
                  </strong>
                  <small>Vendor does not report calibrated confidence</small>
                </div>
              </Row>

              <Row label="Accommodation tier" show={!!livePacket}>
                <div>
                  <strong style={{ fontFamily: "var(--font-mono)" }}>
                    LEVEL {livePacket?.accommodationLevel || 2}
                  </strong>
                  <small>
                    {livePacket?.accommodationLevel === 4
                      ? "Constrained clarification dialogue"
                      : "Native speech → Multilingual AI → TTS"}
                  </small>
                </div>
              </Row>

              <Row label="Clinical concepts" show={!!livePacket}>
                <div className="concepts">
                  {livePacket?.symptoms.map((s) => (
                    <span key={s.name}>
                      <Check style={{ width: 11, color: "var(--emerald)" }} /> {s.name} ({s.status})
                    </span>
                  ))}
                  {livePacket?.medications.map((m) => (
                    <span key={m.spoken}>
                      <Check style={{ width: 11, color: "var(--emerald)" }} /> {m.spoken}
                    </span>
                  ))}
                  {livePacket?.patientAge.value && (
                    <span>
                      <Check style={{ width: 11, color: "var(--emerald)" }} /> Age: {livePacket.patientAge.value}
                    </span>
                  )}
                </div>
              </Row>

              <Row label="Uncertain span" show={!!livePacket}>
                {livePacket?.uncertainSpans && livePacket.uncertainSpans.length > 0 ? (
                  <div className="uncertain">
                    <AlertTriangle style={{ width: 14 }} />
                    <span>
                      “{livePacket.uncertainSpans[0].span}”
                      <small style={{ display: "block", color: "var(--muted)" }}>{livePacket.uncertainSpans[0].reason}</small>
                    </span>
                  </div>
                ) : (
                  <span className="verified">
                    <Check style={{ width: 13 }} /> No critical uncertainty
                  </span>
                )}
              </Row>

              <Row label="Downstream route" show={!!livePacket}>
                <strong>
                  {livePacket?.routingStatus === "safe"
                    ? "Medical Reasoning AI"
                    : "Clarification Loop"}
                </strong>
                <small>
                  {livePacket?.routingStatus === "safe"
                    ? "Verified Clinical Voice Packet"
                    : "Medical AI models withheld"}
                </small>
              </Row>

              {/* Semantic Checksum */}
              <div className={"checksum " + (livePacket ? "shown" : "")}>
                <label>
                  <span>
                    <ShieldCheck style={{ width: 13 }} /> SEMANTIC CHECKSUM
                  </span>
                  <small>
                    {livePacket
                      ? Object.values(livePacket.checksumResults).every((c) => c.passed)
                        ? "11 / 11 passed"
                        : `${Object.values(livePacket.checksumResults).filter((c) => c.passed).length} passed · ${Object.values(livePacket.checksumResults).filter((c) => !c.passed).length} held`
                      : "Pending"}
                  </small>
                </label>
                <div>
                  {checkList.map((checkName) => {
                    const checkObj = livePacket?.checksumResults[checkName];
                    const passed = checkObj ? checkObj.passed : true;
                    return (
                      <span className={!passed ? "bad" : ""} key={checkName} title={checkObj?.note || ""}>
                        {!passed ? <AlertTriangle style={{ width: 10 }} /> : <Check style={{ width: 10, color: "var(--emerald)" }} />}
                        {checkName}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            // Benchmark Sidebar
            <div>
              <Row label="Language + variety" show={stage >= 1}>
                <strong>{c.lang}</strong>
                <small>{c.variety}</small>
                <span className="provenance-tag" style={{ background: "#f1f5f9", color: "#64748b" }}>simulated</span>
              </Row>

              {/* Probabilistic Variety Card for Benchmark */}
              {c.varietyBreakdown && (
                <div style={{ margin: "8px 0", background: "#ffffff", border: "1px solid var(--line)", borderRadius: "6px", padding: "8px 10px" }}>
                  <label style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    PROBABILISTIC VARIETY BREAKDOWN
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    {c.varietyBreakdown.likely.map((v) => (
                      <div key={v.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
                        <span>{v.name}:</span>
                        <strong style={{ color: "var(--ink)" }}>{Math.round(v.probability * 100)}%</strong>
                      </div>
                    ))}
                  </div>
                  {c.varietyBreakdown.notes && (
                    <small style={{ display: "block", marginTop: "4px", fontSize: "10px", color: "var(--muted)" }}>
                      {c.varietyBreakdown.notes}
                    </small>
                  )}
                </div>
              )}

              <Row label="Recognition confidence" show={stage >= 1}>
                <div>
                  <strong style={{ fontFamily: "var(--font-mono)" }}>{c.confidence}%</strong>
                </div>
              </Row>

              <Row label="Accommodation tier" show={stage >= 1}>
                <div>
                  <strong style={{ fontFamily: "var(--font-mono)" }}>
                    LEVEL {c.safe || guidedClarified ? 2 : 4}
                  </strong>
                  <small>
                    {c.safe || guidedClarified
                      ? "Native speech → Multilingual AI → TTS"
                      : "Constrained clarification dialogue"}
                  </small>
                </div>
              </Row>

              <Row label="Clinical concepts" show={stage >= 2}>
                <div className="concepts">
                  {c.concepts.map((x) => (
                    <span key={x}>
                      <Check style={{ width: 11, color: "var(--emerald)" }} />
                      {x}
                    </span>
                  ))}
                </div>
              </Row>

              <Row label="Uncertain span" show={stage >= 3}>
                {c.uncertain && !guidedClarified ? (
                  <div className="uncertain">
                    <AlertTriangle style={{ width: 14 }} />
                    <span>
                      “{c.uncertain}”
                      <small style={{ display: "block" }}>Conflicting dose: 15 vs 5 mL</small>
                    </span>
                  </div>
                ) : (
                  <span className="verified">
                    <Check style={{ width: 13 }} /> No critical uncertainty
                  </span>
                )}
              </Row>

              <Row label="Downstream route" show={stage >= 4}>
                <strong>{c.safe || guidedClarified ? "Medical AI Reasoning" : "Clarification loop"}</strong>
                <small>{c.safe || guidedClarified ? "Structured clinical JSON" : "Do not send to medical AI"}</small>
              </Row>

              <div className={"checksum " + (stage >= 4 ? "shown" : "")}>
                <label>
                  <span>
                    <ShieldCheck style={{ width: 13 }} /> SEMANTIC CHECKSUM
                  </span>
                  <small>{c.safe || guidedClarified ? "11 / 11 passed" : "9 passed · 2 held"}</small>
                </label>
                <div>
                  {checkList.map((x) => {
                    const bad = !(c.safe || guidedClarified) && (x === "Dose" || x === "Uncertainty");
                    return (
                      <span className={bad ? "bad" : ""} key={x}>
                        {bad ? <AlertTriangle style={{ width: 10 }} /> : <Check style={{ width: 10, color: "var(--emerald)" }} />}
                        {x}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>

      {/* 5-Level Accommodation Pipeline Visualizer */}
      <section style={{ width: "min(1400px, calc(100% - 32px))", margin: "0 auto 16px", background: "#ffffff", border: "1px solid var(--line)", borderRadius: "10px", padding: "12px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <label style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            ACCOMMODATION PIPELINE (5 LEVELS)
          </label>
          <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            Current Active Tier: <strong>LEVEL 2 (Multilingual AI + TTS)</strong>
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", fontSize: "11px" }}>
          {[
            { lvl: "LEVEL 1", title: "Speech ↔ Speech", desc: "Native direct acoustic" },
            { lvl: "LEVEL 2", title: "Speech → AI → TTS", desc: "Multilingual AI + voice back (ACTIVE)", active: true },
            { lvl: "LEVEL 3", title: "English Pivot", desc: "Speech → EN rep → target" },
            { lvl: "LEVEL 4", title: "Clarification Loop", desc: "Constrained dialogue on ambiguity" },
            { lvl: "LEVEL 5", title: "Clinical Escalation", desc: "Human interpreter transfer" },
          ].map((item) => (
            <div
              key={item.lvl}
              style={{
                border: "1px solid",
                borderColor: item.active ? "var(--emerald-border)" : "var(--line)",
                background: item.active ? "var(--emerald-bg)" : "var(--card-subtle)",
                borderRadius: "6px",
                padding: "8px 10px",
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: item.active ? "#047857" : "var(--muted)", fontWeight: 600, display: "block" }}>
                {item.lvl}
              </span>
              <strong style={{ color: item.active ? "#065f46" : "var(--ink)", display: "block", marginTop: "2px" }}>
                {item.title}
              </strong>
              <small style={{ color: "var(--muted)", fontSize: "10px" }}>{item.desc}</small>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture Stepper */}
      <section className="pipeline">
        <label>
          Clinical Voice Architecture Pipeline{" "}
          <button
            onClick={() => {
              setStage(0);
              setLivePacket(null);
              setLiveCandidates([]);
              setAudioBlob(null);
              setAudioUrl(null);
              setTtsAudioUrl(null);
            }}
            style={{
              border: "1px solid var(--line)",
              background: "#ffffff",
              padding: "3px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <RotateCcw style={{ width: 12 }} /> Reset
          </button>
        </label>
        <div>
          {[
            "Phone / Mic",
            "Language ID & ASR",
            "Clinical Parser",
            "Semantic Gate",
            "Medical AI",
            "TTS Voice Back",
          ].map((x, i) => (
            <span
              className={
                mode === "live"
                  ? livePacket
                    ? "done"
                    : ""
                  : stage >= Math.min(i + 1, 5)
                  ? "done"
                  : ""
              }
              key={x}
            >
              <b>
                {(mode === "live" && livePacket) || stage >= Math.min(i + 1, 5) ? (
                  <Check style={{ width: 11 }} />
                ) : (
                  i + 1
                )}
              </b>
              <em>
                {x}
                <small>
                  {[
                    "VAD & audio stream",
                    "Chirp 3 + Nova-3 + Whisper",
                    "verbatim, not translated",
                    "fidelity & ambiguity gate",
                    "MedGemma (Ollama) / Frontier",
                    "same-language spoken voice",
                  ][i]}
                </small>
              </em>
            </span>
          ))}
        </div>
        <p>
          Any phone. Any language. Any medical AI. &nbsp;·&nbsp; Preserve the medicine, not just the words.
        </p>
      </section>
    </main>
  );
}

function Row({
  label,
  show,
  children,
}: {
  label: string;
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={"row " + (show ? "shown" : "")}>
      <label>{label}</label>
      <div>{show ? children : <i style={{ height: "9px", width: "70%", borderRadius: "4px", background: "var(--card-subtle)", display: "block" }} />}</div>
    </div>
  );
}
