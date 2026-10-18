import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Task } from "@/types/api";
import { TaskList } from "@/components/tasks/TaskList";

const tasks: Task[] = [
  {
    id: "4398f26b-f527-4eeb-b74c-cd4c0ecc9060",
    title: "A new task",
    status: "todo",
    createdAt: "2026-04-08T10:11:56.354Z",
    updatedAt: "2026-04-08T10:11:56.354Z",
  },
  {
    id: "d7e4a1c5-448b-48f4-854b-c6e7853e7f2f",
    title: "fix the frontend issues",
    status: "done",
    createdAt: "2026-10-17T11:56:41.000Z",
    updatedAt: "2026-10-17T11:56:41.000Z",
  },
];

describe("TaskList", () => {
  it("renders each task in its column", () => {
    render(
      <TaskList
        tasks={tasks}
        savingTaskIds={new Set()}
        updateErrors={{}}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Todo" })).toBeInTheDocument();
    expect(screen.getByText("A new task")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "In-progress" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Done" })).toBeInTheDocument();
    expect(screen.getByText("fix the frontend issues")).toBeInTheDocument();
  });

  it("shows empty columns when there are no tasks", () => {
    render(
      <TaskList tasks={[]} savingTaskIds={new Set()} updateErrors={{}} onUpdate={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByRole("heading", { name: "Todo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "In-progress" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Done" })).toBeInTheDocument();
  });
});
