import { Link, useParams } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { findCategory, findArticle, RELATED_ARTICLES } from "./helpData";
import { useState } from "react";

/**
 * Article detail page — matches Figma "Payment methods on EDVANZ" layout
 * with a Related articles sidebar.
 */
export default function HelpArticlePage() {
  const { categorySlug = "", articleSlug = "" } = useParams();
  const category = findCategory(categorySlug);
  const article = findArticle(categorySlug, articleSlug);
  const [query, setQuery] = useState("");

  if (!category || !article) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4 text-sm text-muted-foreground">
        Article not found.{" "}
        <Link to="/dashboard/help-center" className="text-primary underline">
          Back to Help Center
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <nav className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5 flex-wrap">
        <Link to="/dashboard/help-center" className="hover:text-primary">Help Center</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/dashboard/help-center/${category.slug}`} className="hover:text-primary">
          {category.title}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{article.title}</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold mb-6">Help Center</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <article className="prose prose-sm max-w-none">
          <h2 className="text-xl font-bold mb-3">{article.title}</h2>
          {article.body ? (
            <div dangerouslySetInnerHTML={{ __html: article.body }} />
          ) : (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                EDVANZ provides detailed help on this topic. Full article content
                will be available shortly. In the meantime, reach out via{" "}
                <Link to="/dashboard/help-center/technical-support" className="text-primary">
                  Technical Support
                </Link>{" "}
                if you need immediate assistance.
              </p>
              <p>
                For questions about payments, refunds, gifts, certificates, or
                your account, browse the related articles or contact{" "}
                <a href="mailto:contact@edvanz.com" className="text-primary">
                  contact@edvanz.com
                </a>
                .
              </p>
            </div>
          )}
        </article>

        <aside className="bg-muted/40 rounded-xl p-4 space-y-3 h-fit lg:sticky lg:top-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
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
