import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Blocks already-authenticated users from accessing public marketing routes.
 * Redirects them to their role-appropriate dashboard. Use to wrap pages that
 * should only be visible to anonymous visitors.
 */
export const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    const target =
      user.role === "admin"
        ? "/admin"
        : user.role === "instructor"
        ? "/instructor"
        : "/dashboard";
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};

export default PublicOnlyRoute;
