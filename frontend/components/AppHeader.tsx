"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { openCreateTask } from "@/lib/taskEvents";

export function AppHeader() {
  const pathname = usePathname();
  const onTasks = pathname === "/tasks";
  const onActivity = pathname === "/activity";

  return (
    <header className="app-header">
      <Link href="/tasks" className="brand">
        Task Tracker
      </Link>

      <div className="header-actions">
        {onActivity ? (
          <Link href="/tasks" className="button nav-button">
            Tasks
          </Link>
        ) : (
          <Link href="/activity" className="button nav-button">
            Activity
          </Link>
        )}
        {onTasks ? (
          <button type="button" className="button primary" onClick={openCreateTask}>
            <PlusIcon size={16} />
            Add Task
          </button>
        ) : null}
      </div>
    </header>
  );
}
