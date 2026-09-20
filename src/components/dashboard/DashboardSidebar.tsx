import { forwardRef, memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import edvanz from "../../assets/edvanz logo.png";
import edvanz2 from "../../assets/ednanz1.png";
import { LogOut, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LogoutConfirmModal } from "@/components/auth/LogoutConfirmModal";
import { useLogoutFlow } from "@/hooks/useLogoutFlow";
import { cn } from "@/lib/utils";

// Student Sidebar SVG Assets
import dashboardOutline from "@/assets/student-sidebar/dashboard-outline.svg";
import dashboardFilled from "@/assets/student-sidebar/dashboard-filled.svg";
import myCoursesOutline from "@/assets/student-sidebar/my-courses-outline.svg";
import myCoursesFilled from "@/assets/student-sidebar/my-courses-filled.svg";
import analyticsOutline from "@/assets/student-sidebar/analytics-outline.svg";
import analyticsFilled from "@/assets/student-sidebar/analytics-filled.svg";
import ezCopilotOutline from "@/assets/student-sidebar/ez-copilot-outline.svg";
import ezCopilotFilled from "@/assets/student-sidebar/ez-copilot-filled.svg";
import liveClassesOutline from "@/assets/student-sidebar/live-classes-outline.svg";
import liveClassesFilled from "@/assets/student-sidebar/live-classes-filled.svg";
import practiceTestsOutline from "@/assets/student-sidebar/practice-tests-outline.svg";
import practiceTestsFilled from "@/assets/student-sidebar/practice-tests-filled.svg";
import certificatesOutline from "@/assets/student-sidebar/certificates-outline.svg";
import certificatesFilled from "@/assets/student-sidebar/certificates-filled.svg";
import wishlistOutline from "@/assets/student-sidebar/wishlist-outline.svg";
import wishlistFilled from "@/assets/student-sidebar/wishlist-filled.svg";
import orderHistoryOutline from "@/assets/student-sidebar/order-history-outline.svg";
import orderHistoryFilled from "@/assets/student-sidebar/order-history-filled.svg";
import settingsOutline from "@/assets/student-sidebar/settings-outline.svg";
import settingsFilled from "@/assets/student-sidebar/settings-filled.svg";

interface StudentNavItemConfig {
  label: string;
  path: string;
  outlineIcon: string;
  filledIcon: string;
}

/**
 * Centralized configuration for student sidebar items with Figma SVG assets.
 */
const studentNavItems: StudentNavItemConfig[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    outlineIcon: dashboardOutline,
    filledIcon: dashboardFilled,
  },
  {
    label: "My Courses",
    path: "/dashboard/courses",
    outlineIcon: myCoursesOutline,
    filledIcon: myCoursesFilled,
  },
  {
    label: "Analytics",
    path: "/dashboard/analytics",
    outlineIcon: analyticsOutline,
    filledIcon: analyticsFilled,
  },
  {
    label: "EZ Copilot",
    path: "/dashboard/ezai",
    outlineIcon: ezCopilotOutline,
    filledIcon: ezCopilotFilled,
  },
  {
    label: "Live Classes",
    path: "/dashboard/live-classes",
    outlineIcon: liveClassesOutline,
    filledIcon: liveClassesFilled,
  },
  {
    label: "Tests",
    path: "/practice-tests",
    outlineIcon: practiceTestsOutline,
    filledIcon: practiceTestsFilled,
  },
  {
    label: "Certificates",
    path: "/dashboard/certificates",
    outlineIcon: certificatesOutline,
    filledIcon: certificatesFilled,
  },
  {
    label: "Wishlist",
    path: "/dashboard/wishlist",
    outlineIcon: wishlistOutline,
    filledIcon: wishlistFilled,
  },
  {
    label: "Order History",
    path: "/dashboard/orders",
    outlineIcon: orderHistoryOutline,
    filledIcon: orderHistoryFilled,
  },
  {
    label: "Settings",
    path: "/dashboard/settings",
    outlineIcon: settingsOutline,
    filledIcon: settingsFilled,
  },
];

interface SidebarItemProps {
  item: StudentNavItemConfig;
  isActive: boolean;
  isCollapsed?: boolean;
  onNavigate?: () => void;
}

const SidebarNavItem = memo(
  ({ item, isActive, isCollapsed, onNavigate }: SidebarItemProps) => {
    return (
      <Link
        to={item.path}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-sm md:text-[15px]",
          isActive
            ? "bg-[#EEF4FF] text-primary font-semibold"
            : "text-foreground/80 font-medium hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <div className="w-6 h-6 flex items-center justify-center shrink-0">
          <img
            src={isActive ? item.filledIcon : item.outlineIcon}
            alt={`${item.label} icon`}
            className="w-5 h-5 object-contain shrink-0 transition-opacity duration-200"
          />
        </div>
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  }
);
SidebarNavItem.displayName = "SidebarNavItem";

interface DashboardSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  /** Optional callback fired whenever a nav link/logout is clicked. Used by mobile drawer to auto-close. */
  onNavigate?: () => void;
}

export const DashboardSidebar = forwardRef<HTMLElement, DashboardSidebarProps>(
  ({ isCollapsed, onToggle, onNavigate }, ref) => {
    const location = useLocation();
    const {
      logoutDialogOpen,
      setLogoutDialogOpen,
      loggingOut,
      handleLogout,
      openLogoutModal,
    } = useLogoutFlow();

    return (
      <>
        <motion.aside
          ref={ref as React.Ref<HTMLElement>}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "relative bg-card h-screen top-0 flex flex-col border-r border-border transition-all duration-300",
            isCollapsed ? "w-20" : "w-64"
          )}
        >
          {/* Logo */}
          <div className="px-4 py-5">
            <Link to="/" className="flex justify-center">
              {isCollapsed ? (
                // Collapsed → small icon only
                <img
                  src={edvanz2}
                  alt="EDVANZ Icon"
                  className="w-18 h-12 object-contain"
                />
              ) : (
                // Expanded → full logo
                <img
                  src={edvanz}
                  alt="EDVANZ"
                  className="w-full max-w-[220px] h-[80px] object-cover object-center"
                />
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 min-h-0">
            {studentNavItems.map((item) => {
              const isActive =
                item.path === "/dashboard"
                  ? location.pathname === "/dashboard"
                  : location.pathname.startsWith(item.path);
              return (
                <SidebarNavItem
                  key={item.path}
                  item={item}
                  isActive={isActive}
                  isCollapsed={isCollapsed}
                  onNavigate={onNavigate}
                />
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-4 py-4 border-t border-border">
            <button
              onClick={() => {
                onNavigate?.();
                openLogoutModal();
              }}
              className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors w-full text-sm md:text-[15px] font-semibold"
            >
              <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} />
              {!isCollapsed && <span>Log Out</span>}
            </button>
          </div>

          {/* Collapse Toggle */}
          {onToggle && (
            <button
              onClick={onToggle}
              className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors shadow-sm z-10"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft
                className={cn(
                  "h-4 w-4 transition-transform",
                  isCollapsed && "rotate-180"
                )}
              />
            </button>
          )}
        </motion.aside>

        {/* Shared Logout Confirmation Modal */}
        <LogoutConfirmModal
          open={logoutDialogOpen}
          onOpenChange={setLogoutDialogOpen}
          onConfirm={handleLogout}
          loading={loggingOut}
        />
      </>
    );
  }
);
DashboardSidebar.displayName = "DashboardSidebar";


