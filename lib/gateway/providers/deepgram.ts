import { ASRProviderResult, ASRWord } from "../types";

export interface DeepgramOptions {
  localeHint?: string;
}

export async function transcribeWithDeepgram(
  audioBuffer: Buffer,
  mimeType: string,
  options: DeepgramOptions = {}
): Promise<ASRProviderResult> {
  const startTime = Date.now();
  const requestId = `deepgram_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return {
      provider: "deepgram_nova_3",
      providerLabel: "Deepgram Nova-3 / Specialist",
      model: "nova-3",
      transcript: "",
      detectedLocale: "unknown",
      vendorScore: null,
      vendorScoreMeaning: "Deepgram word confidence score",
      words: [],
      latencyMs: 0,
      requestId,
      status: "unavailable",
      errorMessage: "DEEPGRAM_API_KEY not configured on server",
      provenance: "unavailable",
    };
  }

  try {
    const url = new URL("https://api.deepgram.com/v1/listen");
    url.searchParams.append("model", "nova-3");
    url.searchParams.append("smart_format", "true");
    url.searchParams.append("punctuate", "true");

    if (options.localeHint && options.localeHint !== "auto") {
      const lang = options.localeHint.split("-")[0];
      url.searchParams.append("language", lang);
    } else {
      url.searchParams.append("detect_language", "true");
    }

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": mimeType || "audio/webm",
      },
      body: new Uint8Array(audioBuffer),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        provider: "deepgram_nova_3",
        providerLabel: "Deepgram Nova-3 / Specialist",
        model: "nova-3",
        transcript: "",
        detectedLocale: options.localeHint || "unknown",
        vendorScore: null,
        vendorScoreMeaning: "Deepgram word confidence score",
        words: [],
        latencyMs,
        requestId,
        status: "error",
        errorMessage: `Deepgram API error (${response.status}): ${errorText}`,
        provenance: "unavailable",
      };
    }

    const data = await response.json();
    const channel = data.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    const transcript = alternative?.transcript?.trim() || "(No speech detected)";
    const detectedLocale = channel?.detected_language || options.localeHint || "unknown";
    const confidence = typeof alternative?.confidence === "number" ? Math.round(alternative.confidence * 100) / 100 : null;

    const words: ASRWord[] = [];
    if (Array.isArray(alternative?.words)) {
      for (const w of alternative.words) {
        words.push({
          word: w.punctuated_word || w.word,
          startMs: typeof w.start === "number" ? Math.round(w.start * 1000) : undefined,
          endMs: typeof w.end === "number" ? Math.round(w.end * 1000) : undefined,
          score: typeof w.confidence === "number" ? Math.round(w.confidence * 100) / 100 : undefined,
        });
      }
    }

    return {
      provider: "deepgram_nova_3",
      providerLabel: "Deepgram Nova-3 / Specialist",
      model: "nova-3",
      transcript,
      detectedLocale,
      vendorScore: confidence,
      vendorScoreMeaning: "Deepgram vendor word-level confidence score",
      words,
      latencyMs,
      requestId,
      status: "live",
      provenance: "provider-reported",
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      provider: "deepgram_nova_3",
      providerLabel: "Deepgram Nova-3 / Specialist",
      model: "nova-3",
      transcript: "",
      detectedLocale: options.localeHint || "unknown",
      vendorScore: null,
      vendorScoreMeaning: "Deepgram word confidence score",
      words: [],
      latencyMs,
      requestId,
      status: "error",
      errorMessage: err.message || "Network error calling Deepgram",
      provenance: "unavailable",
    };
  }
}
