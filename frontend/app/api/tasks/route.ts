import { NextResponse } from "next/server";
import { createTaskInBackend, errorForRoute, getTasksFromBackend } from "@/lib/backendApi";
import { TASK_STATUSES, type TaskStatus } from "@/types/api";

const ALLOWED_STATUSES = new Set<string>(TASK_STATUSES);

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && ALLOWED_STATUSES.has(value);
}

export async function GET() {
  try {
    const tasks = await getTasksFromBackend();
    return NextResponse.json({ data: tasks }, { status: 200 });
  } catch (error) {
    const { status, message } = errorForRoute(error, "Unable to fetch tasks.");
    return NextResponse.json({ error: { message } }, { status });
  }
}

export async function POST(request: Request) {
  let payload: { title?: unknown; status?: unknown };

  try {
    payload = (await request.json()) as { title?: unknown; status?: unknown };
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON" } }, { status: 400 });
  }

  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: { message: "Title is required." } }, { status: 400 });
  }

  if (payload?.status !== undefined && !isTaskStatus(payload.status)) {
    return NextResponse.json(
      { error: { message: "status must be todo, in-progress, or done" } },
      { status: 400 }
    );
  }

  try {
    const task = await createTaskInBackend(title, isTaskStatus(payload?.status) ? payload.status : undefined);
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    const { status, message } = errorForRoute(error, "Unable to create task.");
    return NextResponse.json({ error: { message } }, { status });
  }
}
