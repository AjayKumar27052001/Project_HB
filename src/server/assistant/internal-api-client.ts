import "server-only";

import { INTERNAL_API_BASE_URL } from "./config";

/**
 * Standard client response envelope from internal assistant endpoints.
 */
export interface InternalApiResponse<T = unknown> {
  status: string;
  requestId?: string;
  demo?: boolean;
  dataAsOf?: string;
  data: T;
  error?: {
    code: string;
    message: string;
    requestId?: string;
  };
}

function getServiceToken(): string {
  const token = process.env.AI_SERVICE_TOKEN;
  if (!token || token.length < 32) {
    throw new Error("AI_SERVICE_TOKEN is not configured with a valid 32+ character key.");
  }
  return token;
}

/**
 * Executes an authorized POST request against internal assistant APIs.
 */
export async function callInternalApiPost<T = unknown>(path: string, body: unknown): Promise<InternalApiResponse<T>> {
  const baseUrl = INTERNAL_API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;
  const token = getServiceToken();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: { message?: string; code?: string } } | null;
    const errorMessage = errorBody?.error?.message ?? `Internal API returned status ${response.status} (${response.statusText})`;
    const errorCode = errorBody?.error?.code ?? `HTTP_${response.status}`;
    const error = new Error(`[Internal API Error] ${errorCode}: ${errorMessage}`);
    (error as unknown as { code: string; status: number }).code = errorCode;
    (error as unknown as { code: string; status: number }).status = response.status;
    throw error;
  }

  return (await response.json()) as InternalApiResponse<T>;
}

/**
 * Executes an authorized GET request with query parameters against internal assistant APIs.
 */
export async function callInternalApiGet<T = unknown>(
  path: string,
  params?: Record<string, string | number | null | undefined>,
): Promise<InternalApiResponse<T>> {
  const baseUrl = INTERNAL_API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);

  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val !== null && val !== undefined) {
        url.searchParams.set(key, String(val));
      }
    }
  }

  const token = getServiceToken();
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: { message?: string; code?: string } } | null;
    const errorMessage = errorBody?.error?.message ?? `Internal API returned status ${response.status} (${response.statusText})`;
    const errorCode = errorBody?.error?.code ?? `HTTP_${response.status}`;
    const error = new Error(`[Internal API Error] ${errorCode}: ${errorMessage}`);
    (error as unknown as { code: string; status: number }).code = errorCode;
    (error as unknown as { code: string; status: number }).status = response.status;
    throw error;
  }

  return (await response.json()) as InternalApiResponse<T>;
}
