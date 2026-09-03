import { NextRequest, NextResponse } from "next/server";
import { transcribeWithChirp3, getGoogleAccessToken } from "@/lib/gateway/providers/google-chirp";
import { transcribeWithOpenAIWhisper } from "@/lib/gateway/providers/openai-whisper";
import { transcribeWithDeepgram } from "@/lib/gateway/providers/deepgram";
import { buildClinicalVoicePacket } from "@/lib/gateway/packet-builder";
import { ASRProviderResult } from "@/lib/gateway/types";

export const dynamic = "force-dynamic";

export async function GET() {
  // Check Google Cloud ADC / service account status
  let googleAvailable = false;
  let googleMessage = "Checking Google credentials...";
  const { token, error } = await getGoogleAccessToken();
  if (token) {
    googleAvailable = true;
    googleMessage = "Google Cloud authentication active (Speech V2 / chirp_3 ready).";
  } else {
    googleMessage = error || "Google Cloud credentials require authentication.";
  }

  const openaiAvailable = !!process.env.OPENAI_API_KEY;
  const deepgramAvailable = !!process.env.DEEPGRAM_API_KEY;

  let medgemmaAvailable = false;
  let medgemmaMsg = "Local endpoint offline";
  const medgemmaUrl = process.env.MEDGEMMA_BASE_URL || "http://127.0.0.1:11434/v1";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(`${medgemmaUrl}/models`, { signal: ctrl.signal });
    clearTimeout(t);
    if (r.ok) {
      const d = await r.json();
      const modelNames = (d.data || []).map((m: any) => m.id).join(", ");
      medgemmaAvailable = true;
      medgemmaMsg = `Connected to Ollama at ${medgemmaUrl} (${modelNames || "models active"})`;
    }
  } catch {}

  return NextResponse.json({
    providers: {
      google_chirp_3: {
        available: googleAvailable,
        projectId: process.env.GOOGLE_CLOUD_PROJECT || "avian-concord-393012",
        message: googleMessage,
      },
      openai_whisper: {
        available: openaiAvailable,
        message: openaiAvailable
          ? "OpenAI API key configured (whisper-1 live)"
          : "OPENAI_API_KEY missing",
      },
      deepgram_nova_3: {
        available: deepgramAvailable,
        message: deepgramAvailable
          ? "Deepgram API key configured (nova-3 live)"
          : "DEEPGRAM_API_KEY missing",
      },
      medgemma_local: {
        available: medgemmaAvailable,
        baseUrl: medgemmaUrl,
        message: medgemmaMsg,
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const localeHint = (formData.get("localeHint") as string) || "auto";
    const requestedProvidersRaw = formData.get("providers") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided in request." },
        { status: 400 }
      );
    }

    const audioArrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);
    const mimeType = audioFile.type || "audio/webm";

    let providersToRun = ["google_chirp_3", "openai_whisper", "deepgram_nova_3"];
    if (requestedProvidersRaw) {
      try {
        providersToRun = JSON.parse(requestedProvidersRaw);
      } catch {}
    }

    // Run ASR providers concurrently
    const taskPromises: Promise<ASRProviderResult>[] = [];

    if (providersToRun.includes("google_chirp_3")) {
      taskPromises.push(
        transcribeWithChirp3(audioBuffer, mimeType, { localeHint })
      );
    }

    if (providersToRun.includes("openai_whisper")) {
      taskPromises.push(
        transcribeWithOpenAIWhisper(audioBuffer, mimeType, "voice.webm", {
          localeHint,
          prompt: "Panadol, acetaminophen, paracetamol, amoxicillin, 15 mL, 5 mL",
        })
      );
    }

    if (providersToRun.includes("deepgram_nova_3")) {
      taskPromises.push(
        transcribeWithDeepgram(audioBuffer, mimeType, { localeHint })
      );
    }

    const candidates = await Promise.all(taskPromises);

    // Build the Clinical Voice Packet
    const packet = buildClinicalVoicePacket(candidates);

    return NextResponse.json({
      success: true,
      packet,
      candidates,
    });
  } catch (err: any) {
    console.error("Error in ASR gateway route:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process audio in gateway." },
      { status: 500 }
    );
  }
}
