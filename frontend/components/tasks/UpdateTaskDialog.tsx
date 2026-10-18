"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { TASK_STATUSES, TASK_STATUS_LABELS, type Task, type TaskStatus } from "@/types/api";

const NEXT_STATUSES: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in-progress"],
  "in-progress": ["todo", "done"],
  done: ["in-progress"],
};

type UpdateTaskDialogProps = {
  task: Task | null;
  onClose: () => void;
  onUpdate: (taskId: string, patch: { title?: string; status?: TaskStatus }) => Promise<void>;
};

function messageFrom(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not update the task.";
}

function statusChoices(current: TaskStatus): TaskStatus[] {
  const allowed = new Set<TaskStatus>([current, ...NEXT_STATUSES[current]]);
  return TASK_STATUSES.filter((status) => allowed.has(status));
}

export function UpdateTaskDialog({ task, onClose, onUpdate }: UpdateTaskDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [syncedTaskId, setSyncedTaskId] = useState<string | null>(null);
  const open = task !== null;

  if (task && syncedTaskId !== task.id) {
    setSyncedTaskId(task.id);
    setTitle(task.title);
    setStatus(task.status);
    setError("");
    setSubmitting(false);
  }

  if (!task && syncedTaskId !== null) {
    setSyncedTaskId(null);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!task) {
      return;
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 4 || trimmedTitle.length > 200) {
      setError("Title must be between 4 and 200 characters.");
      return;
    }

    const patch: { title?: string; status?: TaskStatus } = {};
    if (trimmedTitle !== task.title) {
      patch.title = trimmedTitle;
    }
    if (status !== task.status) {
      patch.status = status;
    }

    if (!patch.title && !patch.status) {
      onClose();
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await onUpdate(task.id, patch);
      onClose();
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="update-task-heading"
      onCancel={(event) => {
        if (submitting) {
          event.preventDefault();
        }
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current && !submitting) {
          onClose();
        }
      }}
    >
      {task ? (
        <form onSubmit={handleSubmit} className="form-stack">
          <h2 id="update-task-heading" className="heading">
            Update task
          </h2>

          <label htmlFor="update-task-title" className="field">
            Title
            <input
              id="update-task-title"
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={4}
              maxLength={200}
              autoFocus
              disabled={submitting}
            />
          </label>

          <label htmlFor="update-task-status" className="field">
            Status
            <select
              id="update-task-status"
              className="input"
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
              disabled={submitting}
            >
              {statusChoices(task.status).map((value) => (
                <option key={value} value={value}>
                  {TASK_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <p role="alert" className="alert">
              {error}
            </p>
          ) : null}

          <div className="actions actions-end">
            <button type="button" className="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
