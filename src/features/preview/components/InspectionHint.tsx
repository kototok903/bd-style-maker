import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export function InspectionHint() {
  const hint = useRef<HTMLDivElement>(null);
  const [corner, setCorner] = useState<Corner>("top-left");
  return (
    <div
      ref={hint}
      className={cn(
        "absolute z-10 w-fit max-w-[calc(100%-24px)] rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md",
        corner.startsWith("top") ? "top-3" : "bottom-3",
        corner.endsWith("left") ? "left-3" : "right-3",
      )}
      role="status"
      onPointerEnter={(event) => {
        const element = hint.current;
        if (!element?.parentElement) return;
        const area = element.parentElement.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        const opposite = corner.endsWith("left") ? "right" : "left";
        const options: Corner[] = [
          `top-${opposite}`,
          `bottom-${opposite}`,
          `bottom-${corner.endsWith("left") ? "left" : "right"}`,
        ];
        const next = options.find((option) => {
          const left = option.endsWith("left")
            ? area.left + 12
            : area.right - box.width - 12;
          const top = option.startsWith("top")
            ? area.top + 12
            : area.bottom - box.height - 12;
          return (
            event.clientX < left - 8 ||
            event.clientX > left + box.width + 8 ||
            event.clientY < top - 8 ||
            event.clientY > top + box.height + 8
          );
        });
        if (next) setCorner(next);
      }}
    >
      Click an element to inspect it. Esc cancels.
    </div>
  );
}
