import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Cart from "./Cart";

/**
 * Route guard for /cart.
 * - Logged-in students always shop from inside the dashboard chrome,
 *   so we redirect them to /dashboard/cart (which mounts <Cart embedded />
 *   under the DashboardLayout).
 * - Guests and non-student roles see the public cart wrapped in MainLayout.
 */
export const CartRouteGate = () => {
  const { user } = useAuth();
  if (user?.role === "student") {
    return <Navigate to="/dashboard/cart" replace />;
  }
  return <Cart />;
};
