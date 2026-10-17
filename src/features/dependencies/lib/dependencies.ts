import postcss from "postcss";
import valueParser from "postcss-value-parser";

import { analyzeTheme } from "@/features/theme/lib/theme-source";
import type { ThemeImport } from "@/features/theme/theme-types";

export type DependencyResult = {
  url: string;
  depth: number;
  status: string;
  source?: string;
  variableCount?: number;
};

export function resolveResource(path: string, base?: string): string | null {
  try {
    const url = new URL(path, base || undefined);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export async function inspectDependencies(
  imports: ThemeImport[],
  base: string,
  signal: AbortSignal,
): Promise<DependencyResult[]> {
  const results: DependencyResult[] = [],
    seen = new Set<string>();
  async function visit(path: string, parent: string, depth: number) {
    const url = resolveResource(path, parent);
    if (!url) {
      results.push({
        url: path,
        depth,
        status: "Unresolved · use an HTTPS base URL for relative imports",
      });
      return;
    }
    if (seen.has(url)) {
      results.push({
        url,
        depth,
        status: "Already visited · cycle or shared import",
      });
      return;
    }
    if (seen.size >= 20 || depth > 4) {
      results.push({ url, depth, status: "Scan limit reached" });
      return;
    }
    seen.add(url);
    try {
      const response = await fetch(url, {
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // Bound the stream even when the server omits or misreports Content-Length.
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2 * 1024 * 1024) {
          await reader.cancel();
          throw new Error("Stylesheet exceeds 2 MB");
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const analysis = analyzeTheme(source);
      results.push({
        url,
        depth,
        source,
        variableCount: analysis.variables.length,
        status: analysis.diagnostic
          ? "Source readable · CSS parse error"
          : "Source readable · retained as remote import",
      });
      for (const child of analysis.imports) {
        if (signal.aborted) return;
        await visit(child.url, response.url || url, depth + 1);
      }
    } catch (error) {
      if (signal.aborted) return;
      results.push({
        url,
        depth,
        status:
          error instanceof Error && error.message.startsWith("HTTP")
            ? error.message
            : "Source unavailable · network, CORS, timeout, or size limit",
      });
    }
  }
  for (const item of imports) {
    if (signal.aborted) break;
    await visit(item.url, base, 0);
  }
  return results;
}

// Rebase only the preview copy. Never mutate the exported document or import conditions.
export function previewCss(source: string, base: string): string {
  if (!base || !resolveResource(base)) return source;
  try {
    const root = postcss.parse(source, { from: undefined, map: false });
    function rebase(value: string) {
      const parsed = valueParser(value);
      parsed.walk((node) => {
        if (node.type !== "function" || node.value.toLowerCase() !== "url")
          return;
        const raw = valueParser
          .stringify(node.nodes)
          .replace(/^(['"])(.*)\1$/, "$2")
          .trim();
        if (/^(data:|#|blob:)/i.test(raw)) return false;
        const url = resolveResource(raw, base);
        if (url)
          node.nodes = [
            {
              type: "string",
              quote: '"',
              value: url,
              sourceIndex: 0,
              sourceEndIndex: url.length,
            },
          ];
        return false;
      });
      return parsed.toString();
    }
    root.walkDecls((decl) => {
      decl.value = rebase(decl.value);
    });
    root.walkAtRules("import", (rule) => {
      const parsed = valueParser(rule.params),
        first = parsed.nodes.find(
          (n) => n.type !== "space" && n.type !== "comment",
        );
      if (first?.type === "string") {
        const url = resolveResource(first.value, base);
        if (url) first.value = url;
        rule.params = parsed.toString();
      } else rule.params = rebase(rule.params);
    });
    return root.toString();
  } catch {
    return source;
  }
}
