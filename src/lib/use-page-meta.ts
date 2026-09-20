import { useEffect } from "react";

export function usePageMeta({
  title,
  description,
  path,
  keywords,
  url,
  schema,
}: {
  title: string;
  description?: string;
  path?: string;
  keywords?: string;
  url?: string;
  schema?: Record<string, any> | Array<Record<string, any>>;
}) {
  useEffect(() => {
    if (title) {
      document.title = title;

      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute("content", title);
      }
      let twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) {
        twitterTitle.setAttribute("content", title);
      }
    }

    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", description);
      } else {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        metaDesc.setAttribute("content", description);
        document.head.appendChild(metaDesc);
      }

      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        ogDesc.setAttribute("content", description);
      }
      let twitterDesc = document.querySelector('meta[name="twitter:description"]');
      if (twitterDesc) {
        twitterDesc.setAttribute("content", description);
      }
    }

    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) {
        metaKeywords.setAttribute("content", keywords);
      } else {
        metaKeywords = document.createElement("meta");
        metaKeywords.setAttribute("name", "keywords");
        metaKeywords.setAttribute("content", keywords);
        document.head.appendChild(metaKeywords);
      }
    }

    const canonicalUrl = url || (path ? `https://edvanz.co${path}` : undefined);
    if (canonicalUrl) {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) {
        canonical.setAttribute("href", canonicalUrl);
      } else {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        canonical.setAttribute("href", canonicalUrl);
        document.head.appendChild(canonical);
      }

      let ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) {
        ogUrl.setAttribute("content", canonicalUrl);
      }
    }

    if (schema) {
      let script = document.querySelector('script[id="page-schema"]');
      if (script) {
        script.textContent = JSON.stringify(schema, null, 2);
      } else {
        script = document.createElement("script");
        script.setAttribute("id", "page-schema");
        script.setAttribute("type", "application/ld+json");
        script.textContent = JSON.stringify(schema, null, 2);
        document.head.appendChild(script);
      }
    }
  }, [title, description, path, keywords, url, schema]);
}
