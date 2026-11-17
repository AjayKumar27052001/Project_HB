import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { searchMongoProperties } from "@/server/repositories/search-properties";
import type { SearchCriteria } from "@/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchRequest = Partial<SearchCriteria> & { page?: unknown; pageSize?: unknown };

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validCount(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, requestId: randomUUID() } }, { status });
}

export async function POST(request: NextRequest) {
  let body: SearchRequest;

  try {
    body = await request.json() as SearchRequest;
  } catch {
    return errorResponse("VALIDATION_ERROR", "Send a valid JSON search request.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse("VALIDATION_ERROR", "Send a valid search request object.", 400);
  }

  const allowedFields = new Set(["destination", "checkIn", "checkOut", "adults", "rooms", "page", "pageSize"]);
  if (Object.keys(body).some((field) => !allowedFields.has(field))) {
    return errorResponse("VALIDATION_ERROR", "The search request contains unsupported fields.", 400);
  }

  const { destination, checkIn, checkOut, adults, rooms, page = 1, pageSize = 20 } = body;
  if (typeof destination !== "string" || destination.trim().length < 2 || destination.trim().length > 100) {
    return errorResponse("VALIDATION_ERROR", "Enter a destination between 2 and 100 characters.", 400);
  }
  if (!validDate(checkIn) || !validDate(checkOut) || checkOut <= checkIn) {
    return errorResponse("VALIDATION_ERROR", "Choose valid dates with check-out after check-in.", 400);
  }
  if (!validCount(adults, 1, 8) || !validCount(rooms, 1, 5)) {
    return errorResponse("VALIDATION_ERROR", "Choose between 1 and 8 adults and 1 and 5 rooms.", 400);
  }
  if (!validCount(page, 1, 1000) || !validCount(pageSize, 1, 50)) {
    return errorResponse("VALIDATION_ERROR", "Page must be 1–1000 and pageSize must be 1–50.", 400);
  }

  try {
    const criteria: SearchCriteria = { destination: destination.trim(), checkIn, checkOut, adults, rooms };
    const result = await searchMongoProperties(criteria, page, pageSize);
    return NextResponse.json({
      criteria,
      results: result.properties,
      pagination: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages },
    });
  } catch {
    return errorResponse("SEARCH_UNAVAILABLE", "Search results are temporarily unavailable. Please try again.", 503);
  }
}
