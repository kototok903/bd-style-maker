import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { VisualEditor } from "@/features/editor/components/VisualEditor";
import { analyzeTheme } from "@/features/theme/lib/theme-source";

afterEach(cleanup);

it("shows shared headings before inline notes with a comment prefix on each line", () => {
  const analysis = analyzeTheme(`:root {
    /* WARNING HSL AND TEXT COLOR SETTINGS */
    --warning-hue: 40;
    --warning-text-color: #ffffff; /* DOES NOTHING WITH MATERIAL YOU ENABLED */
  }`);
  render(
    <VisualEditor
      analysis={analysis}
      original={analysis}
      selectedRule="all-variables"
      onSelectRule={vi.fn()}
      onEdit={vi.fn()}
      onJump={vi.fn()}
      inspection={null}
      onInspectionHandled={vi.fn()}
    />,
  );
  expect(
    screen.getByText(
      "// WARNING HSL AND TEXT COLOR SETTINGS // DOES NOTHING WITH MATERIAL YOU ENABLED",
    ),
  ).toHaveTextContent(
    "// WARNING HSL AND TEXT COLOR SETTINGS // DOES NOTHING WITH MATERIAL YOU ENABLED",
  );
});

it("prefills an inspected selector and waits for confirmation before changing CSS", async () => {
  const analysis = analyzeTheme(":root { --accent: #a7b7ff; }");
  const onEdit = vi.fn(),
    onInspectionHandled = vi.fn();
  render(
    <VisualEditor
      analysis={analysis}
      original={analysis}
      selectedRule="all-variables"
      onSelectRule={vi.fn()}
      onEdit={onEdit}
      onJump={vi.fn()}
      inspection={{ selector: ".chatContent_f75fb0", create: true, nonce: 1 }}
      onInspectionHandled={onInspectionHandled}
    />,
  );
  expect(await screen.findByRole("dialog")).toBeVisible();
  expect(screen.getByLabelText("CSS selector")).toHaveValue(
    ".chatContent_f75fb0",
  );
  expect(onEdit).not.toHaveBeenCalled();
  expect(onInspectionHandled).toHaveBeenCalledOnce();
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Add selector",
    }),
  );
  expect(onEdit).toHaveBeenCalledWith(
    expect.stringContaining(".chatContent_f75fb0 {"),
  );
});

it("opens selector properties for an existing inspected rule without changing the source", async () => {
  const analysis = analyzeTheme(
    ":root { --accent: #a7b7ff; } .chat { color: #ff0000; }",
  );
  const onEdit = vi.fn();
  render(
    <VisualEditor
      analysis={analysis}
      original={analysis}
      selectedRule={analysis.rules[1].id}
      onSelectRule={vi.fn()}
      onEdit={onEdit}
      onJump={vi.fn()}
      inspection={{ selector: ".chat", create: false, nonce: 2 }}
      onInspectionHandled={vi.fn()}
    />,
  );
  expect(await screen.findByLabelText("color CSS value")).toHaveValue(
    "#ff0000",
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(onEdit).not.toHaveBeenCalled();
});
