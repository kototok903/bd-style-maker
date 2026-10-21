import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { ValueEditor } from "@/features/editor/components/ValueEditor";

afterEach(cleanup);
it("opens the requested picker without changing CSS and commits user alpha changes", async () => {
  const onCommit = vi.fn();
  render(<ValueEditor value="#ff0000" label="--accent" onCommit={onCommit} />);
  fireEvent.click(
    screen.getByRole("button", { name: "--accent color picker" }),
  );
  const opacity = await screen.findByRole("spinbutton", {
    name: "Color opacity percentage",
  });
  expect(opacity).toHaveValue(100);
  expect(onCommit).not.toHaveBeenCalled();
  fireEvent.change(opacity, { target: { value: "50" } });
  expect(onCommit).toHaveBeenLastCalledWith("#ff000080");
});
it("does not turn zero saturation, zero lightness or zero alpha into defaults", async () => {
  const onCommit = vi.fn();
  render(
    <ValueEditor value="#00000000" label="--transparent" onCommit={onCommit} />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "--transparent color picker" }),
  );
  expect(
    await screen.findByRole("spinbutton", { name: "Color opacity percentage" }),
  ).toHaveValue(0);
  expect(screen.getByRole("textbox", { name: "Formatted color" })).toHaveValue(
    "#00000000",
  );
  expect(onCommit).not.toHaveBeenCalled();
});

it.each(["", "0", "var(--accent)"])(
  "offers a picker for color properties with value %s without replacing the value on open",
  async (value) => {
    const onCommit = vi.fn();
    render(
      <ValueEditor
        value={value}
        label="background-color"
        colorProperty
        onCommit={onCommit}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "background-color color picker" }),
    );
    const opacity = await screen.findByRole("spinbutton", {
      name: "Color opacity percentage",
    });
    expect(onCommit).not.toHaveBeenCalled();
    expect(
      screen.getByRole("textbox", { name: "background-color CSS value" }),
    ).toHaveValue(value);
    fireEvent.change(opacity, { target: { value: "50" } });
    expect(onCommit).toHaveBeenLastCalledWith("#a7b7ff80");
  },
);
