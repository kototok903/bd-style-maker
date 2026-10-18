import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { AppShell } from "@/app/AppShell";
import { useThemeSession } from "@/features/editor/hooks/useThemeSession";
import {
  createProject,
  initialSession,
} from "@/features/editor/lib/editor-history";

vi.mock("@/features/editor/hooks/useThemeSession", () => ({
  useThemeSession: vi.fn(),
}));
vi.mock("@/features/preview/components/ThemePreview", () => ({
  ThemePreview: () => null,
}));
vi.mock("@/features/editor/components/SourceEditor", () => ({
  SourceEditor: () => <div>CSS source</div>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("retains the visual editor's variable search while switching to CSS and back", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const text = `:root { --font: "Geist"; ${Array.from({ length: 11 }, (_, i) => `--space-${i}: ${i}px;`).join(" ")} }`;
  vi.mocked(useThemeSession).mockReturnValue({
    state: {
      ...initialSession,
      project: createProject(text, "Search.theme.css"),
    },
    dispatch: vi.fn(),
    hydrated: true,
    dirty: false,
    storageError: "",
  });
  render(<AppShell />);
  const search = screen.getByRole("textbox", { name: "Search settings" });
  fireEvent.change(search, { target: { value: "font" } });
  expect(
    screen.queryByLabelText("--space-1 CSS value"),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "CSS editor" }));
  expect(await screen.findByText("CSS source")).toBeVisible();
  expect(search).not.toBeVisible();
  fireEvent.click(screen.getByRole("tab", { name: "Visual editor" }));
  expect(screen.getByRole("textbox", { name: "Search settings" })).toHaveValue(
    "font",
  );
  expect(screen.getByLabelText("--font CSS value")).toBeVisible();
  expect(
    screen.queryByLabelText("--space-1 CSS value"),
  ).not.toBeInTheDocument();
});
