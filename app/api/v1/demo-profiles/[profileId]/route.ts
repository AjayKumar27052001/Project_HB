import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { findDemoProfile } from "@/server/repositories/demo-profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ profileId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { profileId } = await params;

  try {
    const profile = await findDemoProfile(profileId);

    if (!profile) {
      return NextResponse.json(
        {
          error: {
            code: "DEMO_PROFILE_NOT_FOUND",
            message: "The demo profile was not found.",
            retryable: false,
            requestId: randomUUID(),
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json(profile);
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
