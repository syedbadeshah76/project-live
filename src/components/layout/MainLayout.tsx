import { useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { AuthModal } from "@/components/auth/AuthModal";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { ScrollToTop } from "@/components/home/ScrollToTop";

interface MainLayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

type AuthView = "login" | "signup" | null;

export const MainLayout = ({ children, hideFooter = false }: MainLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [authModal, setAuthModal] = useState<AuthView>(null);

  // Sync modal state from URL (?auth=login | ?auth=signup).
  // This makes /login and /register (which redirect here) open the modal
  // over the homepage so the blurred background is preserved.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const auth = params.get("auth");
    if (auth === "login") setAuthModal("login");
    else if (auth === "signup") setAuthModal("signup");
    else setAuthModal(null);
  }, [location.search]);

  const clearAuthParam = useCallback(() => {
    const params = new URLSearchParams(location.search);
    if (params.has("auth")) {
      params.delete("auth");
      const search = params.toString();
      navigate(`${location.pathname}${search ? `?${search}` : ""}${location.hash}`, { replace: true });
    }
  }, [location, navigate]);

  const openLogin = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.set("auth", "login");
    navigate(`${location.pathname}?${params.toString()}${location.hash}`, { replace: true });
  }, [location, navigate]);

  const openSignup = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.set("auth", "signup");
    navigate(`${location.pathname}?${params.toString()}${location.hash}`, { replace: true });
  }, [location, navigate]);

  const closeModal = useCallback(() => {
    setAuthModal(null);
    clearAuthParam();
  }, [clearAuthParam]);

  const switchToLogin = useCallback(() => openLogin(), [openLogin]);
  const switchToSignup = useCallback(() => openSignup(), [openSignup]);

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <Navbar onLoginClick={openLogin} onSignupClick={openSignup} />
      <main className="flex-1 pt-16 lg:pt-20">{children}</main>
      {!hideFooter && <Footer />}

      {/* Auth Modals via Portal */}
      <AuthModal isOpen={authModal === "login"} onClose={closeModal}>
        <Login isModal onClose={closeModal} onSwitchToSignup={switchToSignup} />
      </AuthModal>

      <AuthModal isOpen={authModal === "signup"} onClose={closeModal}>
        <Register isModal onClose={closeModal} onSwitchToLogin={switchToLogin} />
      </AuthModal>
    </div>
  );
};
