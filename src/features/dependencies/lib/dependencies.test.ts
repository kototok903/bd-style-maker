import { afterEach, describe, expect, it, vi } from "vitest";

import {
  inspectDependencies,
  previewCss,
} from "@/features/dependencies/lib/dependencies";
import { analyzeTheme } from "@/features/theme/lib/theme-source";

afterEach(() => vi.unstubAllGlobals());
describe("dependencies", () => {
  it("rebases only the preview copy and keeps layer/supports/media conditions", () => {
    const source =
      '@import "./base.css" layer(theme) supports(display:grid) screen; a {background: url(../pic.png)}';
    const next = previewCss(source, "https://example.com/themes/My.theme.css");
    expect(next).toContain(
      '"https://example.com/themes/base.css" layer(theme) supports(display:grid) screen',
    );
    expect(next).toContain('url("https://example.com/pic.png")');
    expect(previewCss(source, "")).toBe(source);
    expect(
      previewCss(
        "a{background:url(data:image/png;abc)}",
        "https://example.com/a.css",
      ),
    ).toContain("data:image/png;abc");
  });
  it("bounds cycles and shows unavailable remote sources", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith("missing.css")) throw new TypeError("Failed to fetch");
      return new Response('@import "./a.css"; :root{--x:red}', { status: 200 });
    });
    vi.stubGlobal("fetch", fetcher);
    const imports = analyzeTheme(
      '@import "https://example.com/a.css"; @import "https://example.com/missing.css";',
    ).imports;
    const results = await inspectDependencies(
      imports,
      "",
      new AbortController().signal,
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(results.some((r) => r.status.includes("cycle"))).toBe(true);
    expect(results.some((r) => r.status.includes("unavailable"))).toBe(true);
  });
});
