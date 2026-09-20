import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { VerificationBanner } from "@/components/profile/VerificationBanner";
import { OtpVerificationModal } from "@/components/profile/OtpVerificationModal";
import { SkillPassportSection } from "@/components/profile/SkillPassportSection";
import { EditProfileSection } from "@/components/profile/EditProfileSection";
import { ProfileCourseSearch } from "@/components/profile/ProfileCourseSearch";
import { Flame, LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { profileService, type ProfileData } from "@/services/profile.service";
import { StreakProgressButton } from "@/components/profile/StreakProgressButton";
import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateAvatar } = useAuth();
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyModal, setVerifyModal] = useState<"phone" | "email" | null>(
    null,
  );
  // Callback fired after successful email verification (used by Add Email flow)
  const [emailVerifiedCb, setEmailVerifiedCb] = useState<
    ((email: string) => void) | null
  >(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const refetchProfile = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      try {
        const res = await profileService.getProfile();
        if (!cancelled && res.success) {
          setProfile(res.data);
          if (res.data.avatar) {
            updateAvatar(res.data.avatar);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, updateAvatar]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-5">
            <Skeleton className="h-48 w-1/2 rounded-2xl" />
            <Skeleton className="h-48 w-1/2 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </main>
      </div>
    );
  }

  if (!profile) return null;

  const view: "passport" | "edit" = location.pathname.endsWith("/profile/edit")
    ? "edit"
    : "passport";

  const profileLegacy = {
    name: `${profile.firstName} ${profile.lastName}`,
    username: profile.username,
    email: profile.email,
    phone: profile.phone,
    avatar: profile.avatar || user?.avatar || "",
    bio: profile.bio,
    skills: profile.skills,
    learningInterests: profile.learningInterests,
    education: profile.education,
    socials: profile.socials,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header Bar */}

      {/* {!phoneVerified && (
        <VerificationBanner
          message="to receive important updates and notifications."
          linkText="Phone Number"
          onLinkClick={() => setVerifyModal("phone")}
        />
      )} */}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <AnimatePresence mode="wait">
          {view === "passport" ? (
            <motion.div
              key="passport"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h1 className="text-2xl font-bold text-card-foreground mb-6">
                Skill Passport
              </h1>
              <SkillPassportSection
                profile={profileLegacy}
                onEditProfile={() => navigate("/dashboard/profile/edit")}
              />
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EditProfileSection
                onSaved={refetchProfile}
                onBack={() => navigate("/dashboard/profile")}
                onVerifyPhone={() => setVerifyModal("phone")}
                onAddEmail={(cb) => {
                  setEmailVerifiedCb(() => cb);
                  setVerifyModal("email");
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <OtpVerificationModal
        type={verifyModal || "phone"}
        isOpen={verifyModal !== null}
        onClose={() => {
          setVerifyModal(null);
          setEmailVerifiedCb(null);
        }}
        onVerified={(value) => {
          if (verifyModal === "phone") setPhoneVerified(true);
          if (verifyModal === "email") {
            setEmailVerified(true);
            if (emailVerifiedCb && value) emailVerifiedCb(value);
          }
          setEmailVerifiedCb(null);
          setVerifyModal(null);
        }}
      />
    </div>
  );
};

export default Profile;
