import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { compileTheme } from "@/features/preview/lib/compile-theme";
import {
  analyzeTheme,
  editDeclaration,
} from "@/features/theme/lib/theme-source";

afterEach(() => vi.unstubAllGlobals());
const theme = (name: string) =>
  readFileSync(`test/fixtures/themes/${name}.theme.css`, "utf8");

describe("actual theme configuration files", () => {
  it("discovers MaterialDiscord's scoped variables and changes its message radius losslessly", () => {
    const source = theme("Material-Discord"),
      analysis = analyzeTheme(source);
    expect(analysis.variables).toHaveLength(42);
    const radius = analysis.variables.find(
      (v) => v.property === "--message-radius",
    )!;
    expect(editDeclaration(source, analysis, radius, "36px")).toBe(
      source.replace("--message-radius: 18px", "--message-radius: 36px"),
    );
    const dark = analysis.rules.find((r) => r.selector === ".theme-dark")!
      .declarations[0];
    const next = analyzeTheme(editDeclaration(source, analysis, dark, "0.5"));
    expect(
      next.rules.find((r) => r.selector === ".theme-light")!.declarations[0]
        .value,
    ).toBe("0.74");
  });
  it("keeps system24's body settings and root colors distinct", () => {
    const source = theme("system24"),
      analysis = analyzeTheme(source);
    expect(analysis.variables).toHaveLength(100);
    for (const [property, value] of [
      ["--gap", "24px"],
      ["--bg-4", "#102a20"],
    ]) {
      const decl = analysis.variables.find((v) => v.property === property)!;
      expect(editDeclaration(source, analysis, decl, value)).toBe(
        source.slice(0, decl.valueFrom) + value + source.slice(decl.valueTo),
      );
    }
  });
});

describe("preview import compilation", () => {
  it("loads nested imports before local overrides, rebases assets, and reuses successful sources", async () => {
    const fetcher = vi.fn(
      async (url: string) =>
        new Response(
          url.endsWith("base.css")
            ? '@import "./nested.css"; :root{--color:red} .x{background:url(./image.png)}'
            : ':root{--font:"Example"}',
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    const source =
      '@import "https://example.com/base.css"; :root{--color:green}';
    const cache = new Map(),
      signal = new AbortController().signal;
    const result = await compileTheme(source, true, signal, cache);
    expect(result.resources).toHaveLength(2);
    expect(result.resources.every((r) => r.status === "loaded")).toBe(true);
    expect(result.css.indexOf('--font:"Example"')).toBeLessThan(
      result.css.indexOf("--color:red"),
    );
    expect(result.css.indexOf("--color:red")).toBeLessThan(
      result.css.indexOf("--color:green"),
    );
    expect(result.css).toContain('url("https://example.com/image.png")');
    await compileTheme(source.replace("green", "blue"), true, signal, cache);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("retains layer, supports, and media import conditions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(".x{color:red}")),
    );
    const result = await compileTheme(
      '@import "https://example.com/a.css" layer(theme) supports(display:grid) screen and (min-width: 1px);',
      true,
      new AbortController().signal,
    );
    const root = analyzeTheme(result.css).root!;
    expect(root.first?.type).toBe("atrule");
    expect(result.css).toMatch(/@layer theme/);
    expect(result.css).toMatch(/@supports \(display:grid\)/);
    expect(result.css).toMatch(/@media screen and \(min-width: 1px\)/);
  });
  it("reports import errors rather than pretending a complete theme rendered", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Network/CORS failure");
      }),
    );
    const result = await compileTheme(
      theme("system24"),
      true,
      new AbortController().signal,
    );
    expect(result.resources[0]).toMatchObject({
      status: "failed",
      url: "https://refact0r.github.io/system24/build/system24.css",
    });
    expect(result.css).toContain("--panel-labels: on");
    expect(result.native).toBe(true);
    expect(result.css).toBe(theme("system24"));
  });
  it("pauses imports without fetching and bounds cycles", async () => {
    const fetcher = vi.fn(async () => new Response('@import "./a.css";'));
    vi.stubGlobal("fetch", fetcher);
    const signal = new AbortController().signal;
    const paused = await compileTheme(
      '@import "https://example.com/a.css";',
      false,
      signal,
    );
    expect(paused.resources[0].status).toBe("paused");
    expect(fetcher).not.toHaveBeenCalled();
    const cycle = await compileTheme(
      '@import "https://example.com/a.css";',
      true,
      signal,
    );
    expect(cycle.resources.some((r) => r.message === "Import cycle")).toBe(
      true,
    );
  });
});
