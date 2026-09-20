import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search, HelpCircle } from "lucide-react";
import { HELP_CATEGORIES, POPULAR_TOPICS } from "./helpData";
import { cn } from "@/lib/utils";

/**
 * Help Center home:
 * Student / Instructor toggle · live search · popular topics · category cards grid.
 */
export default function HelpCenterHome() {
  const [audience, setAudience] = useState<"student" | "instructor">("student");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    // 1. Filter by audience
    const audienceFiltered = HELP_CATEGORIES.filter(
      (c) => c && (c.audience === "both" || c.audience === audience)
    );

    const q = query.trim().toLowerCase();
    if (!q) return audienceFiltered;

    // 2. Case-insensitive search across title, description, slug, and articles
    return audienceFiltered.filter((cat) => {
      const titleMatch = cat.title?.toLowerCase().includes(q);
      const descMatch = cat.description?.toLowerCase().includes(q);
      const slugMatch = cat.slug?.toLowerCase().includes(q);
      const articleMatch =
        Array.isArray(cat.articles) &&
        cat.articles.some(
          (a) =>
            a.title?.toLowerCase().includes(q) ||
            a.slug?.toLowerCase().includes(q)
        );

      return Boolean(titleMatch || descMatch || slugMatch || articleMatch);
    });
  }, [audience, query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-6">Help Center</h1>

      {/* Audience toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-full border border-border p-1 bg-card">
          {(["student", "instructor"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAudience(a)}
              className={cn(
                "px-8 py-2 text-sm font-medium rounded-full transition",
                audience === a
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {a === "student" ? "Student" : "Instructor"}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Find Answers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-11 h-12 rounded-full"
        />
      </form>

      {/* Popular topics */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10 text-sm">
        <span className="font-semibold mr-2">Popular topics:</span>
        {POPULAR_TOPICS.map((t) => (
          <Link
            key={t.label}
            to={t.to}
            className="text-muted-foreground hover:text-primary transition"
          >
            {t.label}
          </Link>
        )).reduce<React.ReactNode[]>((acc, el, i) => {
          if (i > 0) acc.push(<span key={`sep-${i}`} className="text-muted-foreground/40">·</span>);
          acc.push(el);
          return acc;
        }, [])}
      </div>

      {/* Category grid / No results */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <HelpCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <h3 className="text-base font-semibold text-foreground">No results found</h3>
          <p className="mt-1 text-sm">
            No help topics matched "{query}". Try searching with different keywords.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-8">
          {visible.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                to={`/dashboard/help-center/${cat.slug}`}
                className="group rounded-2xl bg-card hover:bg-primary/5 border border-transparent hover:border-primary/20 transition p-6 text-center"
              >
                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center group-hover:scale-105 transition">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-base mb-1">{cat.title}</h3>
                <p className="text-xs text-muted-foreground leading-snug">{cat.description}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
