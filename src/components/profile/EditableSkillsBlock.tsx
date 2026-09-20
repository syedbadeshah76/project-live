import { useEffect, useRef, useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { profileService, type SkillField } from "@/services/profile.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EditableSkillsBlockProps {
  title: string;
  field: SkillField;
  initialSkills: string[];
  onChange?: (skills: string[]) => void;
}

/**
 * Searchable, addable, removable skill list.
 * - Typing shows live suggestions from profileService.suggestSkills.
 * - Clicking a suggestion adds it.
 * - Pressing Enter adds free-form text (custom skills like "Web Dev React").
 * - Each chip has an × to remove. All mutations persist via profileService.
 */
export const EditableSkillsBlock = ({
  title,
  field,
  initialSkills,
  onChange,
}: EditableSkillsBlockProps) => {
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSkills(initialSkills), [initialSkills]);

  // Debounced suggestion fetch
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      try {
        const res = await profileService.suggestSkills(query);
        if (res.success) setSuggestions(res.data);
      } catch {
        /* ignore */
      }
    }, 150);
    return () => clearTimeout(t);
  }, [query, open]);

  // Click-outside closes dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isAlreadyAdded = (value: string) =>
    skills.some((s) => s.toLowerCase() === value.toLowerCase());

  const addSkill = async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    if (isAlreadyAdded(value)) {
      toast.info(`"${value}" is already in your list`);
      setQuery("");
      return;
    }
    setBusyKey(`add:${value}`);
    try {
      const res = await profileService.addSkill(field, value);
      if (res.success) {
        setSkills(res.data.items);
        onChange?.(res.data.items);
        setQuery("");
        toast.success(`Added "${value}"`);
      }
    } catch {
      toast.error(`Failed to add "${value}"`);
    } finally {
      setBusyKey(null);
    }
  };

  const removeSkill = async (value: string) => {
    setBusyKey(`del:${value}`);
    try {
      const res = await profileService.removeSkill(field, value);
      if (res.success) {
        setSkills(res.data.items);
        onChange?.(res.data.items);
      }
    } catch {
      toast.error(`Failed to remove "${value}"`);
    } finally {
      setBusyKey(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim()) addSkill(query);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const visibleSuggestions = suggestions.filter((s) => !isAlreadyAdded(s));
  const trimmed = query.trim();
  const showCreate =
    trimmed.length > 0 &&
    !isAlreadyAdded(trimmed) &&
    !visibleSuggestions.some((s) => s.toLowerCase() === trimmed.toLowerCase());

  return (
    <div className="bg-card rounded-2xl border border-border p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-lg font-bold text-card-foreground">{title}</h3>
        <div ref={containerRef} className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            placeholder={`Search ${title.toLowerCase()}`}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            aria-label={`Search and add ${title.toLowerCase()}`}
            className="w-full text-sm border rounded-full pl-8 pr-3 py-1.5 bg-background text-card-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
          {open && (visibleSuggestions.length > 0 || showCreate) && (
            <div
              role="listbox"
              className="absolute z-30 left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto"
            >
              {visibleSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="option"
                  onClick={() => addSkill(s)}
                  disabled={busyKey === `add:${s}`}
                  className="w-full text-left px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors disabled:opacity-60"
                >
                  {s}
                </button>
              ))}
              {showCreate && (
                <button
                  type="button"
                  role="option"
                  onClick={() => addSkill(trimmed)}
                  disabled={busyKey === `add:${trimmed}`}
                  className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-accent flex items-center gap-2 border-t border-border disabled:opacity-60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add "<span className="font-medium">{trimmed}</span>"
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {skills.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No {title.toLowerCase()} yet. Search above to add one.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <Badge
              key={skill}
              variant="outline"
              className={cn(
                "rounded-full pl-3 pr-1.5 py-1 text-sm font-normal text-[#604BD6] bg-[#F1EEFF] border-[#604BD6] hover:bg-[#604BD6]/10 cursor-default flex items-center gap-1.5",
                busyKey === `del:${skill}` && "opacity-50"
              )}
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                disabled={busyKey === `del:${skill}`}
                aria-label={`Remove ${skill}`}
                className="ml-0.5 inline-flex items-center justify-center h-4 w-4 rounded-full hover:bg-[#604BD6]/20 text-[#604BD6]"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
