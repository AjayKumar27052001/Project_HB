import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { listDemoProfiles } from "@/server/repositories/demo-profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profiles = await listDemoProfiles();
    return NextResponse.json({ items: profiles });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "DEMO_PROFILES_UNAVAILABLE",
          message: "Demo profiles are unavailable right now.",
          retryable: true,
          requestId: randomUUID(),
        },
      },
      { status: 503 },
    );
  }
}
