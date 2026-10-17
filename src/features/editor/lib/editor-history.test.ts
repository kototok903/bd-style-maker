import { describe, expect, it } from "vitest";

import {
  createProject,
  initialSession,
  sessionReducer,
} from "@/features/editor/lib/editor-history";

describe("shared document history", () => {
  it("coalesces a scrub and interleaves source and guided edits", () => {
    let state = sessionReducer(initialSession, {
      type: "open",
      project: createProject("original", "test.css"),
    });
    state = sessionReducer(state, {
      type: "edit",
      text: "color1",
      group: "color",
      now: 100,
    });
    state = sessionReducer(state, {
      type: "edit",
      text: "color2",
      group: "color",
      now: 200,
    });
    expect(state.past).toEqual(["original"]);
    state = sessionReducer(state, {
      type: "edit",
      text: "source",
      group: "typing",
      now: 300,
    });
    state = sessionReducer(state, { type: "undo" });
    expect(state.project?.text).toBe("color2");
    state = sessionReducer(state, { type: "undo" });
    expect(state.project?.text).toBe("original");
    state = sessionReducer(state, { type: "redo" });
    expect(state.project?.text).toBe("color2");
    state = sessionReducer(state, { type: "edit", text: "another", now: 400 });
    expect(state.future).toEqual([]);
  });
  it("keeps the original and exported text separate", () => {
    let state = sessionReducer(initialSession, {
      type: "open",
      project: createProject("original", "test.css"),
    });
    state = sessionReducer(state, { type: "edit", text: "changed", now: 100 });
    state = sessionReducer(state, { type: "exported", text: "changed" });
    expect(state.project?.original).toBe("original");
    expect(state.project?.exportedText).toBe("changed");
    state = sessionReducer(state, { type: "undo" });
    expect(state.project?.text).toBe("original");
    expect(state.project?.exportedText).toBe("changed");
  });
});
