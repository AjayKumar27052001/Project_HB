"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useDemoProfile } from "@/features/profiles/profile-context";
import { useAssistantDrawer } from "@/features/assistant/assistant-drawer-context";

type AssistantPage = "home" | "search-results" | "rate-list" | "checkout" | "confirmation";
type ChatMessage = { role: "guest" | "concierge"; text: string };
type AssistantStatus = "idle" | "loading" | "error";
type ConversationMessage = { role: "user" | "assistant"; text: string };
type AssistantApiError = Error & { retryable: boolean };
type AssistantTurnRequest = {
  pageSessionId: string;
  page: AssistantPage;
  profileId: string;
  history: ConversationMessage[];
  message: string;
  pageContext: Record<string, unknown>;
};
type AssistantReplyProvider = (request: AssistantTurnRequest) => Promise<string>;
type ApiErrorResponse = { error?: { message?: string; retryable?: boolean } };
type ApiReplyResponse = { reply?: { text?: string } };

const pageCopy: Record<AssistantPage, { welcome: string; prompts: string[] }> = {
  home: {
    welcome: "Hi, I’m Juniper Concierge. I can explain the search options on this page.",
    prompts: ["What dates should I enter?", "How many guests can I add?", "What can I ask you?"],
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
    welcome: "I can explain the details displayed in this mock confirmation.",
    prompts: ["What are the stay dates?", "What does the total include?", "Is this reservation real?"],
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

function createPageSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `page-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function requestGeminiReply(request: AssistantTurnRequest): Promise<string> {
  const response = await fetch("/api/v1/assistant/turn", {
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
  const replyText = successBody.reply?.text?.trim();
  if (!replyText) {
    const error = new Error("The assistant returned an empty reply. Please retry.") as AssistantApiError;
    error.retryable = true;
    throw error;
  }
  return replyText;
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
    pageSessionId.current = createPageSessionId();
    retryHistory.current = [];
    setMessages([]);
    setQuestion("");
    setStatus("idle");
    setStatusMessage("");
    setCanRetry(false);
    setRetryQuestion("");
  }, [pathname, selectedProfile.id]);

  const pageDetails = pageCopy[page];

  async function requestReply(text: string, previousMessages: ConversationMessage[]) {
    const requestId = activeRequestId.current + 1;
    activeRequestId.current = requestId;
    retryHistory.current = previousMessages;
    setRetryQuestion(text);
    setStatusMessage("");
    setCanRetry(false);
    setStatus("loading");

    try {
      if (!pageSessionId.current) pageSessionId.current = createPageSessionId();
      const reply = await replyProvider({
        pageSessionId: pageSessionId.current,
        page,
        profileId: selectedProfile.id,
        history: previousMessages.slice(-12),
        message: text,
        pageContext: buildCurrentPageContext(page),
      });

      if (activeRequestId.current !== requestId) return;

      setMessages((current) => [...current, { role: "concierge", text: reply }]);
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
    <aside id="assistant-help" className="assistant-panel" aria-label="Juniper Concierge">
      <div className="assistant-heading">
        <div className="assistant-avatar" aria-hidden="true">J</div>
        <div>
          <strong>Juniper Concierge</strong>
          <span><i aria-hidden="true" /> Online · read-only</span>
        </div>
        <span className="assistant-sparkle" aria-hidden="true">✳</span>
        <button className="assistant-close" type="button" aria-label="Close Juniper Concierge" onClick={closeDrawer}>×</button>
      </div>
      <div className="assistant-body" aria-live="polite" aria-busy={status === "loading"}>
        <p className="assistant-welcome">{pageDetails.welcome}</p>
        {messages.map((message, index) => (
          <p className={`chat-message chat-${message.role}`} key={`${message.role}-${index}`}>
            {message.text}
          </p>
        ))}
        {status === "loading" ? <p className="assistant-loading" role="status">Juniper Concierge is thinking…</p> : null}
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
      <div className="suggested-questions">
        <span className="eyebrow">SUGGESTED QUESTIONS</span>
        {pageDetails.prompts.map((prompt) => (
          <button className="prompt-chip" type="button" key={prompt} onClick={() => ask(prompt)} disabled={status === "loading"}>
            {prompt}
          </button>
        ))}
      </div>
      <form className="assistant-input" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="assistant-question">Ask Juniper Concierge</label>
        <input
          id="assistant-question"
          value={question}
          disabled={status === "loading"}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a question about this page"
        />
        <button type="submit" aria-label="Send question" disabled={!question.trim() || status === "loading"}>↑</button>
      </form>
    </aside>
  );
}
