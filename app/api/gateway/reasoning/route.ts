import { NextRequest, NextResponse } from "next/server";
import { runMedicalModels } from "@/lib/gateway/medical-models";
import { ClinicalVoicePacket } from "@/lib/gateway/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const packet: ClinicalVoicePacket = body.packet;
    const requestedModels = body.requestedModels || ["gpt4o", "medgemma_4b", "medgemma_27b"];

    if (!packet) {
      return NextResponse.json({ error: "No Clinical Voice Packet provided" }, { status: 400 });
    }

    const conclusions = await runMedicalModels({
      packet,
      requestedModels,
    });

    return NextResponse.json({
      success: true,
      conclusions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
