import { Suspense } from "react";
import { ApiError, getTasksFromBackend } from "@/lib/backendApi";
import { TaskDashboard } from "@/components/tasks/TaskDashboard";
import type { Task } from "@/types/api";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  let initialTasks: Task[] = [];
  let initialLoadError = "";

  try {
    initialTasks = await getTasksFromBackend();
  } catch (error) {
    initialLoadError = error instanceof ApiError ? error.message : "Could not load tasks right now.";
  }

  return (
    <main className="stack">
      <Suspense
        fallback={
          <section className="card card-body">
            <p role="status" className="message">
              Loading tasks...
            </p>
          </section>
        }
      >
        <TaskDashboard initialTasks={initialTasks} initialLoadError={initialLoadError} />
      </Suspense>
    </main>
  );
}
