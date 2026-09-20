import { ReactNode } from "react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { Menu, ShoppingCart, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { profileService, type ProfileData } from "@/services/profile.service";
import { StreakProgressButton } from "@/components/profile/StreakProgressButton";
import { ProfileCourseSearch } from "@/components/profile/ProfileCourseSearch";
import { ProfileDropdownMenu } from "@/components/layout/ProfileDropdownMenu";

/**
 * Standalone wrapper that gives a non-/dashboard student page the same
 * sidebar + top header chrome as DashboardLayout. Use for routes like
 * /practice-tests, /quiz/:id, /leaderboard that aren't nested under the
 * /dashboard outlet but still belong to the student experience.
 */
export const StudentChromeLayout = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { itemCount: cartCount } = useCart();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setMobileSidebarOpen(false), [location.pathname]);
  useEffect(() => {
    profileService.getProfile().then((res) => res.success && setProfile(res.data)).catch(() => { });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:flex h-screen shrink-0">
        <DashboardSidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-[61] h-full w-72 max-w-[85vw] bg-card shadow-xl">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-3 right-3 z-20 p-2 rounded-md hover:bg-muted"
              aria-label="Close menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <DashboardSidebar isCollapsed={false} onNavigate={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 -ml-1 rounded-md hover:bg-muted shrink-0"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link to="/" className="lg:hidden flex items-center shrink-0">
                {/* <span className="font-display font-extrabold text-lg sm:text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight">
                  EDVANZ
                </span> */}
              </Link>
              {/* <button
                onClick={() => navigate("/dashboard/streaks")}
                className="md:hidden p-1 shrink-0 "
                aria-label="View streak"
              >
                <Flame className="h-5 w-5 text-orange-500" />
              </button> */}
              <div className="min-w-0 hidden sm:block">
                <h1 className="text-sm md:text-base font-semibold flex items-center gap-1 truncate">
                  Hello {profile?.firstName || user?.name?.split(" ")[0] || "Student"}{" "}
                  <span className="hidden md:inline">👋🏽</span>
                </h1>



                
                <p className="text-xs text-muted-foreground hidden md:block">
                  Ready for today's class?
                </p>
              </div>
            </div>
{/* 
            <div className="hidden md:block">
              <StreakProgressButton onClick={() => navigate("/dashboard/streaks")} />
            </div> */}

            <div className="flex items-center gap-1 sm:gap-3">
              <div className="hidden sm:block"><ProfileCourseSearch /></div>
              <div className="flex items-center gap-2 md:gap-4">
                {user?.role === "student" && (
                  <Button variant="ghost" size="icon" className="relative" asChild>
                    <Link to="/cart">
                      <ShoppingCart className="h-5 w-5" />
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {cartCount}
                        </span>
                      )}
                    </Link>
                  </Button>
                )}
                <NotificationsPanel />
              </div>
              <ProfileDropdownMenu />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default StudentChromeLayout;
