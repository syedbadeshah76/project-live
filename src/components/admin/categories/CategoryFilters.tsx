import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryStatus } from "@/types/api.types";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  status: CategoryStatus | "all";
  onStatusChange: (v: CategoryStatus | "all") => void;
  total: number;
  shown: number;
}

export function CategoryFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  total,
  shown,
}: Props) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/40 p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="cat-search" className="text-sm font-medium">
            Search Categories..
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="cat-search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search categories..."
              className="pl-9 bg-background"
              aria-label="Search categories"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label className="text-sm font-medium">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => onStatusChange(v as CategoryStatus | "all")}
          >
            <SelectTrigger
              className="bg-background"
              aria-label="Filter by status"
            >
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Showing {shown} of {total} categories
      </p>
    </div>
  );
}
