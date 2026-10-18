"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BoltIcon, CheckCircleIcon, ClipboardIcon, ProgressIcon } from "@/components/icons";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { DeleteTaskDialog } from "@/components/tasks/DeleteTaskDialog";
import { TaskList } from "@/components/tasks/TaskList";
import { UpdateTaskDialog } from "@/components/tasks/UpdateTaskDialog";
import { useTasks } from "@/hooks/useTasks";
import { OPEN_CREATE_TASK } from "@/lib/taskEvents";
import type { Task } from "@/types/api";

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type TaskDashboardProps = {
  initialTasks: Task[];
  initialLoadError: string;
};

function countRecent(tasks: Task[]) {
  const cutoff = Date.now() - RECENT_WINDOW_MS;
  return tasks.filter((task) => {
    const time = new Date(task.updatedAt).getTime();
    return Number.isFinite(time) && time >= cutoff;
  }).length;
}

export function TaskDashboard({ initialTasks, initialLoadError }: TaskDashboardProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const { tasks, loading, loadError, updateErrors, savingTaskIds, fetchTasks, createTask, updateTask, deleteTask } =
    useTasks(initialTasks, initialLoadError);

  useEffect(() => {
    const open = () => {
      setCreateKey((key) => key + 1);
      setCreateOpen(true);
    };

    window.addEventListener(OPEN_CREATE_TASK, open);
    return () => window.removeEventListener(OPEN_CREATE_TASK, open);
  }, []);

  const counts = useMemo(
    () => ({
      total: tasks.length,
      todo: tasks.filter((task) => task.status === "todo").length,
      progress: tasks.filter((task) => task.status === "in-progress").length,
      done: tasks.filter((task) => task.status === "done").length,
      recent: countRecent(tasks),
    }),
    [tasks]
  );

  const recentText =
    counts.recent === 1 ? "1 task was updated recently" : `${counts.recent} tasks were updated recently`;

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
            <p className="stat-value">{counts.total}</p>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon blue">
            <CheckCircleIcon />
          </span>
          <div>
            <p className="stat-label">To Do</p>
            <p className="stat-value">{counts.todo}</p>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon orange">
            <ProgressIcon />
          </span>
          <div>
            <p className="stat-label">In Progress</p>
            <p className="stat-value">{counts.progress}</p>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon green">
            <CheckCircleIcon />
          </span>
          <div>
            <p className="stat-label">Done</p>
            <p className="stat-value">{counts.done}</p>
          </div>
        </article>
      </section>

      <Link href="/activity" className="activity-banner">
        <span className="banner-copy">
          <span className="banner-title">Recent Activity</span>
          <span className="banner-text">{recentText}</span>
        </span>
        <span className="banner-count">{counts.recent}</span>
      </Link>

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
          <button type="button" className="button" onClick={fetchTasks}>
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
