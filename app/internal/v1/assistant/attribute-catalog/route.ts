import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAssistantFilterOperators, listAssistantAttributes } from "@/server/assistant/attribute-registry";
import { assistantError, authorizeAssistantService } from "@/server/assistant/internal-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const authorizationError = authorizeAssistantService(request);
  if (authorizationError) return authorizationError;

  const attributes = listAssistantAttributes().map((attribute) => ({
    key: attribute.key,
    scope: attribute.scope,
    ...(attribute.entityType ? { entityType: attribute.entityType } : {}),
    valueType: attribute.valueType,
    label: attribute.label,
    aliases: attribute.aliases,
    filterOperators: getAssistantFilterOperators(attribute),
    sortModes: attribute.sortValue?.kind === "decimal-field"
      ? ["stored-numeric-amount"]
      : attribute.sortValue?.kind === "eligible-rate"
        ? [attribute.sortValue.basis === "nightly" ? "lowest-starting-nightly" : "lowest-stay-total"]
        : [],
  }));

  return NextResponse.json({
    status: "complete",
    requestId: randomUUID(),
    demo: true,
    dataAsOf: new Date().toISOString(),
    data: { attributes },
  });
}
