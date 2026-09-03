import { ASRProviderResult, ASRWord } from "../types";

export interface WhisperOptions {
  localeHint?: string;
  prompt?: string;
}

export async function transcribeWithOpenAIWhisper(
  audioBuffer: Buffer,
  mimeType: string,
  fileName: string = "audio.webm",
  options: WhisperOptions = {}
): Promise<ASRProviderResult> {
  const startTime = Date.now();
  const requestId = `whisper_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      provider: "openai_whisper",
      providerLabel: "OpenAI Whisper",
      model: "whisper-1",
      transcript: "",
      detectedLocale: "unknown",
      vendorScore: null,
      vendorScoreMeaning: "OpenAI Whisper token probability estimate",
      words: [],
      latencyMs: 0,
      requestId,
      status: "unavailable",
      errorMessage: "OPENAI_API_KEY not configured on server",
      provenance: "unavailable",
    };
  }

  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType || "audio/webm" });
    formData.append("file", blob, fileName);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "word");

    if (options.localeHint && options.localeHint !== "auto") {
      // Whisper expects 2-letter ISO language code (e.g. "ar", "sw", "es", "bn")
      const iso2 = options.localeHint.split("-")[0].toLowerCase();
      formData.append("language", iso2);
    }

    if (options.prompt) {
      formData.append("prompt", options.prompt);
    }

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.error?.message || errorText;
      } catch {}

      return {
        provider: "openai_whisper",
        providerLabel: "OpenAI Whisper",
        model: "whisper-1",
        transcript: "",
        detectedLocale: options.localeHint || "unknown",
        vendorScore: null,
        vendorScoreMeaning: "OpenAI Whisper token probability estimate",
        words: [],
        latencyMs,
        requestId,
        status: "error",
        errorMessage: `OpenAI Whisper API error (${response.status}): ${errorMsg}`,
        provenance: "unavailable",
      };
    }

    const data = await response.json();
    const transcript = data.text?.trim() || "(No speech detected)";
    const detectedLocale = data.language || options.localeHint || "unknown";

    const words: ASRWord[] = [];
    if (Array.isArray(data.words)) {
      for (const w of data.words) {
        words.push({
          word: w.word,
          startMs: typeof w.start === "number" ? Math.round(w.start * 1000) : undefined,
          endMs: typeof w.end === "number" ? Math.round(w.end * 1000) : undefined,
        });
      }
    }

    return {
      provider: "openai_whisper",
      providerLabel: "OpenAI Whisper",
      model: "whisper-1",
      transcript,
      detectedLocale,
      vendorScore: null,
      vendorScoreMeaning: "OpenAI Whisper does not report calibrated confidence scores",
      words,
      latencyMs,
      requestId,
      status: "live",
      provenance: "provider-reported",
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      provider: "openai_whisper",
      providerLabel: "OpenAI Whisper",
      model: "whisper-1",
      transcript: "",
      detectedLocale: options.localeHint || "unknown",
      vendorScore: null,
      vendorScoreMeaning: "OpenAI Whisper token probability estimate",
      words: [],
      latencyMs,
      requestId,
      status: "error",
      errorMessage: err.message || "Network error calling OpenAI Whisper",
      provenance: "unavailable",
    };
  }
}
