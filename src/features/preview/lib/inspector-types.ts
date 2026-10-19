export type InspectorTarget = {
  id: string;
  name: string;
  selector: string;
  count: number;
};
export type InspectorVariant = Omit<InspectorTarget, "id"> & {
  id: string;
  kind: "base" | "state" | "pseudo" | "rule";
};
export type InspectorSelection = {
  path: InspectorTarget[];
  children: InspectorTarget[];
  variants: InspectorVariant[];
  variant: string;
  hit: InspectorTarget | null;
};

function target(value: unknown): value is InspectorTarget {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    item.id.length <= 3000 &&
    typeof item.name === "string" &&
    item.name.length <= 3200 &&
    typeof item.selector === "string" &&
    item.selector.length <= 3000 &&
    Number.isSafeInteger(item.count) &&
    (item.count as number) >= 0
  );
}

// MessageChannel is private, but still bound the payload before rendering it.
export function readInspectorSelection(
  value: unknown,
): InspectorSelection | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    !Array.isArray(item.path) ||
    !item.path.length ||
    item.path.length > 100 ||
    !item.path.every(target) ||
    !Array.isArray(item.children) ||
    item.children.length > 100 ||
    !item.children.every(target) ||
    !Array.isArray(item.variants) ||
    !item.variants.length ||
    item.variants.length > 50 ||
    !item.variants.every(
      (variant: unknown) =>
        target(variant) &&
        "kind" in variant &&
        ["base", "state", "pseudo", "rule"].includes(String(variant.kind)),
    ) ||
    typeof item.variant !== "string" ||
    !item.variants.some((v: InspectorVariant) => v.id === item.variant) ||
    (item.hit !== null && !target(item.hit))
  )
    return null;
  return item as InspectorSelection;
}
