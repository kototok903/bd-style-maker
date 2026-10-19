import { expect, it } from "vitest";

import { readInspectorSelection } from "@/features/preview/lib/inspector-types";

const target = {
  id: "1",
  name: "Member row",
  selector: ".member_c8ffbb",
  count: 7,
};
const selection = {
  path: [target],
  children: [],
  hit: null,
  variant: "base",
  variants: [{ ...target, id: "base", name: "All of this type", kind: "base" }],
};

it("accepts bounded inspector selections but rejects malformed selections before rendering", () => {
  expect(readInspectorSelection(selection)).toEqual(selection);
  for (const invalid of [
    null,
    {},
    { ...selection, path: [] },
    { ...selection, variant: "unknown" },
    { ...selection, children: [{ ...target, selector: null }] },
    { ...selection, hit: { ...target, count: -1 } },
    { ...selection, variants: [{ ...selection.variants[0], kind: "unknown" }] },
    { ...selection, children: Array(101).fill(target) },
  ])
    expect(readInspectorSelection(invalid)).toBeNull();
});
