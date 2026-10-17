import { NextResponse } from "next/server";
import { errorForRoute, updateTaskInBackend } from "@/lib/backendApi";
import { TASK_STATUSES, type TaskStatus } from "@/types/api";

const ALLOWED_STATUSES = new Set<string>(TASK_STATUSES);
const TASK_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && ALLOWED_STATUSES.has(value);
}

type RouteParams = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteParams) {
  let payload: { status?: unknown };

  try {
    payload = (await request.json()) as { status?: unknown };
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON" } }, { status: 400 });
  }

  if (!TASK_ID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: { message: "Task id is not valid." } }, { status: 400 });
  }

  if (!isTaskStatus(payload?.status)) {
    return NextResponse.json(
      { error: { message: "status must be todo, in-progress, or done" } },
      { status: 400 }
    );
  }

  try {
    const task = await updateTaskInBackend(params.id, payload.status);
    return NextResponse.json({ data: task }, { status: 200 });
  } catch (error) {
    const { status, message } = errorForRoute(error, "Unable to update task.");
    return NextResponse.json({ error: { message } }, { status });
  }
}
