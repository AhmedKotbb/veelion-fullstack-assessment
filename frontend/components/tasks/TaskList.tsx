import type { Task, TaskStatus } from "@/types/api";
import { TaskItem } from "@/components/tasks/TaskItem";

type TaskListProps = {
  tasks: Task[];
  savingTaskIds: Set<string>;
  updateErrors: Record<string, string>;
  onStatusChange: (task: Task, status: TaskStatus) => void;
};

export function TaskList({ tasks, savingTaskIds, updateErrors, onStatusChange }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <section className="card card-body">
        <p className="message muted">No tasks match this filter.</p>
      </section>
    );
  }

  return (
    <section aria-label="Task list">
      <ul className="list">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            busy={savingTaskIds.has(task.id)}
            error={updateErrors[task.id] ?? ""}
            onStatusChange={onStatusChange}
          />
        ))}
      </ul>
    </section>
  );
}
