"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { requestJson } from "@/lib/apiClient";
import type { Task, TaskFilter, TaskResponse, TaskStatus, TasksResponse } from "@/types/api";

export type TaskUpdateError = {
  taskId: string;
  message: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");
  const [updateError, setUpdateError] = useState<TaskUpdateError | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string>("");

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      setUpdateError(null);

      const body = await requestJson<TasksResponse>("/api/tasks");

      setTasks(body.data);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Could not load tasks right now."));
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (title: string, status?: TaskStatus) => {
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
  }, [fetchTasks]);

  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    try {
      setUpdatingTaskId(taskId);
      setUpdateError(null);

      const body = await requestJson<TaskResponse>(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setTasks((previous) =>
        previous.map((task) => (task.id === taskId ? body.data : task))
      );
    } catch (error) {
      setUpdateError({
        taskId,
        message: getErrorMessage(error, "Could not update task status."),
      });
    } finally {
      setUpdatingTaskId("");
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = useMemo(() => {
    if (filter === "all") {
      return tasks;
    }

    return tasks.filter((task) => task.status === filter);
  }, [tasks, filter]);

  return {
    filteredTasks,
    filter,
    loading,
    loadError,
    updateError,
    updatingTaskId,
    setFilter,
    fetchTasks,
    createTask,
    updateTaskStatus,
  };
}
