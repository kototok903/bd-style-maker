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

function editor(
  source: string,
  inspection: {
    selector: string;
    create: boolean;
    nonce: number;
  } | null = null,
  originalSource = source,
) {
  const analysis = analyzeTheme(source),
    onEdit = vi.fn(),
    onJump = vi.fn(),
    onInspect = vi.fn();
  render(
    <VisualEditor
      analysis={analysis}
      original={analyzeTheme(originalSource)}
      selectedRule="all-variables"
      onSelectRule={vi.fn()}
      onEdit={onEdit}
      onJump={onJump}
      onInspect={onInspect}
      inspection={inspection}
      onInspectionHandled={vi.fn()}
    />,
  );
  return { onEdit, onJump, onInspect };
}
afterEach(cleanup);
it("groups by author headings, shows shared notes before inline notes, and keeps strings as text", () => {
  editor(`:root {
 /* WARNING HSL AND TEXT COLOR SETTINGS */
 /* Shared guidance */
 --warning-hue:40;
 --warning-text-color:#ffffff; /* DOES NOTHING WITH MATERIAL YOU ENABLED */
 }
 body {--animations:on; /* off: no animations, on: animations */}`);
  expect(
    screen.getByRole("button", { name: /WARNING HSL AND TEXT COLOR SETTINGS/ }),
  ).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText("// Shared guidance")).toBeVisible();
  expect(
    screen.getByText("// DOES NOTHING WITH MATERIAL YOU ENABLED"),
  ).toBeVisible();
  expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Other settings/ }));
  expect(screen.getByLabelText("--animations CSS value")).toHaveValue("on");
  expect(
    screen.queryByRole("button", { name: "Add variable" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Add selector" }),
  ).not.toBeInTheDocument();
});
it("keeps scopes visible for duplicate variables without merging their edits", () => {
  const source = ".theme-dark {--bg:#000000} .theme-light {--bg:#ffffff}";
  const { onEdit } = editor(source);
  expect(screen.getByText(".theme-dark")).toBeVisible();
  expect(screen.getByText(".theme-light")).toBeVisible();
  const inputs = screen.getAllByLabelText("--bg CSS value");
  fireEvent.change(inputs[1], { target: { value: "#eeeeee" } });
  fireEvent.blur(inputs[1]);
  expect(onEdit).toHaveBeenCalledWith(
    source.replace("#ffffff", "#eeeeee"),
    expect.any(String),
  );
});
it("opens inspected element styles without creating an empty rule, then adds only on confirmation", async () => {
  const { onEdit } = editor(":root {--accent:#a7b7ff}", {
    selector: ".chatContent_f75fb0",
    create: true,
    nonce: 1,
  });
  expect(
    await screen.findByRole("combobox", { name: "Element" }),
  ).toHaveTextContent("Chat content");
  expect(onEdit).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Add a style for this element" }),
  );
  expect(
    screen.getByRole("button", { name: "color new color picker" }),
  ).toBeVisible();
  const input = screen.getByLabelText("color new CSS value");
  fireEvent.change(input, { target: { value: "#ff0000" } });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Add style",
    }),
  );
  expect(onEdit).toHaveBeenCalledWith(
    expect.stringMatching(/\.chatContent_f75fb0\s*\{\s*color: #ff0000;/),
  );
});
it("shows separate existing hover and conditional rules and preserves a shared selector", () => {
  const source =
    ".message {color:#ff0000} .message:hover {color:#00ff00} @media (width>900px){.message{color:#0000ff}} .message,.reply{opacity:.5}";
  const { onEdit } = editor(source, {
    selector: ".message",
    create: false,
    nonce: 2,
  });
  // Picking the base component includes its hover, conditional and shared rules.
  expect(screen.getAllByLabelText("color CSS value")).toHaveLength(3);
  const input = screen.getAllByLabelText("color CSS value")[2];
  fireEvent.change(input, { target: { value: "#ffffff" } });
  fireEvent.blur(input);
  expect(onEdit).toHaveBeenCalledWith(
    source.replace("#0000ff", "#ffffff"),
    expect.any(String),
  );
});
it("puts display and location filtering in a popover, and View in CSS navigates to the declaration", async () => {
  const source = "body{--font:mono}:root{--color:#ffffff}",
    { onJump } = editor(source);
  fireEvent.click(
    screen.getByRole("button", { name: "Editor display options" }),
  );
  expect(
    await screen.findByRole("checkbox", {
      name: "Show CSS names and locations",
    }),
  ).not.toBeChecked();
  fireEvent.click(
    screen.getByRole("combobox", { name: "Filter by CSS location" }),
  );
  const option = screen.getByRole("option", { name: ":root" });
  fireEvent.pointerDown(option);
  fireEvent.click(option);
  expect(screen.queryByLabelText("--font CSS value")).not.toBeInTheDocument();
  expect(screen.getByLabelText("--color CSS value")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "View in CSS: --color" }));
  expect(onJump).toHaveBeenCalledWith(source.indexOf("--color"));
});
it("offers existing selectors and unused preview targets without a custom-selector creation option", () => {
  editor(":root{--x:1} .custom:hover{color:red}");
  fireEvent.click(screen.getByRole("button", { name: "Element styles" }));
  fireEvent.click(screen.getByRole("combobox", { name: "Element" }));
  expect(
    screen.getByRole("option", { name: ".custom:hover" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("option", { name: "Member row" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: "Custom selector" }),
  ).not.toBeInTheDocument();
});

it("offers deletion only for element styles and retains original rules", () => {
  const source = ":root{--accent:red} .message{opacity:.7}";
  const { onEdit } = editor(source);
  expect(
    screen.queryByRole("button", { name: "Delete --accent" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Element styles" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete opacity" }));
  expect(onEdit).toHaveBeenCalledWith(":root{--accent:red} .message{}");
});
it("deletes an empty new rule together with its last style in one edit", () => {
  const original = ":root{--accent:red}";
  const { onEdit } = editor(
    original + "\n.message{opacity:.7}",
    { selector: ".message", create: false, nonce: 1 },
    original,
  );
  fireEvent.click(screen.getByRole("button", { name: "Delete opacity" }));
  expect(onEdit).toHaveBeenCalledExactlyOnceWith(original + "\n");
});

it("offers a color picker for an invalid existing color property", async () => {
  const { onEdit } = editor(".message{background-color:0}", {
    selector: ".message",
    create: false,
    nonce: 1,
  });
  fireEvent.click(
    screen.getByRole("button", { name: "background-color color picker" }),
  );
  expect(
    await screen.findByRole("spinbutton", { name: "Color opacity percentage" }),
  ).toBeVisible();
  expect(onEdit).not.toHaveBeenCalled();
});

it("groups additional properties and saves a background image only on confirmation", () => {
  const source = ":root{--accent:red}";
  const { onEdit } = editor(source, {
    selector: ".message",
    create: true,
    nonce: 1,
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Add a style for this element" }),
  );
  fireEvent.click(screen.getByRole("combobox", { name: "Property" }));
  expect(
    screen.getByRole("group", { name: "Backgrounds" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("option", { name: "Background blur" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("option", { name: "Overall opacity" }),
  ).toBeInTheDocument();
  const option = screen.getByRole("option", {
    name: "Background image or gradient",
  });
  fireEvent.pointerDown(option);
  fireEvent.click(option);
  const input = screen.getByLabelText("background-image new CSS value");
  expect(input).toHaveAttribute(
    "placeholder",
    'e.g. url("https://example.com/background.jpg")',
  );
  expect(
    screen.queryByRole("button", { name: "background-image new color picker" }),
  ).not.toBeInTheDocument();
  const value = 'url("https://example.com/wallpaper.jpg")';
  fireEvent.change(input, { target: { value } });
  expect(onEdit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Add style" }));
  const saved = onEdit.mock.calls[0][0] as string;
  expect(saved.startsWith(source)).toBe(true);
  expect(analyzeTheme(saved).rules.at(-1)?.declarations[0]).toMatchObject({
    property: "background-image",
    value,
  });
});
