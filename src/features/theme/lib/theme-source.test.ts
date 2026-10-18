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

describe("field descriptions from CSS comments", () => {
  function comments(source: string) {
    return Object.fromEntries(
      analyzeTheme(source).variables.map((decl) => [
        decl.property,
        decl.comment,
      ]),
    );
  }

  it("applies Material Discord headings to their whole group, never the preceding field", () => {
    expect(
      comments(`:root {
      /* APP FONT SETTINGS */
      --app-font: "Google Sans Flex";
      --app-font-width: 100;
      --app-font-roundness: 100;

      /* ACCENT HSL AND TEXT COLOR SETTINGS */
      --accent-hue: 227;
      --accent-text-color: white; /* DOES NOTHING WITH MATERIAL YOU ENABLED */
      --accent-button-action: white;
    }`),
    ).toEqual({
      "--app-font": "APP FONT SETTINGS",
      "--app-font-width": "APP FONT SETTINGS",
      "--app-font-roundness": "APP FONT SETTINGS",
      "--accent-hue": "ACCENT HSL AND TEXT COLOR SETTINGS",
      "--accent-text-color": "DOES NOTHING WITH MATERIAL YOU ENABLED",
      "--accent-button-action": "ACCENT HSL AND TEXT COLOR SETTINGS",
    });
  });

  it("prefers system24 inline descriptions without passing them to the next field", () => {
    expect(
      comments(`body {
      /* sizes */
      --gap: 12px; /* spacing between panels */
      --divider-thickness: 4px; /* thickness of the unread divider */
      --default-size: 16px;
    }`),
    ).toEqual({
      "--gap": "spacing between panels",
      "--divider-thickness": "thickness of the unread divider",
      "--default-size": "sizes",
    });
    expect(comments(":root { --a: 1; /* only a */ --b: 2; }")).toEqual({
      "--a": "only a",
      "--b": "",
    });
  });

  it("respects blank lines around Tokyo Night headings and between fields", () => {
    expect(
      comments(`.theme-dark { /* Dark Mode */

      /* Header Color */
      --header-primary: white;
      --header-secondary: gray;

      --unrelated: black;
      /* Text Color */
      --text-normal: white;

      /* Detached note */

      --no-description: black;
    }`),
    ).toEqual({
      "--header-primary": "Header Color",
      "--header-secondary": "Header Color",
      "--unrelated": "",
      "--text-normal": "Text Color",
      "--no-description": "",
    });
  });

  it("combines adjacent multiline notes and handles CRLF", () => {
    const source = `body {
      /* transparency options */
      /**
       * Use transparent backgrounds.
       * For example: hsla(220, 15%, 10%, 0.7).
       */
      --transparency: on;
      --blur: on;
    }`.replaceAll("\n", "\r\n");
    const description =
      "transparency options\nUse transparent backgrounds.\nFor example: hsla(220, 15%, 10%, 0.7).";
    expect(comments(source)).toEqual({
      "--transparency": description,
      "--blur": description,
    });
  });

  it("does not carry metadata, import notes, or outer-rule headings into declarations", () => {
    expect(
      comments(`/** @name Theme */
      @import "example.css"; /* Font */
      /* GLOBAL VARIABLES */
      :root { --a: 1; }
      .nested {
        /* Outer */
        --b: 2;
        &.child { --c: 3; }
        --d: 4;
      }
      .other { --e: 5; }
    `),
    ).toEqual({ "--a": "", "--b": "Outer", "--c": "", "--d": "", "--e": "" });
  });

  it("ignores disabled declarations and decorative separators", () => {
    expect(
      comments(`:root {
      /* --disabled: red; */
      --a: 1;
      /* ======= */
      --b: 2;
      /* Old group */
      --c: 3;
      @media (width > 100px) { --inside: 4; }
      --d: 5;
    }`),
    ).toEqual({ "--a": "", "--b": "", "--c": "Old group", "--d": "" });
  });

  it("keeps descriptions associated after an edit without rewriting comments", () => {
    const source =
      ":root {\n /* Font settings */\n --font: serif;\n --width: 100;\n}";
    const a = analyzeTheme(source);
    const next = editDeclaration(source, a, a.variables[0], "sans-serif");
    expect(next).toBe(source.replace("serif", "sans-serif"));
    expect(comments(next)).toEqual({
      "--font": "Font settings",
      "--width": "Font settings",
    });
  });
});
