import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Filter, AlertCircle, RefreshCw, BookOpen, Layers } from "lucide-react";
import { practiceTestService } from "@/services/practiceTest/practiceTestService";
import { useAuth } from "@/contexts/AuthContext";
import type { PracticeTestSummary } from "@/types/practiceTest";
import { PracticeTestCard } from "./PracticeTestCard";

export function PracticeTestsListPage() {
  const { user } = useAuth();
  const [tests, setTests] = useState<PracticeTestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedUserRef = useRef<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await practiceTestService.getPracticeTests(undefined, user?.id);
      setTests(data);
    } catch (err) {
      setError("Failed to load practice tests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const currentId = user?.id || "anon";
    if (fetchedUserRef.current === currentId && tests.length > 0) return;
    fetchedUserRef.current = currentId;
    fetchTests();
  }, [user?.id, fetchTests, tests.length]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    tests.forEach((t) => {
      if (t.category && t.category.trim() !== "") {
        set.add(t.category.trim());
      }
    });
    return ["All", ...Array.from(set)];
  }, [tests]);

  // Extract unique difficulties
  const difficulties = useMemo(() => {
    const set = new Set<string>();
    tests.forEach((t) => {
      if (t.difficulty && t.difficulty.trim() !== "") {
        set.add(t.difficulty.trim());
      }
    });
    return ["All", ...Array.from(set)];
  }, [tests]);

  // Filtered practice tests
  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (test.category && test.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === "All" ||
        (test.category && test.category.toLowerCase() === selectedCategory.toLowerCase());

      const matchesDifficulty =
        selectedDifficulty === "All" ||
        (test.difficulty && test.difficulty.toLowerCase() === selectedDifficulty.toLowerCase());

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [tests, searchQuery, selectedCategory, selectedDifficulty]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Practice Tests
          </h1>
          <p className="text-sm text-muted-foreground">
            Assess your knowledge, test your skills, and prepare for your certifications.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search practice tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          {categories.length > 2 && (
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-10 appearance-none rounded-xl border border-input bg-background pl-3 pr-8 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "All" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
              <Filter className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          )}

          {/* Difficulty Dropdown */}
          {difficulties.length > 2 && (
            <div className="relative">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="h-10 appearance-none rounded-xl border border-input bg-background pl-3 pr-8 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
              >
                {difficulties.map((diff) => (
                  <option key={diff} value={diff}>
                    {diff === "All" ? "All Difficulties" : diff}
                  </option>
                ))}
              </select>
              <Layers className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          )}

          {/* Reset Filters Button */}
          {(searchQuery || selectedCategory !== "All" || selectedDifficulty !== "All") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
                setSelectedDifficulty("All");
              }}
              className="h-10 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchTests}
            className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 animate-pulse"
            >
              <div className="h-24 w-full sm:w-40 rounded-xl bg-muted shrink-0" />
              <div className="w-full flex-1 space-y-3">
                <div className="h-4 w-1/4 rounded-md bg-muted" />
                <div className="h-5 w-3/4 rounded-md bg-muted" />
                <div className="h-3 w-1/2 rounded-md bg-muted" />
                <div className="h-4 w-1/3 rounded-md bg-muted" />
              </div>
              <div className="h-10 w-28 rounded-xl bg-muted shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Practice Tests List */}
      {!loading && !error && (
        <>
          {filteredTests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">No practice tests found</h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {searchQuery || selectedCategory !== "All" || selectedDifficulty !== "All"
                  ? "Try adjusting your search criteria or clearing active filters."
                  : "There are no practice tests available for your enrolled courses yet."}
              </p>
              {(searchQuery || selectedCategory !== "All" || selectedDifficulty !== "All") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                    setSelectedDifficulty("All");
                  }}
                  className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTests.map((test) => (
                <PracticeTestCard key={test.id} test={test} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PracticeTestsListPage;
