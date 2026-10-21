import Color from "color";
import valueParser from "postcss-value-parser";

export function isColorProperty(property: string) {
  return (
    !property.startsWith("--") &&
    (property === "color" ||
      property.endsWith("-color") ||
      property === "fill" ||
      property === "stroke")
  );
}

export function colorPickerValue(
  value: string,
): { hex: string; alpha: string } | null {
  if (/\b(?:var|env)\(|\bcurrentcolor\b/i.test(value)) return null;
  const match = value.match(/^#([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i);
  if (match) {
    const full =
      match[1].length <= 4
        ? [...match[1]].map((c) => c + c).join("")
        : match[1];
    return { hex: "#" + full.slice(0, 6), alpha: full.slice(6) || "ff" };
  }
  try {
    const parsed = Color(value);
    return {
      hex: parsed.hex(),
      alpha: Math.round(parsed.alpha() * 255)
        .toString(16)
        .padStart(2, "0"),
    };
  } catch {
    /* Modern CSS color spaces use the browser conversion below. */
  }
  // A picker is only a view of a literal color. Expressions keep their source notation.
  if (
    !/^(?:[a-z]+|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\(.*\))$/i.test(
      value,
    ) ||
    /^(inherit|initial|unset|revert|revert-layer|currentcolor)$/i.test(value) ||
    typeof CSS === "undefined" ||
    !CSS.supports("color", value)
  )
    return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const channels = [...context.getImageData(0, 0, 1, 1).data].map((n) =>
    n.toString(16).padStart(2, "0"),
  );
  return { hex: "#" + channels.slice(0, 3).join(""), alpha: channels[3] };
}

/** Changing alpha alone retains the literal color's channel notation. */
export function pickedColorValue(value: string, rgba: readonly number[]) {
  const rgb = rgba.slice(0, 3).map((n) => Math.round(n));
  const alpha = Math.max(0, Math.min(1, rgba[3] ?? 1));
  const original = colorPickerValue(value);
  const hex = "#" + rgb.map((n) => n.toString(16).padStart(2, "0")).join("");
  if (
    original?.hex.toLowerCase() === hex.toLowerCase() &&
    value.includes("(")
  ) {
    const parsed = valueParser(value);
    const fn = parsed.nodes.find((node) => node.type === "function");
    if (fn?.type === "function") {
      const commas = fn.nodes.filter(
        (node) => node.type === "div" && node.value === ",",
      );
      const slash = fn.nodes.findIndex(
        (node) => node.type === "div" && node.value === "/",
      );
      const alphaWord = {
        type: "word" as const,
        value: String(Number(alpha.toFixed(3))),
        sourceIndex: 0,
        sourceEndIndex: 0,
      };
      if (slash >= 0 || commas.length === 3) {
        const index = fn.nodes.findLastIndex(
          (node) => node.type !== "space" && node.type !== "comment",
        );
        fn.nodes[index] = alphaWord;
      } else if (commas.length === 2 && /^(rgb|hsl)$/i.test(fn.value)) {
        fn.value += "a";
        fn.nodes.push(
          {
            type: "div",
            value: ",",
            before: "",
            after: " ",
            sourceIndex: 0,
            sourceEndIndex: 0,
          },
          alphaWord,
        );
      } else {
        fn.nodes.push(
          { type: "space", value: " ", sourceIndex: 0, sourceEndIndex: 0 },
          {
            type: "div",
            value: "/",
            before: "",
            after: " ",
            sourceIndex: 0,
            sourceEndIndex: 0,
          },
          alphaWord,
        );
      }
      return parsed.toString();
    }
  }
  return (
    hex +
    (alpha === 1
      ? ""
      : Math.round(alpha * 255)
          .toString(16)
          .padStart(2, "0"))
  );
}
