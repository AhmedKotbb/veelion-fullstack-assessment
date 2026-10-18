import { NextResponse } from "next/server";
import { deleteTaskInBackend, errorForRoute, updateTaskInBackend } from "@/lib/backendApi";
import { TASK_STATUSES, type TaskStatus } from "@/types/api";

const ALLOWED_STATUSES = new Set<string>(TASK_STATUSES);
const TASK_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TITLE_MIN = 4;
const TITLE_MAX = 200;

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && ALLOWED_STATUSES.has(value);
}

type RouteParams = {
  params: {
    id: string;
  };
};

type TaskPatch = {
  title?: string;
  status?: TaskStatus;
};

function readPatch(payload: { title?: unknown; status?: unknown }): { ok: true; patch: TaskPatch } | { ok: false; message: string } {
  const patch: TaskPatch = {};

  if (payload.title !== undefined) {
    if (typeof payload.title !== "string") {
      return { ok: false, message: "Title must be a string." };
    }

    const title = payload.title.trim();
    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
      return { ok: false, message: `Title must be between ${TITLE_MIN} and ${TITLE_MAX} characters.` };
    }

    patch.title = title;
  }

  if (payload.status !== undefined) {
    if (!isTaskStatus(payload.status)) {
      return { ok: false, message: "status must be todo, in-progress, or done" };
    }

    patch.status = payload.status;
  }

  if (patch.title === undefined && patch.status === undefined) {
    return { ok: false, message: "Provide a title or a status." };
  }

  return { ok: true, patch };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  let payload: { title?: unknown; status?: unknown };

  try {
    payload = (await request.json()) as { title?: unknown; status?: unknown };
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON" } }, { status: 400 });
  }

  if (!TASK_ID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: { message: "Task id is not valid." } }, { status: 400 });
  }

  const parsed = readPatch(payload ?? {});
  if (!parsed.ok) {
    return NextResponse.json({ error: { message: parsed.message } }, { status: 400 });
  }

  try {
    const task = await updateTaskInBackend(params.id, parsed.patch);
    return NextResponse.json({ data: task }, { status: 200 });
  } catch (error) {
    const { status, message } = errorForRoute(error, "Unable to update task.");
    return NextResponse.json({ error: { message } }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  if (!TASK_ID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: { message: "Task id is not valid." } }, { status: 400 });
  }

  try {
    await deleteTaskInBackend(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { status, message } = errorForRoute(error, "Unable to delete task.");
    return NextResponse.json({ error: { message } }, { status });
  }
}
