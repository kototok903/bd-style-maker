import type { Comment, Declaration, Rule } from "postcss";

function description(comment: Comment) {
  const text = comment.text
    .split(/\r\n?|\n/)
    .map((line) => line.replace(/^\s*\* ?/, "").trimEnd())
    .join("\n")
    .trim();
  // Disabled declarations/imports are source code, not field descriptions.
  return /^(?:--[\w-]+\s*:|@import\b)/.test(text) || !/[\p{L}\p{N}]/u.test(text)
    ? ""
    : text;
}

/** Associate descriptions within one rule without changing the source. */
export function declarationComments(rule: Rule): Map<Declaration, string> {
  const result = new Map<Declaration, string>();
  const trailing = new Set<Comment>();
  let group = "";
  let heading: string[] | null = null;
  for (const node of rule.nodes) {
    const before = (node.raws.before ?? "").replace(/\r\n?/g, "\n");
    if (/\n[^\S\n]*\n/.test(before)) {
      group = "";
      heading = null;
    }
    if (node.type === "comment") {
      if (trailing.has(node)) continue;
      heading ??= [];
      const text = description(node);
      if (text) heading.push(text);
      else {
        group = "";
        heading = [];
      }
      continue;
    }
    if (node.type !== "decl") {
      group = "";
      heading = null;
      continue;
    }
    if (heading) group = heading.join("\n");
    heading = null;
    const inline: string[] = [];
    let line = node.source?.end?.line;
    for (
      let next = node.next();
      next?.type === "comment" &&
      line !== undefined &&
      next.source?.start?.line === line;
      next = next.next()
    ) {
      trailing.add(next);
      const text = description(next);
      if (text) inline.push(text);
      line = next.source?.end?.line;
    }
    // An inline note overrides a heading for this field only; following fields
    // can still inherit the heading until the visual group ends.
    result.set(node, inline.length ? inline.join("\n") : group);
  }
  return result;
}
