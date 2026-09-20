import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { categoriesService } from "@/services/categories.service";
import type {
  Category,
  CategoryStats,
  CategoryStatus,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "@/types/api.types";

interface UseCategoriesState {
  tree: Category[]; // parents with subcategories nested
  stats: CategoryStats | null;
  loading: boolean;
  statsLoading: boolean;
  error: string | null;
  search: string;
  status: CategoryStatus | "all";
}

function extractError(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const e = err as {
      message?: string;
      response?: { data?: { message?: string } };
    };
    return e.response?.data?.message || e.message || fallback;
  }
  return fallback;
}

/** Filter tree while preserving parents when a child matches. */
function filterTree(
  nodes: Category[],
  search: string,
  status: CategoryStatus | "all",
): Category[] {
  const q = search.trim().toLowerCase();
  const out: Category[] = [];
  for (const n of nodes) {
    const kids = n.subcategories
      ? filterTree(n.subcategories, search, status)
      : [];
    const matchesQuery =
      !q ||
      n.name.toLowerCase().includes(q) ||
      n.slug.toLowerCase().includes(q) ||
      (n.description ?? "").toLowerCase().includes(q);
    const isNodeActive = n.status === "active" || n.isActive === true;
    const matchesStatus =
      status === "all" ||
      (status === "active" && isNodeActive) ||
      (status === "archived" && !isNodeActive);
    if ((matchesQuery && matchesStatus) || kids.length) {
      out.push({ ...n, subcategories: kids.length ? kids : undefined });
    }
  }
  return out;
}

/** Flatten tree — useful for grids and parent pickers. */
function flatten(nodes: Category[]): Category[] {
  const out: Category[] = [];
  const walk = (list: Category[]) => {
    for (const n of list) {
      out.push(n);
      if (n.subcategories?.length) walk(n.subcategories);
    }
  };
  walk(nodes);
  return out;
}

export function useCategories() {
  const [state, setState] = useState<UseCategoriesState>({
    tree: [],
    stats: null,
    loading: true,
    statsLoading: true,
    error: null,
    search: "",
    status: "all",
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, statsLoading: true, error: null }));
    try {
      const res = await categoriesService.getCategoryTree();
      const tree = res.data;
      // stats computed locally against the tree
      const statsRes = await categoriesService.getCategoryStats();
      setState((s) => ({
        ...s,
        tree,
        stats: statsRes.data,
        loading: false,
        statsLoading: false,
      }));
    } catch (err) {
      const msg = extractError(err, "Failed to load categories");
      setState((s) => ({
        ...s,
        loading: false,
        statsLoading: false,
        error: msg,
      }));
      toast.error(msg);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Debounce search for UX; actual filtering is client-side against the tree.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // trigger re-render via state noop — filtering is derived below
      setState((s) => ({ ...s }));
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state.search, state.status]);

  const filteredTree = useMemo(
    () => filterTree(state.tree, state.search, state.status),
    [state.tree, state.search, state.status],
  );

  const categories = useMemo(() => flatten(filteredTree), [filteredTree]);
  const allFlat = useMemo(() => flatten(state.tree), [state.tree]);

  const setSearch = (search: string) => setState((s) => ({ ...s, search }));
  const setStatus = (status: CategoryStatus | "all") =>
    setState((s) => ({ ...s, status }));

  const refresh = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  const createCategory = async (payload: CreateCategoryRequest) => {
    try {
      const res = await categoriesService.createCategory(payload);
      toast.success("Category created");
      await refresh();
      return res.data;
    } catch (err) {
      const msg = extractError(err, "Failed to create category");
      toast.error(msg);
      throw err;
    }
  };

  const updateCategory = async (id: string, payload: UpdateCategoryRequest) => {
    try {
      const res = await categoriesService.updateCategory(id, payload);
      toast.success("Category updated");
      await refresh();
      return res.data;
    } catch (err) {
      const msg = extractError(err, "Failed to update category");
      toast.error(msg);
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await categoriesService.deleteCategory(id);
      toast.success("Category deleted");
      await refresh();
    } catch (err) {
      const msg = extractError(err, "Failed to delete category");
      toast.error(msg);
      throw err;
    }
  };

  return {
    // data
    tree: filteredTree, // filtered tree (parents with nested subcategories)
    categories, // filtered flat list
    allCategories: allFlat,
    totalCount: allFlat.length,
    parentOptions: allFlat.filter((c) => !c.parentId), // top-level for parent picker
    stats: state.stats,
    loading: state.loading,
    statsLoading: state.statsLoading,
    error: state.error,
    // filters
    search: state.search,
    status: state.status,
    setSearch,
    setStatus,
    // actions
    refresh,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
