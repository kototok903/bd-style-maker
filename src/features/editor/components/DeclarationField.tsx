import { ArrowUpRightIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ValueEditor } from "@/features/editor/components/ValueEditor";
import { isColorProperty } from "@/features/editor/lib/color-value";
import {
  declarationKey,
  originalDeclaration,
  removeStyleDeclaration,
  ruleLocation,
} from "@/features/editor/lib/editor-model";
import {
  editDeclaration,
  friendlyName,
  guidedProperties,
} from "@/features/theme/lib/theme-source";
import type {
  ThemeAnalysis,
  ThemeDeclaration,
} from "@/features/theme/theme-types";

type Props = {
  decl: ThemeDeclaration;
  analysis: ThemeAnalysis;
  original: ThemeAnalysis;
  showCode: boolean;
  duplicate: boolean;
  disabled: boolean;
  deletable?: boolean;
  onEdit: (text: string, group?: string) => void;
  onJump: (offset: number) => void;
};
export function DeclarationField({
  decl,
  analysis,
  original,
  showCode,
  duplicate,
  disabled,
  deletable,
  onEdit,
  onJump,
}: Props) {
  const rule = analysis.rules.find((r) => r.id === decl.ruleId)!;
  const originalValue = originalDeclaration(decl, analysis, original)?.value;
  const repeatedLocation =
    analysis.rules
      .filter((r) => ruleLocation(r) === ruleLocation(rule))
      .flatMap((r) => r.declarations)
      .filter((d) => d.property === decl.property).length > 1;
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="min-w-0 text-xs font-medium wrap-anywhere">
            {guidedProperties.find((p) => p.property === decl.property)
              ?.label ?? friendlyName(decl.property)}
          </span>
          {(duplicate || showCode) && (
            <span className="max-w-full font-mono text-[10px] wrap-anywhere text-subtle-foreground">
              {ruleLocation(rule)}
              {showCode && ` · ${decl.property}`}
              {repeatedLocation && ` · L${decl.line}`}
            </span>
          )}
          {decl.important && <Badge variant="outline">!important</Badge>}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {originalValue !== undefined && originalValue !== decl.value && (
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Restore original ${decl.property}`}
              disabled={disabled}
              onClick={() =>
                onEdit(
                  editDeclaration(
                    analysis.source,
                    analysis,
                    decl,
                    originalValue,
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
            aria-label={`View in CSS: ${decl.property}`}
            onClick={() => onJump(decl.from)}
          >
            <ArrowUpRightIcon />
          </Button>
          {deletable && (
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Delete ${decl.property}`}
              disabled={disabled}
              onClick={() =>
                onEdit(removeStyleDeclaration(analysis, decl, original))
              }
            >
              <Trash2Icon />
            </Button>
          )}
        </div>
      </div>
      <ValueEditor
        label={decl.property}
        colorProperty={isColorProperty(decl.property)}
        value={decl.value}
        disabled={disabled}
        onCommit={(value) =>
          onEdit(
            editDeclaration(analysis.source, analysis, decl, value),
            declarationKey(decl, analysis),
          )
        }
      />
      {(decl.note ?? decl.comment) && (
        <p className="mt-1.5 text-[10px] leading-[1.65] whitespace-pre-line text-muted-foreground">
          {(decl.note ?? decl.comment)
            .split("\n")
            .map((line) => `// ${line}`)
            .join("\n")}
        </p>
      )}
    </div>
  );
}
