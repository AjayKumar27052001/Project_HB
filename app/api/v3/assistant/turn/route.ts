import { NextResponse } from "next/server";
import { runAssistantOrchestrator } from "@/server/assistant/orchestrator";
import type { AssistantTurnRequest } from "@/server/assistant/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAXIMUM_REQUEST_BYTES = 32_000;
const VALID_PROFILES = new Set(["PROFILE-ALEX", "PROFILE-MORGAN", "PROFILE-RILEY"]);

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAXIMUM_REQUEST_BYTES) {
      return NextResponse.json(
        {
          error: {
            code: "REQUEST_TOO_LARGE",
            message: "Request payload must be smaller than 32 KB.",
            retryable: false,
          },
        },
        { status: 413 }
      );
    }

    const body: unknown = JSON.parse(rawBody);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid JSON assistant request.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const payload = body as AssistantTurnRequest;
    if (!payload.pageSessionId || !payload.page) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing required pageSessionId or page in request.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Session Token Linkage & Profile Binding
    let linkedProfileId: string | null = null;
    const incomingProfileId = payload.profileId || payload.pageContext?.profileId;
    if (typeof incomingProfileId === "string" && incomingProfileId.trim()) {
      const trimmed = incomingProfileId.trim();
      // Authorization check: Verify profile ID belongs to known credentials
      if (VALID_PROFILES.has(trimmed)) {
        linkedProfileId = trimmed;
      }
    }

    // Attach verified profile ID to the request payload
    payload.profileId = linkedProfileId;
    if (payload.pageContext) {
      payload.pageContext.profileId = linkedProfileId ?? undefined;
    }

    // Direct in-process execution of the LangGraph ReAct + Reflection orchestrator
    const result = await runAssistantOrchestrator(payload);

    // Telemetry audit log
    const durationMs = Date.now() - startTime;
    console.log(
      JSON.stringify({
        telemetry: "ASSISTANT_TURN_AUDIT",
        timestamp: new Date().toISOString(),
        requestId: result.requestId,
        pageSessionId: payload.pageSessionId,
        page: payload.page,
        profileId: linkedProfileId ?? "GUEST_ANONYMOUS",
        status: result.status,
        durationMs,
      })
    );

    return NextResponse.json(result, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[API v3 Assistant] Error handling turn:", err);
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_ERROR",
          message: "The assistant could not complete your request. Please retry.",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
