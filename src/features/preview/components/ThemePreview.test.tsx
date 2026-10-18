import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { ThemePreview } from "@/features/preview/components/ThemePreview";
import { compileTheme } from "@/features/preview/lib/compile-theme";
import { analyzeTheme } from "@/features/theme/lib/theme-source";

vi.mock("@/features/preview/fixture/document", () => ({
  loadFixture: async () => "",
  fixtureDocument: () => "",
}));
vi.mock("@/features/preview/lib/compile-theme", async (original) => ({
  ...(await original<typeof import("@/features/preview/lib/compile-theme")>()),
  compileTheme: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("counts unique failed URLs and displays each importing source and line", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.mocked(compileTheme).mockResolvedValue({
    css: "",
    resources: [
      {
        url: "https://example.com/missing.css",
        status: "failed",
        message: "HTTP 404",
        importedFrom: { url: "https://example.com/base.css", line: 2 },
      },
      {
        url: "https://example.com/missing.css",
        status: "failed",
        message: "HTTP 404",
        importedFrom: { url: null, line: 13 },
      },
    ],
  });
  render(
    <ThemePreview
      analysis={analyzeTheme("")}
      stale={false}
      light={false}
      inspect={false}
      onInspectEnd={vi.fn()}
      fit
      external
      onSelect={vi.fn()}
      onEnableResources={vi.fn()}
    />,
  );
  expect(await screen.findByText("1 stylesheet could not load")).toBeVisible();
  fireEvent.click(screen.getByText("1 source unavailable for inspection"));
  const alert = within(screen.getByRole("alert"));
  expect(
    alert.getAllByText("https://example.com/missing.css: HTTP 404"),
  ).toHaveLength(1);
  expect(
    alert.getByText("https://example.com/base.css · line 2"),
  ).toBeVisible();
  expect(alert.getByText("Current theme · line 13")).toBeVisible();
});
