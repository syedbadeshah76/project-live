import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Users,
  GraduationCap,
  CheckSquare,
  CalendarDays,
  DollarSign,
  Ticket,
  Bell,
  LayoutGrid,
  Upload,
  ShieldCheck,
  Share2,
  Sparkles,
  Settings,
  LogOut,
  ChevronLeft,
  BarChart2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import edvanzLogo from "@/assets/edvanz logo.png";

const adminNavItems = [
  { icon: BarChart2, label: "Dashboard", path: "/admin" },
  { icon: LayoutGrid, label: "Analytics", path: "/admin/analytics" },
  { icon: BookOpen, label: "Courses", path: "/admin/courses" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: GraduationCap, label: "Students", path: "/admin/students" },
  {
    icon: CheckSquare,
    label: "Instructor Approvals",
    path: "/admin/instructor-approvals",
  },
  { icon: CalendarDays, label: "Meeting Approvals", path: "/admin/meetings" },
  { icon: DollarSign, label: "Revenue", path: "/admin/revenue" },
  { icon: Ticket, label: "Coupons", path: "/admin/coupons" },
  { icon: Bell, label: "Notifications", path: "/admin/notifications" },
  { icon: LayoutGrid, label: "Categories", path: "/admin/categories" },
  // { icon: Upload, label: "Upload Content", path: "/admin/upload" },
  // { icon: ShieldCheck, label: "Review & Ratings", path: "/admin/reviews" },
  { icon: Share2, label: "Referrals Approvals", path: "/admin/referrals" },
  { icon: Sparkles, label: "AI Insights", path: "/admin/ai-insights" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onLogoutClick?: () => void;
}

export const AdminSidebar = ({ isCollapsed, onToggle, onLogoutClick }: AdminSidebarProps) => {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-white border-r border-border min-h-0 sticky top-0 flex flex-col transition-all duration-300",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="px-6 pb-[0px] border-b border-border  h-[100px] ">
        <Link to="/admin" className="flex items-center gap-2">
          {isCollapsed ? (
            <div className="bg-primary p-2 rounded-lg">
              <BarChart2 className="h-5 w-5 text-primary-foreground" />
            </div>
          ) : (
            <img
              src={edvanzLogo}
              alt="Edvanz"
              className="h-[130px] w-[150px] ml-4  "
            />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
        {" "}
        {adminNavItems.map((item) => {
          const isActive =
            item.path === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={onLogoutClick ?? logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!isCollapsed && <span className="font-medium">Log Out</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      {onToggle && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors shadow-sm"
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              isCollapsed && "rotate-180",
            )}
          />
        </button>
      )}
    </motion.aside>
  );
};
