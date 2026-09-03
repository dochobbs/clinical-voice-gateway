import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { text, language = "en", voice = "alloy" } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text for TTS" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "OPENAI_API_KEY not configured for TTS router",
          engine: "unavailable",
        },
        { status: 503 }
      );
    }

    // Call OpenAI TTS
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text.slice(0, 1000), // Max 1000 characters for immediate clinical response
        voice: voice || "alloy",
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errTxt = await response.text();
      return NextResponse.json(
        { error: `TTS engine returned HTTP ${response.status}: ${errTxt}` },
        { status: 502 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");
    const audioDataUrl = `data:audio/mp3;base64,${base64Audio}`;
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      audioUrl: audioDataUrl,
      engine: "openai_tts",
      model: "tts-1",
      latencyMs,
      status: "success",
    });
  } catch (err: any) {
    console.error("TTS Router generation error:", err);
    return NextResponse.json(
      { error: err.message, latencyMs: Date.now() - startTime },
      { status: 500 }
    );
  }
}
