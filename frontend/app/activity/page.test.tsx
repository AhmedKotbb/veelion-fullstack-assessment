import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActivityPage from "@/app/activity/page";
import { requestJson } from "@/lib/apiClient";

vi.mock("@/lib/apiClient", () => ({
  requestJson: vi.fn(),
}));

const mockedRequest = vi.mocked(requestJson);

describe("ActivityPage", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it("shows the error and a retry action when the list request fails", async () => {
    mockedRequest.mockRejectedValue(new Error("Could not reach the server. Please try again."));

    render(<ActivityPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server. Please try again.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText(/Total:/)).not.toBeInTheDocument();
  });
});
