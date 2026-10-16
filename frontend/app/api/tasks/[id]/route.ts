import { NextResponse } from "next/server";
import { updateTaskInBackend } from "@/lib/backendApi";
import { TASK_STATUSES, type TaskStatus } from "@/types/api";

const ALLOWED_STATUSES = new Set<string>(TASK_STATUSES);

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && ALLOWED_STATUSES.has(value);
}

type RouteParams = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const payload = (await request.json()) as { status?: unknown };

    if (!isTaskStatus(payload.status)) {
      return NextResponse.json(
        { error: { message: "status must be todo, in-progress, or done" } },
        { status: 400 }
      );
    }

    const task = await updateTaskInBackend(params.id, payload.status);
    return NextResponse.json({ data: task }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Unable to update task." } },
      { status: 500 }
    );
  }
}
