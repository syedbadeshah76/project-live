import * as React from "react";
import { ChevronDown, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type Item = {
  label: string;
  value: string;
};

type SearchableSelectProps = {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function SearchableSelect({
  items,
  value,
  onChange,
  placeholder = "Search...",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const selectedLabel = React.useMemo(
    () => items.find((item) => item.value === value)?.label ?? "",
    [items, value],
  );

  React.useEffect(() => {
    setSearch(selectedLabel);
  }, [selectedLabel]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearch(selectedLabel);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedLabel]);

  const filteredItems = React.useMemo(
    () =>
      items.filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase()),
      ),
    [items, search],
  );

  const selectItem = (item: Item) => {
    setSearch(item.label);
    onChange(item.value);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Input
          value={search}
          disabled={disabled}
          readOnly={disabled}
          placeholder={placeholder}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (disabled) return;

            if (event.key === "Enter") {
              if (open && filteredItems.length > 0) {
                event.preventDefault();
                event.stopPropagation();
                selectItem(filteredItems[0]);
              }
              return;
            }

            if (event.key === "Escape") {
              setOpen(false);
              setSearch(selectedLabel);
            }
          }}
          onChange={(e) => {
            if (disabled) return;
            setSearch(e.target.value);
            onChange("");
            setOpen(true);
          }}
          className="pr-10 h-11"
        />

        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-background shadow-lg">
          {filteredItems.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              No results found.
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                type="button"
                key={item.value}
                onClick={() => selectItem(item)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}

                {value === item.value && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
