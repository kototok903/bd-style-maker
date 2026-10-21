import postcss, { CssSyntaxError } from "postcss";
import valueParser from "postcss-value-parser";

import { declarationDocumentation } from "@/features/theme/lib/declaration-comments";
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
  { property: "color", label: "Text color", example: "#e8e9f0", group: "Text" },
  {
    property: "font-family",
    label: "Font family",
    example: '"Inter", sans-serif',
    group: "Text",
  },
  { property: "font-size", label: "Font size", example: "16px", group: "Text" },
  {
    property: "font-weight",
    label: "Font weight",
    example: "500",
    group: "Text",
  },
  {
    property: "font-style",
    label: "Font style",
    example: "italic",
    group: "Text",
  },
  {
    property: "line-height",
    label: "Line height",
    example: "1.5",
    group: "Text",
  },
  {
    property: "letter-spacing",
    label: "Letter spacing",
    example: "0.05em",
    group: "Text",
  },
  {
    property: "text-align",
    label: "Text alignment",
    example: "center",
    group: "Text",
  },
  {
    property: "text-decoration",
    label: "Text decoration",
    example: "underline",
    group: "Text",
  },
  {
    property: "text-transform",
    label: "Text capitalization",
    example: "uppercase",
    group: "Text",
  },
  {
    property: "text-shadow",
    label: "Text shadow",
    example: "0 1px 3px rgb(0 0 0 / 30%)",
    group: "Text",
  },
  {
    property: "background-color",
    label: "Background color",
    example: "rgb(36 37 43 / 50%)",
    group: "Backgrounds",
  },
  {
    property: "background-image",
    label: "Background image or gradient",
    example: 'url("https://example.com/background.jpg")',
    group: "Backgrounds",
  },
  {
    property: "background-size",
    label: "Background image size",
    example: "cover",
    group: "Backgrounds",
  },
  {
    property: "background-position",
    label: "Background image position",
    example: "center",
    group: "Backgrounds",
  },
  {
    property: "background-repeat",
    label: "Background image repeat",
    example: "no-repeat",
    group: "Backgrounds",
  },
  {
    property: "background-attachment",
    label: "Background scroll behavior",
    example: "fixed",
    group: "Backgrounds",
  },
  {
    property: "border-color",
    label: "Border color",
    example: "#667085",
    group: "Borders and shadows",
  },
  {
    property: "border-width",
    label: "Border width",
    example: "1px",
    group: "Borders and shadows",
  },
  {
    property: "border-style",
    label: "Border style",
    example: "solid",
    group: "Borders and shadows",
  },
  {
    property: "border-radius",
    label: "Corner radius",
    example: "8px",
    group: "Borders and shadows",
  },
  {
    property: "box-shadow",
    label: "Shadow",
    example: "0 4px 16px rgb(0 0 0 / 20%)",
    group: "Borders and shadows",
  },
  { property: "width", label: "Width", example: "240px", group: "Size" },
  { property: "height", label: "Height", example: "48px", group: "Size" },
  {
    property: "min-width",
    label: "Minimum width",
    example: "160px",
    group: "Size",
  },
  {
    property: "min-height",
    label: "Minimum height",
    example: "32px",
    group: "Size",
  },
  {
    property: "max-width",
    label: "Maximum width",
    example: "100%",
    group: "Size",
  },
  {
    property: "max-height",
    label: "Maximum height",
    example: "400px",
    group: "Size",
  },
  {
    property: "padding",
    label: "Inner spacing (padding)",
    example: "8px 12px",
    group: "Spacing",
  },
  {
    property: "margin",
    label: "Outer spacing (margin)",
    example: "8px 0",
    group: "Spacing",
  },
  { property: "gap", label: "Gap", example: "12px", group: "Spacing" },
  {
    property: "opacity",
    label: "Overall opacity",
    example: "0.5",
    group: "Effects",
  },
  {
    property: "backdrop-filter",
    label: "Background blur",
    example: "blur(8px)",
    group: "Effects",
  },
  {
    property: "display",
    label: "Show / hide",
    example: "none",
    group: "Visibility",
  },
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
      if (
        node.parent?.type === "rule" &&
        node.parent.source?.start?.offset !== undefined
      )
        rule.parentRuleId = `rule-${node.parent.source.start.offset + bom}`;
      // A conditional block can sit between a nested rule and its parent rule.
      if (!rule.parentRuleId) {
        let ancestor = node.parent;
        while (ancestor && ancestor.type !== "root") {
          if (
            ancestor.type === "rule" &&
            ancestor.source?.start?.offset !== undefined
          ) {
            rule.parentRuleId = `rule-${ancestor.source.start.offset + bom}`;
            break;
          }
          ancestor = ancestor.parent;
        }
      }
      const comments = declarationDocumentation(node);
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
          comment: comments.get(decl)?.comment ?? "",
          note: comments.get(decl)?.note ?? "",
          group: comments.get(decl)?.group,
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
  const closingLine = text.lastIndexOf("\n", close - 1) + 1;
  const closingOnOwnLine =
    closingLine > rule.from && /^[\t ]*$/.test(text.slice(closingLine, close));
  const insertion = closingOnOwnLine ? closingLine : close;
  let next =
    text.slice(0, insertion) +
    `${closingOnOwnLine ? "" : eol}${indent}  ${property}: ${value.trim()};${eol}${closingOnOwnLine ? "" : indent}` +
    text.slice(insertion);
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
