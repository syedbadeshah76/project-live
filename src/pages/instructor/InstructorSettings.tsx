// src/pages/InstructorSettings.tsx
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User as UserIcon, Camera, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { instructorSettingsService } from "@/services/instructor-settings.service";

/* ============================================================
 * Validation Schemas
 * ============================================================ */
const profileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  bio: z.string().max(500, "Bio must be under 500 characters").optional(),
  expertiseTags: z.string().optional(),
  socialLink: z
    .string()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
  introVideo: z
    .string()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, "Minimum 6 characters"),
    newPassword: z.string().min(6, "Minimum 6 characters"),
  });

const payoutSchema = z.object({
  payoutMethod: z.string().optional(),
  accountNumber: z.string().optional(),
  payoutSchedule: z.string().optional(),
});

const preferencesSchema = z.object({
  meetingPlatform: z.string().optional(),
  newEnrollmentNotifications: z.boolean(),
  qaReplyAlerts: z.boolean(),
  adminApprovalAlerts: z.boolean(),
  revenueUpdates: z.boolean(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type PayoutForm = z.infer<typeof payoutSchema>;
type PreferencesForm = z.infer<typeof preferencesSchema>;

/* ============================================================
 * Constants (mirror backend enums)
 * ============================================================ */
const PAYOUT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "PAYPAL", label: "Paypal" },
  { value: "STRIPE", label: "Stripe" },
];

const PAYOUT_SCHEDULES = [
  { value: "EVERY_15_DAYS", label: "Every 15 Days" },
  { value: "MONTHLY", label: "Monthly" },
];

const MEETING_PLATFORMS = [
  { value: "ZOOM", label: "Zoom" },
];

/* ============================================================
 * Page
 * ============================================================ */
const InstructorSettings = () => {
  const { user, updateAvatar } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.name || "",
      bio: "10+ years in UI/UX Design. Former Google Designer.",
      expertiseTags: "UI/UX, Figma, React, Design Systems",
      socialLink: "",
      introVideo: "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const payoutForm = useForm<PayoutForm>({
    resolver: zodResolver(payoutSchema),
    defaultValues: {
      payoutMethod: "",
      accountNumber: "",
      payoutSchedule: "",
    },
  });

  const prefsForm = useForm<PreferencesForm>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      meetingPlatform: "",
      newEnrollmentNotifications: true,
      qaReplyAlerts: true,
      adminApprovalAlerts: true,
      revenueUpdates: true,
    },
  });

  /* ---------- Load initial data from backend ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [profile, prefs] = await Promise.all([
          instructorSettingsService.getProfile().catch(() => null),
          instructorSettingsService.getPreferences().catch(() => null),
        ]);

        if (!mounted) return;

        if (profile) {
          const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
          const socialUrl =
            profile.socialLink ||
            profile.socials?.linkedin ||
            profile.socials?.github ||
            profile.socials?.website ||
            profile.socials?.twitter ||
            profile.socials?.instagram ||
            (profile as any).introVideo ||
            "";

          profileForm.reset({
            fullName: fullName || user?.name || "",
            bio: profile.bio || "",
            expertiseTags: "UI/UX, Figma, React, Design Systems",
            socialLink: socialUrl,
            introVideo: socialUrl,
          });
          if (profile.avatar) {
            updateAvatar(profile.avatar);
          }
        }

        if (prefs) {
          prefsForm.reset({
            meetingPlatform: prefs.meetingPlatform ?? "ZOOM",
            newEnrollmentNotifications: prefs.newEnrollmentNotifications ?? prefs.emailNotifications ?? true,
            qaReplyAlerts: prefs.qaReplyAlerts ?? true,
            adminApprovalAlerts: prefs.adminApprovalAlerts ?? true,
            revenueUpdates: prefs.revenueUpdates ?? true,
          });
        }
      } catch {
        /* silent — form falls back to defaults */
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Avatar upload ---------- */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Max 5MB allowed.",
        variant: "destructive",
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    updateAvatar(previewUrl);

    try {
      const { url } = await instructorSettingsService.uploadAvatar(file);
      if (url) {
        updateAvatar(url);
      } else {
        const fresh = await instructorSettingsService.getProfile();
        if (fresh?.avatar) updateAvatar(fresh.avatar);
      }
      toast({ title: "Profile photo updated successfully" });
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Could not upload photo. Please try again.";
      toast({
        title: "Upload failed",
        description: errMsg,
        variant: "destructive",
      });
    }
  };

  /* ---------- Submit handlers ---------- */
  const onProfileSubmit = async (data: ProfileForm) => {
    setSavingProfile(true);
    try {
      await instructorSettingsService.updateProfile(data);
      toast({ title: "Profile updated successfully" });
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Could not update profile.";
      toast({
        title: "Update failed",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setSavingPassword(true);
    try {
      await instructorSettingsService.updatePassword(data);
      toast({ title: "Password updated successfully" });
      passwordForm.reset();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Could not update password.";
      toast({
        title: "Update failed",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // const onPayoutSubmit = async (data: PayoutForm) => {
  //   setSavingPayout(true);
  //   try {
  //     await instructorSettingsService.updatePayout(data);
  //     toast({ title: "Payout settings updated" });
  //   } catch {
  //     toast({
  //       title: "Update failed",
  //       description: "Could not update payout settings.",
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setSavingPayout(false);
  //   }
  // };

  const onPrefsSubmit = async (data: PreferencesForm) => {
    setSavingPrefs(true);
    try {
      await instructorSettingsService.updatePreferences(data);
      toast({ title: "Preferences saved successfully" });
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message || err?.message || "Could not save preferences.";
      toast({
        title: "Update failed",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  const bioLength = profileForm.watch("bio")?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-muted/30 p-4 md:p-8"
    >
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ================= LEFT COLUMN ================= */}
        <div className="lg:col-span-2 space-y-6">
          {/* -------- Profile Information -------- */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                className="space-y-6"
              >
                {/* Avatar row */}
                <div className="flex items-center gap-4 pb-6 border-b">
                  <div className="relative">
                    <Avatar className="h-16 w-16 bg-primary text-primary-foreground">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                        {user?.name?.charAt(0) || "JD"}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      aria-label="Change photo"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      <Camera className="h-3 w-3" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base truncate">
                      {user?.name || "John Doe"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      Senior Instructor · Joined Jan 2026
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 h-8 text-primary border-primary/40 hover:bg-primary/5"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Photo
                    </Button>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Full Name
                  </Label>
                  <Input {...profileForm.register("fullName")} />
                  {profileForm.formState.errors.fullName && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Bio / Introduction
                    </Label>
                    <span
                      className={`text-xs ${
                        bioLength > 500
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {bioLength}/500
                    </span>
                  </div>
                  <Textarea
                    rows={4}
                    {...profileForm.register("bio")}
                    className="resize-none"
                  />
                  {profileForm.formState.errors.bio && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.bio.message}
                    </p>
                  )}
                </div>

                {/* Expertise Tags */}
                {/* <div className="space-y-2">
                  <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Expertise Tags
                  </Label>
                  <Input
                    {...profileForm.register("expertiseTags")}
                    placeholder="UI/UX, Figma, React, Design Systems"
                  />
                </div> */}

                {/* Social Link */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Social Link
                  </Label>
                  <Input
                    {...profileForm.register("socialLink")}
                    placeholder="Enter social link"
                  />
                  {(profileForm.formState.errors.socialLink || profileForm.formState.errors.introVideo) && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.socialLink?.message || profileForm.formState.errors.introVideo?.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* -------- Teaching Preferences -------- */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">
                Teaching Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={prefsForm.handleSubmit(onPrefsSubmit)}
                className="space-y-6"
              >
                <div className="space-y-2 pb-6 border-b">
                  <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Preferred Meeting Platform
                  </Label>
                  <Controller
                    name="meetingPlatform"
                    control={prefsForm.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose option..." />
                        </SelectTrigger>
                        <SelectContent>
                          {MEETING_PLATFORMS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {(
                  [
                    {
                      key: "newEnrollmentNotifications",
                      label: "New enrollment notifications",
                    },
                    { key: "qaReplyAlerts", label: "Q&A reply alerts" },
                    {
                      key: "adminApprovalAlerts",
                      label: "Admin approval alerts",
                    },
                    { key: "revenueUpdates", label: "Revenue updates" },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between"
                  >
                    <p className="text-sm">{item.label}</p>
                    <Controller
                      name={item.key}
                      control={prefsForm.control}
                      render={({ field }) => (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <span className="text-sm text-primary font-medium min-w-[24px]">
                            {field.value ? "On" : "Off"}
                          </span>
                        </div>
                      )}
                    />
                  </div>
                ))}

                <div className="flex justify-end">
                  <Button type="submit" disabled={savingPrefs}>
                    {savingPrefs ? "Saving..." : "Save Preferences"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="space-y-6">
          {/* -------- Payout Settings -------- */}
          {/* <Card className="rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">
                Payout Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={payoutForm.handleSubmit(onPayoutSubmit)}
                className="space-y-5"
              >
                <div className="rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary font-medium">
                  Payout details verified &amp; processed by Admin Portal
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Payout Method
                  </Label>
                  <Controller
                    name="payoutMethod"
                    control={payoutForm.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose option..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYOUT_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Account Number
                  </Label>
                  <Input
                    {...payoutForm.register("accountNumber")}
                    placeholder="**** **** **** 4521"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Payout Schedule
                  </Label>
                  <Controller
                    name="payoutSchedule"
                    control={payoutForm.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose option..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYOUT_SCHEDULES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={savingPayout}
                  className="w-full"
                >
                  {savingPayout ? "Saving..." : "Save Payout Settings"}
                </Button>
              </form>
            </CardContent>
          </Card> */}

          {/* -------- Security -------- */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Security</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Current Password
                  </Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    {...passwordForm.register("currentPassword")}
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    New Password
                  </Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    {...passwordForm.register("newPassword")}
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full"
                >
                  {savingPassword ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* -------- Account Status -------- */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Instructor Status", value: "Approved by Admin" },
                { label: "Identity Verified", value: "Verified" },
                { label: "Teaching Plan", value: "Approved" },
                { label: "Documents", value: "Submitted" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between"
                >
                  <p className="text-sm">{row.label}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <CheckCircle2 className="h-3 w-3" />
                    {row.value}
                  </span>
                </div>
              ))}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  All approvals managed via Admin → Instructor Approvals
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default InstructorSettings;
