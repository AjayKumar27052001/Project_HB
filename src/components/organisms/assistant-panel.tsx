"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useDemoProfile } from "@/features/profiles/profile-context";
import { useAssistantDrawer } from "@/features/assistant/assistant-drawer-context";

type AssistantPage = "home" | "search-results" | "rate-list" | "checkout" | "confirmation";
type ChatMessage = { role: "guest" | "concierge"; text: string; evidence?: unknown };
type AssistantStatus = "idle" | "loading" | "error";
type ConversationMessage = { role: "user" | "assistant"; text: string };
type AssistantApiError = Error & { retryable: boolean };
type AssistantTurnRequest = {
  pageSessionId: string;
  profileId?: string;
  page: AssistantPage;
  history: ConversationMessage[];
  message?: string;
  continuationCursor?: string;
  pageContext: Record<string, unknown>;
};
type AssistantReply = { text: string; evidence?: unknown; matches?: unknown };
type AssistantReplyProvider = (request: AssistantTurnRequest) => Promise<AssistantReply>;
type ApiErrorResponse = { error?: { message?: string; retryable?: boolean } };
type ApiReplyResponse = { answer?: { text?: string } };

const pageCopy: Record<AssistantPage, { welcome: string; prompts: string[] }> = {
  home: {
    welcome: "Welcome to Juniper Hotels! I can help you explore our loyalty tiers, member offers, and exclusive rewards.",
    prompts: [
      "What are the benefits of becoming a member?",
      "Compare Silver, Gold, and Platinum tiers",
      "What perks do I get with my account?",
    ],
  },
  "search-results": {
    welcome: "I can compare the hotels shown here and explain their listed amenities.",
    prompts: ["Which option is closest to Las Colinas?", "Compare the nightly prices", "Which hotels have a pool?"],
  },
  "rate-list": {
    welcome: "I can explain the room details, totals, and cancellation terms shown here.",
    prompts: ["Compare the Flexible and Saver rates", "What is included in the package?", "When is free cancellation?"],
  },
  checkout: {
    welcome: "I can help explain the stay summary, cancellation deadline, and total.",
    prompts: ["What is the cancellation deadline?", "How are taxes and fees shown?", "Is this a real booking?"],
  },
  confirmation: {
    welcome: "Congratulations on your booking! I can help you with room upgrades, celebration packages, and loyalty perks for this stay.",
    prompts: [
      "What upgrades or celebration packages are available?",
      "Can I apply an Upgrade Award for this stay?",
      "What are my loyalty benefits for this booking?",
    ],
  },
};

function getPageFromPath(pathname: string): AssistantPage {
  if (pathname.startsWith("/search")) return "search-results";
  if (pathname.includes("/rates")) return "rate-list";
  if (pathname.startsWith("/checkout")) return "checkout";
  if (pathname.startsWith("/confirmation")) return "confirmation";
  return "home";
}

function readSerializedPageContext(): Record<string, unknown> | null {
  const serializedContext = document.querySelector<HTMLElement>("[data-assistant-context]")?.dataset.assistantContext;
  if (!serializedContext) return null;

  try {
    const parsedContext: unknown = JSON.parse(serializedContext);
    if (typeof parsedContext === "object" && parsedContext !== null && !Array.isArray(parsedContext)) {
      return parsedContext as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function buildCurrentPageContext(page: AssistantPage): Record<string, unknown> {
  const routeContext = readSerializedPageContext();
  if (routeContext) return routeContext;

  if (page === "home") {
    return {
      visibleSearchFields: ["Destination", "Check-in", "Check-out", "Adults", "Rooms"],
      searchLimits: { adults: "1 to 8", rooms: "1 to 5", checkOutMustBeAfterCheckIn: true },
    };
  }

  if (page === "search-results") {
    return {
      limitation: "Do not guess about hotel-specific search results. Backend grounding for current search results will be added in a later release.",
    };
  }

  if (page === "rate-list") {
    return { limitation: "Do not guess about room prices, availability, or policies. Backend grounding for current rates will be added in a later release." };
  }

  return { limitation: "The current page does not expose stay details to the assistant." };
}

function getOrCreateSessionId(profileId: string): string {
  if (typeof window === "undefined") return "page-init";
  const storageKey = `assistant_session_${profileId || "guest"}`;
  const timestampKey = `${storageKey}_time`;
  const now = Date.now();
  const lastTime = Number(window.sessionStorage.getItem(timestampKey) || "0");
  const existing = window.sessionStorage.getItem(storageKey);

  if (existing && now - lastTime < 30 * 60 * 1000) {
    window.sessionStorage.setItem(timestampKey, String(now));
    return existing;
  }

  const generated = `sess_${typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Date.now()}`;
  window.sessionStorage.setItem(storageKey, generated);
  window.sessionStorage.setItem(timestampKey, String(now));
  return generated;
}

function renderFacts(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  return Object.entries(record)
    .filter(([key]) => key !== "nextCursor" && key !== "continuationCursor")
    .filter(([, item]) => item === null || ["string", "number", "boolean"].includes(typeof item))
    .map(([key, item]) => `${key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}: ${String(item)}`);
}

function EvidenceDetails({ evidence }: { evidence: unknown }) {
  const envelopes: Record<string, unknown>[] = [];
  const nestedFacts: string[] = [];
  const collectScalars = (value: unknown, prefix = "", depth = 0) => {
    if (depth > 3 || value === null || value === undefined) return;
    if (["string", "number", "boolean"].includes(typeof value)) {
      if (prefix && !prefix.toLowerCase().includes("cursor")) nestedFacts.push(`${prefix}: ${String(value)}`);
      return;
    }
    if (Array.isArray(value)) { value.forEach((item, index) => collectScalars(item, `${prefix}[${index + 1}]`, depth + 1)); return; }
    if (typeof value === "object") Object.entries(value as Record<string, unknown>).forEach(([key, item]) => collectScalars(item, prefix ? `${prefix}.${key}` : key, depth + 1));
  };
  const visit = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items)) record.items.forEach(visit);
    if (Array.isArray(record.entities)) record.entities.forEach(visit);
    if (Array.isArray(record.rounds)) record.rounds.forEach(visit);
    if (record.data) visit(record.data);
    if (record.entity && Array.isArray(record.facts)) envelopes.push(record);
  };
  visit(evidence);
  collectScalars(evidence);
  const matches = evidence && typeof evidence === "object" && "items" in evidence
    ? (evidence as { items?: unknown }).items
    : undefined;
  const items = envelopes.length ? envelopes : Array.isArray(matches) ? matches : [];
  const facts = renderFacts(evidence).concat(nestedFacts).slice(0, 40);
  if (!items.length && !facts.length) return null;
  return (
    <details className="assistant-evidence">
      <summary>Verified details</summary>
      {items.length ? (
        <ul className="assistant-match-list">
          {items.map((item, index) => {
            const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
            const entity = record.entity && typeof record.entity === "object" ? record.entity as Record<string, unknown> : record;
            const name = typeof entity.name === "string" ? entity.name : typeof record.name === "string" ? record.name : `Match ${index + 1}`;
            const rawFacts = Array.isArray(record.facts) ? record.facts : [];
            const details = rawFacts.map((fact) => {
              if (!fact || typeof fact !== "object") return String(fact);
              const item = fact as Record<string, unknown>;
              const label = typeof item.label === "string" ? item.label : typeof item.attribute === "string" ? item.attribute : "Fact";
              const value = item.value === null || item.value === undefined ? "not confirmed" : String(item.value);
              const qualifier = [item.unit, item.basis, item.scope].filter((part) => typeof part === "string").join(" ");
              return `${label}: ${value}${qualifier ? ` (${qualifier})` : ""}`;
            });
            return <li key={`${name}-${index}`}><strong>{name}</strong>{details.length ? <span>{details.join(" · ")}</span> : null}</li>;
          })}
        </ul>
      ) : <ul className="assistant-fact-list">{facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>}
    </details>
  );
}

async function requestGeminiReply(request: AssistantTurnRequest): Promise<AssistantReply> {
  const response = await fetch("/api/v3/assistant/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const responseBody: unknown = await response.json();
  if (!response.ok) {
    const errorBody = responseBody as ApiErrorResponse;
    const error = new Error(errorBody.error?.message ?? "The assistant could not answer right now.") as AssistantApiError;
    error.retryable = errorBody.error?.retryable ?? true;
    throw error;
  }

  const successBody = responseBody as ApiReplyResponse;
  const replyText = successBody.answer?.text?.trim();
  if (!replyText) {
    const error = new Error("The assistant returned an empty reply. Please retry.") as AssistantApiError;
    error.retryable = true;
    throw error;
  }
  return { text: replyText, evidence: (responseBody as { evidence?: unknown }).evidence, matches: (responseBody as { matches?: unknown }).matches };
}

export function AssistantPanel({ replyProvider = requestGeminiReply }: { replyProvider?: AssistantReplyProvider } = {}) {
  const pathname = usePathname();
  const { selectedProfile } = useDemoProfile();
  const { closeDrawer } = useAssistantDrawer();
  const page = getPageFromPath(pathname);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [retryQuestion, setRetryQuestion] = useState("");
  const activeRequestId = useRef(0);
  const pageSessionId = useRef("");
  const retryHistory = useRef<ConversationMessage[]>([]);

  useEffect(() => {
    activeRequestId.current += 1;
    pageSessionId.current = getOrCreateSessionId(selectedProfile.id);
    retryHistory.current = [];
    setMessages([]);
    setQuestion("");
    setStatus("idle");
    setStatusMessage("");
    setCanRetry(false);
    setRetryQuestion("");
  }, [pathname, selectedProfile.id]);

  const pageDetails = pageCopy[page];

  async function requestReply(text: string, previousMessages: ConversationMessage[], continuationCursor?: string) {
    const requestId = activeRequestId.current + 1;
    activeRequestId.current = requestId;
    retryHistory.current = previousMessages;
    setRetryQuestion(text);
    setStatusMessage("");
    setCanRetry(false);
    setStatus("loading");

    try {
      const isGuest = selectedProfile.id === "GUEST";
      const profileIdToSend = isGuest ? undefined : selectedProfile.id;
      if (!pageSessionId.current) pageSessionId.current = getOrCreateSessionId(selectedProfile.id);
      const reply = await replyProvider({
        pageSessionId: pageSessionId.current,
        profileId: profileIdToSend,
        page,
        history: previousMessages.slice(-12),
        ...(continuationCursor ? { continuationCursor } : { message: text }),
        pageContext: {
          ...buildCurrentPageContext(page),
          profileId: profileIdToSend,
        },
      });

      if (activeRequestId.current !== requestId) return;

      setMessages((current) => [...current, { role: "concierge", text: reply.text, evidence: reply.matches ?? reply.evidence }]);
      retryHistory.current = [];
      setRetryQuestion("");
      setStatus("idle");
    } catch (error) {
      if (activeRequestId.current !== requestId) return;
      setStatusMessage(error instanceof Error ? error.message : "The assistant could not answer right now. Please retry.");
      setCanRetry(!(error instanceof Error && "retryable" in error && error.retryable === false));
      setStatus("error");
    }
  }

  function ask(text: string) {
    const cleanText = text.trim();
    if (!cleanText || status === "loading") return;

    const history = messages.map((message) => ({
      role: message.role === "guest" ? "user" as const : "assistant" as const,
      text: message.text,
    }));
    setMessages((current) => [...current, { role: "guest", text: cleanText }]);
    setQuestion("");
    void requestReply(cleanText, history);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  return (
    <aside id="assistant-help" className="assistant-panel" aria-label="dreRuss Concierge">
      <div className="assistant-heading">
        <div className="assistant-avatar" aria-hidden="true">D</div>
        <div>
          <strong>dreRuss Concierge</strong>
          <span><i aria-hidden="true" /> Online · read-only</span>
        </div>
        <span className="assistant-sparkle" aria-hidden="true">✳</span>
        <button className="assistant-close" type="button" aria-label="Close dreRuss Concierge" onClick={closeDrawer}>×</button>
      </div>
      <div className="assistant-body" aria-live="polite" aria-busy={status === "loading"}>
        <p className="assistant-welcome">{pageDetails.welcome}</p>
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`}>
            <p className={`chat-message chat-${message.role}`}>{message.text}</p>
          </div>
        ))}
        {status === "loading" ? <p className="assistant-loading" role="status">dreRuss Concierge is thinking…</p> : null}
        {status === "error" ? (
          <div className="assistant-error" role="alert">
            <p>{statusMessage || "That reply didn’t come through."}</p>
            {canRetry ? (
              <button type="button" onClick={() => void requestReply(retryQuestion, retryHistory.current)}>Try again</button>
            ) : (
              <p className="assistant-error-guidance">Fix the issue above before asking again.</p>
            )}
          </div>
        ) : null}
        <p className="assistant-demo-note">Use fictional demo details only; don’t enter real personal or booking information. The concierge cannot change your booking.</p>
      </div>
      {(() => {
        const latest = [...messages].reverse().find((message) => message.role === "concierge" && message.evidence);
        const latestEvidence = latest?.evidence as { complete?: boolean; nextCursor?: string } | undefined;
        return latestEvidence?.complete === false && typeof latestEvidence.nextCursor === "string";
      })() ? (
        <button className="assistant-more" type="button" onClick={() => {
          const latest = [...messages].reverse().find((message) => message.role === "concierge" && message.evidence) ?? null;
          const matches = latest?.evidence as { nextCursor?: string } | undefined;
          if (matches?.nextCursor) void requestReply("", [], matches.nextCursor);
        }}>Show more matches</button>
      ) : null}
      <div className="suggested-questions">
        <span className="eyebrow">SUGGESTED QUESTIONS</span>
        {pageDetails.prompts.map((prompt) => (
          <button className="prompt-chip" type="button" key={prompt} onClick={() => ask(prompt)} disabled={status === "loading"}>
            {prompt}
          </button>
        ))}
      </div>
      <form className="assistant-input" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="assistant-question">Ask dreRuss Concierge</label>
        <input
          id="assistant-question"
          value={question}
          disabled={status === "loading" || page === "confirmation"}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a question about this page"
        />
        <button type="submit" aria-label="Send question" disabled={!question.trim() || status === "loading" || page === "confirmation"}>↑</button>
      </form>
    </aside>
  );
}
