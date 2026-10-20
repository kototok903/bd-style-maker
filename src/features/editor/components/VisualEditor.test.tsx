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

it("offers grouped inspector targets and keeps custom selectors editable", async () => {
  const analysis = analyzeTheme(":root { --accent: #a7b7ff; }");
  const onEdit = vi.fn();
  render(
    <VisualEditor
      analysis={analysis}
      original={analysis}
      selectedRule="all-variables"
      onSelectRule={vi.fn()}
      onEdit={onEdit}
      onJump={vi.fn()}
      inspection={{ selector: ".member_c8ffbb", create: true, nonce: 3 }}
      onInspectionHandled={vi.fn()}
    />,
  );
  const preset = await screen.findByRole("combobox", {
    name: "Common selector",
  });
  expect(preset).toHaveTextContent("Member row");
  fireEvent.click(preset);
  const folders = screen.getByRole("group", { name: "Server folders" });
  const folder = within(folders).getByRole("option", { name: "Folder button" });
  expect(
    screen.getByRole("option", { name: "Top title bar" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("option", { name: "Member group heading" }),
  ).toBeInTheDocument();
  fireEvent.pointerDown(folder);
  fireEvent.click(folder);
  expect(screen.getByLabelText("CSS selector")).toHaveValue(
    ".folderButton__48112",
  );
  expect(onEdit).not.toHaveBeenCalled();

  fireEvent.click(preset);
  const custom = screen.getByRole("option", { name: "Custom selector" });
  fireEvent.pointerDown(custom);
  fireEvent.click(custom);
  fireEvent.change(screen.getByLabelText("CSS selector"), {
    target: { value: ".my-custom-selector:hover" },
  });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Add selector",
    }),
  );
  expect(onEdit).toHaveBeenCalledWith(
    expect.stringContaining(".my-custom-selector:hover {"),
  );
});
