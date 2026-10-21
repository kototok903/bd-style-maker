import {
  ArrowUpRightIcon,
  CrosshairIcon,
  EllipsisIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChoiceSelect } from "@/features/editor/components/ChoiceSelect";
import { DeclarationField } from "@/features/editor/components/DeclarationField";
import { ValueEditor } from "@/features/editor/components/ValueEditor";
import { isColorProperty } from "@/features/editor/lib/color-value";
import type { StyleRule } from "@/features/editor/lib/editor-model";
import {
  declarationKey,
  elementName,
  previewElements,
  ruleKey,
  ruleLocation,
  rulesForElement,
  settingGroups,
  settingsDeclarations,
  styleRules,
} from "@/features/editor/lib/editor-model";
import {
  addDeclaration,
  addRule,
  analyzeTheme,
  guidedProperties,
} from "@/features/theme/lib/theme-source";
import type {
  ThemeAnalysis,
  ThemeDeclaration,
} from "@/features/theme/theme-types";
import { cn } from "@/lib/utils";

export type PreviewInspection = {
  selector: string;
  create: boolean;
  nonce: number;
};
type Props = {
  inspection: PreviewInspection | null;
  onInspectionHandled: () => void;
  analysis: ThemeAnalysis;
  original: ThemeAnalysis;
  selectedRule: string;
  onSelectRule: (id: string) => void;
  onEdit: (text: string, group?: string) => void;
  onJump: (offset: number) => void;
  onInspect?: () => void;
};
export function VisualEditor({
  inspection,
  onInspectionHandled,
  analysis,
  original,
  selectedRule,
  onSelectRule,
  onEdit,
  onJump,
  onInspect,
}: Props) {
  const id = useId();
  const initialRule = analysis.rules.find((rule) => rule.id === selectedRule);
  const [section, setSection] = useState(
    initialRule?.declarations.some((d) => !d.property.startsWith("--"))
      ? "elements"
      : "settings",
  );
  const [searches, setSearches] = useState({ settings: "", elements: "" });
  const [locations, setLocations] = useState({
    settings: "all",
    elements: "all",
  });
  const [showCode, setShowCode] = useState(false);
  const [element, setElement] = useState(
    initialRule ? `selector:${initialRule.selector}` : "all",
  );
  const groups = useMemo(() => settingGroups(analysis), [analysis]);
  const records = useMemo(() => styleRules(analysis), [analysis]);
  const [openSettings, setOpenSettings] = useState<string[]>(() =>
    groups.slice(0, 1).map((group) => group.key),
  );
  const [openRules, setOpenRules] = useState<string[]>(() =>
    records.map((record) => record.key),
  );
  const [openElements, setOpenElements] = useState<string[]>(() => [
    records.find((record) =>
      record.rule.declarations.some((d) => !d.property.startsWith("--")),
    )?.elements[0] ?? "",
  ]);
  const [adding, setAdding] = useState<{
    ruleKey?: string;
    selector: string;
  } | null>(null);
  const [property, setProperty] = useState("background-color");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const disabled = !!analysis.diagnostic;
  const search = searches[section as keyof typeof searches];
  const location = locations[section as keyof typeof locations];
  useEffect(() => {
    if (!inspection) return;
    setSection("elements");
    const isElement =
      previewElements.some((item) => item.selector === inspection.selector) ||
      records.some((record) => record.elements.includes(inspection.selector));
    setElement(`${isElement ? "element" : "selector"}:${inspection.selector}`);
    setSearches((current) => ({ ...current, elements: "" }));
    setLocations((current) => ({ ...current, elements: "all" }));
    setOpenRules(
      (isElement
        ? rulesForElement(records, inspection.selector)
        : records.filter(
            (record) =>
              record.rule.selector === inspection.selector ||
              record.selector === inspection.selector,
          )
      ).map((record) => record.key),
    );
    onInspectionHandled();
  }, [inspection, onInspectionHandled, records]);
  function matches(decl: ThemeDeclaration) {
    return `${decl.property} ${decl.value} ${decl.comment}`
      .toLowerCase()
      .includes(search.toLowerCase());
  }
  function eligible(ruleId: string) {
    const rule = analysis.rules.find((r) => r.id === ruleId)!;
    return location === "all" || ruleLocation(rule) === location;
  }
  const settings = settingsDeclarations(analysis);
  const duplicates = new Map<string, number>();
  for (const decl of section === "settings"
    ? settings
    : analysis.rules.flatMap((rule) =>
        rule.declarations.filter((d) => !d.property.startsWith("--")),
      ))
    duplicates.set(decl.property, (duplicates.get(decl.property) ?? 0) + 1);
  function fields(declarations: ThemeDeclaration[], deletable = false) {
    return (
      <FieldGroup className="gap-5">
        {declarations.map((decl) => (
          <DeclarationField
            key={declarationKey(decl, analysis)}
            decl={decl}
            analysis={analysis}
            original={original}
            showCode={showCode}
            duplicate={(duplicates.get(decl.property) ?? 0) > 1}
            disabled={disabled}
            deletable={deletable}
            onEdit={onEdit}
            onJump={onJump}
          />
        ))}
      </FieldGroup>
    );
  }
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      declarations: group.declarations.filter(
        (decl) => eligible(decl.ruleId) && matches(decl),
      ),
    }))
    .filter((group) => group.declarations.length);
  const hasHeadings = groups.some((group) => group.title);
  const styleRecords = records.filter((record) =>
    record.rule.declarations.some((decl) => !decl.property.startsWith("--")),
  );
  const selectedSelector =
    element === "all" ? "" : element.slice(element.indexOf(":") + 1);
  const selectedRecords =
    element === "all"
      ? styleRecords
      : element.startsWith("selector:")
        ? styleRecords.filter(
            (record) =>
              record.rule.selector === selectedSelector ||
              record.selector === selectedSelector,
          )
        : rulesForElement(styleRecords, selectedSelector);
  const visibleRecords = selectedRecords
    .filter((record) => eligible(record.rule.id))
    .map((record) => ({
      ...record,
      visible: record.rule.declarations.filter(
        (decl) => !decl.property.startsWith("--") && matches(decl),
      ),
    }))
    .filter((record) => record.visible.length);
  const allLocationRules = analysis.rules.filter((rule) =>
    section === "settings"
      ? rule.declarations.some((decl) => settings.includes(decl))
      : rule.declarations.some((decl) => !decl.property.startsWith("--")),
  );
  const locationOptions = [...new Set(allLocationRules.map(ruleLocation))];
  const currentRule = adding?.ruleKey
    ? analysis.rules.find((rule) => ruleKey(rule, analysis) === adding.ruleKey)
    : undefined;
  const properties = guidedProperties.filter(
    (p) =>
      !currentRule?.declarations.some((decl) => decl.property === p.property),
  );
  function startProperty(record?: StyleRule) {
    const selector = record?.rule.selector ?? selectedSelector;
    if (!selector) return;
    const existing =
      record?.rule ??
      analysis.rules.find(
        (rule) =>
          !rule.parentRuleId &&
          !rule.context.length &&
          rule.selector === selector,
      );
    const first = guidedProperties.find(
      (p) =>
        !existing?.declarations.some((decl) => decl.property === p.property),
    );
    if (!first) return;
    setProperty(first.property);
    setValue("");
    setError("");
    setAdding({
      selector,
      ruleKey: existing ? ruleKey(existing, analysis) : undefined,
    });
  }
  function saveProperty() {
    if (!adding) return;
    try {
      let source = analysis.source,
        parsed = analysis,
        rule = currentRule;
      if (adding.ruleKey && !rule)
        throw new Error(
          "This rule changed. Close this dialog and select it again.",
        );
      if (!rule) {
        source = addRule(source, adding.selector);
        parsed = analyzeTheme(source);
        rule = parsed.rules.at(-1)!;
      }
      const next = addDeclaration(source, parsed, rule.id, property, value);
      onEdit(next);
      onSelectRule(rule.id);
      const nextRecords = styleRules(analyzeTheme(next));
      setOpenRules((current) => [
        ...new Set([
          ...current,
          ...nextRecords
            .filter((r) => r.rule.selector === adding.selector)
            .map((r) => r.key),
        ]),
      ]);
      setAdding(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add this style.");
    }
  }
  const choices = (() => {
    const used = new Map<string, { label: string; value: string }>();
    for (const record of records) {
      for (const target of record.elements)
        used.set(`element:${target}`, {
          value: `element:${target}`,
          label: elementName(target),
        });
      if (!record.elements.includes(record.selector))
        used.set(`selector:${record.selector}`, {
          value: `selector:${record.selector}`,
          label: record.selector,
        });
    }
    const result = [
      {
        label: "Overview",
        options: [{ label: "All existing styles", value: "all" }],
      },
      { label: "In this theme", options: [...used.values()] },
    ];
    const known = new Set(used.keys());
    for (const category of [
      ...new Set(previewElements.map((item) => item.category)),
    ]) {
      const options = previewElements
        .filter(
          (item) =>
            item.category === category &&
            !known.has(`element:${item.selector}`),
        )
        .map((item) => ({
          label: item.label,
          value: `element:${item.selector}`,
        }));
      if (options.length)
        result.push({ label: `More elements · ${category}`, options });
    }
    if (
      element !== "all" &&
      !result.some((group) =>
        group.options.some((option) => option.value === element),
      )
    )
      result.splice(1, 0, {
        label: "Selected element",
        options: [{ label: elementName(selectedSelector), value: element }],
      });
    return result.filter((group) => group.options.length);
  })();
  function renderRule(record: (typeof visibleRecords)[number], index: number) {
    return (
      <AccordionItem key={record.key} value={record.key}>
        <AccordionTrigger
          className={cn(
            "items-center gap-2 py-3",
            element === "all" && "focus-visible:ring-inset",
            element === "all" && index === 0 && "pt-1",
          )}
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span data-slot="accordion-title" className="text-xs wrap-anywhere">
              {record.label}
            </span>
            <span className="font-mono text-[10px] font-normal wrap-anywhere text-subtle-foreground">
              {ruleLocation(record.rule)} · L{record.rule.line}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 pb-5">
          {record.shared && (
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Shared rule: changes affect all selectors listed above.
            </p>
          )}
          {fields(record.visible, true)}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              size="xs"
              variant="ghost"
              disabled={
                disabled ||
                !guidedProperties.some(
                  (p) =>
                    !record.rule.declarations.some(
                      (d) => d.property === p.property,
                    ),
                )
              }
              onClick={() => startProperty(record)}
            >
              <PlusIcon data-icon="inline-start" />
              Add property
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onJump(record.rule.from)}
            >
              <ArrowUpRightIcon data-icon="inline-start" />
              View in CSS
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  }
  const elementGroups = [
    ...new Set(visibleRecords.map((record) => record.elements[0])),
  ];
  return (
    <div className="flex min-w-0 flex-col gap-4 px-[26px] pt-6 pb-[30px] max-[1050px]:px-5 max-[1050px]:py-[22px] max-[760px]:px-[22px] min-[1600px]:px-8 min-[1600px]:py-[30px]">
      {disabled && (
        <Alert variant="destructive">
          <AlertTitle>CSS needs a quick fix</AlertTitle>
          <AlertDescription>
            {analysis.diagnostic!.message} on line {analysis.diagnostic!.line}.
            Your source remains available in the CSS editor.
          </AlertDescription>
          <Button size="sm" variant="outline" onClick={() => onJump(0)}>
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
        aria-label="Visual settings category"
      >
        <ToggleGroupItem value="settings" className="flex-1">
          Theme settings
        </ToggleGroupItem>
        <ToggleGroupItem value="elements" className="flex-1">
          Element styles
        </ToggleGroupItem>
      </ToggleGroup>
      {section === "elements" && (
        <Field>
          <FieldLabel htmlFor={`${id}-element`}>Element</FieldLabel>
          <div className="flex items-center gap-2">
            <ChoiceSelect
              id={`${id}-element`}
              label="Element"
              value={element}
              groups={choices}
              onChange={(next) => {
                setElement(next);
                setOpenRules(records.map((record) => record.key));
                setSearches((current) => ({ ...current, elements: "" }));
                setLocations((current) => ({ ...current, elements: "all" }));
              }}
            />
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Pick an element in the preview"
              onClick={onInspect}
              disabled={!onInspect}
            >
              <CrosshairIcon />
            </Button>
          </div>
        </Field>
      )}
      <div className="flex items-center gap-2">
        <SearchIcon className="size-3.5 shrink-0 text-subtle-foreground" />
        <Input
          aria-label="Search settings"
          placeholder={
            section === "settings"
              ? "Search settings or comments…"
              : "Search properties or values…"
          }
          value={search}
          onChange={(event) =>
            setSearches((current) => ({
              ...current,
              [section]: event.target.value,
            }))
          }
        />
        <Popover>
          <PopoverTrigger
            render={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Editor display options"
              />
            }
          >
            <EllipsisIcon />
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="max-w-[calc(100vw-24px)] gap-4 p-4"
          >
            <PopoverTitle>Display options</PopoverTitle>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showCode}
                onChange={(event) => setShowCode(event.target.checked)}
                className="accent-ring"
              />
              Show CSS names and locations
            </label>
            <Field>
              <FieldLabel htmlFor={`${id}-filter`}>
                Filter by CSS location
              </FieldLabel>
              <ChoiceSelect
                id={`${id}-filter`}
                label="Filter by CSS location"
                value={location}
                options={[
                  { label: "All locations", value: "all" },
                  ...locationOptions.map((value) => ({ label: value, value })),
                ]}
                onChange={(value) =>
                  setLocations((current) => ({ ...current, [section]: value }))
                }
              />
            </Field>
          </PopoverContent>
        </Popover>
      </div>
      {location !== "all" && (
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="min-w-0 wrap-anywhere whitespace-normal"
          >
            {location}
          </Badge>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Clear location filter"
            onClick={() =>
              setLocations((current) => ({ ...current, [section]: "all" }))
            }
          >
            <XIcon />
          </Button>
        </div>
      )}
      {section === "settings" ? (
        hasHeadings ? (
          <Accordion
            multiple
            value={
              search ? visibleGroups.map((group) => group.key) : openSettings
            }
            onValueChange={(value) => setOpenSettings(value as string[])}
          >
            {visibleGroups.map((group) => (
              <AccordionItem key={group.key} value={group.key}>
                <AccordionTrigger className="items-center gap-2 py-3">
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span
                      data-slot="accordion-title"
                      className="text-xs wrap-anywhere"
                    >
                      {group.title || "Other settings"}
                    </span>
                    <span className="text-[10px] font-normal text-subtle-foreground">
                      {group.declarations.length}
                    </span>
                    {groups.filter((g) => g.title === group.title).length >
                      1 && (
                      <span className="max-w-full font-mono text-[10px] font-normal wrap-anywhere text-subtle-foreground">
                        {group.location}
                      </span>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-4 pb-5">
                  {group.note && (
                    <p className="text-[10px] leading-relaxed whitespace-pre-line text-muted-foreground">
                      {group.note
                        .split("\n")
                        .map((line) => `// ${line}`)
                        .join("\n")}
                    </p>
                  )}
                  {fields(group.declarations)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <>
            {visibleGroups.map((group) => (
              <div key={group.key}>{fields(group.declarations)}</div>
            ))}
          </>
        )
      ) : (
        <>
          {element === "all" ? (
            <Accordion
              multiple
              value={search ? elementGroups : openElements}
              onValueChange={(value) => setOpenElements(value as string[])}
            >
              {elementGroups.map((target) => (
                <AccordionItem key={target} value={target}>
                  <AccordionTrigger className="items-center gap-2 py-3">
                    <span
                      data-slot="accordion-title"
                      className="text-xs wrap-anywhere"
                    >
                      {elementName(target)}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pt-0">
                    <Accordion
                      multiple
                      value={
                        search
                          ? visibleRecords.map((record) => record.key)
                          : openRules
                      }
                      onValueChange={(value) => setOpenRules(value as string[])}
                    >
                      {visibleRecords
                        .filter((record) => record.elements[0] === target)
                        .map(renderRule)}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <>
              <Accordion
                multiple
                value={
                  search
                    ? visibleRecords.map((record) => record.key)
                    : openRules
                }
                onValueChange={(value) => setOpenRules(value as string[])}
              >
                {visibleRecords.map(renderRule)}
              </Accordion>
              {!search &&
                location === "all" &&
                !analysis.rules.some(
                  (rule) =>
                    !rule.parentRuleId &&
                    !rule.context.length &&
                    rule.selector === selectedSelector,
                ) && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => startProperty()}
                  >
                    <PlusIcon data-icon="inline-start" />
                    {selectedRecords.length
                      ? "Add base style"
                      : "Add a style for this element"}
                  </Button>
                )}
            </>
          )}
        </>
      )}
      {(section === "settings"
        ? !visibleGroups.length
        : !visibleRecords.length) && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {search || location !== "all"
                ? "No matching settings"
                : section === "settings"
                  ? "No theme settings found"
                  : element === "all"
                    ? "No element styles yet"
                    : "No local styles for this element"}
            </EmptyTitle>
            <EmptyDescription>
              {search || location !== "all"
                ? "Try another search or clear the location filter."
                : section === "settings"
                  ? "This file does not declare editable theme settings. You can edit its CSS or style an element."
                  : element === "all"
                    ? "Pick an element in the preview or choose one from the Element list."
                    : "Choose a property and value to add a style. Selecting an element does not change your CSS."}
            </EmptyDescription>
          </EmptyHeader>
          {section === "elements" && element === "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={onInspect}
              disabled={!onInspect}
            >
              <CrosshairIcon data-icon="inline-start" />
              Pick an element in the preview
            </Button>
          )}
        </Empty>
      )}
      <Dialog
        open={adding !== null}
        onOpenChange={(open) => {
          if (!open) setAdding(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add property</DialogTitle>
            <DialogDescription>{adding?.selector}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveProperty();
            }}
            className="flex flex-col gap-5"
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${id}-property`}>Property</FieldLabel>
                <ChoiceSelect
                  id={`${id}-property`}
                  label="Property"
                  value={property}
                  groups={[...new Set(guidedProperties.map((p) => p.group))]
                    .map((group) => ({
                      label: group,
                      options: properties
                        .filter((p) => p.group === group)
                        .map((p) => ({
                          label: p.label,
                          value: p.property,
                        })),
                    }))
                    .filter((group) => group.options.length)}
                  onChange={(next) => {
                    setProperty(next);
                    setValue("");
                    setError("");
                  }}
                />
              </Field>
              <Field>
                <FieldLabel>Value</FieldLabel>
                <ValueEditor
                  label={`${property} new`}
                  colorProperty={isColorProperty(property)}
                  placeholder={`e.g. ${guidedProperties.find((p) => p.property === property)?.example ?? ""}`}
                  value={value}
                  onCommit={setValue}
                  onDraftChange={setValue}
                />
              </Field>
            </FieldGroup>
            {error && <FieldError>{error}</FieldError>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdding(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={disabled || !value.trim()}>
                Add style
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
