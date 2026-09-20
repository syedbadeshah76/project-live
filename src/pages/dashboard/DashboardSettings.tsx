/**
 * DashboardSettings.tsx — Complete, backend-ready Settings page.
 *
 * Stack: React + react-router-dom + shadcn/ui + framer-motion + lucide-react + zod
 *
 * REQUIRED shadcn components (run `npx shadcn@latest add ...` if missing):
 *   card button input label switch tabs dialog alert-dialog select
 *   radio-group badge textarea
 * REQUIRED deps: framer-motion lucide-react zod react-router-dom
 *
 * Backend integration: everything talks to the `settingsApi` object below.
 * Each method is a mock returning fake data after a short delay. To wire up
 * your Java Spring Boot backend, replace ONLY the function bodies with real
 * fetch/axios calls to the documented endpoints. The UI never changes.
 *
 * Demo OTP for all OTP flows: 1234
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  LogOut,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  CheckCircle2,
  Info,
  AlertCircle,
  Loader2,
  Monitor,
  Laptop,
  Smartphone,
  Tablet,
  Mail,
  KeyRound,
  ShieldCheck,
  Clock,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/auth.service";
import { profileService } from "@/services/profile.service";
import { getApiError } from "@/lib/api-error";

/* ============================================================================
 * TYPES
 * ==========================================================================*/

export interface NotificationPrefs {
  promotionalEmails: boolean;
  pushNotifications: boolean;
  courseUpdates: boolean;
  streakReminders: boolean;
  weeklyDigest: boolean;
}

export interface UserSession {
  sessionId: string;
  deviceType?: string;
  deviceName?: string;
  // ipAddress?: string;
  active?: boolean;
  loginTime?: string;
  createdAt?: string;
  expiresAt?: string;
}

/* ============================================================================
 * MOCK API LAYER  (replace bodies with Spring Boot calls)
 * ==========================================================================*/

const wait = (ms = 600) => new Promise((res) => setTimeout(res, ms));

const settingsApi = {
  // ---- Notifications -------------------------------------------------------
  notifications: {
    /** GET /api/settings/notifications */
    async get(): Promise<NotificationPrefs> {
      const res = await apiClient.get("/users/preferences");

      return {
        promotionalEmails: res.promotionalEmails,
        pushNotifications: res.pushNotifications,
        courseUpdates: res.courseUpdates,
        streakReminders: res.emailNotifications,
        weeklyDigest: res.weeklyLearningDigest,
      };
    },

    /** PUT /api/settings/notifications */
    async update(prefs: NotificationPrefs): Promise<NotificationPrefs> {
      await apiClient.patch("/users/preferences", {
        emailNotifications: prefs.streakReminders,
        pushNotifications: prefs.pushNotifications,
        courseUpdates: prefs.courseUpdates,
        promotionalEmails: prefs.promotionalEmails,
        weeklyLearningDigest: prefs.weeklyDigest,
      });

      return prefs;
    },
    
  },

  // ---- Account -------------------------------------------------------------
  account: {
    /** GET /api/account/email */
    async getEmails(): Promise<{ primary: string }> {
      const res = await profileService.getProfile();
      return {
        primary: res?.data?.email || "",
      };
    },
    /** POST /api/account/logout-all */
    async logoutAllDevices(): Promise<{ ok: boolean }> {
      await authService.logout();
      return { ok: true };
    },
    /** DELETE /api/account  body: { password, reason } */
    async delete(password: string, reason: string): Promise<{ ok: boolean }> {
      await apiClient.delete("/users/me", { data: { password, reason } });
      return { ok: true };
    },
  },

  // ---- Privacy & Security --------------------------------------------------
  security: {
    /** GET /api/security/location */
    async getLocation(): Promise<{ country: string; city: string }> {
      try {
        const res = await profileService.getProfile();
        return {
          country: res?.data?.country || "",
          city: res?.data?.city || "",
        };
      } catch {
        return { country: "", city: "" };
      }
    },
    /** PUT /api/security/location  body: { country, city } */
    async updateLocation(country: string, city: string): Promise<{ ok: boolean }> {
      await profileService.updateProfile({ country, city });
      return { ok: true };
    },
    resetPassword: {
      /** POST /api/security/password  body: { newPassword } -> triggers OTP */
      async submit(newPassword: string): Promise<{ otpSent: boolean }> {
        await wait();
        if (!newPassword) throw new Error("Password required");
        return { otpSent: true };
      },
      /** POST /api/security/password/verify  body: { otp } */
      async verify(otp: string): Promise<{ ok: boolean }> {
        await wait();
        if (otp !== "1234") throw new Error("Invalid OTP");
        return { ok: true };
      },
    },
    accountActivity: {
      /** GET /api/users/sessions */
      async list(): Promise<UserSession[]> {
        const res = await apiClient.get<any>("/users/sessions");
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.data)) return res.data;
        if (Array.isArray(res?.content)) return res.content;
        return [];
      },
    },
  },
};

/* ============================================================================
 * HELPERS
 * ==========================================================================*/

const passwordRules = {
  minLength: (v: string) => v.length >= 8,
  composition: (v: string) =>
    /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v) && /[A-Z]/.test(v),
};

const COUNTRIES = [
  { value: "us", label: "United States", flag: "🇺🇸" },
  { value: "in", label: "India", flag: "🇮🇳" },
  { value: "gb", label: "United Kingdom", flag: "🇬🇧" },
  { value: "ca", label: "Canada", flag: "🇨🇦" },
  { value: "au", label: "Australia", flag: "🇦🇺" },
];

const CITIES = ["Florida", "New York", "Los Angeles", "Chicago", "Austin"];

const DELETE_REASONS = [
  "No longer using the service/platform",
  "Found a better alternative",
  "Privacy concerns",
  "Too many emails/notifications",
  "Difficulty navigating the platform",
  "Account security concerns",
  "Personal reasons",
  "Others",
];

function getDeviceIcon(deviceType?: string, deviceName?: string) {
  const dt = (deviceType || "").toUpperCase();
  const dn = (deviceName || "").toLowerCase();
  if (
    dt === "MOBILE" ||
    dn.includes("iphone") ||
    dn.includes("android") ||
    dn.includes("phone") ||
    dn.includes("mobile")
  ) {
    return Smartphone;
  }
  if (dt === "TABLET" || dn.includes("ipad") || dn.includes("tablet")) {
    return Tablet;
  }
  if (dn.includes("mac") || dn.includes("laptop") || dn.includes("windows")) {
    return Laptop;
  }
  return Monitor;
}

/* ============================================================================
 * REUSABLE — OTP INPUT (4 boxes)
 * ==========================================================================*/

function OtpInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const handle = (idx: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1);
    const arr = value.padEnd(4, " ").split("");
    arr[idx] = digit || " ";
    const next = arr.join("").replace(/\s/g, "");
    onChange(next);
    if (digit && idx < 3) {
      const el = document.getElementById(`otp-${idx + 1}`);
      el?.focus();
    }
  };

  return (
    <div className="flex gap-3">
      {[0, 1, 2, 3].map((i) => (
        <Input
          key={i}
          id={`otp-${i}`}
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handle(i, e.target.value)}
          className="h-12 w-14 text-center text-lg font-semibold"
        />
      ))}
    </div>
  );
}

function useCountdown(start: number) {
  const [seconds, setSeconds] = useState(start);
  const reset = useCallback(() => setSeconds(start), [start]);
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);
  const label = `00:${String(Math.max(seconds, 0)).padStart(2, "0")}`;
  return { seconds, label, reset };
}

/* ============================================================================
 * MAIN COMPONENT
 * ==========================================================================*/

const DashboardSettings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6"
    >
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Settings</h1>

      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="notifications" className="w-full">
            <div className="overflow-x-auto">
              <TabsList className="mb-2 inline-flex h-auto w-full justify-start gap-2 bg-transparent p-0">
                {[
                  ["notifications", "Notifications"],
                  ["account", "Account"],
                  ["privacy", "Privacy & Security"],
                ].map(([v, label]) => (
                  <TabsTrigger
                    key={v}
                    value={v}
                    className="rounded-none border-b-2 border-transparent bg-transparent px-3 pb-2 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="mt-6">
              <TabsContent value="notifications">
                <NotificationsTab />
              </TabsContent>
              <TabsContent value="account">
                <AccountTab navigate={navigate} toast={toast} />
              </TabsContent>
              <TabsContent value="privacy">
                <PrivacyTab navigate={navigate} toast={toast} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DashboardSettings;

/* ============================================================================
 * NOTIFICATIONS TAB
 * ==========================================================================*/

const NOTIF_ROWS: {
  key: keyof NotificationPrefs;
  title: string;
  desc: string;
}[] = [
  {
    key: "promotionalEmails",
    title: "Promotional Emails",
    desc: "Receive offers and promotional content",
  },
  {
    key: "pushNotifications",
    title: "Push Notifications",
    desc: "Receive push notifications in browser",
  },
  {
    key: "courseUpdates",
    title: "Course Updates",
    desc: "Get notified about new lessons and course updates",
  },
  {
    key: "streakReminders",
    title: "Streaks Learning Reminder",
    desc: "Receive mails to maintain the streaks",
  },
  {
    key: "weeklyDigest",
    title: "Weekly Learning Digest",
    desc: "Summary of your weekly learning progress",
  },
];

function NotificationsTab() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    settingsApi.notifications.get().then(setPrefs);
  }, []);

  const toggle = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated); // optimistic
    try {
      await settingsApi.notifications.update(updated);
      toast({ title: "Preferences updated" });
    } catch {
      setPrefs(prefs); // rollback
      toast({ title: "Could not update", variant: "destructive" });
    }
  };

  if (!prefs) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {NOTIF_ROWS.map((row) => (
        <div
          key={row.key}
          className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4"
        >
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="text-sm text-muted-foreground">{row.desc}</p>
          </div>
          <Switch
            checked={prefs[row.key]}
            onCheckedChange={(v) => toggle(row.key, v)}
          />
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
 * ACCOUNT TAB
 * ==========================================================================*/

function AccountTab({
  navigate,
  toast,
}: {
  navigate: ReturnType<typeof useNavigate>;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const { user, logout } = useAuth();
  const [primaryEmail, setPrimaryEmail] = useState(user?.email || "");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setPrimaryEmail(user.email);
    } else {
      profileService.getProfile().then((res) => {
        if (res?.data?.email) setPrimaryEmail(res.data.email);
      }).catch(() => {});
    }
  }, [user?.email]);

  const handleLogoutAll = async () => {
    try {
      await authService.logout();
    } catch {
      // Proceed with local logout regardless of network error
    } finally {
      if (logout) logout();
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("Edvanz_user");
      setLogoutConfirmOpen(false);
      toast({ title: "Logged out from all devices" });
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <p className="mb-3 font-medium">Email</p>

        <div className="space-y-1.5">
          <Label className="text-primary">Primary Email*</Label>
          <Input value={primaryEmail} disabled readOnly />
        </div>
      </div>

      {/* Log out of all devices */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-1 flex items-center gap-2">
          <LogOut className="h-4 w-4 text-primary" />
          <p className="font-semibold">Log out of all devices</p>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          Log out of all active sessions across all devices. This helps secure
          your account if you believe it has been accessed by someone else.
        </p>
        <Button onClick={() => setLogoutConfirmOpen(true)}>Continue</Button>
      </div>

      {/* Delete account */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-1 flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-primary" />
          <p className="font-semibold">Delete account</p>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          If you delete your account, all your personal information will be
          permanently removed from our servers. Your profile, activity history,
          saved data, and any associated records will be deleted, and you will no
          longer be able to access your account. This action is permanent and
          can't be undone.
        </p>
        <Button onClick={() => setDeleteOpen(true)}>Delete My Account</Button>
      </div>

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to logout from all devices?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of every active session. You'll need to log
              in again on each device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogoutAll}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteAccountFlow
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        navigate={navigate}
        toast={toast}
      />
    </div>
  );
}

/* ---- DELETE ACCOUNT 3-STEP FLOW ----------------------------------------- */

function DeleteAccountFlow({
  open,
  onOpenChange,
  navigate,
  toast,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  navigate: ReturnType<typeof useNavigate>;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  type Step = "password" | "feedback" | "confirm" | null;
  const [step, setStep] = useState<Step>(null);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("password");
      setPassword("");
      setReason("");
      setOtherReason("");
    } else {
      setStep(null);
    }
  }, [open]);

  const close = () => onOpenChange(false);

  const { logout } = useAuth();

  const confirmDelete = async () => {
    setLoading(true);
    try {
      const selectedReason = reason === "Others" ? otherReason : reason;
      const payload: Record<string, string> = {};
      if (selectedReason) {
        payload.reason = selectedReason;
      }
      if (password) {
        payload.password = password;
      }

      await apiClient.delete("/users/me", {
        data: payload,
      });
      close();
      toast({ title: "Account deleted successfully" });
      if (logout) logout();
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("Edvanz_user");
      navigate("/login", { replace: true });
    } catch (err) {
      toast({
        title: getApiError(err, "Could not delete account"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Step 1: password */}
      <Dialog open={open && step === "password"} onOpenChange={close}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              Deleting your account will remove your profile, EZ Coins, course
              access, live classes, and certificate verification. You can
              reactivate your account within 14 days by signing in again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Enter Password</Label>
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              disabled={!password}
              onClick={() => setStep("feedback")}
            >
              Continue
            </Button>
            <Button variant="outline" onClick={close}>
              Go, back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: feedback */}
      <Dialog open={open && step === "feedback"} onOpenChange={close}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Your feedback helps us improve. Why are you deleting your account?
            </DialogDescription>
          </DialogHeader>

          <RadioGroup value={reason} onValueChange={setReason} className="gap-0">
            {DELETE_REASONS.map((r) => (
              <label
                key={r}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-muted"
              >
                <RadioGroupItem value={r} />
                <span>{r}</span>
              </label>
            ))}
          </RadioGroup>

          {reason === "Others" && (
            <Textarea
              placeholder="Please write a reason..."
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
            />
          )}

          <DialogFooter className="sm:justify-center">
            <Button
              disabled={!reason || (reason === "Others" && !otherReason)}
              onClick={() => setStep("confirm")}
            >
              Continue
            </Button>
            <Button variant="outline" onClick={close}>
              Go, back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 3: final confirm */}
      <Dialog open={open && step === "confirm"} onOpenChange={close}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete your account?
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs italic text-muted-foreground">
            Ensuring that the user understands the consequences of deleting their
            account (loss of data, subscriptions, etc.).
          </p>
          <DialogFooter className="sm:justify-center">
            <Button onClick={confirmDelete} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes I'm sure
            </Button>
            <Button variant="outline" onClick={close}>
              Go, back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ============================================================================
 * PRIVACY & SECURITY TAB
 * ==========================================================================*/

function PrivacyTab({
  toast,
}: {
  navigate?: ReturnType<typeof useNavigate>;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  const countries = useMemo(() => {
    try {
      return Country.getAllCountries() || [];
    } catch {
      return [];
    }
  }, []);

  const countryItems = useMemo(
    () =>
      (countries || [])
        .filter((c) => c && typeof c.name === "string")
        .map((c) => ({
          label: `${c.flag ? c.flag + " " : ""}${c.name}`,
          value: c.name,
        })),
    [countries]
  );

  const currentCountryObj = useMemo(() => {
    if (!selectedCountry || typeof selectedCountry !== "string") return null;
    const search = selectedCountry.trim().toLowerCase();
    if (!search) return null;
    return (
      (countries || []).find(
        (c) =>
          c &&
          ((typeof c.name === "string" && c.name.toLowerCase() === search) ||
            (typeof c.isoCode === "string" && c.isoCode.toLowerCase() === search))
      ) || null
    );
  }, [selectedCountry, countries]);

  const availableStates = useMemo(() => {
    if (!currentCountryObj || !currentCountryObj.isoCode) return [];
    try {
      return State.getStatesOfCountry(currentCountryObj.isoCode) || [];
    } catch {
      return [];
    }
  }, [currentCountryObj]);

  const availableCities = useMemo(() => {
    if (!currentCountryObj || !currentCountryObj.isoCode) return [];
    try {
      return City.getCitiesOfCountry(currentCountryObj.isoCode) || [];
    } catch {
      return [];
    }
  }, [currentCountryObj]);

  const locationType = useMemo<"State" | "City" | null>(() => {
    if (!selectedLocation || !currentCountryObj) return null;
    const locLower = selectedLocation.trim().toLowerCase();

    // Check if matches state name or code
    const isState = availableStates.some(
      (s) =>
        s &&
        ((typeof s.name === "string" && s.name.toLowerCase() === locLower) ||
          (typeof s.isoCode === "string" && s.isoCode.toLowerCase() === locLower))
    );
    if (isState) return "State";

    // Check if matches city name
    const isCity = availableCities.some(
      (c) => c && typeof c.name === "string" && c.name.toLowerCase() === locLower
    );
    if (isCity) return "City";

    return availableStates.length > 0 ? "City" : "City";
  }, [selectedLocation, currentCountryObj, availableStates, availableCities]);

  const locationItems = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    const seen = new Set<string>();

    (availableStates || [])
      .filter((s) => s && typeof s.name === "string")
      .forEach((s) => {
        const key = s.name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ label: s.name, value: s.name });
        }
      });

    // If no states are defined for this country, provide cities
    if (items.length === 0 && (availableCities || []).length > 0) {
      availableCities
        .filter((c) => c && typeof c.name === "string")
        .forEach((c) => {
          const key = c.name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            items.push({ label: c.name, value: c.name });
          }
        });
    }

    // If user's selected location is not yet in the items list, include it so SearchableSelect can show it
    if (selectedLocation && !seen.has(selectedLocation.trim().toLowerCase())) {
      items.unshift({
        label: selectedLocation.trim(),
        value: selectedLocation.trim(),
      });
    }

    return items;
  }, [availableStates, availableCities, selectedLocation]);

  useEffect(() => {
    let isMounted = true;
    setLoadingLocation(true);
    profileService
      .getProfile()
      .then((res) => {
        if (!isMounted) return;
        const c = res?.data?.country;
        const ci = res?.data?.city;

        if (typeof c === "string" && c.trim()) {
          const cTrim = c.trim();
          const matchedCountry = (countries || []).find(
            (item) =>
              item &&
              ((typeof item.name === "string" &&
                item.name.toLowerCase() === cTrim.toLowerCase()) ||
                (typeof item.isoCode === "string" &&
                  item.isoCode.toLowerCase() === cTrim.toLowerCase()))
          );
          setSelectedCountry(matchedCountry ? matchedCountry.name : cTrim);
        }

        if (typeof ci === "string" && ci.trim()) {
          setSelectedLocation(ci.trim());
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) {
          setLoadingLocation(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [countries]);

  const save = async () => {
    setSavingLocation(true);
    try {
      await profileService.updateProfile({
        country: selectedCountry,
        city: selectedLocation,
      });
      toast({ title: "Country and location updated successfully" });
    } catch (err) {
      toast({
        title: getApiError(err, "Failed to update country and location"),
        variant: "destructive",
      });
    } finally {
      setSavingLocation(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      {loadingLocation ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label>Change Country</Label>
            <SearchableSelect
              items={countryItems}
              value={selectedCountry}
              onChange={(val) => {
                setSelectedCountry(val);
                setSelectedLocation("");
              }}
              placeholder="Select Country"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>
                Change {locationType ? locationType : "City / State"}
              </Label>
              {selectedLocation && locationType && (
                <Badge variant="secondary" className="text-xs font-normal">
                  Location Type:{" "}
                  <span className="font-semibold text-foreground ml-1">
                    {locationType}
                  </span>
                </Badge>
              )}
            </div>
            <SearchableSelect
              items={locationItems}
              value={selectedLocation}
              onChange={(val) => setSelectedLocation(val)}
              placeholder={
                !selectedCountry
                  ? "Select country first"
                  : locationItems.length === 0
                  ? "No states/cities available"
                  : `Select ${locationType || "City / State"}`
              }
              disabled={!selectedCountry || locationItems.length === 0}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Reset Password</Label>
            <div className="relative">
              <Input value="••••••••••" disabled readOnly className="pr-10" />
              <button
                type="button"
                onClick={() => setResetOpen(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Reset password"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-1 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <p className="font-semibold">Account Activity</p>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              View recent account activity, including sign-ins, security events, and
              changes made to your account.
            </p>
            <Button onClick={() => setActivityOpen(true)}>Continue</Button>
          </div>

          <Button onClick={save} disabled={savingLocation}>
            {savingLocation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </>
      )}

      <ResetPasswordDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        toast={toast}
      />
      <AccountActivityDialog open={activityOpen} onOpenChange={setActivityOpen} />
    </div>
  );
}

function ResetPasswordDialog({
  open,
  onOpenChange,
  toast,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentPwd("");
      setNewPwd("");
      setConfirm("");
    }
  }, [open]);

  const okLength = passwordRules.minLength(newPwd);
  const okComposition = passwordRules.composition(newPwd);
  const match = newPwd.length > 0 && newPwd === confirm;
  const canSubmit = currentPwd.length > 0 && okLength && okComposition && match;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await apiClient.put("/auth/password", {
        currentPassword: currentPwd,
        newPassword: newPwd,
      });
      onOpenChange(false);
      toast({ title: "Password updated successfully" });
    } catch (err) {
      toast({
        title: getApiError(err, "Failed to update password"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Input
              type={showCurrentPwd ? "text" : "password"}
              placeholder="Current Password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPwd((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <Input
              type={showNewPwd ? "text" : "password"}
              placeholder="New Password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNewPwd((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm New Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          <ul className="space-y-1.5 text-sm">
            <RuleRow ok={okLength} text="Must be at least 8 character" />
            <RuleRow
              ok={okComposition}
              text="Must be have a number, special character and an upper case letter"
            />
            {confirm.length > 0 && !match && (
              <li className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                Passwords does not match
              </li>
            )}
          </ul>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button onClick={submit} disabled={!canSubmit || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RuleRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li
      className={`flex items-center gap-2 ${
        ok ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <Info className="h-4 w-4" />
      )}
      {text}
    </li>
  );
}

function parseUtcTimestamp(raw?: string | number | Date | null): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === "number") {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(raw).trim();
  if (!str) return null;
  // If the date string has no timezone indicator (Z or +/-offset), treat it as UTC
  const hasTz = str.endsWith("Z") || /[+-]\d{2}(:?\d{2})?$/.test(str);
  const normalized = hasTz ? str : `${str.replace(" ", "T")}Z`;
  const dateObj = new Date(normalized);
  return isNaN(dateObj.getTime()) ? null : dateObj;
}

function formatAccountActivityTime(dateInput?: string | number | Date | null): string {
  const dateObj = parseUtcTimestamp(dateInput);
  if (!dateObj) return "";

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: userTimeZone,
  }).format(dateObj);
}

function AccountActivityDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [sessions, setSessions] = useState<UserSession[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setSessions(null);
      settingsApi.security.accountActivity
        .list()
        .then((data) => setSessions(data))
        .catch(() => setSessions([]))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const displayedSessions = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    // Sort by loginTime / createdAt descending
    const sorted = [...sessions].sort((a, b) => {
      const timeA = parseUtcTimestamp(a.loginTime || a.createdAt)?.getTime() ?? 0;
      const timeB = parseUtcTimestamp(b.loginTime || b.createdAt)?.getTime() ?? 0;
      return timeB - timeA;
    });

    const activeSessions = sorted.filter((s) => s.active);
    const pastSessions = sorted.filter((s) => !s.active);

    if (activeSessions.length > 0) {
      // Show active session at the top, and 3 activities below it
      return [...activeSessions.slice(0, 1), ...pastSessions.slice(0, 3)];
    }

    // Fallback if no active session
    return sorted.slice(0, 4);
  }, [sessions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Account Activity</DialogTitle>
          <DialogDescription>
            Recent sign-ins, devices, and sessions on your account.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayedSessions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No active sessions or recent activity found.
          </div>
        ) : (
          <div className="space-y-3 pr-1">
            {displayedSessions.map((session) => {
              const Icon = getDeviceIcon(session.deviceType, session.deviceName);
              const activityTimestamp = session.loginTime || session.createdAt;
              return (
                <div
                  key={session.sessionId}
                  className="flex gap-3 rounded-lg border bg-card p-3 items-center justify-between"
                >
                  <div className="flex gap-3 items-center min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate text-sm">
                          {session.deviceName || "Web Browser"}
                        </p>
                        {session.active && (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px] px-1.5 py-0 h-4 font-normal"
                          >
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {activityTimestamp && (
                    <span className="shrink-0 text-xs text-muted-foreground text-right">
                      {formatAccountActivityTime(activityTimestamp)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
