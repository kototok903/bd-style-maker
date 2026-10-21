import type { Selector } from "postcss-selector-parser";
import selectorParser from "postcss-selector-parser";

import { inspectorTargetGroups } from "@/features/theme/lib/selector-presets";
import { removeDeclaration } from "@/features/theme/lib/theme-source";
import type {
  ThemeAnalysis,
  ThemeDeclaration,
  ThemeRule,
} from "@/features/theme/theme-types";

export const previewElements = inspectorTargetGroups.flatMap((group) =>
  group.targets.map(([selector, label]) => ({
    selector,
    label,
    category: group.label,
  })),
);
const aliases = [
  { selector: '[class*="message_"]', label: "Messages" },
  { selector: '[class*="channelTextArea_"]', label: "Message input" },
  { selector: '[class*="embedFull_"]', label: "Embeds" },
];
export function elementName(selector: string) {
  return (
    [...previewElements, ...aliases].find(
      (element) => element.selector === selector,
    )?.label ?? selector
  );
}
export function ruleLocation(rule: ThemeRule) {
  return [...rule.context, rule.selector].join(" · ");
}
export function ruleKey(rule: ThemeRule, analysis: ThemeAnalysis) {
  const same = analysis.rules.filter(
    (r) => ruleLocation(r) === ruleLocation(rule),
  );
  return `${ruleLocation(rule)}#${same.indexOf(rule)}`;
}
export function originalDeclaration(
  decl: ThemeDeclaration,
  analysis: ThemeAnalysis,
  original: ThemeAnalysis,
) {
  const rule = analysis.rules.find((r) => r.id === decl.ruleId)!;
  const oldRule = original.rules.find(
    (r) => ruleKey(r, original) === ruleKey(rule, analysis),
  );
  const duplicate = rule.declarations
    .filter((d) => d.property === decl.property)
    .indexOf(decl);
  return oldRule?.declarations.filter((d) => d.property === decl.property)[
    duplicate
  ];
}
export function removeStyleDeclaration(
  analysis: ThemeAnalysis,
  declaration: ThemeDeclaration,
  original: ThemeAnalysis,
) {
  const next = removeDeclaration(analysis.source, analysis, declaration);
  const rule = analysis.rules.find((r) => r.id === declaration.ruleId)!;
  const existed = original.rules.some(
    (r) => ruleKey(r, original) === ruleKey(rule, analysis),
  );
  if (existed) return next;
  let empty = false;
  const bom = analysis.source.startsWith("\uFEFF") ? 1 : 0;
  analysis.root?.walkRules((node) => {
    if (node.source?.start?.offset === rule.from - bom)
      // Keep comments, variables, nested rules and other content in place.
      empty = node.nodes.length === 1 && node.first?.type === "decl";
  });
  return empty
    ? analysis.source.slice(0, rule.from) + analysis.source.slice(rule.to)
    : next;
}
export function declarationKey(
  decl: ThemeDeclaration,
  analysis: ThemeAnalysis,
) {
  const rule = analysis.rules.find((r) => r.id === decl.ruleId)!;
  return `${ruleKey(rule, analysis)}:${decl.property}:${rule.declarations.filter((d) => d.property === decl.property).indexOf(decl)}`;
}
export function settingsDeclarations(analysis: ThemeAnalysis) {
  return analysis.rules
    .flatMap((rule) =>
      rule.declarations.filter(
        (decl) =>
          decl.property.startsWith("--") ||
          (!rule.parentRuleId &&
            /^(?:body|html|:root)$/.test(rule.selector.trim()) &&
            [
              "font-weight",
              "letter-spacing",
              "font-family",
              "font-size",
            ].includes(decl.property)),
      ),
    )
    .sort((a, b) => a.from - b.from);
}
export type SettingGroup = {
  key: string;
  title: string;
  note: string;
  location: string;
  declarations: ThemeDeclaration[];
};
export function settingGroups(analysis: ThemeAnalysis): SettingGroup[] {
  const groups: SettingGroup[] = [];
  const occurrences = new Map<string, number>();
  let lastKey = "";
  for (const decl of settingsDeclarations(analysis)) {
    const rule = analysis.rules.find((r) => r.id === decl.ruleId)!;
    const key = `${ruleKey(rule, analysis)}:${decl.group?.key ?? "ungrouped"}`;
    let group = groups.at(-1);
    if (!group || lastKey !== key) {
      const occurrence = occurrences.get(key) ?? 0;
      occurrences.set(key, occurrence + 1);
      lastKey = key;
      group = {
        key: `${key}:${occurrence}`,
        title: decl.group?.title ?? "",
        note: decl.group?.note ?? "",
        location: ruleLocation(rule),
        declarations: [],
      };
      groups.push(group);
    }
    group.declarations.push(decl);
  }
  return groups;
}

/** Positive subjects only: .message .content targets .content, :not(.message) does not target messages. */
function subjects(selector: Selector): string[] {
  const lastCombinator = selector.nodes.findLastIndex(
    (node) => node.type === "combinator",
  );
  const compound = selector.nodes.slice(lastCombinator + 1);
  const direct = compound.filter((node) =>
    ["class", "id", "attribute", "tag"].includes(node.type),
  );
  const alternatives = compound.flatMap((node) =>
    node.type === "pseudo" && [":is", ":where"].includes(node.value)
      ? (node.nodes ?? []).flatMap((n) => subjects(n as Selector))
      : [],
  );
  if (!direct.length) return alternatives;
  const known = direct.find((node) =>
    previewElements.some(
      (element) => element.selector === node.toString().trim(),
    ),
  );
  const first =
    known ?? direct.find((node) => node.type === "class") ?? direct[0];
  return [
    ...new Set([
      first.toString().trim(),
      ...direct.map((node) => node.toString().trim()),
      ...alternatives,
    ]),
  ];
}
function parse(value: string) {
  return selectorParser().astSync(value);
}
export function effectiveSelector(
  rule: ThemeRule,
  analysis: ThemeAnalysis,
  visited = new Set<string>(),
): string {
  if (!rule.parentRuleId || visited.has(rule.id)) return rule.selector;
  visited.add(rule.id);
  const parent = analysis.rules.find((r) => r.id === rule.parentRuleId);
  if (!parent) return rule.selector;
  const outer = effectiveSelector(parent, analysis, visited);
  try {
    const parentTree = parse(outer);
    const replacement = parentTree.nodes.length === 1 ? outer : `:is(${outer})`;
    const tree = parse(rule.selector);
    tree.each((branch) => {
      let nested = false;
      branch.walkNesting((node) => {
        nested = true;
        node.replaceWith(
          ...parse(replacement).nodes[0].nodes.map((n) => n.clone()),
        );
      });
      if (!nested) {
        branch.prepend(selectorParser.combinator({ value: " " }));
        for (const node of [...parse(replacement).nodes[0].nodes].reverse())
          branch.prepend(node.clone());
      }
    });
    return tree.toString();
  } catch {
    return `${outer} → ${rule.selector}`;
  }
}
export type StyleRule = {
  rule: ThemeRule;
  key: string;
  selector: string;
  elements: string[];
  label: string;
  shared: boolean;
};
function qualifier(branch: Selector, element: string) {
  const nodes = branch.nodes;
  const lastCombinator = nodes.findLastIndex((n) => n.type === "combinator");
  const compound = nodes.slice(lastCombinator + 1);
  const anchor = compound.find((n) => n.toString().trim() === element);
  const suffix = anchor
    ? compound
        .filter((n) => n !== anchor)
        .map((n) => n.toString())
        .join("")
    : "";
  const context =
    lastCombinator >= 0
      ? nodes
          .slice(0, lastCombinator)
          .map((n) => n.toString())
          .join("")
          .trim()
      : "";
  const relation =
    lastCombinator >= 0 ? (nodes[lastCombinator].value?.trim() ?? "") : "";
  const inside = context
    ? `${relation === ">" ? "Direct child of" : relation === "+" ? "After" : relation === "~" ? "Following" : "Inside"} ${context}`
    : "";
  return (
    [inside, suffix].filter(Boolean).join(" · ") ||
    (branch.toString() === element ? "Base" : branch.toString())
  );
}
export function styleRules(analysis: ThemeAnalysis): StyleRule[] {
  return analysis.rules.map((rule) => {
    const selector = effectiveSelector(rule, analysis);
    let elements: string[] = [],
      labels: string[] = [],
      shared = false;
    try {
      const tree = parse(selector);
      const branches = tree.nodes;
      elements = [...new Set(branches.flatMap((branch) => subjects(branch)))];
      shared =
        branches.length > 1 ||
        branches.some(
          (branch) =>
            branch.nodes.some(
              (node) =>
                node.type === "pseudo" &&
                [":is", ":where"].includes(node.value) &&
                node.nodes.length > 1,
            ) &&
            !branch.nodes.some((node) =>
              ["class", "id", "attribute", "tag"].includes(node.type),
            ),
        );
      labels = branches.map((branch) =>
        qualifier(branch, subjects(branch)[0] ?? branch.toString()),
      );
    } catch {
      /* Unknown syntax remains available under its original selector. */
    }
    if (!elements.length) elements = [selector];
    // At-rule conditions stay literal; nested parent selectors are reflected above.
    const conditions = rule.context.filter((context) =>
      context.startsWith("@"),
    );
    return {
      rule,
      key: ruleKey(rule, analysis),
      selector,
      elements,
      label: [...new Set([...labels, ...conditions])].join(" · ") || selector,
      shared,
    };
  });
}
/** Match a contextual preset against positive selector compounds, preserving its ancestor constraints. */
function matchesTarget(candidate: Selector, target: Selector) {
  function compounds(branch: Selector) {
    const result: { nodes: string[]; relation: string }[] = [
      { nodes: [], relation: "" },
    ];
    for (const node of branch.nodes) {
      if (node.type === "combinator")
        result.push({ nodes: [], relation: node.value.trim() || " " });
      else result.at(-1)!.nodes.push(node.toString().trim());
    }
    return result;
  }
  const actual = compounds(candidate),
    wanted = compounds(target);
  function matches(ai: number, wi: number): boolean {
    if (
      ai < 0 ||
      !wanted[wi].nodes.every((node) => actual[ai].nodes.includes(node))
    )
      return false;
    if (wi === 0) return true;
    const relation = wanted[wi].relation;
    if (relation !== " ")
      return actual[ai].relation === relation && matches(ai - 1, wi - 1);
    // A descendant may have extra ancestors, but a sibling relation cannot satisfy it.
    for (let i = ai; i > 0 && [" ", ">"].includes(actual[i].relation); i--) {
      if (matches(i - 1, wi - 1)) return true;
    }
    return false;
  }
  return matches(actual.length - 1, wanted.length - 1);
}
export function rulesForElement(records: StyleRule[], selector: string) {
  let targets: Selector[] = [];
  try {
    targets = parse(selector).nodes;
  } catch {
    /* Exact selector fallback. */
  }
  return records.filter((record) => {
    if (record.selector === selector || record.rule.selector === selector)
      return true;
    try {
      return parse(record.selector).nodes.some((branch) =>
        targets.some((target) =>
          target.nodes.some((node) => node.type === "combinator")
            ? matchesTarget(branch, target)
            : subjects(target).some((subject) =>
                subjects(branch).includes(subject),
              ),
        ),
      );
    } catch {
      return false;
    }
  });
}
