import { getAssistantConfig } from "./config";

const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

export interface GeminiCallOptions {
  systemInstruction?: string;
  temperature?: number;
  timeoutMs?: number;
}

export async function askGemini(prompt: string, options?: GeminiCallOptions): Promise<string> {
  const config = getAssistantConfig();
  const timeoutMs = options?.timeoutMs ?? 25_000;

  const response = await fetch(GEMINI_INTERACTIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.apiKey,
    },
    body: JSON.stringify({
      model: config.model,
      input: prompt,
      system_instruction: options?.systemInstruction ?? "You are an expert, helpful hotel concierge assistant.",
      store: false,
      generation_config: {
        thinking_level: "low",
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (HTTP ${response.status}): ${errorText}`);
  }

  const data: unknown = await response.json();
  if (!data || typeof data !== "object") {
    throw new Error("Invalid response received from Gemini.");
  }

  const record = data as Record<string, unknown>;
  if (!Array.isArray(record.steps)) {
    throw new Error("Malformed steps in Gemini response.");
  }

  const textParts = record.steps.flatMap((step: unknown) => {
    if (!step || typeof step !== "object") return [];
    const s = step as Record<string, unknown>;
    if (s.type !== "model_output" || !Array.isArray(s.content)) return [];
    return s.content.flatMap((part: unknown) => {
      if (part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string") {
        return [(part as Record<string, unknown>).text as string];
      }
      return [];
    });
  });

  const reply = textParts.join("").trim();
  if (!reply) {
    throw new Error("Empty text returned by Gemini.");
  }

  return reply;
}

export async function askGeminiJson<T = unknown>(prompt: string, options?: GeminiCallOptions): Promise<T> {
  const raw = await askGemini(prompt, options);
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(`Failed to parse JSON from Gemini response: ${raw}`);
  }
}
