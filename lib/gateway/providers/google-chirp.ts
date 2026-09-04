import { GoogleAuth } from "google-auth-library";
import crypto from "crypto";
import { ASRProviderResult, ASRWord } from "../types";

export interface ChirpOptions {
  localeHint?: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

export async function getGoogleAccessToken(): Promise<{ token: string | null; error?: string }> {
  const now = Date.now();
  if (cachedAccessToken && now < tokenExpiresAt - 60000) {
    return { token: cachedAccessToken };
  }

  // Option 1: Direct access token provided in environment
  if (process.env.GOOGLE_ACCESS_TOKEN) {
    cachedAccessToken = process.env.GOOGLE_ACCESS_TOKEN;
    tokenExpiresAt = now + 30 * 60 * 1000;
    return { token: cachedAccessToken };
  }

  // Option 2: JSON credentials string or Base64 in environment
  const rawCreds = process.env.GOOGLE_CREDENTIALS_BASE64
    ? Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, "base64").toString("utf8")
    : process.env.GOOGLE_CREDENTIALS_JSON;

  if (rawCreds) {
    try {
      const creds = JSON.parse(rawCreds);
      if (creds.type === "authorized_user" && creds.refresh_token) {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: creds.client_id,
            client_secret: creds.client_secret,
            refresh_token: creds.refresh_token,
            grant_type: "refresh_token",
          }),
        });
        if (!res.ok) {
          const txt = await res.text();
          return { token: null, error: `Token refresh failed (${res.status}): ${txt}` };
        }
        const data = await res.json();
        if (data.access_token) {
          cachedAccessToken = data.access_token;
          tokenExpiresAt = now + (data.expires_in || 3600) * 1000;
          return { token: cachedAccessToken };
        }
      } else if (creds.type === "service_account" && creds.client_email && creds.private_key) {
        const iat = Math.floor(Date.now() / 1000);
        const exp = iat + 3600;
        const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
        const claimSet = Buffer.from(JSON.stringify({
          iss: creds.client_email,
          scope: "https://www.googleapis.com/auth/cloud-platform",
          aud: "https://oauth2.googleapis.com/token",
          exp,
          iat,
        })).toString("base64url");

        const sign = crypto.createSign("RSA-SHA256");
        sign.update(`${header}.${claimSet}`);
        const signature = sign.sign(creds.private_key, "base64url");
        const jwt = `${header}.${claimSet}.${signature}`;

        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
          }),
        });

        if (!res.ok) {
          const txt = await res.text();
          return { token: null, error: `Service account token grant failed (${res.status}): ${txt}` };
        }
        const data = await res.json();
        if (data.access_token) {
          cachedAccessToken = data.access_token;
          tokenExpiresAt = now + (data.expires_in || 3600) * 1000;
          return { token: cachedAccessToken };
        }
      } else {
        const auth = new GoogleAuth({
          credentials: creds,
          scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        const tokStr = typeof token === "string" ? token : token?.token;
        if (tokStr) {
          cachedAccessToken = tokStr;
          tokenExpiresAt = now + 50 * 60 * 1000;
          return { token: cachedAccessToken };
        }
      }
    } catch (err: any) {
      return { token: null, error: `Error loading GOOGLE_CREDENTIALS_JSON: ${err.message}` };
    }
  }

  // Option 3: Key file or default ADC
  try {
    const authOptions: any = {
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    };
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      authOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
    const auth = new GoogleAuth(authOptions);
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const tokStr = typeof token === "string" ? token : token?.token;
    if (tokStr) {
      cachedAccessToken = tokStr;
      tokenExpiresAt = now + 50 * 60 * 1000;
      return { token: cachedAccessToken };
    }
    return { token: null, error: "No access token returned from GoogleAuth" };
  } catch (err: any) {
    return { token: null, error: err.message };
  }
}

export async function transcribeWithChirp3(
  audioBuffer: Buffer,
  mimeType: string,
  options: ChirpOptions = {}
): Promise<ASRProviderResult> {
  const startTime = Date.now();
  const requestId = `chirp3_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    "avian-concord-393012";

  const { token: accessToken, error: authError } = await getGoogleAccessToken();

  if (!accessToken) {
    const latencyMs = Date.now() - startTime;
    const isReauth =
      authError?.includes("invalid_grant") ||
      authError?.includes("invalid_rapt") ||
      authError?.includes("reauth");

    const message = isReauth
      ? "Google credentials require re-authentication (run 'gcloud auth application-default login' or set GOOGLE_ACCESS_TOKEN / GOOGLE_APPLICATION_CREDENTIALS)"
      : authError || "No Google Cloud access token found";

    return {
      provider: "google_chirp_3",
      providerLabel: "Google Cloud Speech-to-Text V2",
      model: "chirp_3",
      transcript: "",
      detectedLocale: options.localeHint || "unknown",
      vendorScore: null,
      vendorScoreMeaning: "Google Chirp 3 word-level acoustic match score (uncalibrated heuristic, not confidence)",
      words: [],
      latencyMs,
      requestId,
      status: "unavailable",
      errorMessage: message,
      provenance: "unavailable",
    };
  }

  try {
    // Chirp 3 is available in multi-region 'us'
    const location = process.env.GOOGLE_SPEECH_LOCATION || "us";
    const endpoint = `https://${location}-speech.googleapis.com/v2/projects/${projectId}/locations/${location}/recognizers/_:recognize`;

    const payload: any = {
      config: {
        autoDecodingConfig: {},
        model: "chirp_3",
        languageCodes: options.localeHint && options.localeHint !== "auto" ? [options.localeHint] : ["auto"],
        features: {
          enableWordTimeOffsets: true,
        },
      },
      content: audioBuffer.toString("base64"),
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=utf-8",
        "x-goog-user-project": projectId,
      },
      body: JSON.stringify(payload),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      let parsedMsg = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        parsedMsg = errorJson.error?.message || errorText;
      } catch {}

      return {
        provider: "google_chirp_3",
        providerLabel: "Google Cloud Speech-to-Text V2",
        model: "chirp_3",
        transcript: "",
        detectedLocale: options.localeHint || "unknown",
        vendorScore: null,
        vendorScoreMeaning: "Google Chirp 3 word-level acoustic match score (uncalibrated heuristic, not confidence)",
        words: [],
        latencyMs,
        requestId,
        status: "error",
        errorMessage: `Google Chirp 3 API error (${response.status}): ${parsedMsg}`,
        provenance: "unavailable",
      };
    }

    const data = await response.json();
    const results = data.results || [];

    let transcript = "";
    let detectedLocale = options.localeHint || "unknown";
    const words: ASRWord[] = [];
    let totalScore = 0;
    let scoredWordsCount = 0;

    for (const result of results) {
      if (result.languageCode) {
        detectedLocale = result.languageCode;
      }
      const alt = result.alternatives?.[0];
      if (alt) {
        if (alt.transcript) {
          transcript += (transcript ? " " : "") + alt.transcript.trim();
        }
        if (Array.isArray(alt.words)) {
          for (const w of alt.words) {
            const startMs = parseDurationToMs(w.startOffset);
            const endMs = parseDurationToMs(w.endOffset);
            const score = typeof w.confidence === "number" ? w.confidence : undefined;
            if (score !== undefined) {
              totalScore += score;
              scoredWordsCount++;
            }
            words.push({
              word: w.word || "",
              startMs,
              endMs,
              score,
            });
          }
        }
      }
    }

    const averageVendorScore = scoredWordsCount > 0 ? totalScore / scoredWordsCount : null;

    return {
      provider: "google_chirp_3",
      providerLabel: "Google Cloud Speech-to-Text V2",
      model: "chirp_3",
      transcript: transcript || "(No speech recognized in audio)",
      detectedLocale,
      vendorScore: averageVendorScore !== null ? Math.round(averageVendorScore * 100) / 100 : null,
      vendorScoreMeaning: "Google Chirp 3 word-level acoustic match score (uncalibrated heuristic, not confidence)",
      words,
      latencyMs,
      requestId,
      status: "live",
      provenance: "provider-reported",
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      provider: "google_chirp_3",
      providerLabel: "Google Cloud Speech-to-Text V2",
      model: "chirp_3",
      transcript: "",
      detectedLocale: options.localeHint || "unknown",
      vendorScore: null,
      vendorScoreMeaning: "Google Chirp 3 word-level acoustic match score (uncalibrated heuristic, not confidence)",
      words: [],
      latencyMs,
      requestId,
      status: "error",
      errorMessage: err.message || "Network error calling Chirp 3",
      provenance: "unavailable",
    };
  }
}

function parseDurationToMs(durationStr?: string): number | undefined {
  if (!durationStr) return undefined;
  const match = durationStr.match(/^([\d.]+)s$/);
  if (!match) return undefined;
  return Math.round(parseFloat(match[1]) * 1000);
}
