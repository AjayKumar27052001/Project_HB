import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getStayNightCount } from "@/server/pricing/rate-quote";
import type { SearchCriteria } from "@/shared/types";

const maximumRequestBytes = 32_000;

export function assistantError(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message, requestId: randomUUID() } },
    { status },
  );
}

export function authorizeAssistantService(request: Request): NextResponse | null {
  const expectedToken = process.env.AI_SERVICE_TOKEN;
  if (!expectedToken || expectedToken.length < 32) {
    return assistantError("SERVICE_NOT_CONFIGURED", "Assistant service access is not configured.", 503);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const providedToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const expected = Buffer.from(expectedToken);
  const provided = Buffer.from(providedToken);

  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return assistantError("UNAUTHORIZED", "A valid assistant service credential is required.", 401);
  }

  return null;
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > maximumRequestBytes) return null;

  try {
    const bodyText = await request.text();
    if (Buffer.byteLength(bodyText, "utf8") > maximumRequestBytes) return null;
    const body: unknown = JSON.parse(bodyText);
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown, maximumLength = 120): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximumLength;
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseSearchCriteria(value: unknown): SearchCriteria | null {
  if (!isPlainObject(value)) return null;
  const allowedKeys = new Set(["destination", "checkIn", "checkOut", "adults", "rooms"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null;

  const { destination, checkIn, checkOut, adults, rooms } = value;
  if (!isNonEmptyString(destination, 100) || destination.trim().length < 2) return null;
  const stayCriteria = parseStayCriteria({ checkIn, checkOut, adults, rooms });
  if (!stayCriteria) return null;

  return { destination: destination.trim(), ...stayCriteria };
}

export type AssistantStayCriteria = Pick<SearchCriteria, "checkIn" | "checkOut" | "adults" | "rooms">;

export function parseStayCriteria(value: unknown): AssistantStayCriteria | null {
  if (!isPlainObject(value)) return null;
  const allowedKeys = new Set(["checkIn", "checkOut", "adults", "rooms"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null;

  const { checkIn, checkOut, adults, rooms } = value;
  if (!isValidDate(checkIn) || !isValidDate(checkOut) || checkOut <= checkIn) return null;
  if (typeof adults !== "number" || !Number.isInteger(adults) || adults < 1 || adults > 8) return null;
  if (typeof rooms !== "number" || !Number.isInteger(rooms) || rooms < 1 || rooms > 5) return null;

  try {
    getStayNightCount(checkIn, checkOut);
  } catch {
    return null;
  }

  return { checkIn, checkOut, adults, rooms };
}
