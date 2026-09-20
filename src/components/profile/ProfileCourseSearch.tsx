import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { searchService } from "@/services/search.service";
import type { Course } from "@/types/api.types";

export const ProfileCourseSearch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Course[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync input value with URL when on /dashboard/search
  useEffect(() => {
    if (location.pathname === "/dashboard/search") {
      setQuery(searchParams.get("q") ?? "");
    }
  }, [location.pathname, searchParams]);

  useEffect(() => {
    if (!open || query.trim().length === 0) {
      setResults([]);
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);

      try {
        const res = await searchService.search(query.trim());

        if (res.success) {
          setResults(res.data.courses.slice(0, 6));
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  const goToCourse = (id: string) => {
    setOpen(false);
    navigate(`/courses/${id}`);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = query.trim();
    setOpen(false);
    navigate(`/dashboard/search${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchSubmit();
    }

    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative hidden lg:block"
    >
      {/* Figma Search Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="
          flex items-center
          w-[312px]
          h-[48px]
          rounded-[12px]
          border
          border-[#E2E2E2]
          bg-[#F9F9F9]
          px-4
          py-3
          gap-[10px]
          transition-all
          focus-within:border-primary
          focus-within:ring-1
          focus-within:ring-primary/20
        "
      >
        <button
          type="submit"
          className="p-0 border-none bg-transparent flex items-center justify-center cursor-pointer text-[#9CA3AF] hover:text-primary transition-colors shrink-0"
          aria-label="Submit search"
        >
          <Search className="h-5 w-5 shrink-0" />
        </button>

        <input
          type="text"
          value={query}
          placeholder="Search from courses..."
          aria-label="Search courses"
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className="
            w-[200px]
            bg-transparent
            outline-none
            border-none
            text-sm
            text-[#111827]
            placeholder:text-[#9CA3AF]
          "
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
              if (location.pathname === "/dashboard/search") {
                navigate("/dashboard/search");
              }
            }}
            className="p-0 border-none bg-transparent text-[#9CA3AF] hover:text-[#111827] shrink-0"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {open && query.trim().length > 0 && (
        <div
          className="
            absolute
            top-[56px]
            left-0
            w-[340px]
            bg-white
            border
            border-border
            rounded-xl
            shadow-lg
            overflow-hidden
            z-50
          "
        >
          {loading ? (
            <div className="p-4 text-sm text-center text-muted-foreground">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-center text-muted-foreground">
              No courses found
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {results.map((course) => (
                <li key={course.id}>
                  <button
                    onClick={() =>
                      goToCourse(course.id)
                    }
                    className="
                      w-full
                      flex
                      items-center
                      gap-3
                      px-4
                      py-3
                      hover:bg-accent
                      transition-colors
                      text-left
                    "
                  >
                    <img
                      src={course.thumbnail}
                      alt=""
                      className="
                        w-14
                        h-10
                        rounded
                        object-cover
                        shrink-0
                      "
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {course.title}
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        {typeof course.category === "object"
                          ? course.category.name
                          : course.category}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};