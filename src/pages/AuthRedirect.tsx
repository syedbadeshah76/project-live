import { Navigate, useLocation } from "react-router-dom";

interface AuthRedirectProps {
  mode: "login" | "signup";
}

/**
 * When users hit /login or /register directly via URL, we don't want to render
 * the auth pages standalone (which produces a white screen — the modal expects
 * a layout behind it). Instead, redirect to the homepage with an `?auth=` param
 * which MainLayout reads to open the appropriate modal over the blurred home page.
 *
 * Preserves any existing query params (e.g. ?redirect=/courses).
 */
export const AuthRedirect = ({ mode }: AuthRedirectProps) => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set("auth", mode);
  return <Navigate to={`/?${params.toString()}`} replace />;
};

export default AuthRedirect;
