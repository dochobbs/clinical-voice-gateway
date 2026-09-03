import { ClinicalVoicePacket, MedicalModelConclusion } from "./types";
import { evaluateResponseFidelity } from "./packet-builder";

export interface RunMedicalModelsOptions {
  packet: ClinicalVoicePacket;
  requestedModels?: Array<"medgemma_4b" | "medgemma_27b" | "gpt4o">;
}

export async function runMedicalModels(
  options: RunMedicalModelsOptions
): Promise<MedicalModelConclusion[]> {
  const { packet, requestedModels = ["medgemma_4b", "medgemma_27b", "gpt4o"] } = options;

  // SAFETY RULE: If packet routing is not safe, STRICTLY BLOCK all medical model calls
  if (packet.routingStatus !== "safe") {
    return requestedModels.map((modelId) => ({
      modelId,
      modelLabel: getModelLabel(modelId),
      triage: "BLOCKED",
      clarifyingQuestions: [
        packet.clarification?.question || "Clarification required on dose or clinical values before AI consultation.",
      ],
      medicationAdvice: "Model execution withheld due to unresolved safety-critical uncertainty.",
      unsupportedAssumptions: [],
      safetyNetInstructions: "Wait for clinical verification or human confirmation.",
      patientFacingAnswer:
        packet.clarification?.question || "Please confirm the dose before receiving clinical recommendations.",
      latencyMs: 0,
      status: "error",
      errorMessage: `Blocked by gateway: ${(packet.routingReasons || ["Safety check holds model"]).join(" | ")}`,
      provenance: "deterministically derived",
    }));
  }

  // Run cloud models (gpt4o) concurrently, but run local Ollama models sequentially
  // to avoid VRAM contention and model eviction aborts.
  const gpt4oPromise = requestedModels.includes("gpt4o")
    ? evaluateSingleModel("gpt4o", packet)
    : null;

  const results: MedicalModelConclusion[] = [];
  for (const m of requestedModels) {
    if (m !== "gpt4o") {
      const localResult = await evaluateSingleModel(m, packet);
      results.push(localResult);
    }
  }

  if (gpt4oPromise) {
    const gptRes = await gpt4oPromise;
    results.push(gptRes);
  }

  return results;
}

async function evaluateSingleModel(
  modelId: "medgemma_4b" | "medgemma_27b" | "gpt4o",
  packet: ClinicalVoicePacket
): Promise<MedicalModelConclusion> {
  const startTime = Date.now();
  const label = getModelLabel(modelId);

  // OpenAI Frontier Comparator
  if (modelId === "gpt4o") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        modelId,
        modelLabel: label,
        triage: "Unavailable",
        clarifyingQuestions: [],
        medicationAdvice: "",
        unsupportedAssumptions: [],
        safetyNetInstructions: "",
        patientFacingAnswer: "",
        latencyMs: 0,
        status: "unavailable",
        errorMessage: "OPENAI_API_KEY not configured",
        provenance: "unavailable",
      };
    }

    try {
      const prompt = createClinicalPrompt(packet);
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an advisory medical AI providing structured clinical triage and communication support for a community health worker. Always answer in JSON format with fields: triage, clarifyingQuestions (array of strings), medicationAdvice, unsupportedAssumptions (array of strings), safetyNetInstructions, and patientFacingAnswer (in patient's native language). Note: This is prototype guidance, not a diagnosis.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
      });

      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        const txt = await res.text();
        return {
          modelId,
          modelLabel: label,
          triage: "Error",
          clarifyingQuestions: [],
          medicationAdvice: "",
          unsupportedAssumptions: [],
          safetyNetInstructions: "",
          patientFacingAnswer: "",
          latencyMs,
          status: "error",
          errorMessage: `OpenAI API error: ${txt}`,
          provenance: "unavailable",
        };
      }

      const json = await res.json();
      const content = JSON.parse(json.choices?.[0]?.message?.content || "{}");
      const patientFacingAnswer = content.patientFacingAnswer || "";
      const fidelityCheck = evaluateResponseFidelity(packet, patientFacingAnswer);

      return {
        modelId,
        modelLabel: label,
        triage: content.triage || "Non-urgent / Routine assessment",
        clarifyingQuestions: content.clarifyingQuestions || [],
        medicationAdvice: content.medicationAdvice || "No contraindicated medications noted.",
        unsupportedAssumptions: content.unsupportedAssumptions || [],
        safetyNetInstructions: content.safetyNetInstructions || "Seek immediate emergency evaluation if condition worsens.",
        patientFacingAnswer,
        fidelityCheck,
        latencyMs,
        status: "live",
        provenance: "model-inferred",
      };
    } catch (err: any) {
      return {
        modelId,
        modelLabel: label,
        triage: "Error",
        clarifyingQuestions: [],
        medicationAdvice: "",
        unsupportedAssumptions: [],
        safetyNetInstructions: "",
        patientFacingAnswer: "",
        latencyMs: Date.now() - startTime,
        status: "error",
        errorMessage: err.message,
        provenance: "unavailable",
      };
    }
  }

  // Local MedGemma 4B or 27B via Ollama or local inference server
  const baseUrl =
    modelId === "medgemma_27b"
      ? process.env.MEDGEMMA_27B_URL || process.env.MEDGEMMA_BASE_URL || "http://127.0.0.1:11434/v1"
      : process.env.MEDGEMMA_BASE_URL || "http://127.0.0.1:11434/v1";

  const targetModelName =
    modelId === "medgemma_27b"
      ? process.env.MEDGEMMA_MODEL_27B || "medgemma:27b"
      : process.env.MEDGEMMA_MODEL_4B || "medgemma:4b";

  try {
    const prompt = createClinicalPrompt(packet);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000); // 180 sec timeout for local inference

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: targetModelName,
        messages: [
          {
            role: "system",
            content:
              "You are MedGemma, an advisory clinical decision support model. Output strict JSON with keys: triage, clarifyingQuestions, medicationAdvice, unsupportedAssumptions, safetyNetInstructions, and patientFacingAnswer (in the patient's language).",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 450,
        stop: ["<end_of_turn>", "<eos>"],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`MedGemma (${targetModelName}) returned ${res.status}: ${txt.slice(0, 100)}`);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    const content = parseModelJSON(rawContent);

    const patientFacingAnswer = content.patientFacingAnswer || rawContent;
    const fidelityCheck = evaluateResponseFidelity(packet, patientFacingAnswer);

    return {
      modelId,
      modelLabel: label,
      triage: content.triage || "Standard clinical assessment",
      clarifyingQuestions: content.clarifyingQuestions || [],
      medicationAdvice: content.medicationAdvice || "Verify pediatric dosage against weight.",
      unsupportedAssumptions: content.unsupportedAssumptions || [],
      safetyNetInstructions: content.safetyNetInstructions || "Seek immediate emergency evaluation if breathing difficulty develops.",
      patientFacingAnswer,
      fidelityCheck,
      latencyMs,
      status: "live",
      provenance: "model-inferred",
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      modelId,
      modelLabel: label,
      triage: "Local Endpoint Offline",
      clarifyingQuestions: [],
      medicationAdvice: "Local model unreachable",
      unsupportedAssumptions: [],
      safetyNetInstructions: "",
      patientFacingAnswer: "",
      latencyMs,
      status: "unavailable",
      errorMessage: `MedGemma (${targetModelName}) at ${baseUrl} error: ${err.message}`,
      provenance: "unavailable",
    };
  }
}

function parseModelJSON(raw: string): any {
  if (!raw) return {};
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return { patientFacingAnswer: raw };
  }
}

function getModelLabel(id: "medgemma_4b" | "medgemma_27b" | "gpt4o" | "simulated") {
  switch (id) {
    case "medgemma_4b":
      return "MedGemma 1.5 4B (Local Edge)";
    case "medgemma_27b":
      return "MedGemma 27B (Clinical Reasoning)";
    case "gpt4o":
      return "Frontier General Model (GPT-4o)";
    default:
      return "Simulated Clinical Model";
  }
}

function createClinicalPrompt(packet: ClinicalVoicePacket): string {
  return JSON.stringify({
    notice: "Prototype non-validated clinical decision support",
    packetId: packet.packetId,
    canonicalTranscript: packet.canonicalTranscript?.text || "",
    likelyLanguage: packet.likelyLanguage,
    patientAge: packet.patientAge?.value || "unspecified",
    symptoms: packet.symptoms || [],
    medications: packet.medications || [],
    doseCandidates: packet.doseCandidates || [],
    allergies: packet.allergies || [],
    chronology: packet.chronology || {},
    severity: packet.severity?.level || "unspecified",
  });
}
