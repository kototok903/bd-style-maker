import { useEffect, useId, useMemo, useState } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ChoiceSelect } from "@/features/editor/components/ChoiceSelect";
import { colorPickerValue } from "@/features/editor/lib/color-value";

type Props = {
  value: string;
  label: string;
  variables: string[];
  onCommit: (value: string) => void;
  disabled?: boolean;
  allowBinding?: boolean;
};

export function ValueEditor({
  value,
  label,
  variables,
  onCommit,
  disabled,
  allowBinding = true,
}: Props) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  const [binding, setBinding] = useState(/^var\(/.test(value));
  useEffect(() => {
    setDraft(value);
    setError("");
    setBinding(/^var\(/.test(value));
  }, [value]);
  function commit(next: string) {
    try {
      onCommit(next);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update this value.");
    }
  }
  const color = useMemo(() => colorPickerValue(draft), [draft]);
  return (
    <Field data-invalid={!!error} data-disabled={disabled}>
      <FieldLabel htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <div className="flex items-center gap-2">
        {color && !binding && (
          <input
            type="color"
            value={color.hex}
            aria-label={`${label} color picker`}
            disabled={disabled}
            onChange={(event) => {
              const next =
                event.target.value + (color.alpha === "ff" ? "" : color.alpha);
              setDraft(next);
              commit(next);
            }}
            className="size-[30px] shrink-0 cursor-pointer rounded-[7px] border border-input bg-editor-surface p-[3px] [&::-webkit-color-swatch]:rounded-[3px] [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
          />
        )}
        <Input
          id={id}
          value={draft}
          aria-label={`${label} CSS value`}
          aria-invalid={!!error}
          disabled={disabled}
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (draft !== value) commit(draft);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(draft);
            }
            if (event.key === "Escape") {
              setDraft(value);
              setError("");
            }
          }}
          className="min-w-0 flex-1"
        />
      </div>
      {allowBinding && (
        <div className="flex min-w-0 items-center gap-1.5 [&>button]:min-w-0 [&>button]:flex-1">
          <ChoiceSelect
            label={`${label} value type`}
            value={binding ? "variable" : "literal"}
            options={[
              { label: "Direct value", value: "literal" },
              { label: "CSS variable", value: "variable" },
            ]}
            disabled={disabled}
            onChange={(mode) => {
              setBinding(mode === "variable");
            }}
          />
          {binding && (
            <ChoiceSelect
              label={`${label} variable`}
              value={variables.find((v) => draft === `var(${v})`) ?? "custom"}
              options={[
                { label: "Custom expression", value: "custom" },
                ...variables.map((v) => ({ label: v, value: v })),
              ]}
              disabled={disabled}
              onChange={(variable) => {
                if (variable !== "custom") {
                  const next = `var(${variable})`;
                  setDraft(next);
                  commit(next);
                }
              }}
            />
          )}
        </div>
      )}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
