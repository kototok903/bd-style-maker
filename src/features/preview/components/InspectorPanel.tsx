import { ChevronRightIcon, CrosshairIcon, XIcon } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ChoiceSelect } from "@/features/editor/components/ChoiceSelect";
import type { InspectorSelection } from "@/features/preview/lib/inspector-types";

type Props = {
  selection: InspectorSelection;
  onNavigate: (id: string) => void;
  onVariant: (id: string) => void;
  onUse: (selector: string) => void;
  onCancel: () => void;
};

export function InspectorPanel({
  selection,
  onNavigate,
  onVariant,
  onUse,
  onCancel,
}: Props) {
  const id = useId();
  const current = selection.path.at(-1)!;
  const variant = selection.variants.find((v) => v.id === selection.variant)!;
  return (
    <div
      className="max-h-[min(360px,45%)] shrink-0 overflow-y-auto border-b bg-card p-3"
      aria-label="Element inspector"
      role="region"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium">
          <CrosshairIcon className="size-3.5" />
          Inspect element
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Cancel inspection"
          onClick={onCancel}
        >
          <XIcon />
        </Button>
      </div>
      <nav
        aria-label="Element hierarchy"
        className="mb-3 flex flex-wrap items-center gap-0.5"
      >
        {selection.path.map((target, index) => (
          <span
            key={target.id}
            className="inline-flex min-w-0 items-center gap-0.5"
          >
            {index > 0 && (
              <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground" />
            )}
            <Button
              className="h-auto min-h-6 max-w-full text-left wrap-anywhere whitespace-normal"
              variant={target.id === current.id ? "secondary" : "ghost"}
              size="xs"
              onClick={() => onNavigate(target.id)}
              title={target.selector}
              aria-current={target.id === current.id ? "location" : undefined}
            >
              {target.name}
            </Button>
          </span>
        ))}
      </nav>
      <FieldGroup className="mb-2 grid grid-cols-2 gap-3 max-[460px]:grid-cols-1">
        <Field>
          <FieldLabel htmlFor={`${id}-parts`}>Inner element</FieldLabel>
          <ChoiceSelect
            id={`${id}-parts`}
            label="Inspect inner element"
            value=""
            options={[
              { value: "", label: "Choose an inner element…" },
              ...selection.children.map((target, index) => ({
                value: target.id,
                label: `${target.name} · ${index + 1}`,
              })),
            ]}
            disabled={!selection.children.length}
            onChange={(next) => {
              if (next) onNavigate(next);
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-scope`}>Selector scope</FieldLabel>
          <ChoiceSelect
            id={`${id}-scope`}
            label="Inspector selector scope"
            value={selection.variant}
            options={selection.variants.map((v) => ({
              value: v.id,
              label: v.name,
            }))}
            onChange={onVariant}
          />
        </Field>
      </FieldGroup>
      <code className="block font-mono text-[11px] wrap-anywhere text-muted-foreground">
        {variant.selector}
      </code>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground" role="status">
          {variant.count}{" "}
          {variant.kind === "pseudo"
            ? `possible target${variant.count === 1 ? "" : "s"} · applies on ${variant.name.toLowerCase()}`
            : `matching element${variant.count === 1 ? "" : "s"}`}
        </span>
        <div className="flex items-center gap-2">
          {selection.hit && (
            <Button
              size="xs"
              variant="ghost"
              title={selection.hit.selector}
              onClick={() => onNavigate(selection.hit!.id)}
            >
              Exact clicked element
            </Button>
          )}
          <Button size="sm" onClick={() => onUse(variant.selector)}>
            Use selector
          </Button>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Click another element to pick it. Alt+↑/↓ moves through the hierarchy.
        Esc cancels.
      </p>
    </div>
  );
}
