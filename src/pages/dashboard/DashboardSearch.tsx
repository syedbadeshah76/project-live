// src/pages/DashboardSearch.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { CourseCard } from "@/components/courses/CourseCard";
import { Button } from "@/components/ui/button";
import { categoriesService } from "@/services/categories.service";
import { searchService } from "@/services/search.service";
import { instructorsService, type InstructorOption } from "@/services/instructors.service";
import { enrollmentService } from "@/services/enrollment.service";
import { HandPickedSection } from "@/components/dashboard/HandPickedSection";
import type { Course } from "@/types/api.types";

type MainCategory = { id: string; name: string; slug?: string };
type Subcategory = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string;
  mainCategoryId?: string;
};

type CourseType = "all" | "recorded" | "live";

const PAGE_SIZE = 5;

const DashboardSearch = () => {
  const [params, setParams] = useSearchParams();

  const urlQ = params.get("q") ?? "";
  const urlMain = params.get("main") ?? "all";
  const urlSub = params.get("sub") ?? "all";
  const urlSort = params.get("sort") ?? "latest";
  const urlType = (params.get("type") as CourseType) || "all";
  const urlPage = Number(params.get("page") ?? 0);

  const [query, setQuery] = useState(urlQ);
  const [searchKey, setSearchKey] = useState(0);

  const [megaOpen, setMegaOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);

  const [mains, setMains] = useState<MainCategory[]>([]);
  const [allSubs, setAllSubs] = useState<Subcategory[]>([]);

  const [instructorMap, setInstructorMap] = useState<Record<string, string>>({});

  const [courses, setCourses] = useState<Course[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());

  // Helper to update URL search parameters cleanly without circular loops
  const updateUrlParam = useCallback((updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === "all" || val === "" || (key === "sort" && val === "latest") || (key === "page" && val === "0")) {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    }
    if (next.toString() !== params.toString()) {
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  // Pre-fetch enrolled course IDs once on mount
  useEffect(() => {
    enrollmentService.getEnrolledCourseIds().then(setEnrolledIds).catch(() => {});
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Course[]>([]);

  const megaRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const autoRef = useRef<HTMLDivElement>(null);

  // Sync input value with URL when urlQ changes externally
  useEffect(() => {
    setQuery(urlQ);
  }, [urlQ]);

  // Debounced sync from input typing to URL
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = query.trim();
      if (trimmed !== urlQ) {
        updateUrlParam({ q: trimmed, page: "0" });
      }
    }, 300);

    return () => clearTimeout(t);
  }, [query, urlQ, updateUrlParam]);

  /* ---- Categories ---- */
  useEffect(() => {
    let cancelled = false;
    categoriesService
      .getCategories()
      .then((list: any) => {
        if (cancelled) return;
        const raw = Array.isArray(list) ? list : list?.data ?? [];
        const flat: any[] = [];
        const walk = (nodes: any[], parentId: string | null = null) => {
          for (const n of nodes || []) {
            flat.push({ ...n, parentId: n.parentId ?? parentId });
            if (n.subcategories?.length) walk(n.subcategories, n.id);
            if (n.children?.length) walk(n.children, n.id);
          }
        };
        walk(raw);

        const mainList = flat.filter((c) => !c.parentId);
        const subList = flat.filter((c) => !!c.parentId);

        setMains(mainList.map((c) => ({ id: String(c.id), name: c.name, slug: c.slug })));
        setAllSubs(
          subList.map((c) => ({
            id: String(c.id),
            name: c.name,
            slug: c.slug,
            parentId: String(c.parentId),
            mainCategoryId: String(c.parentId),
          })),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- Instructors ---- */
  useEffect(() => {
    let cancelled = false;
    instructorsService
      .list()
      .then((list) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const inst of list) {
          if (inst.id) map[String(inst.id)] = inst.name;
          if (inst.userId) map[String(inst.userId)] = inst.name;
        }
        setInstructorMap(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- Fetch courses ---- */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    searchService
      .searchFilters({
        keyword: urlQ || undefined,
        categoryIds: urlMain !== "all" ? [urlMain] : undefined,
        subCategoryIds: urlSub !== "all" ? [urlSub] : undefined,
        type: urlType,
        sortBy: urlSort,
        page: urlPage,
        size: PAGE_SIZE,
      })
      .then((res) => {
        if (cancelled) return;
        setCourses(res.courses);
        setTotalPages(res.totalPages || 1);
        setTotalElements(res.totalElements || 0);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.response?.data?.message ?? e?.message ?? "Failed to load courses");
        setCourses([]);
        setTotalPages(1);
        setTotalElements(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [urlQ, urlMain, urlSub, urlSort, urlType, urlPage, searchKey]);

  /* ---- Autocomplete (debounced 250ms) ---- */
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      searchService
        .searchFilters({ keyword: q, size: 6, page: 0, sortBy: "latest" })
        .then((res) => {
          if (!cancelled) setSuggestions(res.courses.slice(0, 6));
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  /* ---- Click-outside ---- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) setMegaOpen(false);
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeOpen(false);
      if (autoRef.current && !autoRef.current.contains(e.target as Node)) setAutoOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const resolveInstructor = useCallback((c: any) => {
    const key = String(c.instructorId ?? c.instructor?.id ?? "");
    return instructorMap[key] ?? "";
  }, [instructorMap]);

  const enrichedCourses = useMemo(
    () => courses.map((c: any) => ({ ...c, instructor: resolveInstructor(c) || c.instructor })),
    [courses, resolveInstructor],
  );

  const subsForActiveMain = useMemo(
    () => (urlMain === "all" ? [] : allSubs.filter((s) => s.mainCategoryId === urlMain)),
    [urlMain, allSubs],
  );

  const megaGroups = useMemo(
    () => mains.map((m) => ({ main: m, subs: allSubs.filter((s) => s.mainCategoryId === m.id) })),
    [mains, allSubs],
  );

  const sectionTitle = (() => {
    if (urlQ) return `Results for "${urlQ}"`;
    if (urlSub !== "all") {
      const s = allSubs.find((x) => x.id === urlSub);
      return s ? `${s.name} Courses` : "Courses";
    }
    return "Courses";
  })();

  const typeLabel =
    urlType === "recorded" ? "Recorded Classes" : urlType === "live" ? "Live Classes" : "All Classes";

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    updateUrlParam({ q: trimmed, page: "0" });
    setAutoOpen(false);
    setSearchKey((k) => k + 1);
  };

  const resetAll = useCallback(() => {
    setQuery("");
    setParams(new URLSearchParams(), { replace: true });
    setSearchKey((k) => k + 1);
  }, [setParams]);

  const onPickMain = (id: string) => {
    updateUrlParam({ main: id, sub: "all", page: "0" });
    setMegaOpen(false);
  };

  /* ---- Pagination helpers ---- */
  const canPrev = urlPage > 0;
  const canNext = urlPage < totalPages - 1;
  const pageNumbers = useMemo(() => {
    const pages: (number | "…")[] = [];
    const windowSize = 1;
    for (let i = 0; i < totalPages; i++) {
      if (
        i === 0 ||
        i === totalPages - 1 ||
        (i >= urlPage - windowSize && i <= urlPage + windowSize)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "…") {
        pages.push("…");
      }
    }
    return pages;
  }, [urlPage, totalPages]);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Search input with autocomplete */}
      <form onSubmit={handleSearchSubmit} className="relative" ref={autoRef}>
        <div className="relative flex items-center">
          <button
            type="submit"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            aria-label="Submit search"
          >
            <Search className="h-4 w-4" />
          </button>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setAutoOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearchSubmit(e);
              }
            }}
            onFocus={() => setAutoOpen(true)}
            placeholder="Search courses, categories, instructors…"
            className="w-full pl-10 pr-10 py-2.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                updateUrlParam({ q: "", page: "0" });
                setAutoOpen(false);
                setSearchKey((k) => k + 1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {autoOpen && query.trim() && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-30 mt-2 w-full bg-background border border-border rounded-xl shadow-lg overflow-hidden"
            >
              {suggestions.map((c: any) => (
                <Link
                  key={c.id}
                  to={`/course/${c.slug || c.id}`}
                  onClick={() => setAutoOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-accent transition-colors"
                >
                  {c.thumbnail && (
                    <img src={c.thumbnail} alt="" className="w-10 h-10 rounded object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {typeof c.category === "object" ? c.category?.name : c.category} ·{" "}
                      {resolveInstructor(c) || "Instructor"}
                    </p>
                  </div>
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Filter bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => updateUrlParam({ main: "all", sub: "all", page: "0" })}
            className={`px-6 py-2 rounded-full border text-sm font-semibold transition ${
              urlMain === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-primary/40 text-primary bg-primary/5 hover:bg-primary/10"
            }`}
          >
            All
          </button>

          <div className="relative" ref={megaRef}>
            <button
              onClick={() => setMegaOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-6 py-2 rounded-full border text-sm font-semibold transition ${
                megaOpen || urlMain !== "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary/40 text-primary bg-primary/5 hover:bg-primary/10"
              }`}
              aria-expanded={megaOpen}
            >
              Categories
              <ChevronDown className={`h-4 w-4 transition-transform ${megaOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {megaOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute z-40 mt-2 left-0 w-[min(96vw,1080px)] bg-background border border-border rounded-2xl shadow-xl p-8"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-8">
                    {megaGroups.map(({ main, subs }) => (
                      <div key={main.id} className="space-y-3">
                        <button
                          onClick={() => onPickMain(main.id)}
                          className="block text-left font-bold text-foreground hover:text-primary"
                        >
                          {main.name}
                        </button>
                        <div className="flex flex-col gap-2">
                          {subs.slice(0, 8).map((s) => (
                            <button
                              key={s.id}
                              onClick={() => {
                                updateUrlParam({ main: main.id, sub: s.id, page: "0" });
                                setMegaOpen(false);
                              }}
                              className="block text-left text-sm text-muted-foreground hover:text-primary transition"
                            >
                              {s.name}
                            </button>
                          ))}
                          {subs.length > 8 && (
                            <button
                              onClick={() => onPickMain(main.id)}
                              className="text-xs text-primary font-medium hover:underline underline text-left"
                            >
                              View all
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {mains.length === 0 && (
                    <p className="text-sm text-muted-foreground">Loading categories…</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Course Type (Recorded / Live) */}
          <div className="relative ml-auto" ref={typeRef}>
            <button
              onClick={() => setTypeOpen((v) => !v)}
              className="flex items-center gap-2 px-5 py-2 rounded-full border border-border bg-background text-sm font-medium hover:bg-muted transition"
              aria-expanded={typeOpen}
            >
              {typeLabel}
              <ChevronDown className={`h-4 w-4 transition-transform ${typeOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {typeOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 z-30 mt-2 w-48 bg-background border border-border rounded-xl shadow-lg overflow-hidden"
                >
                  {(["all", "recorded", "live"] as CourseType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        updateUrlParam({ type: t, page: "0" });
                        setTypeOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm transition ${
                        urlType === t ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                      }`}
                    >
                      {t === "all" ? "All Classes" : t === "recorded" ? "Recorded Classes" : "Live Classes"}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sort (hidden by default, kept for parity) */}
          <select
            value={urlSort}
            onChange={(e) => updateUrlParam({ sort: e.target.value, page: "0" })}
            className="hidden md:block px-3 py-2 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="latest">Latest</option>
            <option value="popular">Most popular</option>
            <option value="priceAsc">Price: Low to High</option>
            <option value="priceDesc">Price: High to Low</option>
            <option value="rating">Top rated</option>
          </select>

          {(urlMain !== "all" || urlSub !== "all" || urlQ || urlType !== "all") && (
            <Button variant="ghost" size="sm" onClick={resetAll} className="text-primary">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Sub-category chips (Figma row 2) */}
        {urlMain !== "all" && subsForActiveMain.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateUrlParam({ sub: "all", page: "0" })}
              className={`px-4 py-1.5 rounded-full border text-xs font-medium transition ${
                urlSub === "all"
                  ? "border-primary text-primary-foreground bg-primary"
                  : "border-primary/40 text-primary hover:bg-primary/5"
              }`}
            >
              All
            </button>
            {subsForActiveMain.map((s) => (
              <button
                key={s.id}
                onClick={() => updateUrlParam({ sub: s.id, page: "0" })}
                className={`px-4 py-1.5 rounded-full border text-xs font-medium transition ${
                  urlSub === s.id
                    ? "border-primary text-primary-foreground bg-primary"
                    : "border-primary/40 text-primary hover:bg-primary/5"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Section title */}
      <div className="flex items-end justify-between">
        <h2 className="text-lg font-bold underline underline-offset-4 decoration-2">
          {sectionTitle}
        </h2>
        <span className="text-xs text-muted-foreground">
          {loading ? "Loading…" : `${totalElements} course${totalElements === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* Results */}
      {error ? (
        <div className="text-center py-16">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={resetAll}>Reset filters</Button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="h-[360px] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : enrichedCourses.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">No courses found.</p>
          <Button onClick={resetAll}>Reset filters</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {enrichedCourses.map((c: any) => (
              <CourseCard
                key={c.id}
                course={c}
                showType={urlType !== "all" || true /* always show badge like Figma */}
                enrolledCourseIds={enrolledIds}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
              <button
                disabled={!canPrev}
                onClick={() => canPrev && updateUrlParam({ page: String(urlPage - 1) })}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-border text-sm disabled:opacity-40 hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              {pageNumbers.map((p, idx) =>
                p === "…" ? (
                  <span key={`e-${idx}`} className="px-2 text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => updateUrlParam({ page: String(p) })}
                    className={`min-w-9 h-9 px-3 rounded-md border text-sm font-medium transition ${
                      p === urlPage
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {p + 1}
                  </button>
                ),
              )}

              <button
                disabled={!canNext}
                onClick={() => canNext && updateUrlParam({ page: String(urlPage + 1) })}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-border text-sm disabled:opacity-40 hover:bg-muted"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

       {/* Hand Picked For You */}
      <HandPickedSection />
    </div>
  );
};

export default DashboardSearch;
