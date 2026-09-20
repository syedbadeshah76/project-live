import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { giftService } from "@/services/gift.service";
import { authService } from "@/services/auth.service";
import { extractAvatarUrl } from "@/lib/api-client";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin" | "instructor";
  avatar?: string;
  enrolledCourses?: string[];
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Legacy mock login — kept for backward compatibility with existing pages */
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role?: "student" | "instructor",
  ) => Promise<void>;
  logout: () => void;
  updateAvatar: (avatarUrl: string) => void;
  /**
   * Token-based login — called after OTP verification succeeds.
   *
   * Stores `accessToken` and `refreshToken` using the exact localStorage keys
   * the api-client interceptor reads (`accessToken`, `refreshToken`).
   *
   * Normalises the backend role (e.g. "INSTRUCTOR" → "instructor") so it
   * matches the frontend User type and ProtectedRoute role checks.
   *
   * Constructs a minimal user object from the token payload so routes and
   * the nav bar render immediately.  Full profile data is fetched lazily
   * by individual pages via usersService.getProfile().
   */
  loginWithToken: (
    token: string,
    refreshToken: string,
    role: string,
    email: string,
  ) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Mock users (kept for legacy `login` method) ──────────────────────────────

const mockUsers: User[] = [
  {
    id: "1",
    name: "John Student",
    email: "student@Edvanz.com",
    role: "student",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    enrolledCourses: ["1", "2", "3"],
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Admin User",
    email: "admin@Edvanz.com",
    role: "admin",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    createdAt: "2023-06-01",
  },
  {
    id: "3",
    name: "Sarah Instructor",
    email: "instructor@Edvanz.com",
    role: "instructor",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    createdAt: "2023-08-15",
  },
];

const pendingInstructors = new Set<string>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function autoRedeemGiftsForUser(user: User & { phone?: string }) {
  try {
    const history = await giftService.getGiftHistory();
    if (!Array.isArray(history) || history.length === 0) return;

    const pendingGifts = history.filter(
      (g) => g.status === "PENDING" && (g.giftId || (g as any).id),
    );
    if (pendingGifts.length === 0) return;

    const enrolled = new Set(user.enrolledCourses || []);
    for (const g of pendingGifts) {
      const giftId = g.giftId || (g as any).id;
      if (giftId) {
        await giftService.redeemGift(giftId);
      }
      if (g.courseId) {
        enrolled.add(g.courseId);
      }
    }
    const updated = { ...user, enrolledCourses: Array.from(enrolled) };
    localStorage.setItem("Edvanz_user", JSON.stringify(updated));
  } catch {
    // silent — non-blocking
  }
}

/**
 * Normalise the role string returned by the backend.
 * Backend sends uppercase ("STUDENT", "ADMIN", "INSTRUCTOR").
 * Frontend expects lowercase ("student", "admin", "instructor").
 * Falls back to "student" for any unrecognised value.
 */
function normaliseRole(raw: string): User["role"] {
  const lower = raw.toLowerCase();
  if (lower === "admin" || lower === "instructor") return lower;
  return "student";
}

const getAuthenticatedUser = (response: any) =>
  response?.data?.user ?? response?.data ?? response?.user ?? response;

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("Edvanz_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  // Session validation on mount — evict stale/malformed sessions
  useEffect(() => {
    try {
      const stored = localStorage.getItem("Edvanz_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!parsed.id || !parsed.email || !parsed.role) {
            localStorage.removeItem("Edvanz_user");
            setUser(null);
            return;
          }

        // Existing sessions created before the authenticated id was resolved
        // may still store the email address as user.id. Refresh it on startup.
        void authService.getCurrentUser().then(async (response) => {
          const authenticatedUser = getAuthenticatedUser(response);
          if (!authenticatedUser?.id) return;

          let fullName = [authenticatedUser.firstName, authenticatedUser.lastName].filter(Boolean).join(" ");
          if (!fullName && (!authenticatedUser.name || authenticatedUser.name === parsed.email.split("@")[0])) {
            try {
              const { profileService } = await import("@/services/profile.service");
              const pRes = await profileService.getProfile();
              if (pRes.success && pRes.data) {
                fullName = [pRes.data.firstName, pRes.data.lastName].filter(Boolean).join(" ");
              }
            } catch {}
          }

          setUser((currentUser) => {
            if (!currentUser || currentUser.email !== parsed.email) return currentUser;

            const remoteAvatar = extractAvatarUrl(authenticatedUser);
            const validLocalAvatar =
              currentUser.avatar && !currentUser.avatar.startsWith("blob:")
                ? currentUser.avatar
                : "";

            const resolvedUser: User = {
              ...currentUser,
              id: authenticatedUser.id,
              name: fullName || authenticatedUser.name || currentUser.name,
              avatar: remoteAvatar || validLocalAvatar,
            };
            localStorage.setItem("Edvanz_user", JSON.stringify(resolvedUser));
            return resolvedUser;
          });
        }).catch(() => {
          // Existing session validation remains non-blocking.
        });
      } catch {
        try {
          localStorage.removeItem("Edvanz_user");
        } catch {}
        setUser(null);
      }
    }
  } catch {}
}, []);

  // ── loginWithToken ─────────────────────────────────────────────────────────
  /**
   * Called by Login.tsx after OTP verification succeeds.
   *
   * Storage keys:
   *   "accessToken"   — read by api-client request interceptor
   *   "refreshToken"  — read by api-client 401 interceptor
   *   "Edvanz_user"   — read on mount to restore session
   *
   * The minimal user object is enough to satisfy ProtectedRoute and the
   * navigation bar.  Pages that need the full profile call
   * usersService.getProfile() themselves.
   */
  const loginWithToken = useCallback(
    (token: string, refreshToken: string, role: string, email: string) => {
      // ── 1. Persist tokens (keys must match api-client interceptor) ──────
      localStorage.setItem("accessToken", token);
      localStorage.setItem("refreshToken", refreshToken);

      // ── 2. Build minimal user ────────────────────────────────────────────
      const normalizedRole = normaliseRole(role);

      const minimalUser: User = {
        // "id" not returned by verify-otp; use email as a stable placeholder.
        // It will be overwritten when any page calls usersService.getProfile().
        id: email,
        // Derive a display name from the email prefix until profile is fetched.
        name: email.split("@")[0],
        email,
        role: normalizedRole,
        createdAt: new Date().toISOString().split("T")[0],
      };

      // ── 3. Update React state & localStorage ─────────────────────────────
      setUser(minimalUser);
      localStorage.setItem("Edvanz_user", JSON.stringify(minimalUser));

      // The OTP response does not include the user id. Resolve it through the
      // existing authenticated endpoint so user.id is the UUID used by courses.
      void authService.getCurrentUser().then(async (response) => {
        const authenticatedUser = getAuthenticatedUser(response);
        if (!authenticatedUser?.id) return;

        let fullName = [authenticatedUser.firstName, authenticatedUser.lastName].filter(Boolean).join(" ");
        if (!fullName && (!authenticatedUser.name || authenticatedUser.name === email.split("@")[0])) {
          try {
            const { profileService } = await import("@/services/profile.service");
            const pRes = await profileService.getProfile();
            if (pRes.success && pRes.data) {
              fullName = [pRes.data.firstName, pRes.data.lastName].filter(Boolean).join(" ");
            }
          } catch {}
        }

        setUser((currentUser) => {
          // Do not overwrite a newer session if the user logged out or in again.
          if (!currentUser || currentUser.email !== email) return currentUser;

          const remoteAvatar = extractAvatarUrl(authenticatedUser);
          const validLocalAvatar =
            currentUser.avatar && !currentUser.avatar.startsWith("blob:")
              ? currentUser.avatar
              : "";

          const resolvedUser: User = {
            ...currentUser,
            id: authenticatedUser.id,
            name: fullName || authenticatedUser.name || currentUser.name,
            avatar: remoteAvatar || validLocalAvatar,
          };
          localStorage.setItem("Edvanz_user", JSON.stringify(resolvedUser));
          return resolvedUser;
        });
      }).catch(() => {
        // Keep the minimal session available if resolving the profile fails.
      });

      // ── 4. Auto-redeem gifts (non-blocking) ──────────────────────────────
      void autoRedeemGiftsForUser(minimalUser);
    },
    [],
  );

  // ── login (legacy — mock only, kept for backward compat) ──────────────────
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const foundUser = mockUsers.find((u) => u.email === email);
      if (!foundUser)
        throw new Error("No account found with this email address");
      if (password.length < 6) throw new Error("Incorrect password");
      setUser(foundUser);
      localStorage.setItem("Edvanz_user", JSON.stringify(foundUser));
      void autoRedeemGiftsForUser(foundUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── register ───────────────────────────────────────────────────────────────
  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: "student" | "instructor" = "student",
    ) => {
      setIsLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const existing = mockUsers.find((u) => u.email === email);
        if (existing)
          throw new Error("An account with this email already exists");
        if (role === "instructor") {
          pendingInstructors.add(email);
          return;
        }
        const newUser: User = {
          id: Date.now().toString(),
          name,
          email,
          role,
          enrolledCourses: [],
          createdAt: new Date().toISOString().split("T")[0],
        };
        setUser(newUser);
        localStorage.setItem("Edvanz_user", JSON.stringify(newUser));
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("ezcopilot:") ||
            key.startsWith("edvanz:ezcopilot:") ||
            key === "edvanz:ezcopilot:chat-state:v1")
        ) {
          keysToRemove.push(key);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    } catch {
      // fail silently
    }
    setUser(null);
    localStorage.removeItem("Edvanz_user");
    localStorage.removeItem("accessToken"); // matches api-client interceptor
    localStorage.removeItem("refreshToken"); // matches api-client 401 handler
  }, []);

  // ── updateAvatar ───────────────────────────────────────────────────────────
  const updateAvatar = useCallback((avatarUrl: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, avatar: avatarUrl };
      localStorage.setItem("Edvanz_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateAvatar,
        loginWithToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    if (import.meta.env.DEV) {
      return {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: async () => {},
        register: async () => {},
        logout: () => {},
        updateAvatar: () => {},
        loginWithToken: async () => {},
      };
    }
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
