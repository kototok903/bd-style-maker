import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useReducer } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { AppShell } from "@/app/AppShell";
import { useThemeSession } from "@/features/editor/hooks/useThemeSession";
import type { EditorSession } from "@/features/editor/lib/editor-history";
import {
  createProject,
  initialSession,
  sessionReducer,
} from "@/features/editor/lib/editor-history";
import { downloadTheme } from "@/features/theme-export/lib/theme-file";

vi.mock("@/features/editor/hooks/useThemeSession", () => ({
  useThemeSession: vi.fn(),
}));
vi.mock("@/features/preview/components/ThemePreview", () => ({
  ThemePreview: () => null,
}));
vi.mock("@/features/editor/components/SourceEditor", () => ({
  SourceEditor: () => <div className="cm-scroller">CSS source</div>,
}));

vi.mock("@/features/theme-export/lib/theme-file", async (original) => ({
  ...(await original<
    typeof import("@/features/theme-export/lib/theme-file")
  >()),
  downloadTheme: vi.fn(),
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

it("restores both editor scroll positions after hidden panels reset their offsets", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const text = `:root { ${Array.from({ length: 20 }, (_, i) => `--space-${i}: ${i}px;`).join("\n")} }`;
  vi.mocked(useThemeSession).mockReturnValue({
    state: {
      ...initialSession,
      project: createProject(text, "Scroll.theme.css"),
    },
    dispatch: vi.fn(),
    hydrated: true,
    dirty: false,
    storageError: "",
  });
  const { container } = render(<AppShell />);
  const visual = container.querySelector<HTMLElement>(
    '[data-slot="scroll-area-viewport"]',
  )!;
  visual.scrollTop = 420;
  visual.scrollLeft = 12;
  fireEvent.click(screen.getByRole("tab", { name: "CSS editor" }));
  visual.scrollTop = 0;
  visual.scrollLeft = 0;
  await screen.findByText("CSS source");
  const css = container.querySelector<HTMLElement>(".cm-scroller")!;
  css.scrollTop = 680;
  css.scrollLeft = 48;
  fireEvent.click(screen.getByRole("tab", { name: "Visual editor" }));
  expect(visual.scrollTop).toBe(420);
  expect(visual.scrollLeft).toBe(12);
  css.scrollTop = 0;
  css.scrollLeft = 0;
  fireEvent.click(screen.getByRole("tab", { name: "CSS editor" }));
  expect(css.scrollTop).toBe(680);
  expect(css.scrollLeft).toBe(48);
});

function renderNavigationSession(overrides: Partial<EditorSession> = {}) {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.mocked(downloadTheme).mockClear();
  const initial: EditorSession = {
    ...initialSession,
    project: createProject(":root { --gap: 12px; }", "Navigation.theme.css"),
    ...overrides,
  };
  vi.mocked(useThemeSession).mockImplementation(
    function useNavigationSession() {
      const [state, dispatch] = useReducer(sessionReducer, initial);
      return {
        state,
        dispatch,
        hydrated: true,
        storageError: "",
        dirty:
          !!state.project && state.project.text !== state.project.exportedText,
      };
    },
  );
  render(<AppShell />);
  return initial.project!;
}

it("returns to the welcome screen immediately when there is no edit history", () => {
  renderNavigationSession();
  fireEvent.click(screen.getByRole("button", { name: "Back to themes" }));
  expect(
    screen.getByText("Create and edit BetterDiscord themes."),
  ).toBeVisible();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByText("Local workspace")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("tab", { name: "Visual editor" }),
  ).not.toBeInTheDocument();
});

it.each(["past", "future"] as const)(
  "guards closing a theme with %s history even when the current text is saved",
  async (history) => {
    renderNavigationSession({ [history]: [":root { --gap: 10px; }"] });
    fireEvent.click(screen.getByRole("button", { name: "Back to themes" }));
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByText(/Closing this theme clears/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("tab", { name: "Visual editor" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back to themes" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Discard & close" }),
    );
    expect(
      screen.getByText("Create and edit BetterDiscord themes."),
    ).toBeVisible();
    expect(downloadTheme).not.toHaveBeenCalled();
  },
);

it("protects a recovered unsaved draft even without undo/redo history", async () => {
  const project = createProject(
    ":root { --gap: 12px; }",
    "Recovered.theme.css",
  );
  project.exportedText = ":root { --gap: 10px; }";
  renderNavigationSession({ project });
  fireEvent.click(screen.getByRole("button", { name: "Back to themes" }));
  expect(
    await screen.findByRole("button", { name: "Discard & close" }),
  ).toBeVisible();
});

it("downloads the current source before closing and clears history for the next theme", async () => {
  const project = renderNavigationSession({ past: ["previous source"] });
  fireEvent.click(screen.getByRole("button", { name: "Back to themes" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Download & close" }),
  );
  expect(downloadTheme).toHaveBeenCalledWith(project.text, project.fileName);
  expect(
    screen.getByText("Create and edit BetterDiscord themes."),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Start from scratch" }));
  fireEvent.click(screen.getByRole("button", { name: "Back to themes" }));
  expect(
    screen.getByText("Create and edit BetterDiscord themes."),
  ).toBeVisible();
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});

it("still guards replacing a theme with unsaved changes", async () => {
  const project = createProject(":root { --gap: 12px; }", "Changed.theme.css");
  project.exportedText = ":root { --gap: 10px; }";
  renderNavigationSession({ project });
  fireEvent.click(screen.getByRole("button", { name: "New theme" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Discard & open" }),
  );
  expect(
    within(screen.getByRole("banner")).getByText("Untitled.theme.css"),
  ).toBeVisible();
  expect(screen.getByRole("tab", { name: "Visual editor" })).toBeVisible();
});
