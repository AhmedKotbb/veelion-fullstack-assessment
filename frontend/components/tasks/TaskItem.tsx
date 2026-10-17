import { TASK_STATUS_LABELS, type Task, type TaskStatus } from "@/types/api";

const NEXT_STATUSES: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in-progress"],
  "in-progress": ["todo", "done"],
  done: ["in-progress"],
};

type TaskItemProps = {
  task: Task;
  busy: boolean;
  error: string;
  onStatusChange: (task: Task, status: TaskStatus) => void;
};

function moveLabel(from: TaskStatus, to: TaskStatus): string {
  if (to === "todo") {
    return "Back to to do";
  }

  if (to === "done") {
    return "Mark done";
  }

  return from === "done" ? "Reopen" : "Start";
}

export function TaskItem({ task, busy, error, onStatusChange }: TaskItemProps) {
  const moves = NEXT_STATUSES[task.status] ?? [];

  return (
    <li
      className="card"
      style={{
        padding: "0.85rem",
        display: "grid",
        gap: "0.4rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", alignItems: "start" }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{task.title}</p>
        <span className="badge">{TASK_STATUS_LABELS[task.status] ?? task.status}</span>
      </div>

      <small style={{ color: "var(--muted)" }}>
        Updated: {new Date(task.updatedAt).toLocaleString()}
      </small>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {busy ? (
          <button type="button" className="button" disabled>
            Saving...
          </button>
        ) : (
          moves.map((status) => (
            <button
              key={status}
              type="button"
              className="button"
              onClick={() => onStatusChange(task, status)}
              aria-label={`${moveLabel(task.status, status)}: ${task.title}`}
            >
              {moveLabel(task.status, status)}
            </button>
          ))
        )}
      </div>

      {error ? (
        <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p>
      ) : null}
    </li>
  );
}
