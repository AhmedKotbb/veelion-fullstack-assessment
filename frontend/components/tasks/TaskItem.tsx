"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarIcon, KebabIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { formatTimestamp } from "@/lib/format";
import type { Task } from "@/types/api";

type TaskItemProps = {
  task: Task;
  busy: boolean;
  error: string;
  onUpdate: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export function TaskItem({ task, busy, error, onUpdate, onDelete }: TaskItemProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (busy) {
      setOpen(false);
    }
  }, [busy]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <li className={open ? "task-card is-open" : "task-card"}>
      <div className="task-top">
        <p className="task-title">{task.title}</p>
        <div className="task-menu" ref={menuRef}>
          <button
            type="button"
            className="icon-button"
            aria-label={`Actions for ${task.title}`}
            aria-haspopup="menu"
            aria-expanded={open}
            disabled={busy}
            onClick={() => setOpen((current) => !current)}
          >
            <KebabIcon />
          </button>
          {open ? (
            <div className="menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  setOpen(false);
                  onUpdate(task);
                }}
              >
                <PencilIcon />
                Update
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-item danger"
                onClick={() => {
                  setOpen(false);
                  onDelete(task);
                }}
              >
                <TrashIcon />
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <p className="task-meta">
        <span className="meta-icon">
          <CalendarIcon />
        </span>
        Created: {formatTimestamp(task.createdAt)}
      </p>
      <p className="task-meta">
        <span className="meta-icon">
          <CalendarIcon />
        </span>
        Updated: {formatTimestamp(task.updatedAt)}
      </p>

      {busy ? <p className="task-saving">Saving...</p> : null}
      {error ? (
        <p role="alert" className="task-error">
          {error}
        </p>
      ) : null}
    </li>
  );
}
