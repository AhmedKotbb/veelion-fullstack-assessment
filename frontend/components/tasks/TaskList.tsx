import type { Task, TaskStatus } from "@/types/api";
import { TaskItem } from "@/components/tasks/TaskItem";

type TaskListProps = {
  tasks: Task[];
  updatingTaskId: string;
  onStatusChange: (task: Task, status: TaskStatus) => void;
};

export function TaskList({ tasks, updatingTaskId, onStatusChange }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <section className="card" style={{ padding: "1rem" }}>
        <p style={{ margin: 0, color: "var(--muted)" }}>No tasks match this filter.</p>
      </section>
    );
  }

  return (
    <section aria-label="Task list">
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.7rem" }}>
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            busy={updatingTaskId === task.id}
            onStatusChange={onStatusChange}
          />
        ))}
      </ul>
    </section>
  );
}
