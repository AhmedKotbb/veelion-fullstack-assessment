"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { requestJson } from "@/lib/apiClient";
import type { Task, TaskFilter, TaskResponse, TaskStatus, TasksResponse, TasksSummary } from "@/types/api";

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
  const [summary, setSummary] = useState<TasksSummary | null>(null);
  const [summaryError, setSummaryError] = useState("");
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

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryError("");
      const body = await requestJson<TasksSummary>("/api/reports/tasks-summary");
      setSummary(body);
    } catch (error) {
      setSummaryError(getErrorMessage(error, "Could not load the task summary."));
    }
  }, []);

  const fetchTasks = useCallback(async (background = false) => {
    try {
      if (!background) {
        setLoading(true);
      }
      setLoadError("");
      setUpdateErrors({});

      const body = await requestJson<TasksResponse>("/api/tasks");

      setTasks(body.data);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Could not load tasks right now."));
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const hasInitialData = initialTasks.length > 0 && initialLoadError === "";
    void fetchTasks(hasInitialData);
    void fetchSummary();
    // Reload the list and the summary when the tasks page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTasks, fetchSummary]);

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
      await Promise.all([fetchTasks(true), fetchSummary()]);
    },
    [fetchSummary, fetchTasks, setFilter]
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
          await requestJson<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
          });

          await Promise.all([fetchTasks(true), fetchSummary()]);
        },
        "Could not update the task."
      );
    },
    [fetchSummary, fetchTasks, runTaskChange]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      await runTaskChange(
        taskId,
        async () => {
          await requestJson<void>(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
          await Promise.all([fetchTasks(true), fetchSummary()]);
        },
        "Could not delete the task."
      );
    },
    [fetchSummary, fetchTasks, runTaskChange]
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
    summary,
    summaryError,
    setFilter,
    fetchTasks,
    fetchSummary,
    createTask,
    updateTask,
    deleteTask,
  };
}
