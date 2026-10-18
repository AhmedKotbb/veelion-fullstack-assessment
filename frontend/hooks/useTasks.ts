"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { requestJson } from "@/lib/apiClient";
import type { Task, TaskFilter, TaskResponse, TaskStatus, TasksResponse } from "@/types/api";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function readTaskFilter(value: string | null): TaskFilter {
  if (value === "todo" || value === "in-progress" || value === "done") {
    return value;
  }

  return "all";
}

export function useTasks(initialTasks: Task[], initialLoadError: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(initialLoadError);
  const [updateErrors, setUpdateErrors] = useState<Record<string, string>>({});
  const savingTaskIdsRef = useRef<Set<string>>(new Set());
  const [savingTaskIds, setSavingTaskIds] = useState<Set<string>>(() => new Set());
  const filter = readTaskFilter(searchParams.get("status"));

  const setFilter = useCallback(
    (value: TaskFilter) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value === "all") {
        params.delete("status");
      } else {
        params.set("status", value);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      setUpdateErrors({});

      const body = await requestJson<TasksResponse>("/api/tasks");

      setTasks(body.data);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Could not load tasks right now."));
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(
    async (title: string, status?: TaskStatus) => {
      const payload: { title: string; status?: TaskStatus } = { title };
      if (status) {
        payload.status = status;
      }

      await requestJson<TaskResponse>("/api/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setFilter("all");
      await fetchTasks();
    },
    [fetchTasks, setFilter]
  );

  const runTaskChange = useCallback(async (taskId: string, work: () => Promise<void>, fallback: string) => {
    if (savingTaskIdsRef.current.has(taskId)) {
      throw new Error("This task is already saving.");
    }

    const started = new Set(savingTaskIdsRef.current);
    started.add(taskId);
    savingTaskIdsRef.current = started;
    setSavingTaskIds(started);
    setUpdateErrors((current) => {
      if (!(taskId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[taskId];
      return next;
    });

    try {
      await work();
    } catch (error) {
      const message = getErrorMessage(error, fallback);
      setUpdateErrors((current) => ({
        ...current,
        [taskId]: message,
      }));
      throw error instanceof Error ? error : new Error(message);
    } finally {
      const finished = new Set(savingTaskIdsRef.current);
      finished.delete(taskId);
      savingTaskIdsRef.current = finished;
      setSavingTaskIds(finished);
    }
  }, []);

  const updateTask = useCallback(
    async (taskId: string, patch: { title?: string; status?: TaskStatus }) => {
      await runTaskChange(
        taskId,
        async () => {
          const body = await requestJson<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
          });

          setTasks((previous) => previous.map((task) => (task.id === taskId ? body.data : task)));
        },
        "Could not update the task."
      );
    },
    [runTaskChange]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      await runTaskChange(
        taskId,
        async () => {
          await requestJson<void>(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
          setTasks((previous) => previous.filter((task) => task.id !== taskId));
        },
        "Could not delete the task."
      );
    },
    [runTaskChange]
  );

  const filteredTasks = useMemo(() => {
    if (filter === "all") {
      return tasks;
    }

    return tasks.filter((task) => task.status === filter);
  }, [tasks, filter]);

  return {
    tasks,
    filteredTasks,
    filter,
    loading,
    loadError,
    updateErrors,
    savingTaskIds,
    setFilter,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  };
}
