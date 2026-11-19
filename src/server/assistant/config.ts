/**
 * Assistant Configuration
 * Loads environment variables and defaults for the Gemini model and agent runtime.
 */
export function getAssistantConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }

  return {
    apiKey,
    model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
    temperature: 0.1,
    maxRetrievalRounds: 2,
  };
}
