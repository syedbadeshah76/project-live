import { useEffect, useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryColorPicker } from "./CategoryColorPicker";
import { slugify } from "@/lib/category.utils";
import type { Category, CreateCategoryRequest } from "@/types/api.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateCategoryRequest) => Promise<unknown>;
  parentOptions?: Category[];
}

interface FormValues {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  iconUrl: string;
  color: string;
  sortOrder: string;
}

type Errors = Partial<Record<keyof FormValues, string>>;

const NONE = "__none__";

const initial: FormValues = {
  name: "",
  slug: "",
  description: "",
  parentId: "",
  iconUrl: "",
  color: "#2563EB",
  sortOrder: "0",
};

export function CategoryCreateModal({
  open,
  onOpenChange,
  onSubmit,
  parentOptions = [],
}: Props) {
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setValues(initial);
      setErrors({});
      setSubmitting(false);
    }
  }, [open]);

  const setField =
    <K extends keyof FormValues>(key: K) =>
    (v: FormValues[K]) => {
      setValues((s) => ({ ...s, [key]: v }));
      setErrors((e) => ({ ...e, [key]: undefined }));
    };

  const autoSlug = () => setField("slug")(slugify(values.name || ""));

  const validate = (): Errors => {
    const e: Errors = {};
    if (!values.name.trim() || values.name.trim().length < 2)
      e.name = "Name must be at least 2 characters";
    if (!values.slug.trim()) e.slug = "Slug is required";
    else if (!/^[a-z0-9-]+$/.test(values.slug.trim()))
      e.slug = "Slug can only contain lowercase letters, numbers and dashes";
    if (values.sortOrder && Number.isNaN(Number(values.sortOrder)))
      e.sortOrder = "Sort order must be a number";
    return e;
  };

  const parentList = useMemo(
    () => parentOptions.filter((p) => !p.parentId),
    [parentOptions],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateCategoryRequest = {
        name: values.name.trim(),
        slug: values.slug.trim(),
        description: values.description.trim(),
        color: values.color || undefined,
        iconUrl: values.iconUrl.trim() || undefined,
        parentId: values.parentId ? values.parentId : null,
        sortOrder: values.sortOrder ? Number(values.sortOrder) : 0,
        metadata: {
          categoryType: values.parentId ? "SUB" : "MAIN",
        },
      };
      await onSubmit(payload);
      onOpenChange(false);
    } catch (err) {
      const e = err as {
        errors?: Record<string, string[]>;
      };
      if (e?.errors) {
        const next: Errors = {};
        for (const key of Object.keys(e.errors)) {
          next[key as keyof FormValues] = e.errors[key]?.[0];
        }
        setErrors(next);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-4 sm:p-6 rounded-xl sm:rounded-2xl">
        <DialogHeader className="shrink-0 space-y-1 text-left pb-2 border-b border-border/50">
          <DialogTitle className="text-lg sm:text-xl font-semibold">Create Category</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Add a new course category
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 px-1 space-y-3.5 sm:space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cc-name" className="text-xs sm:text-sm font-medium">Category Name</Label>
            <Input
              id="cc-name"
              value={values.name}
              onChange={(e) => setField("name")(e.target.value)}
              aria-invalid={!!errors.name}
              autoFocus
              className="h-9 sm:h-10 text-xs sm:text-sm"
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-medium">Parent Category (optional)</Label>
            <Select
              value={values.parentId || NONE}
              onValueChange={(v) => setField("parentId")(v === NONE ? "" : v)}
            >
              <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm w-full">
                <SelectValue placeholder="None — top-level category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} className="text-xs sm:text-sm">None — top-level category</SelectItem>
                {parentList.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs sm:text-sm">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Leave empty to create a main category. Select a parent to create a subcategory.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cc-slug" className="text-xs sm:text-sm font-medium">Slug (URL-friendly)</Label>
            <div className="flex gap-2">
              <Input
                id="cc-slug"
                value={values.slug}
                onChange={(e) => setField("slug")(e.target.value)}
                aria-invalid={!!errors.slug}
                className="h-9 sm:h-10 text-xs sm:text-sm flex-1 min-w-0"
              />
              <Button type="button" variant="outline" onClick={autoSlug} className="h-9 sm:h-10 text-xs sm:text-sm px-3 shrink-0">
                <Copy className="h-3.5 w-3.5 mr-1" /> Auto
              </Button>
            </div>
            {errors.slug ? (
              <p className="text-xs text-destructive">{errors.slug}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cc-desc" className="text-xs sm:text-sm font-medium">Description</Label>
            <Textarea
              id="cc-desc"
              rows={3}
              value={values.description}
              onChange={(e) => setField("description")(e.target.value)}
              aria-invalid={!!errors.description}
              className="text-xs sm:text-sm min-h-[70px] resize-none"
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cc-icon" className="text-xs sm:text-sm font-medium">Icon URL (optional)</Label>
              <Input
                id="cc-icon"
                placeholder="https://…/icon.png"
                value={values.iconUrl}
                onChange={(e) => setField("iconUrl")(e.target.value)}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-sort" className="text-xs sm:text-sm font-medium">Sort Order</Label>
              <Input
                id="cc-sort"
                type="number"
                value={values.sortOrder}
                onChange={(e) => setField("sortOrder")(e.target.value)}
                aria-invalid={!!errors.sortOrder}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
              {errors.sortOrder ? (
                <p className="text-xs text-destructive">{errors.sortOrder}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-medium">Category Color</Label>
            <CategoryColorPicker
              value={values.color}
              onChange={setField("color")}
            />
          </div>

          <DialogFooter className="shrink-0 pt-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
            >
              {submitting ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
