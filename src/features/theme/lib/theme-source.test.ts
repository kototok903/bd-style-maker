import { describe, expect, it } from "vitest";

import {
  addDeclaration,
  addRule,
  analyzeTheme,
  editDeclaration,
  readMetadata,
  removeDeclaration,
  updateMetadata,
} from "@/features/theme/lib/theme-source";

describe("source-preserving edits", () => {
  it("keeps BOM, CRLF, imports, comments and unrelated CSS byte-for-byte", () => {
    const source =
      '\uFEFF/**\r\n * @name Unlisted\r\n * @custom keep me\r\n */\r\n@import url("https://example.com/a.css") layer(base) screen;\r\n:root { --color : red /* keep */ ! important; --other: calc(2px + 1rem); }\r\n@keyframes pulse { to { opacity: .2 } }';
    const analysis = analyzeTheme(source);
    expect(analysis.diagnostic).toBeNull();
    expect(analysis.source).toBe(source);
    expect(
      editDeclaration(source, analysis, analysis.variables[0], "#123456"),
    ).toBe(source.replace("red /* keep */", "#123456 /* keep */"));
    expect(analysis.imports[0]).toMatchObject({
      url: "https://example.com/a.css",
      conditions: "layer(base) screen",
    });
  });
  it("distinguishes duplicate variables across rules, conditions and case", () => {
    const source =
      ":root {--x:red;--X:white} .theme-light{--x:black} @media (width>1px){:root{--x:blue}}";
    const a = analyzeTheme(source);
    expect(a.variables).toHaveLength(4);
    expect(a.rules.at(-1)?.context).toEqual(["@media (width>1px)"]);
    expect(editDeclaration(source, a, a.variables[3], "green")).toBe(
      source.replace("--x:blue", "--x:green"),
    );
  });
  it("handles nested syntax, multiline values, semicolons in strings and fragments", () => {
    const source =
      ':root {--svg:url("data:image/svg+xml;a;b");--gradient:linear-gradient(\nred,blue);--rgb:255, 255, 255;} .a { &:hover { color: var(--x, red); } }';
    const a = analyzeTheme(source);
    expect(a.diagnostic).toBeNull();
    expect(
      editDeclaration(
        source,
        a,
        a.variables[1],
        "linear-gradient(green, blue)",
      ),
    ).toBe(
      source.replace(
        "linear-gradient(\nred,blue)",
        "linear-gradient(green, blue)",
      ),
    );
    expect(a.rules.at(-1)?.context).toEqual([".a"]);
  });
  it("rejects stale references and rule injection", () => {
    const source = ":root{--a:red;}";
    const a = analyzeTheme(source);
    expect(() =>
      editDeclaration(source + " ", a, a.variables[0], "blue"),
    ).toThrow("source changed");
    expect(() =>
      editDeclaration(source, a, a.variables[0], "blue; color:red"),
    ).toThrow();
    expect(() =>
      editDeclaration(source, a, a.variables[0], "blue !important"),
    ).toThrow();
  });
  it("adds and removes a declaration while preserving rules and comments", () => {
    const source = ":root { --a: red /* comment */ }";
    const a = analyzeTheme(source);
    const next = addDeclaration(source, a, a.rules[0].id, "--radius", "10px");
    const b = analyzeTheme(next);
    expect(b.diagnostic).toBeNull();
    expect(b.variables.map((v) => v.property)).toEqual(["--a", "--radius"]);
    expect(next).toContain("--a: red /* comment */;");
    expect(removeDeclaration(next, b, b.variables[1])).toContain(
      "--a: red /* comment */;",
    );
    expect(() => addDeclaration(next, b, b.rules[0].id, "--a", "blue")).toThrow(
      "already",
    );
  });
  it("preserves invalid text and reports a diagnostic", () => {
    const source = ":root { --a: red;";
    const a = analyzeTheme(source);
    expect(a.source).toBe(source);
    expect(a.diagnostic?.message).toMatch(/Unclosed/i);
    expect(() => addRule(source, ".new")).toThrow();
  });
});

describe("metadata", () => {
  it("edits a known field while preserving unknown tags, CRLF and attribution", () => {
    const source =
      "\uFEFF/**\r\n * @name Test\r\n * @author Original Author\r\n * @custom keep this\r\n */\r\na{color:red}";
    expect(readMetadata(source).author).toBe("Original Author");
    const next = updateMetadata(source, "name", "My variation");
    expect(next).toBe(source.replace("@name Test", "@name My variation"));
    expect(readMetadata(updateMetadata(next, "version", "1.0.0")).custom).toBe(
      "keep this",
    );
    expect(() => updateMetadata(source, "name", "*/ bad")).toThrow();
  });
  it("adds a leading header without discarding headerless CSS", () => {
    const source = "\uFEFFbody { color: red }";
    const next = updateMetadata(source, "name", "Test");
    expect(next.startsWith("\uFEFF/**")).toBe(true);
    expect(next.endsWith("body { color: red }")).toBe(true);
  });
});
