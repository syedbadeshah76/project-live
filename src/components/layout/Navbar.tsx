import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import EdvanzLogo2 from "../../assets/ednanz1.png";
import EdvanzLogo from "../../assets/edvanz logo.png";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  ShoppingCart,
  Heart,
} from "lucide-react";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { ProfileDropdownMenu } from "@/components/layout/ProfileDropdownMenu";

export const Navbar = ({
  onLoginClick,
  onSignupClick,
}: {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount: cartCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getDashboardLink = () => {
    if (user?.role === "admin") return "/admin";
    if (user?.role === "instructor") return "/instructor";
    return "/dashboard";
  };

  const getDashboardLabel = () => {
    if (user?.role === "admin") return "Admin Panel";
    if (user?.role === "instructor") return "Instructor Panel";
    return "Dashboard";
  };

  const isStudent = user?.role === "student";
  const navLinks =
    user?.role === "admin"
      ? [{ name: "Admin Dashboard", path: "/admin" }]
      : [
          { name: "Home", path: "/" },
          { name: "About Us", path: "/about" },
          { name: "Contact Us", path: "/contact" },
        ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <nav className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link
            to={user?.role === "admin" ? "/admin" : "/"}
            className="flex items-center gap-1 relative"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {/* <img src={EdvanzLogo2} alt="EZ Logo" className="h-10 sm:h-[80px] w-auto" /> */}
            <img
              src={EdvanzLogo}
              alt="Edvanz Logo"
              className="h-[140px] sm:h-[170px] w-auto -ml-1"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-medium transition-colors hover:text-primary ${location.pathname === link.path ? "text-primary" : "text-muted-foreground"}`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-1">
                {/* Cart & Wishlist for students or unauthenticated */}
                {isStudent && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative"
                      asChild
                    >
                      <Link to="/wishlist">
                        <Heart className="h-5 w-5" />
                        {wishlistCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                            {wishlistCount}
                          </span>
                        )}
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative"
                      asChild
                    >
                      <Link to="/cart">
                        <ShoppingCart className="h-5 w-5" />
                        {cartCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {cartCount}
                          </span>
                        )}
                      </Link>
                    </Button>
                  </>
                )}
                <NotificationsPanel />
                <ProfileDropdownMenu />
              </div>
            ) : (
              <>
                {/* <Button variant="ghost" size="icon" className="relative" asChild>
                  <Link to="/cart">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{cartCount}</span>
                    )}
                  </Link>
                </Button> */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (onLoginClick) onLoginClick();
                    else navigate("/login"); // fallback (important)
                  }}
                >
                  Log In 
                </Button>
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                  onClick={() => {
                    if (onSignupClick) onSignupClick();
                    else navigate("/register");
                  }}
                >
                  Register
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-border/50"
            >
              <div className="py-4 space-y-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block py-2 font-medium transition-colors ${location.pathname === link.path ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {link.name}
                  </Link>
                ))}
                {isStudent && (
                  <>
                    <Link
                      to="/wishlist"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-muted-foreground"
                    >
                      <Heart className="h-4 w-4" />
                      Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
                    </Link>
                    <Link
                      to="/cart"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-muted-foreground"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Cart {cartCount > 0 && `(${cartCount})`}
                    </Link>
                  </>
                )}
                <div className="pt-4 border-t border-border/50 space-y-3">
                  {isAuthenticated ? (
                    <>
                      <Link
                        to={getDashboardLink()}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 py-2 text-muted-foreground"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        {getDashboardLabel()}
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-2 py-2 text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          if (onLoginClick) onLoginClick();
                          else navigate("/login");
                        }}
                      >
                        Log In
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-primary text-primary hover:bg-primary/10"
                        onClick={() => {
                          if (onSignupClick) onSignupClick();
                          else navigate("/register");
                        }}
                      >
                   Register
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};
