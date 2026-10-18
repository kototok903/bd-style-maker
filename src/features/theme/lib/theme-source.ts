import postcss, { CssSyntaxError } from "postcss";
import valueParser from "postcss-value-parser";

import { declarationComments } from "@/features/theme/lib/declaration-comments";
import type {
  ThemeAnalysis,
  ThemeDeclaration,
  ThemeRule,
} from "@/features/theme/theme-types";

export const metadataFields = [
  "name",
  "author",
  "description",
  "version",
] as const;
export const guidedProperties = [
  { property: "color", label: "Text color" },
  { property: "background-color", label: "Background color" },
  { property: "border-color", label: "Border color" },
  { property: "border-radius", label: "Corner radius" },
  { property: "font-size", label: "Font size" },
  { property: "padding", label: "Padding" },
  { property: "gap", label: "Gap" },
  { property: "opacity", label: "Opacity" },
] as const;

export function readMetadata(text: string): Record<string, string> {
  const header = text.match(/^\uFEFF?\/\*\*[\s\S]*?\*\//)?.[0];
  return Object.fromEntries(
    Array.from(
      (header ?? "").matchAll(/^[\t ]*\*[\t ]*@([\w-]+)[\t ]+([^\r\n]*)/gm),
      (m) => [m[1], m[2].trim()],
    ),
  );
}

export function analyzeTheme(source: string): ThemeAnalysis {
  const result: ThemeAnalysis = {
    source,
    root: null,
    rules: [],
    variables: [],
    imports: [],
    metadata: readMetadata(source),
    diagnostic: null,
  };
  // PostCSS strips a BOM before computing positions; keep offsets in the original document.
  const bom = source.startsWith("\uFEFF") ? 1 : 0;
  try {
    const root = postcss.parse(source, { from: undefined, map: false });
    result.root = root;
    root.walkRules((node) => {
      if (
        node.source?.start?.offset === undefined ||
        node.source.end?.offset === undefined
      )
        return;
      const from = node.source.start.offset + bom;
      const rule: ThemeRule = {
        id: `rule-${from}`,
        from,
        to: node.source.end.offset + bom,
        selector: node.selector,
        context: [],
        line: node.source.start.line,
        declarations: [],
      };
      let parent = node.parent;
      while (parent && parent.type !== "root") {
        if (parent.type === "atrule")
          rule.context.unshift(`@${parent.name} ${parent.params}`);
        if (parent.type === "rule") rule.context.unshift(parent.selector);
        parent = parent.parent;
      }
      const comments = declarationComments(node);
      node.each((decl) => {
        if (
          decl.type !== "decl" ||
          decl.source?.start?.offset === undefined ||
          decl.source.end?.offset === undefined
        )
          return;
        const start = decl.source.start.offset + bom;
        const rawValue = decl.raws.value?.raw ?? decl.value;
        const valueStart =
          start + decl.prop.length + (decl.raws.between ?? ":").length;
        // Keep comments around a value and its !important spelling outside the edit.
        const nodes = valueParser(rawValue).nodes.filter(
          (n) => n.type !== "space" && n.type !== "comment",
        );
        const first = nodes[0],
          last = nodes.at(-1);
        const declaration: ThemeDeclaration = {
          id: `decl-${start}`,
          ruleId: rule.id,
          from: start,
          to: decl.source.end.offset + bom,
          property: decl.prop,
          value: decl.value.trim(),
          important: !!decl.important,
          valueFrom: valueStart + (first?.sourceIndex ?? 0),
          valueTo: valueStart + (last?.sourceEndIndex ?? rawValue.length),
          line: decl.source.start.line,
          comment: comments.get(decl) ?? "",
        };
        rule.declarations.push(declaration);
        if (decl.prop.startsWith("--")) result.variables.push(declaration);
      });
      result.rules.push(rule);
    });
    root.walkAtRules("import", (node) => {
      const nodes = valueParser(node.params).nodes;
      const first = nodes.find(
        (n) => n.type !== "space" && n.type !== "comment",
      );
      let url = "";
      if (first?.type === "string") url = first.value;
      if (first?.type === "function" && first.value.toLowerCase() === "url")
        url = valueParser
          .stringify(first.nodes)
          .replace(/^(['"])(.*)\1$/, "$2")
          .trim();
      if (url)
        result.imports.push({
          id: `import-${node.source?.start?.offset}`,
          url,
          conditions: node.params.slice(first!.sourceEndIndex).trim(),
          line: node.source?.start?.line ?? 1,
        });
    });
  } catch (error) {
    result.diagnostic =
      error instanceof CssSyntaxError
        ? {
            message: error.reason,
            line: error.line ?? 1,
            column: error.column ?? 1,
          }
        : { message: "Unable to parse this stylesheet.", line: 1, column: 1 };
  }
  return result;
}

function assertCurrent(text: string, analysis: ThemeAnalysis) {
  if (text !== analysis.source)
    throw new Error("The source changed. Try this edit again.");
  if (!analysis.root || analysis.diagnostic)
    throw new Error("Fix the CSS syntax error before using the visual editor.");
}

export function validateValue(property: string, value: string) {
  if (!value.trim()) throw new Error("Enter a CSS value.");
  const parsed = postcss.parse(`a { ${property}: ${value}; }`, {
    from: undefined,
    map: false,
  });
  const rule = parsed.first;
  if (
    parsed.nodes.length !== 1 ||
    rule?.type !== "rule" ||
    rule.nodes.length !== 1 ||
    rule.first?.type !== "decl" ||
    rule.first.prop !== property ||
    rule.first.important
  ) {
    throw new Error(
      "Enter a single value. Use the CSS editor to change rules or !important.",
    );
  }
}

export function editDeclaration(
  text: string,
  analysis: ThemeAnalysis,
  declaration: ThemeDeclaration,
  value: string,
): string {
  assertCurrent(text, analysis);
  if (!analysis.rules.some((r) => r.declarations.includes(declaration)))
    throw new Error("This declaration is no longer available.");
  validateValue(declaration.property, value);
  const next =
    text.slice(0, declaration.valueFrom) +
    value.trim() +
    text.slice(declaration.valueTo);
  if (analyzeTheme(next).diagnostic)
    throw new Error("This value does not form valid CSS.");
  return next;
}

export function removeDeclaration(
  text: string,
  analysis: ThemeAnalysis,
  declaration: ThemeDeclaration,
): string {
  assertCurrent(text, analysis);
  if (!analysis.rules.some((r) => r.declarations.includes(declaration)))
    throw new Error("This declaration is no longer available.");
  return text.slice(0, declaration.from) + text.slice(declaration.to);
}

export function addDeclaration(
  text: string,
  analysis: ThemeAnalysis,
  ruleId: string,
  property: string,
  value: string,
): string {
  assertCurrent(text, analysis);
  if (
    !/^--[a-zA-Z_][\w-]*$/.test(property) &&
    !guidedProperties.some((p) => p.property === property)
  )
    throw new Error(
      "Choose a supported property or a variable name beginning with --.",
    );
  validateValue(property, value);
  const rule = analysis.rules.find((r) => r.id === ruleId);
  if (!rule) throw new Error("Select a rule first.");
  if (rule.declarations.some((d) => d.property === property))
    throw new Error(
      "This rule already declares that property. Edit its existing value.",
    );
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lineStart = text.lastIndexOf("\n", rule.from - 1) + 1;
  const indent = text.slice(lineStart, rule.from).match(/^\s*/)?.[0] ?? "";
  const close = rule.to - 1;
  const tail = rule.declarations.at(-1);
  const needsSemicolon =
    tail && !text.slice(tail.from, tail.to).trimEnd().endsWith(";");
  let next =
    text.slice(0, close) +
    `${eol}${indent}  ${property}: ${value.trim()};${eol}${indent}` +
    text.slice(close);
  if (needsSemicolon) next = next.slice(0, tail.to) + ";" + next.slice(tail.to);
  if (analyzeTheme(next).diagnostic)
    throw new Error(
      "Could not insert this declaration. Use the CSS editor for this rule.",
    );
  return next;
}

export function addRule(text: string, selector: string): string {
  if (!selector.trim()) throw new Error("Enter a selector.");
  const rule = postcss.parse(`${selector} {}`, { from: undefined, map: false });
  if (
    rule.nodes.length !== 1 ||
    rule.first?.type !== "rule" ||
    rule.first.nodes.length
  )
    throw new Error("Enter a single CSS selector.");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const next =
    text +
    `${text.endsWith("\n") ? eol : eol + eol}${selector.trim()} {${eol}}${eol}`;
  if (analyzeTheme(next).diagnostic)
    throw new Error("Fix the source before adding a selector.");
  return next;
}

export function updateMetadata(
  text: string,
  key: string,
  value: string,
): string {
  if (!/^[\w-]+$/.test(key) || /[\r\n]|\*\//.test(value))
    throw new Error("Metadata must be one line and cannot close the comment.");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const header = text.match(/^\uFEFF?\/\*\*[\s\S]*?\*\//)?.[0];
  if (!header) {
    const bom = text.startsWith("\uFEFF") ? "\uFEFF" : "";
    return (
      bom +
      `/**${eol} * @${key} ${value}${eol} */${eol}${eol}` +
      text.slice(bom.length)
    );
  }
  const pattern = new RegExp(
    `(^[\\t ]*\\*[\\t ]*@${key}[\\t ]+)[^\\r\\n]*`,
    "m",
  );
  const updated = pattern.test(header)
    ? header.replace(pattern, (_, prefix: string) => prefix + value)
    : header.replace(/\*\/$/, ` * @${key} ${value}${eol} */`);
  return updated + text.slice(header.length);
}

export function friendlyName(property: string) {
  return property
    .replace(/^--/, "")
    .replace(/[-_]+/g, " ")
    .replace(/^\w/, (s) => s.toUpperCase());
}

export function exportFileName(fileName: string) {
  const safe =
    Array.from(fileName, (char) => (char.charCodeAt(0) < 32 ? "-" : char))
      .join("")
      .replace(/[\\/:*?"<>|]/g, "-")
      .trim() || "Untitled";
  return safe.endsWith(".theme.css")
    ? safe
    : safe.replace(/\.css$/i, "") + ".theme.css";
}
