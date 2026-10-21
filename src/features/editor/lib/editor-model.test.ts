import { describe, expect, it } from "vitest";

import {
  declarationKey,
  originalDeclaration,
  removeStyleDeclaration,
  rulesForElement,
  settingGroups,
  settingsDeclarations,
  styleRules,
} from "@/features/editor/lib/editor-model";
import {
  analyzeTheme,
  editDeclaration,
} from "@/features/theme/lib/theme-source";

describe("theme settings organization", () => {
  it("uses standalone headings, keeps prose notes separate, and falls back to plain settings", () => {
    const analysis = analyzeTheme(`body {
      /* sizes */
      --gap: 12px; /* panel spacing */
      --border: 2px;

      /* A longer explanation. This is not a section heading. */
      --misc: on;
    }`);
    const groups = settingGroups(analysis);
    expect(groups.map((g) => g.title)).toEqual(["sizes", ""]);
    expect(groups[0].declarations[0].note).toBe("panel spacing");
    expect(groups[0].declarations[0].comment).toBe("sizes\npanel spacing");
    expect(groups[1].declarations[0].note).toContain("A longer explanation.");
    expect(
      settingGroups(analyzeTheme(":root {--a:1;--b:2}")).map((g) => g.title),
    ).toEqual([""]);
  });
  it("keeps duplicate variables and repeated headings distinct, and preserves stable identities during edits", () => {
    const source = `.dark { /* Colors */ --bg: red; } .light { /* Colors */ --bg: white; } @media (width > 900px) {.dark {--bg:blue}}`;
    const analysis = analyzeTheme(source),
      groups = settingGroups(analysis);
    expect(groups).toHaveLength(3);
    expect(new Set(groups.map((g) => g.key)).size).toBe(3);
    const decl = analysis.variables[1],
      key = declarationKey(decl, analysis);
    const updated = analyzeTheme(
      editDeclaration(source, analysis, decl, "oklch(90% 0 0 / .5)"),
    );
    expect(updated.variables.map((d) => d.value)).toEqual([
      "red",
      "oklch(90% 0 0 / .5)",
      "blue",
    ]);
    expect(declarationKey(updated.variables[1], updated)).toBe(key);
    expect(
      originalDeclaration(updated.variables[1], updated, analysis)?.value,
    ).toBe("white");
    expect(settingGroups(updated).map((g) => g.key)).toEqual(
      groups.map((g) => g.key),
    );
  });
  it("keeps settings in source order across nested declarations", () => {
    const a = analyzeTheme(".a { --first: 1; .b { --second: 2 } --third: 3 }");
    expect(settingsDeclarations(a).map((d) => d.property)).toEqual([
      "--first",
      "--second",
      "--third",
    ]);
  });
  it("includes ordinary global typography settings without treating every element property as a theme knob", () => {
    const a = analyzeTheme(
      "body {font-weight:300;letter-spacing:-.05ch;--x:on} .message {font-weight:500;color:red;--y:off}",
    );
    expect(settingsDeclarations(a).map((d) => d.property)).toEqual([
      "font-weight",
      "letter-spacing",
      "--x",
      "--y",
    ]);
  });
});
describe("element rule organization", () => {
  it("recognizes the subject instead of grouping descendants, negations or :has arguments as targets", () => {
    const records = styleRules(
      analyzeTheme(
        `.message {color:red} .parent > .message:hover {color:blue} .message .content {color:white} :not(.message) {color:black} .message:has(.attachment) {opacity:.5} .selected.message {color:green}`,
      ),
    );
    const messages = rulesForElement(records, ".message");
    expect(messages.map((r) => r.rule.selector)).toEqual([
      ".message",
      ".parent > .message:hover",
      ".message:has(.attachment)",
      ".selected.message",
    ]);
    expect(messages[1].label).toBe("Direct child of .parent · :hover");
    expect(rulesForElement(records, ".attachment")).toHaveLength(0);
    expect(records[2].elements).toEqual([".content"]);
  });
  it("preserves nested selectors, at-rule conditions, source order and shared rule identity", () => {
    const source = `.message { color:red; &:hover {color:blue} @supports (display:grid) { &.selected {padding:2px} } } @media (width > 900px) { .message {color:white} } .message, .reply {opacity:.5} .message {color:black}`;
    const a = analyzeTheme(source),
      records = styleRules(a),
      messages = rulesForElement(records, ".message");
    expect(messages).toHaveLength(6);
    expect(messages[1].selector).toBe(".message:hover");
    expect(messages[2].selector).toBe(".message.selected");
    expect(messages[2].label).toContain("@supports (display:grid)");
    expect(messages[3].label).toContain("@media (width > 900px)");
    expect(messages[4].shared).toBe(true);
    expect(rulesForElement(records, ".reply")[0]).toBe(messages[4]);
    expect(messages.map((r) => r.rule.line)).toEqual(
      [...messages]
        .sort((x, y) => x.rule.from - y.rule.from)
        .map((r) => r.rule.line),
    );
    const hover = messages[1].rule.declarations[0];
    expect(editDeclaration(source, a, hover, "yellow")).toBe(
      source.replace("color:blue", "color:yellow"),
    );
    expect(new Set(messages.map((r) => r.key)).size).toBe(messages.length);
  });
  it("matches contextual preview targets without losing their ancestor constraints", () => {
    const records = styleRules(
      analyzeTheme(`
      .message .author {color:red}
      .theme-dark .message > .contents .author:hover {color:blue}
      .other .author {color:white}
      .message + .author {color:black}
      .message :not(.author) {color:green}
    `),
    );
    expect(
      rulesForElement(records, ".message .author").map(
        (r) => r.rule.declarations[0].value,
      ),
    ).toEqual(["red", "blue"]);
    expect(rulesForElement(records, ".message > .author")).toHaveLength(0);
  });
  it("handles selector lists in nesting and keeps unknown or unmatched selectors available", () => {
    const records = styleRules(
      analyzeTheme(
        ".a,.b { &:hover {color:red} .child{color:blue} } :not(.unknown){color:white}",
      ),
    );
    expect(rulesForElement(records, ".a").map((r) => r.rule.selector)).toEqual([
      ".a,.b",
      "&:hover",
    ]);
    expect(records[2].elements).toEqual([".child"]);
    expect(records[3].elements).toEqual([":not(.unknown)"]);
  });
});

describe("style deletion", () => {
  it("preserves original empty rules and removes only the selected repeated declaration", () => {
    const source = ".message{color:red;color:blue}";
    const a = analyzeTheme(source);
    expect(removeStyleDeclaration(a, a.rules[0].declarations[1], a)).toBe(
      ".message{color:red;}",
    );
    const only = analyzeTheme(".message{opacity:.5}");
    expect(
      removeStyleDeclaration(only, only.rules[0].declarations[0], only),
    ).toBe(".message{}");
  });
  it("removes a newly added empty rule without removing an original duplicate or conditional wrapper", () => {
    const original = analyzeTheme("\uFEFF.message {color:red}\r\n");
    const source =
      original.source +
      "@media (width>900px) { .message {opacity:.5} }\r\n.message {opacity:.7}";
    const a = analyzeTheme(source);
    expect(
      removeStyleDeclaration(a, a.rules[2].declarations[0], original),
    ).toBe(source.replace(".message {opacity:.7}", ""));
    expect(
      removeStyleDeclaration(a, a.rules[1].declarations[0], original),
    ).toBe(source.replace(".message {opacity:.5}", ""));
  });
  it("keeps new rules that still contain comments, variables or nested content", () => {
    const original = analyzeTheme("");
    for (const remaining of [
      "/* author note */",
      "--accent:red;",
      "&:hover{color:red}",
      "@supports(display:grid){display:grid}",
    ]) {
      const source = `.message{opacity:.5;${remaining}}`;
      const a = analyzeTheme(source);
      expect(
        removeStyleDeclaration(a, a.rules[0].declarations[0], original),
      ).toBe(`.message{${remaining}}`);
    }
  });
});
