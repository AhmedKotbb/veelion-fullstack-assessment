import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StatusFilter } from "@/components/tasks/StatusFilter";

describe("StatusFilter", () => {
  it("marks the active filter and reports the next choice", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<StatusFilter value="all" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "In progress" }));

    expect(onChange).toHaveBeenCalledWith("in-progress");
  });
});
