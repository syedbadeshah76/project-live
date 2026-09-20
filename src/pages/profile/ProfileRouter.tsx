import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-load each role's profile page to keep initial bundle lean
const StudentProfile = lazy(() => import("@/pages/Profile"));
const AdminProfile = lazy(() => import("@/pages/profile/AdminProfile"));
const InstructorProfile = lazy(() => import("@/pages/profile/InstructorProfile"));

const ProfileFallback = () => (
  <div className="min-h-screen bg-background p-4 md:p-8">
    <Skeleton className="h-8 w-48 mb-6" />
    <Skeleton className="h-48 rounded-2xl mb-6" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
    </div>
  </div>
);

/**
 * Routes the authenticated user to the right profile page based on their role.
 * - student   → StudentProfile (existing Figma-based design)
 * - instructor → InstructorProfile
 * - admin     → AdminProfile
 */
const ProfileRouter = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Suspense fallback={<ProfileFallback />}>
      {user.role === "admin" && <AdminProfile />}
      {user.role === "instructor" && <InstructorProfile />}
      {user.role === "student" && <StudentProfile />}
    </Suspense>
  );
};

export default ProfileRouter;
