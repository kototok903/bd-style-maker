import { afterEach, expect, it, vi } from "vitest";

import {
  colorPickerValue,
  pickedColorValue,
} from "@/features/editor/lib/color-value";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("preserves transparent channel values and leaves expressions as text", () => {
  expect(colorPickerValue("rgba(255, 0, 0, 0)")).toEqual({
    hex: "#FF0000",
    alpha: "00",
  });
  expect(colorPickerValue("#fff0")).toEqual({ hex: "#ffffff", alpha: "00" });
  expect(colorPickerValue("var(--accent)")).toBeNull();
  expect(colorPickerValue("rgb(from var(--color) r g b)")).toBeNull();
  expect(colorPickerValue("currentColor")).toBeNull();
});
it("changes alpha without rewriting existing function channels, including oklch", () => {
  expect(pickedColorValue("rgb(255, 0, 0)", [255, 0, 0, 0.5])).toBe(
    "rgba(255, 0, 0, 0.5)",
  );
  expect(pickedColorValue("rgba(255,0,0,.8)", [255, 0, 0, 0.5])).toBe(
    "rgba(255,0,0,0.5)",
  );
  expect(pickedColorValue("hsl(0 100% 50%)", [255, 0, 0, 0.5])).toBe(
    "hsl(0 100% 50% / 0.5)",
  );
  vi.stubGlobal("CSS", { supports: () => true });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillStyle: "",
    fillRect: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray([20, 20, 20, 255]) }),
  } as unknown as CanvasRenderingContext2D);
  expect(pickedColorValue("oklch(19% 0 0)", [20, 20, 20, 0.5])).toBe(
    "oklch(19% 0 0 / 0.5)",
  );
  expect(pickedColorValue("oklch(19% 0 0 / .7)", [20, 20, 20, 0.5])).toBe(
    "oklch(19% 0 0 / 0.5)",
  );
});
