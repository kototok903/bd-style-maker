import { PipetteIcon } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOpacity,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  colorPickerValue,
  pickedColorValue,
} from "@/features/editor/lib/color-value";

type Props = {
  value: string;
  label: string;
  placeholder?: string;
  colorProperty?: boolean;
  onCommit: (value: string) => void;
  disabled?: boolean;
  onDraftChange?: (value: string) => void;
};
export function ValueEditor({
  value,
  label,
  placeholder,
  colorProperty = false,
  onCommit,
  disabled,
  onDraftChange,
}: Props) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  useEffect(() => {
    setDraft(value);
    setError("");
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
  const pickerColor = color
    ? color.hex + color.alpha
    : colorProperty
      ? "#a7b7ff"
      : null;
  return (
    <Field data-invalid={!!error} data-disabled={disabled}>
      <FieldLabel htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <div className="flex items-center gap-2">
        {pickerColor && (
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`${label} color picker`}
                  disabled={disabled}
                  className="shrink-0 p-1"
                />
              }
            >
              {color ? (
                <span
                  className="size-full rounded-sm"
                  style={{
                    background:
                      "repeating-conic-gradient(var(--preview-checker) 0 25%,var(--preview-checker-alt) 0 50%) 0/8px 8px",
                  }}
                >
                  <span
                    className="block size-full rounded-sm"
                    style={{ backgroundColor: color.hex + color.alpha }}
                  />
                </span>
              ) : (
                <PipetteIcon />
              )}
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="max-w-[calc(100vw-24px)] p-4"
            >
              <PopoverTitle>{label}</PopoverTitle>
              <ColorPicker
                value={pickerColor}
                onChange={(rgba) => {
                  const next = pickedColorValue(draft, rgba);
                  const same = colorPickerValue(next);
                  if (
                    color &&
                    same?.hex.toLowerCase() === color.hex.toLowerCase() &&
                    same?.alpha.toLowerCase() === color.alpha.toLowerCase()
                  )
                    return;
                  setDraft(next);
                  commit(next);
                }}
              >
                <ColorPickerSelection aria-label="Color saturation and brightness" />
                <ColorPickerHue aria-label="Color hue" />
                <ColorPickerOpacity />
                <ColorPickerAlpha aria-label="Color opacity" />
                <div className="flex items-center gap-2">
                  <ColorPickerEyeDropper />
                  <ColorPickerOutput />
                </div>
                <ColorPickerFormat />
              </ColorPicker>
            </PopoverContent>
          </Popover>
        )}
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          aria-label={`${label} CSS value`}
          aria-invalid={!!error}
          disabled={disabled}
          spellCheck={false}
          className="min-w-0 flex-1"
          onChange={(event) => {
            setDraft(event.target.value);
            onDraftChange?.(event.target.value);
          }}
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
        />
      </div>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
