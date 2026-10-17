import { BACKEND_BASE_URL } from "@/lib/constants";
import type {
  ActivityLog,
  ErrorResponse,
  Task,
  TaskResponse,
  TaskStatus,
  TasksResponse,
} from "@/types/api";

const UNREACHABLE_MESSAGE = "Could not reach the server. Please try again.";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function errorForRoute(error: unknown, fallback: string): { status: number; message: string } {
  if (error instanceof ApiError) {
    return { status: error.status, message: error.message };
  }

  return { status: 500, message: fallback };
}

function buildBackendUrl(path: string): string {
  return `${BACKEND_BASE_URL}${path}`;
}

async function parseError(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}`;

  try {
    const body = (await response.json()) as ErrorResponse;
    return body.error?.message || fallback;
  } catch {
    return fallback;
  }
}

function asApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof TypeError) {
    return new ApiError(502, UNREACHABLE_MESSAGE);
  }

  return new ApiError(500, fallback);
}

async function requestBackend(path: string, init: RequestInit | undefined, fallback: string): Promise<Response> {
  try {
    const response = await fetch(buildBackendUrl(path), {
      ...init,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new ApiError(response.status, await parseError(response));
    }

    return response;
  } catch (error) {
    throw asApiError(error, fallback);
  }
}

export async function createTaskInBackend(title: string, status?: TaskStatus): Promise<Task> {
  const payload: { title: string; status?: TaskStatus } = { title };
  if (status) {
    payload.status = status;
  }

  const response = await requestBackend(
    "/tasks",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "Failed to create task."
  );
  const body = (await response.json()) as TaskResponse;
  return body.data;
}

export async function getTasksFromBackend(): Promise<Task[]> {
  const response = await requestBackend("/tasks", undefined, "Failed to load tasks.");
  const body = (await response.json()) as TasksResponse;
  return body.data;
}

export async function updateTaskInBackend(taskId: string, status: TaskStatus): Promise<Task> {
  const response = await requestBackend(
    `/tasks/${taskId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
    "Failed to update task."
  );
  const body = (await response.json()) as TaskResponse;
  return body.data;
}

export async function getActivityFromBackend(): Promise<ActivityLog[]> {
  try {
    const response = await fetch(buildBackendUrl("/activity"), {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return (await response.json()) as ActivityLog[];
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to load activity logs.");
  }
}
