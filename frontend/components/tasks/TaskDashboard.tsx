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
      <header className="card card-body panel-header">
        <h1 className="heading">Task Dashboard</h1>
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
        <section className="card card-body">
          <p role="status" className="message">
            Loading tasks...
          </p>
        </section>
      ) : null}

      {loadError ? (
        <section className="card card-body error-box">
          <p role="alert" className="alert-block">
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
