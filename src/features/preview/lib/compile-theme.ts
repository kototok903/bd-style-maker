import type { ChildNode } from "postcss";
import postcss from "postcss";
import valueParser from "postcss-value-parser";

import {
  previewCss,
  resolveResource,
} from "@/features/dependencies/lib/dependencies";

export type CachedStylesheet = { source: string; url: string };
export type StylesheetImport = {
  // null identifies an import in the theme currently being edited.
  url: string | null;
  line: number;
};
export type ThemeResource = {
  url: string;
  status: "loaded" | "failed" | "paused";
  importedFrom: StylesheetImport;
  message?: string;
};
export type CompiledTheme = {
  css: string;
  resources: ThemeResource[];
  native?: boolean;
};
export type StylesheetCache = Map<string, CachedStylesheet>;

export function groupFailedStylesheets(resources: ThemeResource[]) {
  const groups = new Map<
    string,
    { url: string; messages: string[]; importedFrom: StylesheetImport[] }
  >();
  for (const resource of resources) {
    if (resource.status !== "failed") continue;
    let group = groups.get(resource.url);
    if (!group) {
      group = { url: resource.url, messages: [], importedFrom: [] };
      groups.set(resource.url, group);
    }
    if (resource.message && !group.messages.includes(resource.message))
      group.messages.push(resource.message);
    if (
      !group.importedFrom.some(
        (origin) =>
          origin.url === resource.importedFrom.url &&
          origin.line === resource.importedFrom.line,
      )
    )
      group.importedFrom.push(resource.importedFrom);
  }
  return [...groups.values()];
}

function importTarget(params: string) {
  const nodes = valueParser(params).nodes;
  const first = nodes.find((n) => n.type !== "space" && n.type !== "comment");
  let url = "";
  if (first?.type === "string") url = first.value;
  if (first?.type === "function" && first.value.toLowerCase() === "url")
    url = valueParser
      .stringify(first.nodes)
      .replace(/^(['"])(.*)\1$/, "$2")
      .trim();
  return {
    url,
    conditions: first ? params.slice(first.sourceEndIndex).trim() : "",
  };
}

function wrapImport(nodes: ChildNode[], conditions: string): ChildNode[] {
  const parts = valueParser(conditions).nodes.filter(
    (n) => n.type !== "space" && n.type !== "comment",
  );
  let layer: string | null = null,
    supports = "";
  const first = parts[0];
  if (first?.type === "function" && first.value === "layer") {
    layer = valueParser.stringify(first.nodes);
    parts.shift();
  } else if (first?.type === "word" && first.value === "layer") {
    layer = "";
    parts.shift();
  }
  const second = parts[0];
  if (second?.type === "function" && second.value === "supports") {
    const content = valueParser.stringify(second.nodes);
    supports = /^(\(|not\s|selector\(|font-(tech|format)\()/.test(content)
      ? content
      : `(${content})`;
    parts.shift();
  }
  const mediaStart = parts[0]?.sourceIndex;
  const media = mediaStart === undefined ? "" : conditions.slice(mediaStart);
  let result = nodes;
  for (const [name, params] of [
    ["media", media],
    ["supports", supports],
    ["layer", layer],
  ] as const) {
    if (params === null || (params === "" && name !== "layer")) continue;
    const wrapper = postcss.atRule({ name, params });
    wrapper.append(result);
    result = [wrapper];
  }
  return result;
}

async function readStylesheet(
  url: string,
  signal: AbortSignal,
): Promise<CachedStylesheet> {
  const response = await fetch(url, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty stylesheet response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 3 * 1024 * 1024) {
      await reader.cancel();
      throw new Error("Stylesheet exceeds 3 MB");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return {
    source: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    url: response.url || url,
  };
}

// Resolve imports only into a preview copy. The user's original file is never rebuilt.
// Imported defaults precede local overrides; layers/supports/media keep their CSS semantics.
export async function compileTheme(
  source: string,
  external: boolean,
  signal: AbortSignal,
  cache: StylesheetCache = new Map(),
): Promise<CompiledTheme> {
  const resources: ThemeResource[] = [];
  let total = source.length,
    count = 0;
  let browserFallback = false;
  async function expand(
    css: string,
    base: string,
    ancestry: Set<string>,
    depth: number,
  ): Promise<ChildNode[]> {
    signal.throwIfAborted();
    const root = postcss.parse(previewCss(css, base), {
      from: undefined,
      map: false,
    });
    for (const node of [...root.nodes]) {
      if (node.type === "atrule" && node.name === "charset") {
        node.remove();
        continue;
      }
      if (node.type !== "atrule" || node.name !== "import") continue;
      const { url: path, conditions } = importTarget(node.params),
        url = resolveResource(path, base),
        importedFrom = { url: base || null, line: node.source!.start!.line };
      if (!external) {
        resources.push({ url: url ?? path, status: "paused", importedFrom });
        node.remove();
        continue;
      }
      try {
        if (!url)
          throw new Error(
            "Unresolved URL. Set the original HTTPS source URL in Imports.",
          );
        if (ancestry.has(url)) throw new Error("Import cycle");
        if (++count > 40 || depth > 8)
          throw new Error("Import depth/count limit reached");
        let file = cache.get(url);
        if (!file) {
          file = await readStylesheet(url, signal);
          cache.set(url, file);
        }
        total += file.source.length;
        if (total > 8 * 1024 * 1024)
          throw new Error("Combined stylesheets exceed 8 MB");
        const children = await expand(
          file.source,
          file.url,
          new Set([...ancestry, url]),
          depth + 1,
        );
        resources.push({ url, status: "loaded", importedFrom });
        node.replaceWith(...wrapImport(children, conditions));
      } catch (error) {
        signal.throwIfAborted();
        if (error instanceof TypeError) browserFallback = true;
        resources.push({
          url: url ?? path,
          status: "failed",
          importedFrom,
          message:
            error instanceof Error ? error.message : "Network or CORS failure",
        });
        node.remove();
      }
    }
    return root.nodes;
  }
  const root = postcss.root();
  root.append(await expand(source, "", new Set(), 0));
  // Browsers can render cross-origin CSS that fetch() cannot read (notably
  // redirects without CORS headers). Let the browser resolve the original import
  // graph in that case, preserving its order and conditions rather than silently
  // dropping an unreadable dependency. The iframe reports style load/error events.
  const native = external && browserFallback;
  return { css: native ? source : root.toString(), resources, native };
}
