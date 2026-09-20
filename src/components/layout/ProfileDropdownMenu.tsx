import { Link as RouterLink } from "react-router-dom";
import {
  User,
  LogOut,
  Users,
  GraduationCap,
  HelpCircle,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogoutConfirmModal } from "@/components/auth/LogoutConfirmModal";
import { useLogoutFlow } from "@/hooks/useLogoutFlow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const ProfileDropdownMenu = () => {
  const { user } = useAuth();
  const {
    logoutDialogOpen,
    setLogoutDialogOpen,
    loggingOut,
    handleLogout,
    openLogoutModal,
  } = useLogoutFlow();

  const getProfileLink = () => {
    if (user?.role === "student") return "/dashboard/profile";
    return "/profile";
  };

  const itemClass =
    "flex items-center gap-3 py-2.5 cursor-pointer rounded-md text-sm";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-1.5 px-1 sm:px-2">
            <Avatar className="h-9 w-9 ring-2 ring-primary/30">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {user?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 p-2">
          <DropdownMenuItem asChild>
            <RouterLink
              to={getProfileLink()}
              className={`${itemClass} text-primary font-medium`}
            >
              <User className="h-4 w-4" />
              Profile
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <RouterLink to="/dashboard/refer" className={itemClass}>
              <Users className="h-4 w-4 text-muted-foreground" />
              Refer a friend
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <RouterLink to="/become-instructor" className={itemClass}>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              Become Instructor
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <RouterLink to="/dashboard/help-center" className={itemClass}>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              Help Center
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <RouterLink to="/dashboard/redeem-center" className={itemClass}>
              <Gift className="h-4 w-4 text-muted-foreground" />
              Redeem Gift            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              openLogoutModal();
            }}
            className={`${itemClass} text-destructive focus:text-destructive font-medium`}
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </DropdownMenuItem>
          <div className="px-2 pt-2 mt-1 border-t border-border text-[11px] text-muted-foreground">
            <RouterLink to="/dashboard/privacy-policy" className="block py-1 hover:text-primary">
              · Privacy Policy
            </RouterLink>
            <RouterLink to="/dashboard/terms-and-conditions" className="block py-1 hover:text-primary">
              · Terms &amp; Conditions
            </RouterLink>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <LogoutConfirmModal
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={handleLogout}
        loading={loggingOut}
      />
    </>
  );
};
