import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  assistantError,
  authorizeAssistantService,
  readJsonObject,
} from "@/server/assistant/internal-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAG_MAP: Record<string, { start: string; end: string }> = {
  tiers: { start: "<!-- [TIER_BENEFITS] -->", end: "<!-- [END_TIER_BENEFITS] -->" },
  points: { start: "<!-- [REDEMPTION] -->", end: "<!-- [END_REDEMPTION] -->" },
  redemption: { start: "<!-- [REDEMPTION] -->", end: "<!-- [END_REDEMPTION] -->" },
  upgrades: { start: "<!-- [UPSELL_TERMS] -->", end: "<!-- [END_UPSELL_TERMS] -->" },
  upsell: { start: "<!-- [UPSELL_TERMS] -->", end: "<!-- [END_UPSELL_TERMS] -->" },
};

export async function POST(request: Request) {
  const authorizationError = authorizeAssistantService(request);
  if (authorizationError) return authorizationError;

  const body = await readJsonObject(request);
  const topic = (typeof body?.topic === "string" ? body.topic.toLowerCase().trim() : "tiers");

  try {
    const filePath = join(process.cwd(), "src", "data", "loyalty-program.md");
    const fileContent = await readFile(filePath, "utf-8");

    let extractedChunk = "";
    const tags = TAG_MAP[topic];

    if (tags && fileContent.includes(tags.start) && fileContent.includes(tags.end)) {
      const startIndex = fileContent.indexOf(tags.start) + tags.start.length;
      const endIndex = fileContent.indexOf(tags.end);
      extractedChunk = fileContent.slice(startIndex, endIndex).trim();
    } else {
      // Default to returning the tier benefits chunk if no specific tag matches
      const defaultTags = TAG_MAP.tiers;
      const startIndex = fileContent.indexOf(defaultTags.start) + defaultTags.start.length;
      const endIndex = fileContent.indexOf(defaultTags.end);
      extractedChunk = fileContent.slice(startIndex, endIndex).trim();
    }

    return NextResponse.json({
      status: "complete",
      requestId: randomUUID(),
      dataAsOf: new Date().toISOString(),
      data: {
        topic,
        policyContent: extractedChunk,
      },
    });
  } catch {
    return assistantError("POLICY_UNAVAILABLE", "Loyalty policy knowledge is temporarily unavailable.", 503);
  }
}
