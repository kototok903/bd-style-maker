import {
  ArrowUpRightIcon,
  CodeIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChoiceSelect } from "@/features/editor/components/ChoiceSelect";
import { ValueEditor } from "@/features/editor/components/ValueEditor";
import { selectorPresets } from "@/features/theme/lib/starter-theme";
import {
  addDeclaration,
  addRule,
  editDeclaration,
  friendlyName,
  guidedProperties,
  removeDeclaration,
} from "@/features/theme/lib/theme-source";
import type {
  ThemeAnalysis,
  ThemeDeclaration,
} from "@/features/theme/theme-types";

type Props = {
  analysis: ThemeAnalysis;
  original: ThemeAnalysis;
  selectedRule: string;
  onSelectRule: (id: string) => void;
  onEdit: (text: string, group?: string) => void;
  onJump: (offset: number) => void;
};

export function GuidedEditor({
  analysis,
  original,
  selectedRule,
  onSelectRule,
  onEdit,
  onJump,
}: Props) {
  const [section, setSection] = useState("variables");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<
    "variable" | "property" | "selector" | null
  >(null);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const id = useId();
  const rule =
    analysis.rules.find((r) => r.id === selectedRule) ?? analysis.rules[0];
  const variables = [...new Set(analysis.variables.map((d) => d.property))];
  const declarations =
    rule?.declarations.filter((d) =>
      section === "variables"
        ? d.property.startsWith("--")
        : guidedProperties.some((p) => p.property === d.property),
    ) ?? [];
  const filtered = declarations.filter((d) =>
    `${d.property} ${d.value} ${d.comment}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const disabled = !!analysis.diagnostic;
  const preferSelectorStyles =
    !!rule &&
    rule.declarations.some((d) =>
      guidedProperties.some((p) => p.property === d.property),
    ) &&
    !rule.declarations.some((d) => d.property.startsWith("--"));
  useEffect(() => {
    if (preferSelectorStyles) setSection("selectors");
  }, [selectedRule, preferSelectorStyles]);
  function start(kind: typeof adding) {
    setAdding(kind);
    setName(
      kind === "property" ? "color" : kind === "selector" ? ":root" : "--",
    );
    setValue(kind === "property" ? "var(--text-normal)" : "");
    setError("");
  }
  function add() {
    try {
      if (adding === "selector") {
        const next = addRule(analysis.source, name);
        onEdit(next);
        onSelectRule(`rule-${next.lastIndexOf(name.trim() + " {")}`);
      } else if (rule)
        onEdit(addDeclaration(analysis.source, analysis, rule.id, name, value));
      setAdding(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add this setting.");
    }
  }
  function originalValue(decl: ThemeDeclaration) {
    const occurrences = analysis.rules.filter(
      (r) =>
        r.selector === rule?.selector &&
        r.context.join("\n") === rule.context.join("\n"),
    );
    const index = occurrences.findIndex((r) => r.id === rule?.id);
    const originalRule = original.rules.filter(
      (r) =>
        r.selector === rule?.selector &&
        r.context.join("\n") === rule.context.join("\n"),
    )[index];
    const duplicate = rule!.declarations
      .filter((d) => d.property === decl.property)
      .indexOf(decl);
    return originalRule?.declarations.filter(
      (d) => d.property === decl.property,
    )[duplicate]?.value;
  }
  return (
    <div className="guided-editor">
      <div className="section-intro">
        <div className="eyebrow">Your stylesheet, made approachable</div>
        <h1>Make it your own.</h1>
        <p>Small adjustments. A whole different feeling.</p>
      </div>
      {disabled && (
        <Alert variant="destructive">
          <AlertTitle>CSS needs a quick fix</AlertTitle>
          <AlertDescription>
            {analysis.diagnostic!.message} on line {analysis.diagnostic!.line}.
            Your text is safe in the CSS editor.
          </AlertDescription>
          <Button variant="outline" size="sm" onClick={() => onJump(0)}>
            Open CSS editor
          </Button>
        </Alert>
      )}
      <ToggleGroup
        value={[section]}
        onValueChange={(values) => {
          if (values[0]) setSection(values[0]);
        }}
        variant="outline"
        size="sm"
        className="w-full"
        aria-label="Guided settings category"
      >
        <ToggleGroupItem value="variables" className="flex-1">
          Variables{" "}
          <Badge variant="secondary">{analysis.variables.length}</Badge>
        </ToggleGroupItem>
        <ToggleGroupItem value="selectors" className="flex-1">
          Selector styles
        </ToggleGroupItem>
      </ToggleGroup>
      <FieldGroup>
        <Field>
          <div className="field-heading">
            <FieldLabel>Editing scope</FieldLabel>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Add selector"
              onClick={() => start("selector")}
              disabled={disabled}
            >
              <PlusIcon />
            </Button>
          </div>
          <ChoiceSelect
            label="Editing scope"
            value={rule?.id ?? "none"}
            options={
              analysis.rules.length
                ? analysis.rules.map((r) => ({
                    label: `${r.selector} · L${r.line}`,
                    value: r.id,
                  }))
                : [{ label: "No selectors yet", value: "none" }]
            }
            onChange={onSelectRule}
            disabled={disabled || !analysis.rules.length}
          />
          {rule?.context.length ? (
            <p className="scope-context">Inside {rule.context.join(" → ")}</p>
          ) : (
            <p className="scope-context">
              Only declarations in this rule will change.
            </p>
          )}
        </Field>
      </FieldGroup>
      <Separator />
      <div className="list-heading">
        <span className="eyebrow">
          {section === "variables" ? "CSS variables" : "Selected properties"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={!rule || disabled}
          onClick={() =>
            start(section === "variables" ? "variable" : "property")
          }
        >
          <PlusIcon data-icon="inline-start" />
          Add {section === "variables" ? "variable" : "property"}
        </Button>
      </div>
      {declarations.length > 10 && (
        <div className="search-field">
          <SearchIcon />
          <Input
            aria-label="Search settings"
            placeholder="Find a setting…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}
      <FieldGroup>
        {filtered.map((decl) => {
          const reset = originalValue(decl);
          return (
            <div className="declaration-setting" key={decl.id}>
              <div className="field-heading">
                <span className="setting-label">
                  {guidedProperties.find((p) => p.property === decl.property)
                    ?.label ?? friendlyName(decl.property)}
                </span>
                <div className="flex items-center gap-0.5">
                  {reset !== undefined && reset !== decl.value && (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Reset ${decl.property}`}
                      disabled={disabled}
                      onClick={() =>
                        onEdit(
                          editDeclaration(
                            analysis.source,
                            analysis,
                            decl,
                            reset,
                          ),
                        )
                      }
                    >
                      <RotateCcwIcon />
                    </Button>
                  )}
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`View source for ${decl.property}`}
                    onClick={() => onJump(decl.from)}
                  >
                    <ArrowUpRightIcon />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Remove ${decl.property}`}
                    disabled={disabled}
                    onClick={() =>
                      onEdit(removeDeclaration(analysis.source, analysis, decl))
                    }
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
              <ValueEditor
                label={decl.property}
                value={decl.value}
                variables={variables.filter((v) => v !== decl.property)}
                allowBinding={section === "selectors"}
                disabled={disabled}
                onCommit={(next) =>
                  onEdit(
                    editDeclaration(analysis.source, analysis, decl, next),
                    decl.id,
                  )
                }
              />
              <div className="setting-caption">
                <code>{decl.property}</code>
                {decl.important && <Badge variant="outline">!important</Badge>}
              </div>
              {decl.comment && (
                <p className="setting-comment">{decl.comment}</p>
              )}
            </div>
          );
        })}
      </FieldGroup>
      {!filtered.length && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {search
                ? "No matching settings"
                : section === "variables"
                  ? "A blank canvas"
                  : "Style this selector"}
            </EmptyTitle>
            <EmptyDescription>
              {search
                ? "Try a different name or value."
                : section === "variables"
                  ? "Add a variable here, or choose a different scope."
                  : "Add color, radius, spacing, typography, or opacity. Other properties stay available in CSS."}
            </EmptyDescription>
          </EmptyHeader>
          {!search && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                start(
                  rule
                    ? section === "variables"
                      ? "variable"
                      : "property"
                    : "selector",
                )
              }
              disabled={disabled}
            >
              <PlusIcon data-icon="inline-start" />
              Add{" "}
              {rule
                ? section === "variables"
                  ? "variable"
                  : "property"
                : "selector"}
            </Button>
          )}
        </Empty>
      )}
      <div className="guided-footer">
        <CodeIcon />
        <p>
          Need more freedom?
          <br />
          <button type="button" onClick={() => onJump(rule?.from ?? 0)}>
            Everything is editable in CSS <span>↗</span>
          </button>
        </p>
      </div>
      <Dialog
        open={adding !== null}
        onOpenChange={(open) => {
          if (!open) setAdding(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {adding}</DialogTitle>
            <DialogDescription>
              {adding === "selector"
                ? "Create a new rule. Existing rules stay unchanged."
                : `Add a declaration to ${rule?.selector ?? "your stylesheet"}.`}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="flex flex-col gap-5"
          >
            <FieldGroup>
              {adding === "property" ? (
                <Field>
                  <FieldLabel>Property</FieldLabel>
                  <ChoiceSelect
                    label="New property"
                    value={name}
                    options={guidedProperties.map((p) => ({
                      label: p.label,
                      value: p.property,
                    }))}
                    onChange={setName}
                  />
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor={`${id}-name`}>
                    {adding === "selector" ? "CSS selector" : "Variable name"}
                  </FieldLabel>
                  {adding === "selector" && (
                    <ChoiceSelect
                      label="Common selector"
                      value={
                        selectorPresets.find((p) => p.selector === name)
                          ?.selector ?? "custom"
                      }
                      options={[
                        ...selectorPresets.map((p) => ({
                          label: p.label,
                          value: p.selector,
                        })),
                        { label: "Custom selector", value: "custom" },
                      ]}
                      onChange={(next) =>
                        setName(next === "custom" ? "" : next)
                      }
                    />
                  )}
                  <Input
                    id={`${id}-name`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    spellCheck={false}
                    placeholder={
                      adding === "selector" ? ".my-selector" : "--my-color"
                    }
                    autoFocus
                  />
                </Field>
              )}
              {adding !== "selector" && (
                <Field>
                  <FieldLabel htmlFor={`${id}-value`}>CSS value</FieldLabel>
                  <Input
                    id={`${id}-value`}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="#a7b7ff, 12px, or var(--accent)"
                    spellCheck={false}
                  />
                </Field>
              )}
              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdding(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Add {adding}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
