import { Check } from "lucide-react";
import { CATEGORY_COLOR_PALETTE } from "@/lib/category.utils";
import { Input } from "@/components/ui/input";

interface Props {
  value: string;
  onChange: (color: string) => void;
}

export function CategoryColorPicker({ value, onChange }: Props) {
  const currentColor = value || "#2563EB";
  const isInPalette = CATEGORY_COLOR_PALETTE.some(
    (c) => c.toLowerCase() === currentColor.toLowerCase(),
  );

  return (
    <div className="space-y-2">
      <div
        className="flex flex-wrap gap-2 items-center"
        role="radiogroup"
        aria-label="Category color"
      >
        {CATEGORY_COLOR_PALETTE.map((color) => {
          const active = currentColor.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Select color ${color}`}
              onClick={() => onChange(color)}
              className={`h-8 w-8 sm:h-9 sm:w-9 rounded-md border-2 grid place-items-center transition shrink-0 ${
                active
                  ? "border-foreground scale-110 shadow-sm"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: color }}
            >
              {active ? <Check className="h-4 w-4 text-white drop-shadow" /> : null}
            </button>
          );
        })}

        {/* If the current color is not in the predefined palette, show it as an active swatch */}
        {!isInPalette && currentColor ? (
          <button
            type="button"
            role="radio"
            aria-checked={true}
            aria-label={`Current custom color ${currentColor}`}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-md border-2 border-foreground scale-110 shadow-sm grid place-items-center transition shrink-0"
            style={{ backgroundColor: currentColor }}
          >
            <Check className="h-4 w-4 text-white drop-shadow" />
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="color"
          value={currentColor.startsWith("#") && currentColor.length === 7 ? currentColor : "#2563EB"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-9 p-0.5 rounded border border-border cursor-pointer bg-background"
          aria-label="Custom color picker"
        />
        <Input
          value={currentColor}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#2563EB"
          className="h-8 text-xs font-mono max-w-[120px]"
        />
      </div>
    </div>
  );
}

