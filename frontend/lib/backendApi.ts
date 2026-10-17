import "server-only";

import { BACKEND_BASE_URL } from "@/lib/constants";
import type {
  ActivityLog,
  ErrorResponse,
  Task,
  TaskResponse,
  TaskStatus,
  TasksResponse,
} from "@/types/api";

const BACKEND_TIMEOUT_MS = 5000;
const UNREACHABLE_MESSAGE = "Could not reach the server. Please try again.";
const TIMEOUT_MESSAGE = "The server took too long to respond. Please try again.";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ApiError";
    this.status = status;
  }
}

export function errorForRoute(error: unknown, fallback: string): { status: number; message: string } {
  if (error instanceof ApiError) {
    return { status: error.status, message: error.message };
  }

  console.error(error);
  return { status: 500, message: fallback };
}

function buildBackendUrl(path: string): string {
  return `${BACKEND_BASE_URL}${path}`;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "";
}

function isTimeoutError(error: unknown): boolean {
  if (errorName(error) === "TimeoutError") {
    return true;
  }

  if (error instanceof Error && error.cause !== undefined) {
    return isTimeoutError(error.cause);
  }

  return false;
}

async function readBackendError(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}`;

  try {
    const body = (await response.json()) as ErrorResponse;
    return body.error?.message || fallback;
  } catch {
    return fallback;
  }
}

async function requestBackend(path: string, init: RequestInit | undefined): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(buildBackendUrl(path), {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(error);

    if (isTimeoutError(error)) {
      throw new ApiError(504, TIMEOUT_MESSAGE, { cause: error });
    }

    throw new ApiError(502, UNREACHABLE_MESSAGE, { cause: error });
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readBackendError(response));
  }

  return response;
}

export async function createTaskInBackend(title: string, status?: TaskStatus): Promise<Task> {
  const payload: { title: string; status?: TaskStatus } = { title };
  if (status) {
    payload.status = status;
  }

  const response = await requestBackend("/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as TaskResponse;
  return body.data;
}

export async function getTasksFromBackend(): Promise<Task[]> {
  const response = await requestBackend("/tasks", undefined);
  const body = (await response.json()) as TasksResponse;
  return body.data;
}

export async function updateTaskInBackend(taskId: string, status: TaskStatus): Promise<Task> {
  const response = await requestBackend(`/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  const body = (await response.json()) as TaskResponse;
  return body.data;
}

export async function getActivityFromBackend(): Promise<ActivityLog[]> {
  const response = await requestBackend("/activity", undefined);
  return (await response.json()) as ActivityLog[];
}
