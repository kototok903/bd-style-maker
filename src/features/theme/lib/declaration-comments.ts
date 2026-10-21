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

export type DeclarationDocumentation = {
  comment: string;
  note: string;
  group?: { key: string; title: string; note: string };
};

/** Keep structural headings separate from field descriptions. Source is untouched. */
export function declarationDocumentation(
  rule: Rule,
): Map<Declaration, DeclarationDocumentation> {
  const result = new Map<Declaration, DeclarationDocumentation>();
  const trailing = new Set<Comment>();
  let group = "";
  let section: DeclarationDocumentation["group"];
  let groupIndex = 0;
  let heading: string[] | null = null;
  for (const node of rule.nodes) {
    const before = (node.raws.before ?? "").replace(/\r\n?/g, "\n");
    if (/\n[^\S\n]*\n/.test(before)) {
      group = "";
      section = undefined;
      heading = null;
    }
    if (node.type === "comment") {
      if (trailing.has(node)) continue;
      heading ??= [];
      const text = description(node);
      if (text) heading.push(text);
      else {
        group = "";
        section = undefined;
        heading = [];
      }
      continue;
    }
    if (node.type !== "decl") {
      group = "";
      section = undefined;
      heading = null;
      continue;
    }
    if (heading) {
      group = heading.join("\n");
      const title = heading[0] ?? "";
      // Only short standalone labels become headings. Prose stays a note.
      section =
        title.length <= 90 &&
        title.split(/\s+/).length <= 12 &&
        !/[\n.!?:;,"'=]/.test(title) &&
        !!title
          ? {
              key: `group-${groupIndex++}`,
              title,
              note: heading.slice(1).join("\n"),
            }
          : undefined;
    }
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
    // Shared headings precede this field's inline notes in source order.
    // Following fields inherit only the heading until the visual group ends.
    result.set(node, {
      comment: [group, ...inline].filter(Boolean).join("\n"),
      note: [section ? "" : group, ...inline].filter(Boolean).join("\n"),
      group: section,
    });
  }
  return result;
}

/** Compatibility view for callers interested only in descriptions. */
export function declarationComments(rule: Rule): Map<Declaration, string> {
  return new Map(
    [...declarationDocumentation(rule)].map(([node, doc]) => [
      node,
      doc.comment,
    ]),
  );
}
