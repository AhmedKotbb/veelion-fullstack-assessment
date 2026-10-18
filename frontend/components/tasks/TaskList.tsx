import { CheckIcon } from "@/components/icons";
import { TaskItem } from "@/components/tasks/TaskItem";
import type { Task, TaskStatus } from "@/types/api";

const COLUMNS: Array<{ status: TaskStatus; label: string; tone: "todo" | "progress" | "done" }> = [
  { status: "todo", label: "Todo", tone: "todo" },
  { status: "in-progress", label: "In-progress", tone: "progress" },
  { status: "done", label: "Done", tone: "done" },
];

type TaskListProps = {
  tasks: Task[];
  savingTaskIds: Set<string>;
  updateErrors: Record<string, string>;
  onUpdate: (task: Task) => void;
  onDelete: (task: Task) => void;
};

function byRecentUpdate(left: Task, right: Task) {
  const leftTime = new Date(left.updatedAt).getTime();
  const rightTime = new Date(right.updatedAt).getTime();
  return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
}

export function TaskList({ tasks, savingTaskIds, updateErrors, onUpdate, onDelete }: TaskListProps) {
  return (
    <div className="board" aria-label="Task board">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.status).sort(byRecentUpdate);

        return (
          <section key={column.status} className={`column ${column.tone}`} aria-labelledby={`${column.status}-heading`}>
            <header className="column-header">
              <h2 id={`${column.status}-heading`} className="column-title">
                <span className={`column-mark ${column.tone}`}>
                  {column.tone === "done" ? <CheckIcon size={13} /> : null}
                </span>
                {column.label}
              </h2>
              <span className="column-count">{columnTasks.length}</span>
            </header>
            <ul className="column-tasks">
              {columnTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  busy={savingTaskIds.has(task.id)}
                  error={updateErrors[task.id] ?? ""}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
