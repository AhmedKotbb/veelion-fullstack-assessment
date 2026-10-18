"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskStatus } from "@/types/api";

type CreateTaskDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string, status?: TaskStatus) => Promise<void>;
};

function messageFrom(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not create the task.";
}

export function CreateTaskDialog({ open, onClose, onCreate }: CreateTaskDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"" | TaskStatus>("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      setTitle("");
      setStatus("");
      setError("");
      setSubmitting(false);
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 4 || trimmedTitle.length > 200) {
      setError("Title must be between 4 and 200 characters.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await onCreate(trimmedTitle, status || undefined);
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
      aria-labelledby="create-task-heading"
      onCancel={(event) => {
        if (submitting) {
          event.preventDefault();
        }
      }}
      onClose={handleClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          handleClose();
        }
      }}
    >
      <form onSubmit={handleSubmit} className="form-stack">
        <h2 id="create-task-heading" className="heading">
          Add task
        </h2>

        <label htmlFor="task-title" className="field">
          Title
          <input
            id="task-title"
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            minLength={4}
            maxLength={200}
            placeholder="Task title"
            autoFocus
            disabled={submitting}
          />
        </label>

        <label htmlFor="task-status" className="field">
          Status (optional)
          <select
            id="task-status"
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value as "" | TaskStatus)}
            disabled={submitting}
          >
            <option value="">No status</option>
            {TASK_STATUSES.map((value) => (
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
          <button type="button" className="button" onClick={handleClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="button primary" disabled={submitting}>
            {submitting ? "Creating..." : "Add task"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
