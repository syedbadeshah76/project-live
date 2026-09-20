import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { findCategory, RELATED_ARTICLES } from "./helpData";
import { useState } from "react";

/**
 * Category listing page — shows all articles in a category with the
 * "Related articles" sidebar from Figma.
 */
export default function HelpCategoryPage() {
  const { categorySlug = "" } = useParams();
  const navigate = useNavigate();
  const category = findCategory(categorySlug);
  const [query, setQuery] = useState("");

  if (!category) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4 text-sm text-muted-foreground">
        Category not found.{" "}
        <Link to="/dashboard/help-center" className="text-primary underline">
          Back to Help Center
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <nav className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
        <Link to="/dashboard/help-center" className="hover:text-primary">Help Center</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{category.title}</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold mb-2">Help Center</h1>
      <h2 className="text-lg font-semibold text-foreground mb-6">{category.title}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Articles */}
        <div className="space-y-3">
          {category.articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No articles yet.</p>
          ) : (
            category.articles.map((a) => (
              <Link
                key={a.slug}
                to={`/dashboard/help-center/${category.slug}/${a.slug}`}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition"
              >
                <span className="text-sm font-medium">{a.title}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))
          )}
        </div>

        {/* Related sidebar */}
        <aside className="bg-muted/40 rounded-xl p-4 space-y-3 h-fit lg:sticky lg:top-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) navigate(`/dashboard/help-center/${category.slug}?q=${encodeURIComponent(query.trim())}`);
            }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Find Answers"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-9 bg-background"
            />
          </form>
          <h3 className="text-sm font-semibold underline underline-offset-4">Related articles</h3>
          <ul className="space-y-2 text-sm">
            {RELATED_ARTICLES.map((r) => (
              <li key={r.label}>
                <Link to={r.to} className="text-primary hover:underline">
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
