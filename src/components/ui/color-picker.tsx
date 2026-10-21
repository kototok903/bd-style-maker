"use client";

// Installed from shadcn.io's color-picker registry. Adapted to Base UI;
// controlled colors and zero-valued channels are preserved, and callbacks only
// fire for user changes (opening a picker never edits the source).
import { Slider } from "@base-ui/react/slider";
import Color from "color";
import { PipetteIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes, PointerEvent } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type PickerRGBA = [number, number, number, number];
type Channels = {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
};
type PickerContext = Channels & {
  mode: string;
  setMode: (mode: string) => void;
  update: (patch: Partial<Channels>) => void;
};
const ColorPickerContext = createContext<PickerContext | null>(null);
function useColorPicker() {
  const context = useContext(ColorPickerContext);
  if (!context) throw new Error("Color picker controls require ColorPicker.");
  return context;
}
function channels(value: string): Channels {
  const color = Color(value);
  return {
    hue: color.hue(),
    saturation: color.saturationl(),
    lightness: color.lightness(),
    alpha: color.alpha() * 100,
  };
}
export type ColorPickerProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange"
> & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: PickerRGBA) => void;
};
export function ColorPicker({
  value,
  defaultValue = "#000000",
  onChange,
  className,
  ...props
}: ColorPickerProps) {
  const [color, setColor] = useState(() => channels(value ?? defaultValue));
  const [mode, setMode] = useState("hex");
  const current = useRef(color);
  const emitted = useRef<string | null>(null);
  useEffect(() => {
    if (
      value === undefined ||
      (emitted.current !== null && Color(value).hexa() === emitted.current)
    )
      return;
    const next = channels(value);
    current.current = next;
    setColor(next);
  }, [value]);
  function update(patch: Partial<Channels>) {
    const next = { ...current.current, ...patch };
    current.current = next;
    setColor(next);
    const rgb = Color.hsl(next.hue, next.saturation, next.lightness)
      .alpha(next.alpha / 100)
      .rgb();
    emitted.current = rgb.hexa();
    onChange?.([rgb.red(), rgb.green(), rgb.blue(), next.alpha / 100]);
  }
  return (
    <ColorPickerContext.Provider value={{ ...color, mode, setMode, update }}>
      <div className={cn("flex w-full flex-col gap-4", className)} {...props} />
    </ColorPickerContext.Provider>
  );
}
export function ColorPickerSelection({
  className,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const { hue, saturation, lightness, update } = useColorPicker();
  const hsv = Color.hsl(hue, saturation, lightness).hsv();
  function choose(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const s = Math.max(
      0,
      Math.min(100, ((event.clientX - rect.left) / rect.width) * 100),
    );
    const v = Math.max(
      0,
      Math.min(100, 100 - ((event.clientY - rect.top) / rect.height) * 100),
    );
    const hsl = Color.hsv(hue, s, v).hsl();
    update({ saturation: hsl.saturationl(), lightness: hsl.lightness() });
  }
  return (
    <div
      className={cn(
        "relative h-36 w-full cursor-crosshair touch-none rounded-md",
        className,
      )}
      style={{
        background: `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,transparent),hsl(${hue},100%,50%)`,
        ...style,
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        choose(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          choose(event);
      }}
      {...props}
    >
      <span
        className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
        style={{ left: `${hsv.saturationv()}%`, top: `${100 - hsv.value()}%` }}
      />
    </div>
  );
}
type PickerSliderProps = {
  id?: string;
  className?: string;
  "aria-label"?: string;
};
function PickerSlider({
  kind,
  className,
  id,
  "aria-label": label,
}: PickerSliderProps & { kind: "hue" | "alpha" }) {
  const { hue, saturation, lightness, alpha, update } = useColorPicker();
  const rgb = Color.hsl(hue, saturation, lightness)
    .rgb()
    .array()
    .slice(0, 3)
    .join(",");
  return (
    <Slider.Root
      id={id}
      value={kind === "hue" ? hue : alpha}
      min={0}
      max={kind === "hue" ? 360 : 100}
      step={1}
      onValueChange={(value: number) =>
        update(kind === "hue" ? { hue: value } : { alpha: value })
      }
      className={cn("w-full", className)}
    >
      <Slider.Control className="relative flex h-5 w-full touch-none items-center select-none">
        <Slider.Track
          className="relative h-3 w-full rounded-full"
          style={{
            background:
              kind === "hue"
                ? "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)"
                : `linear-gradient(to right,rgba(${rgb},0),rgb(${rgb})),repeating-conic-gradient(#737783 0 25%,#414550 0 50%) 0/8px 8px`,
          }}
        >
          <Slider.Thumb
            aria-label={label ?? (kind === "hue" ? "Hue" : "Opacity")}
            className="size-4 rounded-full border border-primary/50 bg-background shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}
export function ColorPickerHue(props: PickerSliderProps) {
  return <PickerSlider kind="hue" {...props} />;
}
export function ColorPickerAlpha(props: PickerSliderProps) {
  return <PickerSlider kind="alpha" {...props} />;
}
export function ColorPickerOpacity() {
  const { alpha, update } = useColorPicker();
  return (
    <label className="flex items-center justify-between gap-3 text-xs">
      Opacity
      <span className="flex items-center gap-1">
        <Input
          aria-label="Color opacity percentage"
          type="number"
          min={0}
          max={100}
          step={1}
          value={Math.round(alpha)}
          onChange={(event) => {
            if (event.target.value !== "")
              update({
                alpha: Math.max(0, Math.min(100, Number(event.target.value))),
              });
          }}
          className="w-20"
        />
        <span className="text-muted-foreground">%</span>
      </span>
    </label>
  );
}
export function ColorPickerEyeDropper(props: ComponentProps<typeof Button>) {
  const { update } = useColorPicker();
  const supported = typeof window !== "undefined" && "EyeDropper" in window;
  async function pick() {
    if (!supported) return;
    const EyeDropper = (
      window as unknown as {
        EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> };
      }
    ).EyeDropper;
    try {
      const result = await new EyeDropper().open();
      update(channels(result.sRGBHex));
    } catch {
      /* Escape cancels sampling. */
    }
  }
  return (
    <Button
      size="icon-sm"
      variant="outline"
      type="button"
      aria-label="Sample screen color"
      disabled={!supported}
      onClick={pick}
      {...props}
    >
      <PipetteIcon />
    </Button>
  );
}
const formats = ["hex", "rgb", "css", "hsl"].map((value) => ({
  value,
  label: value.toUpperCase(),
}));
export function ColorPickerOutput() {
  const { mode, setMode } = useColorPicker();
  return (
    <Select
      value={mode}
      items={formats}
      onValueChange={(value) => {
        if (value) setMode(value);
      }}
    >
      <SelectTrigger aria-label="Color format" className="w-20 shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {formats.map((format) => (
            <SelectItem key={format.value} value={format.value}>
              {format.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
export function ColorPickerFormat() {
  const { hue, saturation, lightness, alpha, mode } = useColorPicker();
  const color = Color.hsl(hue, saturation, lightness).alpha(alpha / 100);
  const output =
    mode === "hex"
      ? alpha === 100
        ? color.hex()
        : color.hexa()
      : mode === "hsl"
        ? color.hsl().round(2).string()
        : mode === "rgb"
          ? color.rgb().round().array().slice(0, 3).join(", ")
          : color.rgb().round().string();
  return (
    <Input
      aria-label="Formatted color"
      readOnly
      value={output}
      className="min-w-0 flex-1"
    />
  );
}
