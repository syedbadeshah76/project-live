import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/dashboard/AdminSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/auth.service";
import { LogoutConfirmModal } from "@/components/auth/LogoutConfirmModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      /* non-blocking API fallback */
    } finally {
      logout();
      setLoggingOut(false);
      setLogoutModalOpen(false);
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-screen shrink-0">
        <AdminSidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogoutClick={() => setLogoutModalOpen(true)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-50 h-full w-64">
            <AdminSidebar
              isCollapsed={false}
              onLogoutClick={() => setLogoutModalOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="shrink-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border px-3 sm:px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={() => setMobileSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            </div>
        <div className="flex items-center gap-3 md:gap-4">
  <NotificationsPanel />

  <div className="flex items-center gap-3">
    <Avatar className="h-11 w-11 shrink-0 rounded-full bg-purple-100">
      <AvatarImage src={user?.avatar} alt={user?.name} className="object-cover" />
      <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold text-sm">
        {user?.name?.charAt(0)}
      </AvatarFallback>
    </Avatar>

    <div className="flex flex-col justify-center">
      <p className="text-base font-bold text-slate-900 leading-tight">
        {user?.name || "Admin User"}
      </p>
      <p className="text-xs font-normal text-slate-400 capitalize mt-0.5">
        {user?.role || "Admin"}
      </p>
    </div>
  </div>
</div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-1">{children}</main>
      </div>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmModal
        open={logoutModalOpen}
        onOpenChange={setLogoutModalOpen}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />
    </div>
  );
};
