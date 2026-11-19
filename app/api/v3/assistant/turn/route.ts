import { NextResponse } from "next/server";
import { runAssistantOrchestrator } from "@/server/assistant/orchestrator";
import type { AssistantTurnRequest } from "@/server/assistant/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAXIMUM_REQUEST_BYTES = 32_000;

export async function POST(request: Request) {
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

    // Direct in-process execution of the LangGraph ReAct + Reflection orchestrator
    const result = await runAssistantOrchestrator(payload);

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
