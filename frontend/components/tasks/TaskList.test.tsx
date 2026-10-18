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
  it("renders each task title and status", () => {
    render(
      <TaskList tasks={tasks} savingTaskIds={new Set()} updateErrors={{}} onStatusChange={vi.fn()} />
    );

    expect(screen.getByText("A new task")).toBeInTheDocument();
    expect(screen.getByText("To do")).toBeInTheDocument();
    expect(screen.getByText("fix the frontend issues")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("shows an empty message when the filter matches nothing", () => {
    render(<TaskList tasks={[]} savingTaskIds={new Set()} updateErrors={{}} onStatusChange={vi.fn()} />);

    expect(screen.getByText("No tasks match this filter.")).toBeInTheDocument();
  });
});
