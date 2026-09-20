import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { InstructorSidebar } from "./InstructorSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/auth.service";
import { LogoutConfirmModal } from "@/components/auth/LogoutConfirmModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, LogOut, User, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";

export const InstructorLayout = () => {
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
        <InstructorSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogoutClick={() => setLogoutModalOpen(true)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-10 h-full w-64">
            <InstructorSidebar
              collapsed={false}
              onLogoutClick={() => setLogoutModalOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="shrink-0 z-30 flex h-14 md:h-16 items-center justify-between border-b bg-background/95 px-3 md:px-6 backdrop-blur">
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5 md:gap-4">
            <NotificationsPanel />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-1.5 md:px-2">
                  <Avatar className="h-7 w-7 md:h-8 md:w-8">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium md:inline-block">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/instructor/settings" className="flex items-center gap-2"><User className="h-4 w-4" />Profile Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLogoutModalOpen(true)} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Confirmation Modal */}
      <LogoutConfirmModal
        open={logoutModalOpen}
        onOpenChange={setLogoutModalOpen}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />
    </div>
  );
};
