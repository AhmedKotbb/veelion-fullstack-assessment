import type { ErrorResponse } from "@/types/api";

export class ClientApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
  }
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;

    try {
      const body = (await response.json()) as ErrorResponse;
      if (body.error?.message) {
        message = body.error.message;
      }
    } catch {
      // The error body was not JSON. Keep the status fallback.
    }

    throw new ClientApiError(response.status, message);
  }

  return (await response.json()) as T;
}
