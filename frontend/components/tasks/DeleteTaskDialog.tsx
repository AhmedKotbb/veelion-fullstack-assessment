"use client";

import { useEffect, useRef, useState } from "react";
import type { Task } from "@/types/api";

type DeleteTaskDialogProps = {
  task: Task | null;
  onClose: () => void;
  onConfirm: (taskId: string) => Promise<void>;
};

function messageFrom(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not delete the task.";
}

export function DeleteTaskDialog({ task, onClose, onConfirm }: DeleteTaskDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const open = task !== null;

  useEffect(() => {
    if (task) {
      setError("");
      setSubmitting(false);
    }
  }, [task]);

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

  const handleConfirm = async () => {
    if (!task) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await onConfirm(task.id);
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
      aria-labelledby="delete-task-heading"
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
        <div className="form-stack">
          <h2 id="delete-task-heading" className="heading">
            Delete task
          </h2>
          <p className="message">
            Delete <strong>{task.title}</strong>? This cannot be undone.
          </p>
          {error ? (
            <p role="alert" className="alert">
              {error}
            </p>
          ) : null}
          <div className="actions actions-end">
            <button type="button" className="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="button" className="button danger" onClick={() => void handleConfirm()} disabled={submitting}>
              {submitting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
