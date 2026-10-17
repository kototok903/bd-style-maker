export function colorPickerValue(
  value: string,
): { hex: string; alpha: string } | null {
  const match = value.match(/^#([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i);
  if (match) {
    const full =
      match[1].length <= 4
        ? [...match[1]].map((c) => c + c).join("")
        : match[1];
    return { hex: "#" + full.slice(0, 6), alpha: full.slice(6) || "ff" };
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
