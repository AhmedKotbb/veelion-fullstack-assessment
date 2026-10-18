"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BoltIcon, CheckCircleIcon, ClipboardIcon, ProgressIcon } from "@/components/icons";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { DeleteTaskDialog } from "@/components/tasks/DeleteTaskDialog";
import { TaskList } from "@/components/tasks/TaskList";
import { UpdateTaskDialog } from "@/components/tasks/UpdateTaskDialog";
import { useTasks } from "@/hooks/useTasks";
import { OPEN_CREATE_TASK } from "@/lib/taskEvents";
import type { Task } from "@/types/api";

type TaskDashboardProps = {
  initialTasks: Task[];
  initialLoadError: string;
};

export function TaskDashboard({ initialTasks, initialLoadError }: TaskDashboardProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const {
    tasks,
    loading,
    loadError,
    updateErrors,
    savingTaskIds,
    summary,
    summaryError,
    fetchTasks,
    fetchSummary,
    createTask,
    updateTask,
    deleteTask,
  } = useTasks(initialTasks, initialLoadError);

  useEffect(() => {
    const open = () => {
      setCreateKey((key) => key + 1);
      setCreateOpen(true);
    };

    window.addEventListener(OPEN_CREATE_TASK, open);
    return () => window.removeEventListener(OPEN_CREATE_TASK, open);
  }, []);

  const recentCount = summary?.recentActivityCount;
  const cardValue = (value: number | undefined) => (value === undefined ? "–" : value);

  const recentText =
    recentCount === 1
      ? "1 activity entry in the last 7 days"
      : `${cardValue(recentCount)} activity entries in the last 7 days`;

  return (
    <section className="stack">
      <CreateTaskDialog
        key={createKey}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createTask}
      />
      <UpdateTaskDialog task={editing} onClose={() => setEditing(null)} onUpdate={updateTask} />
      <DeleteTaskDialog task={deleting} onClose={() => setDeleting(null)} onConfirm={deleteTask} />

      <section className="stats" aria-label="Task summary">
        <article className="stat-card">
          <span className="stat-icon purple">
            <ClipboardIcon />
          </span>
          <div>
            <p className="stat-label">Total Tasks</p>
            <p className="stat-value">{cardValue(summary?.total)}</p>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon blue">
            <CheckCircleIcon />
          </span>
          <div>
            <p className="stat-label">To Do</p>
            <p className="stat-value">{cardValue(summary?.byStatus.todo)}</p>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon orange">
            <ProgressIcon />
          </span>
          <div>
            <p className="stat-label">In Progress</p>
            <p className="stat-value">{cardValue(summary?.byStatus["in-progress"])}</p>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon green">
            <CheckCircleIcon />
          </span>
          <div>
            <p className="stat-label">Done</p>
            <p className="stat-value">{cardValue(summary?.byStatus.done)}</p>
          </div>
        </article>
      </section>

      <Link href="/activity" className="activity-banner">
        <span className="banner-copy">
          <span className="banner-title">Recent Activity</span>
          <span className="banner-text">{recentText}</span>
        </span>
      </Link>

      {summaryError ? (
        <section className="panel error">
          <p role="alert" className="alert-block">
            {summaryError}
          </p>
          <button type="button" className="button" onClick={() => void fetchSummary()}>
            Retry
          </button>
        </section>
      ) : null}

      {loading ? (
        <section className="panel">
          <p role="status" className="message">
            Loading tasks...
          </p>
        </section>
      ) : null}

      {loadError ? (
        <section className="panel error">
          <p role="alert" className="alert-block">
            {loadError}
          </p>
          <button
            type="button"
            className="button"
            onClick={() => {
              void fetchTasks();
              void fetchSummary();
            }}
          >
            Retry
          </button>
        </section>
      ) : null}

      {!loading && !loadError ? (
        <TaskList
          tasks={tasks}
          savingTaskIds={savingTaskIds}
          updateErrors={updateErrors}
          onUpdate={setEditing}
          onDelete={setDeleting}
        />
      ) : null}
    </section>
  );
}
