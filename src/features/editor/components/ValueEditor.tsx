import { useEffect, useId, useState } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ChoiceSelect } from "@/features/editor/components/ChoiceSelect";

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
  const color = /^#[a-f\d]{6}$/i.test(draft)
    ? draft
    : /^#[a-f\d]{3}$/i.test(draft)
      ? "#" +
        draft
          .slice(1)
          .split("")
          .map((s) => s + s)
          .join("")
      : null;
  return (
    <Field data-invalid={!!error} data-disabled={disabled}>
      <FieldLabel htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <div className="value-controls">
        {color && !binding && (
          <input
            type="color"
            value={color}
            aria-label={`${label} color picker`}
            disabled={disabled}
            onChange={(event) => {
              setDraft(event.target.value);
              commit(event.target.value);
            }}
            className="color-input"
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
        <div className="binding-controls">
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
