"use client";

import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import type { Task, TaskStatus } from "@/types/api";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { StatusFilter } from "@/components/tasks/StatusFilter";
import { TaskList } from "@/components/tasks/TaskList";

type TaskDashboardProps = {
  initialTasks: Task[];
  initialLoadError: string;
};

export function TaskDashboard({ initialTasks, initialLoadError }: TaskDashboardProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const {
    filteredTasks,
    filter,
    loading,
    loadError,
    updateErrors,
    savingTaskIds,
    setFilter,
    fetchTasks,
    createTask,
    updateTaskStatus,
  } = useTasks(initialTasks, initialLoadError);

  const handleStatusChange = (task: Task, status: TaskStatus) => {
    updateTaskStatus(task.id, status);
  };

  return (
    <section className="stack">
      <header
        className="card"
        style={{
          padding: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.8rem",
        }}
      >
        <h1 style={{ margin: 0 }}>Task Dashboard</h1>
        <button
          type="button"
          className="button primary"
          onClick={() => {
            setCreateKey((key) => key + 1);
            setCreateOpen(true);
          }}
          disabled={loading}
        >
          New task
        </button>
      </header>

      <CreateTaskDialog
        key={createKey}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createTask}
      />

      <StatusFilter value={filter} onChange={setFilter} />

      {loading ? (
        <section className="card" style={{ padding: "1rem" }}>
          <p role="status" style={{ margin: 0 }}>
            Loading tasks...
          </p>
        </section>
      ) : null}

      {loadError ? (
        <section className="card" style={{ padding: "1rem", borderColor: "#e3b4c0", background: "#fff8fa" }}>
          <p role="alert" style={{ marginTop: 0, marginBottom: "0.75rem", color: "var(--danger)" }}>
            {loadError}
          </p>
          <button type="button" className="button" onClick={fetchTasks}>
            Retry
          </button>
        </section>
      ) : null}

      {!loading && !loadError ? (
        <TaskList
          tasks={filteredTasks}
          savingTaskIds={savingTaskIds}
          updateErrors={updateErrors}
          onStatusChange={handleStatusChange}
        />
      ) : null}
    </section>
  );
}
