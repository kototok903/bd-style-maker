import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { InspectorPanel } from "@/features/preview/components/InspectorPanel";
import type { InspectorSelection } from "@/features/preview/lib/inspector-types";

afterEach(cleanup);
const selection: InspectorSelection = {
  path: [
    {
      id: "1",
      name: "Member sidebar",
      selector: ".membersWrap_c8ffbb",
      count: 1,
    },
    { id: "2", name: "Member row", selector: ".member_c8ffbb", count: 7 },
  ],
  children: [
    {
      id: "3",
      name: "Member avatar",
      selector: ".member_c8ffbb .avatar__91a9d",
      count: 7,
    },
  ],
  hit: {
    id: "4",
    name: "span.name",
    selector: ".member_c8ffbb .name",
    count: 7,
  },
  variants: [
    {
      id: "base",
      name: "All of this type",
      selector: ".member_c8ffbb",
      count: 7,
      kind: "base",
    },
    {
      id: "offline",
      name: "Offline",
      selector: ".member_c8ffbb.offline__5d473",
      count: 2,
      kind: "state",
    },
  ],
  variant: "base",
};

it("navigates the hierarchy and parts without selecting CSS for editing", async () => {
  const onNavigate = vi.fn(),
    onUse = vi.fn(),
    onCancel = vi.fn();
  render(
    <InspectorPanel
      selection={selection}
      onNavigate={onNavigate}
      onVariant={vi.fn()}
      onUse={onUse}
      onCancel={onCancel}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Member sidebar" }));
  expect(onNavigate).toHaveBeenLastCalledWith("1");
  fireEvent.click(
    screen.getByRole("combobox", { name: "Inspect inner element" }),
  );
  const avatar = await screen.findByRole("option", {
    name: "Member avatar · 1",
  });
  fireEvent.pointerDown(avatar);
  fireEvent.click(avatar);
  expect(onNavigate).toHaveBeenLastCalledWith("3");
  fireEvent.click(
    screen.getByRole("button", { name: "Exact clicked element" }),
  );
  expect(onNavigate).toHaveBeenLastCalledWith("4");
  expect(onUse).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel inspection" }));
  expect(onCancel).toHaveBeenCalledOnce();
});

it("shows match counts and uses only the confirmed state selector", async () => {
  const onUse = vi.fn(),
    onVariant = vi.fn();
  const props = { onNavigate: vi.fn(), onVariant, onUse, onCancel: vi.fn() };
  const { rerender } = render(
    <InspectorPanel selection={selection} {...props} />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("7 matching elements");
  fireEvent.click(
    screen.getByRole("combobox", { name: "Inspector selector scope" }),
  );
  const offline = await screen.findByRole("option", { name: "Offline" });
  fireEvent.pointerDown(offline);
  fireEvent.click(offline);
  expect(onVariant).toHaveBeenCalledWith("offline");
  expect(onUse).not.toHaveBeenCalled();
  rerender(
    <InspectorPanel
      selection={{ ...selection, variant: "offline" }}
      {...props}
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("2 matching elements");
  fireEvent.click(screen.getByRole("button", { name: "Use selector" }));
  expect(onUse).toHaveBeenCalledWith(".member_c8ffbb.offline__5d473");
});
