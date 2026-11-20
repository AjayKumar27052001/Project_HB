import "server-only";

import { askGemini } from "../gemini";
import { GraphState } from "../types";

/**
 * Node 5: Synthesize Node
 * Generates the executive answer grounded in evidence, personal preferences, and strict formatting.
 */
export async function synthesizeNode(state: typeof GraphState.State) {
  const { request, evidence, isOutOfScope, focusedPropertyName, navigationAction } = state;

  if (isOutOfScope && state.answer) {
    return {};
  }

  if (state.answer && !evidence) {
    return {};
  }

  const isFirstMessage = !Array.isArray(request.history) || request.history.length === 0;

  const prompt = `You are a friendly, concise hotel booking and loyalty concierge.
Current Page: "${request.page}"
Guest Question: "${request.message}"
Is First Message in Conversation: ${isFirstMessage}
Focused Hotel (if user selected or referenced one): ${focusedPropertyName ? `"${focusedPropertyName}"` : "None"}
Navigation Action: ${navigationAction ? `"${navigationAction}"` : "None"}

VERIFIED BACKEND EVIDENCE FROM DATABASE & POLICY KNOWLEDGE BASE:
${JSON.stringify(evidence, null, 2)}

STRICT JOURNEY & NAVIGATION RULES:
1. NEVER promise to "hold a room in chat" or ask the guest to "reply with dates to lock in a room in chat". You are an AI concierge drawer assisting a web booking application.
2. HOME PAGE (EXPLORING LOYALTY & REWARDS):
   - On the Home page, NEVER discuss search form restrictions, adult counts, or date selection guidelines unless the user explicitly asks how many adults/rooms fit.
   - The Home page is dedicated to exploring loyalty benefits, member offers, rewards perks, and membership tiers.
   - If the guest is not logged in (Anonymous Guest): explain our Juniper Rewards program (Silver 5 pts/₹100, Gold 7 pts/₹100 with 5% discount, Platinum 10 pts/₹100 with 10% discount and free breakfast), and invite them to join or sign in to unlock exclusive member rates!
   - If the guest is logged in: warmly acknowledge their tier and points balance, and highlight their current perks and upgrade progress.
3. If the user expresses intent to select, book, or choose a specific hotel on the Search Results page (or if navigationAction is "select_property"):
   - Acknowledge their choice enthusiastically.
   - Instruct them clearly: "Click the **View Rates** button on its card above to select your room and lock in your reservation."
   - Suggest exploring room options, amenities, or policies for that hotel.
4. If the user asks about discounts or benefits based on their profile or membership:
   - Identify their tier from evidence (Silver, Gold, or Platinum).
   - If the user is Gold: they get a 5% direct booking discount, 7 pts/₹100, and available upgrade awards.
   - If the user is Platinum: they get a 10% direct booking discount, complimentary breakfast, and upgrade awards.
   - If a Gold member asks about Platinum: clarify that they are currently Gold, explain Platinum perks, and note how many nights they need to upgrade!
   - State clearly that their direct-booking discount applies across all properties shown when they select a flexible rate!
5. If a Focused Hotel is identified and the user sends follow-up date/stay queries (e.g. "today to tomorrow"):
   - Do NOT restart the entire 3-hotel list from scratch. Keep your response focused on that specific hotel!

STRICT OUTPUT FORMAT RULES:
1. LINE 1:
   - If this is the FIRST message (${isFirstMessage}): Start naturally with "Hey!" or "Hey Hi!" followed immediately by the direct answer.
   - If this is a FOLLOW-UP message (not first message): DO NOT say "Hey" again. Jump straight into the casual, friendly answer (e.g., "Got it! Here are...", "Sure, here's...", or direct answer).
   - NEVER introduce yourself (no "I am dreRuss Concierge").
   - NEVER repeat travel dates, room count, or destination unless directly asked.
2. LOYALTY & UPSELLING RULES (Faithfulness):
   - Never fabricate discounts or prices. Only quote rates found in the verified evidence above.
   - For Gold/Platinum members: If they have available Upgrade Awards, proactively remind them they can claim a Deluxe Suite upgrade for free.
   - For Platinum members: Remind them that daily gourmet breakfast is already complimentary.
   - If guest preferences are known in evidence (e.g. quiet room, high floor, late checkout), reference them naturally.
3. BODY: Provide concise comparisons or options using clean bullet points.
4. SUGGESTION (CLOSING):
   - After the main answer, leave a blank line (double newline) and provide ONE short, friendly next-step suggestion.
   - DO NOT include the word "Suggestion" or any labels like "**Suggestion:**" or "Suggestion:". Simply write the suggestion sentence directly on a new line!
5. Keep the entire response brief, friendly, and strictly grounded in the verified evidence above.`;

  try {
    const answerText = await askGemini(prompt, {
      systemInstruction:
        "You are a concise, friendly hotel booking and loyalty assistant. Never introduce yourself. Only say 'Hey' on the first turn of conversation, then be casual and direct. Do not hallucinate prices or discounts. Never promise to hold rooms in chat. Never output the word 'Suggestion' or '**Suggestion:**' - simply state the recommendation after a line break.",
    });

    // Clean up any stray "Suggestion:" or "**Suggestion:**" tokens if LLM still emitted them
    const cleanedAnswer = answerText
      ? answerText
          .replace(/(\*{0,2}Suggestion:\*{0,2}\s*)+/gi, "\n\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim()
      : answerText;

    return { answer: cleanedAnswer };
  } catch (error) {
    console.error("[Orchestrator:synthesizeNode] Synthesize error:", error);
    return {
      answer: "I retrieved the verified details for your request, but could not format the summary. Please see the verified details below.",
    };
  }
}
