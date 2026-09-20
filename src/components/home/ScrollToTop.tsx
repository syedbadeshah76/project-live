import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Hook to automatically reset scroll position to top (0, 0) on route/pathname change.
 */
export const useScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
};

/**
 * Reusable ScrollToTop component for public website pages/components inside src/components/home.
 * Automatically ensures navigation between public pages starts at top (0, 0).
 */
export const ScrollToTop = () => {
  useScrollToTop();
  return null;
};

export default ScrollToTop;
