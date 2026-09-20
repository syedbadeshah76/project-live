// import { Link, useLocation } from "react-router-dom";
// import { cn } from "@/lib/utils";
// import edvanz from "../../assets/edvanz logo.png"
// import edvanz2 from "../../assets/ednanz1.png"
// import {
//   LayoutDashboard,
//   BookOpen,
//   Users,
//   BarChart3,
//   Upload,
//   Settings,
//   ChevronLeft,
//   GraduationCap,
//   Video,
//   ClipboardList,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";

// interface InstructorSidebarProps {
//   collapsed?: boolean;
//   onToggle?: () => void;
// }

// const sidebarLinks = [
//   { href: "/instructor", label: "Dashboard", icon: LayoutDashboard, exact: true },
//   { href: "/instructor/courses", label: "My Courses", icon: BookOpen },
//   { href: "/instructor/meetings", label: "Meetings", icon: Video },
//   { href: "/instructor/quizzes", label: "Practice Test", icon: ClipboardList },
//   { href: "/instructor/quiz-analytics", label: "Practice test analytics", icon: BarChart3 },
//   { href: "/instructor/students", label: "Students", icon: Users },
//   { href: "/instructor/analytics", label: "Analytics", icon: BarChart3 },
//   { href: "/instructor/upload", label: "Upload Content", icon: Upload },
//   { href: "/instructor/settings", label: "Settings", icon: Settings },
// ];

// export const InstructorSidebar = ({ collapsed, onToggle }: InstructorSidebarProps) => {
//   const location = useLocation();

//   const isActive = (href: string, exact?: boolean) => {
//     if (exact) {
//       return location.pathname === href;
//     }
//     return location.pathname.startsWith(href);
//   };

//   return (
//     <aside
//       className={cn(
//         "h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col",
//         collapsed ? "w-16" : "w-64"
//       )}
//     >
//       <div className="flex h-full flex-col">
//         {/* Logo */}
// <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-4">

//   <Link
//     to="/"
//     className={cn(
//       "flex items-center",
//       collapsed ? "justify-center w-full" : "flex-1"
//     )}
//   >
//     {collapsed ? (
//       // Collapsed → small icon
//       <img
//         src={edvanz2}
//         alt="EDVANZ"
//         className="w-10 h-10 object-contain"
//       />
//     ) : (
//       // Expanded → full logo
//          <img
//           src={edvanz}
//           alt="EDVANZ"
//           className="
//             w-full
//             max-w-[220px]
//             h-[80px]
//             object-cover
//             object-center
//           "
//         />
//     )}
//   </Link>

//   {!collapsed && onToggle && (
//     <Button
//       variant="ghost"
//       size="icon"
//       onClick={onToggle}
//       className="text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
//     >
//       <ChevronLeft className="h-4 w-4" />
//     </Button>
//   )}

//   {collapsed && onToggle && (
//     <Button
//       variant="ghost"
//       size="icon"
//       onClick={onToggle}
//       className="absolute top-4 right-2 text-sidebar-foreground"
//     >
//       <ChevronLeft className="h-4 w-4 rotate-180" />
//     </Button>
//   )}
// </div>

//         {/* Navigation */}
//         <nav className="flex-1 overflow-y-auto space-y-1 p-3 min-h-0">
//           {sidebarLinks.map((link) => {
//             const Icon = link.icon;
//             const active = isActive(link.href, link.exact);
            
//             return (
//               <Link
//                 key={link.href}
//                 to={link.href}
//                 className={cn(
//                   "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
//                   active
//                     ? "bg-sidebar-primary text-sidebar-primary-foreground"
//                     : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
//                 )}
//               >
//                 <Icon className="h-5 w-5 shrink-0" />
//                 {!collapsed && <span>{link.label}</span>}
//               </Link>
//             );
//           })}
//         </nav>

//         {/* Instructor Badge */}
//         {!collapsed && (
//           <div className="border-t border-sidebar-border p-4">
//             <div className="rounded-lg bg-sidebar-accent p-3">
//               <p className="text-xs text-sidebar-foreground/70">Instructor Portal</p>
//               <p className="mt-1 text-sm font-medium text-sidebar-foreground">
//                 Create & Manage Courses
//               </p>
//             </div>
//           </div>
//         )}
//       </div>
//     </aside>
//   );
// };


import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import edvanz from "../../assets/edvanz logo.png";
import edvanz2 from "../../assets/ednanz1.png";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Users,
  Video,
  Megaphone,
  MessageSquare,
  DollarSign,
  Star,
  Share2,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
 
interface InstructorSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onLogoutClick?: () => void;
}
 
const sidebarLinks = [
  { href: "/instructor", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/instructor/courses", label: "My Courses", icon: BookOpen },
  { href: "/instructor/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/instructor/students", label: "Students", icon: Users },
  { href: "/instructor/meetings", label: "Live Classes", icon: Video },
  { href: "/instructor/announcements", label: "Announcements", icon: Megaphone },
  { href: "/instructor/qna", label: "Q&A", icon: MessageSquare },
  { href: "/instructor/revenue", label: "Revenue", icon: DollarSign },
  { href: "/instructor/reviews", label: "Reveiw & Ratings", icon: Star },
  { href: "/instructor/referrals", label: "Referral", icon: Share2 },
  { href: "/instructor/practice-tests", label: "Test", icon: BarChart3 },
  { href: "/instructor/settings", label: "Settings", icon: Settings },
];
 
export const InstructorSidebar = ({ collapsed, onToggle, onLogoutClick }: InstructorSidebarProps) => {
  const location = useLocation();
  const { logout } = useAuth();
 
  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };
 
  return (
    <aside
      className={cn(
        "h-screen bg-white text-foreground border-r border-border transition-all duration-300 flex flex-col relative",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-20 items-center justify-between border-b border-border px-4 shrink-0">
          <Link to="/instructor" className={cn("flex items-center", collapsed ? "justify-center w-full" : "flex-1")}>
            {collapsed ? (
              <img src={edvanz2} alt="EDVANZ" className="w-10 h-10 object-contain" />
            ) : (
              <img src={edvanz} alt="EDVANZ" className="w-full max-w-[200px] h-[190px] object-contain object-left" />
            )}
          </Link>
          {!collapsed && onToggle && (
            <Button variant="ghost" size="icon" onClick={onToggle} className="shrink-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
 
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto space-y-1 p-3 min-h-0">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href, link.exact);
            return (
              <Link
  key={link.href}
  to={link.href}
  title={collapsed ? link.label : undefined}
  className={cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    active
      ? "bg-[#EBF1FF] text-[#2457D6]"
      : "text-muted-foreground hover:bg-[#dfe8ffe0] hover:text-foreground"
  )}
>
  <Icon className="h-[18px] w-[18px] shrink-0" />
  {!collapsed && <span className="truncate">{link.label}</span>}
</Link>
            );
          })}
        </nav>
 
        {/* Logout */}
        <div className="border-t border-border p-3 shrink-0">
          <button
            onClick={onLogoutClick ?? logout}
            title={collapsed ? "Log Out" : undefined}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>
 
        {collapsed && onToggle && (
          <button
            onClick={onToggle}
            className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors shadow-sm"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </button>
        )}
      </div>
    </aside>
  );
};
 
 