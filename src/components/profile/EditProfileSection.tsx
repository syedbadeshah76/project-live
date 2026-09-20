import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  ProfileData,
  profileService,
  type Education,
} from "@/services/profile.service";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface EditProfileSectionProps {
  onBack: () => void;
  onVerifyPhone: () => void;
  onAddEmail: (onVerified: (email: string) => void) => void;
  /** Called after any successful backend write so the parent can refetch /users/me */
  onSaved?: () => void;
}

const MAX_BIO_WORDS = 50;

type EduRow = Omit<Education, "id"> & { id: string };

const countWords = (s: string) =>
  s.trim().length === 0 ? 0 : s.trim().split(/\s+/).length;

const limitWords = (s: string, max: number) => {
  const parts = s.split(/(\s+)/);
  let count = 0;
  const out: string[] = [];
  for (const p of parts) {
    if (/\s+/.test(p) || p.length === 0) {
      out.push(p);
    } else {
      if (count >= max) break;
      out.push(p);
      count++;
    }
  }
  return out.join("");
};

const formatDMY = (iso: string) => {
  if (!iso) return "DD/MM/YY";
  const [y, m = "01", d = "01"] = iso.split("-");
  const shortYear = y.length === 4 ? y.slice(2) : y;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${shortYear}`;
};

const formatEduDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};

const formatDisplayDateRange = (startDate: string, endDate: string) => {
  const start = formatEduDate(startDate);
  const end = endDate ? formatEduDate(endDate) : "Present";
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  return "";
};

export const EditProfileSection = ({
  onBack,
  onSaved,
}: EditProfileSectionProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateAvatar: updateAuthAvatar } = useAuth();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    bio: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const [phoneFull, setPhoneFull] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("IN");
  const [, setPhoneLocal] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const [socials, setSocials] = useState<string[]>([""]);
  const [socialError, setSocialError] = useState("");

  // Education state (List of entries)
  const [education, setEducation] = useState<EduRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Education Modal & Deletion State
  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [editingEduIndex, setEditingEduIndex] = useState<number | null>(null);
  const [eduForm, setEduForm] = useState<EduRow>({
    id: "",
    school: "",
    degree: "",
    fieldOfStudy: "",
    startDate: "",
    endDate: "",
    description: "",
  });
  const [eduErrors, setEduErrors] = useState<Record<string, string>>({});

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(
    null,
  );
  const [deleteTriggerSource, setDeleteTriggerSource] = useState<
    "modal" | "card"
  >("modal");

  // Hydrate
  const hydrate = async () => {
    const res = await profileService.getProfile();
    if (!res.success) return;
    const p = res.data;
    setForm({
      firstName: p.firstName || "",
      lastName: p.lastName || "",
      email: p.email || "",
      bio: limitWords(p.bio || "", MAX_BIO_WORDS),
    });
    setAvatarUrl(p.avatar || "");
    setPhoneFull(p.phone || "");
    setPhoneLocal(p.phone || "");
    const socialList = Object.values(p.socials || {}).filter(
      Boolean,
    ) as string[];
    setSocials(socialList.length ? socialList : [""]);
    setEducation(
      p.education && p.education.length
        ? p.education.map((e, idx) => ({
            ...e,
            id: e.id || crypto.randomUUID() || String(idx),
          }))
        : [],
    );
  };

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard escape listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDeleteConfirmOpen) {
          handleCancelDeleteGoBack();
        } else if (isEduModalOpen) {
          setIsEduModalOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeleteConfirmOpen, isEduModalOpen, deleteTriggerSource]);

  // ---- Avatar ----
  const handleAvatarPick = () => fileInputRef.current?.click();
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const res = await profileService.updateAvatar(file);
      if (res.success) {
        const nextAvatar = res.data.avatarUrl || "";
        updateAuthAvatar(nextAvatar);
        setAvatarUrl(nextAvatar);
        toast({
          title: "Profile updated",
          description: "Your profile picture has been uploaded successfully.",
        });
        await hydrate();
        onSaved?.();
        onBack();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown upload error";
      console.error("Avatar upload failed", error);
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // ---- Socials ----
  const handleAddSocial = () => setSocials([...socials, ""]);
  const handleRemoveSocial = (i: number) => {
    const next = socials.filter((_, idx) => idx !== i);
    setSocials(next.length ? next : [""]);
  };
  const handleSocialChange = (index: number, value: string) => {
    const next = [...socials];
    next[index] = value;
    setSocials(next);
    if (value && !/^https?:\/\/.+/.test(value) && value.length > 5) {
      setSocialError(
        "*Enter a valid URL (must start with http:// or https://)",
      );
    } else {
      setSocialError("");
    }
  };

  // ---- Bio ----
  const bioWordCount = countWords(form.bio);
  const handleBioChange = (val: string) => {
    setForm({
      ...form,
      bio:
        countWords(val) <= MAX_BIO_WORDS ? val : limitWords(val, MAX_BIO_WORDS),
    });
  };

  // ---- Education Validation & Handlers ----
  const validateEduForm = (formToValidate: EduRow): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!formToValidate.school.trim()) {
      errs.school = "*School is required";
    }
    if (!formToValidate.degree.trim()) {
      errs.degree = "*Degree is required";
    }
    if (!formToValidate.fieldOfStudy.trim()) {
      errs.fieldOfStudy = "*Field of study is required";
    }
    if (!formToValidate.startDate.trim()) {
      errs.startDate = "*Start Date is required";
    }
    return errs;
  };

  const handleEduFieldChange = (field: keyof EduRow, value: string) => {
    const nextForm = { ...eduForm, [field]: value };
    setEduForm(nextForm);
    if (eduErrors[field]) {
      const errs = validateEduForm(nextForm);
      setEduErrors(errs);
    }
  };

  const handleEduFieldBlur = (field: keyof EduRow) => {
    const errs = validateEduForm(eduForm);
    if (errs[field]) {
      setEduErrors((prev) => ({ ...prev, [field]: errs[field] }));
    } else {
      setEduErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleOpenAddModal = () => {
    setEditingEduIndex(null);
    setEduForm({
      id: crypto.randomUUID(),
      school: "",
      degree: "",
      fieldOfStudy: "",
      startDate: "",
      endDate: "",
      description: "",
    });
    setEduErrors({});
    setIsEduModalOpen(true);
  };

  const handleOpenEditModal = (index: number) => {
    setEditingEduIndex(index);
    setEduForm({ ...education[index] });
    setEduErrors({});
    setIsEduModalOpen(true);
  };

  const handleSaveEduModal = () => {
    const errs = validateEduForm(eduForm);
    if (Object.keys(errs).length > 0) {
      setEduErrors(errs);
      return;
    }

    if (editingEduIndex !== null) {
      setEducation((prev) =>
        prev.map((item, i) => (i === editingEduIndex ? eduForm : item)),
      );
    } else {
      setEducation((prev) => [...prev, eduForm]);
    }

    setIsEduModalOpen(false);
    setEduErrors({});
  };

  const handleModalInitiateDelete = () => {
    if (editingEduIndex === null) return;
    setPendingDeleteIndex(editingEduIndex);
    setDeleteTriggerSource("modal");
    setIsEduModalOpen(false);
    setIsDeleteConfirmOpen(true);
  };

  const handleOpenCardDelete = (index: number) => {
    setPendingDeleteIndex(index);
    setDeleteTriggerSource("card");
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteIndex !== null) {
      setEducation((prev) => prev.filter((_, i) => i !== pendingDeleteIndex));
    }
    setIsDeleteConfirmOpen(false);
    setIsEduModalOpen(false);
    setPendingDeleteIndex(null);
    setEditingEduIndex(null);
  };

  const handleCancelDeleteGoBack = () => {
    setIsDeleteConfirmOpen(false);
    if (deleteTriggerSource === "modal") {
      setIsEduModalOpen(true);
    }
    setPendingDeleteIndex(null);
  };

  // ---- Profile Level Save ----
  const buildSocialsMap = (): ProfileData["socials"] => {
    const socialsMap: ProfileData["socials"] = {
      linkedin: "",
      github: "",
      instagram: "",
      twitter: "",
      website: "",
    };

    socials.forEach((url) => {
      const value = url.trim();
      if (!value) return;
      const lower = value.toLowerCase();
      if (lower.includes("linkedin")) {
        socialsMap.linkedin = value;
      } else if (lower.includes("github")) {
        socialsMap.github = value;
      } else if (lower.includes("instagram")) {
        socialsMap.instagram = value;
      } else if (lower.includes("twitter") || lower.includes("x.com")) {
        socialsMap.twitter = value;
      } else {
        socialsMap.website = value;
      }
    });

    return socialsMap;
  };

  const handleSave = async () => {
    const invalidSocial = socials.find(
      (s) => s.trim() && !/^https?:\/\/.+/.test(s.trim()),
    );
    if (invalidSocial) {
      setSocialError(
        "*Enter a valid URL (must start with http:// or https://)",
      );
      return;
    }

    setSaving(true);

    try {
      const validEducation = education.map((e) => ({
        id: e.id ?? "",
        school: e.school,
        degree: e.degree,
        fieldOfStudy: e.fieldOfStudy,
        startDate: e.startDate,
        endDate: e.endDate,
        description: e.description || "",
      }));

      const res = await profileService.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: phoneFull ?? "",
        bio: form.bio ?? "",
        avatar: avatarUrl || undefined,
        socials: buildSocialsMap(),
        education: validEducation,
      });

      if (res.success) {
        await hydrate();
        onSaved?.();
        toast({
          title: "Profile updated",
          description: "Your changes have been saved successfully.",
        });
        await hydrate();
        onBack();
      }
    } catch {
      toast({
        title: "Update failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={onBack} className="hover:text-[#2557D6]">
          Skill Passport
        </button>
        <span>›</span>
        <span className="text-[#2557D6] font-medium">Edit Profile</span>
      </div>

      <div className="pt-3 lg:pt-3">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT */}
          <div className="shrink-0 lg:w-52">
            <div className="bg-card rounded-sm border border-border p-6 md:p-8 space-y-6 h-1/7 flex flex-col items-center gap-4 w-full">
              <Avatar className="h-28 w-28 border-2 border-[#2557D6]/30">
                <AvatarImage src={avatarUrl} alt="Profile" />
                <AvatarFallback className="text-2xl font-semibold bg-muted text-[#2557D6]">
                  {(form.firstName || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFile}
              />

              <Button
                onClick={handleAvatarPick}
                disabled={uploading}
                className="rounded-xl px-8 bg-[#2557D6] hover:bg-[#1D4ED8] text-sm font-medium w-full text-white"
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex-1 space-y-10">
            {/* ============ General Profile Form ============ */}
            <div className="flex-1 space-y-6 min-w-0 bg-card rounded-sm border border-border p-6 md:p-6">
              <h2 className="text-2xl font-bold text-card-foreground">
                Edit Profile
              </h2>

              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium text-[#344054]">First Name</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium text-[#344054]">Last Name</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium text-[#344054]">Email</Label>
                  <div className="relative">
                    <Input
                      value={form.email}
                      readOnly
                      disabled
                      className="h-11 rounded-xl bg-muted/30 pr-20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-[#2557D6]">
                      Primary
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium text-[#344054]">Phone Number</Label>
                  <PhoneInput
                    value={phoneFull}
                    defaultCountry={phoneCountryCode}
                    error={phoneError}
                    onChange={(fullPhone, code, local) => {
                      setPhoneFull(fullPhone);
                      setPhoneCountryCode(code);
                      setPhoneLocal(local);
                      if (phoneError) setPhoneError("");
                    }}
                  />
                </div>
              </div>

              {/* Socials + Bio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium text-[#344054]">Add Socials</Label>
                  {socials.map((url, i) => (
                    <div key={i} className="relative">
                      <Input
                        value={url}
                        onChange={(e) => handleSocialChange(i, e.target.value)}
                        placeholder="Enter URL"
                        className="h-11 rounded-xl pr-9"
                      />
                      {(socials.length > 1 || url) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSocial(i)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {socialError && (
                    <p className="text-xs text-destructive">{socialError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleAddSocial}
                    className="w-full rounded-xl border border-dashed border-border py-2.5 flex items-center justify-center text-[#2557D6] hover:bg-muted/40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium text-[#344054]">Bio</Label>
                    <span className="text-xs text-[#2557D6]">
                      *Max word limit {bioWordCount}-{MAX_BIO_WORDS}
                    </span>
                  </div>
                  <Textarea
                    value={form.bio}
                    onChange={(e) => handleBioChange(e.target.value)}
                    placeholder="Write about yourself..."
                    className="rounded-xl min-h-[150px] resize-none"
                  />
                </div>
              </div>

              {/* Main Save button */}
              <div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-11 rounded-xl px-8 bg-[#2557D6] hover:bg-[#1D4ED8] font-medium text-white"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            {/* ============ State 1: Education List Section ============ */}
            <div className="bg-card rounded-2xl border border-border p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xl md:text-2xl font-bold text-[#101828]">
                  Education
                </h3>

                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="text-[#2557D6] hover:opacity-80 p-1.5 rounded-lg hover:bg-[#2557D6]/10 transition-colors"
                  aria-label="Add Education"
                >
                  <Plus className="h-6 w-6 text-[#2557D6]" />
                </button>
              </div>

              {education.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border rounded-xl text-muted-foreground space-y-2">
                  <p className="text-sm">No education details added yet.</p>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleOpenAddModal}
                    className="text-sm font-semibold text-[#2557D6] hover:bg-[#2557D6]/10"
                  >
                    + Add Education
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {education.map((edu, index) => (
                    <div
                      key={edu.id || index}
                      className="border border-border rounded-xl p-5 md:p-6 bg-card space-y-2 hover:border-[#2557D6]/30 transition-all shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="text-lg font-bold text-[#101828] leading-snug">
                          {edu.school}
                        </h4>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            onClick={() => handleOpenEditModal(index)}
                            className="h-9 px-6 bg-[#2557D6] hover:bg-[#1D4ED8] text-white font-semibold text-sm rounded-xl"
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenCardDelete(index)}
                            className="h-9 px-6 border-[#2557D6] text-[#2557D6] hover:bg-[#2557D6]/5 font-semibold text-sm rounded-xl"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-[#475467]">
                        {edu.degree}
                        {edu.degree && edu.fieldOfStudy ? " - " : ""}
                        {edu.fieldOfStudy}
                      </p>
                      <p className="text-xs text-[#667085] font-normal">
                        {formatDisplayDateRange(edu.startDate, edu.endDate)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ State 2: Add/Edit Education Modal ============ */}
      {isEduModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEduModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edu-modal-title"
            className="bg-card w-full max-w-2xl rounded-2xl border border-border p-6 md:p-8 shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95 duration-200 my-8"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h3
                id="edu-modal-title"
                className="text-xl md:text-2xl font-bold text-[#101828]"
              >
                Education
              </h3>
              <button
                type="button"
                onClick={() => setIsEduModalOpen(false)}
                className="text-[#2557D6] hover:opacity-80 p-1"
                aria-label="Close modal"
              >
                <Plus className="h-6 w-6 text-[#2557D6] rotate-45" />
              </button>
            </div>

            {/* Modal Form Fields (Matching Figma) */}
            <div className="space-y-4">
              {/* School + Degree */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#344054]">
                    School
                  </Label>
                  <Input
                    value={eduForm.school}
                    onChange={(e) =>
                      handleEduFieldChange("school", e.target.value)
                    }
                    onBlur={() => handleEduFieldBlur("school")}
                    placeholder=""
                    className={cn(
                      "h-11 rounded-xl border-input text-sm text-[#101828] focus-visible:ring-[#2557D6] focus-visible:border-[#2557D6]",
                      eduErrors.school &&
                        "border-destructive focus-visible:ring-destructive",
                    )}
                  />
                  {eduErrors.school && (
                    <p className="text-xs text-destructive">
                      {eduErrors.school}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#344054]">
                    Degree
                  </Label>
                  <Input
                    value={eduForm.degree}
                    onChange={(e) =>
                      handleEduFieldChange("degree", e.target.value)
                    }
                    onBlur={() => handleEduFieldBlur("degree")}
                    placeholder=""
                    className={cn(
                      "h-11 rounded-xl border-input text-sm text-[#101828] focus-visible:ring-[#2557D6] focus-visible:border-[#2557D6]",
                      eduErrors.degree &&
                        "border-destructive focus-visible:ring-destructive",
                    )}
                  />
                  {eduErrors.degree && (
                    <p className="text-xs text-destructive">
                      {eduErrors.degree}
                    </p>
                  )}
                </div>
              </div>

              {/* Field of study */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-[#344054]">
                  Field of study
                </Label>
                <Input
                  value={eduForm.fieldOfStudy}
                  onChange={(e) =>
                    handleEduFieldChange("fieldOfStudy", e.target.value)
                  }
                  onBlur={() => handleEduFieldBlur("fieldOfStudy")}
                  placeholder="Bachelor of Technology in Computer Science and Engineering with Specialization in Artificial Intelligence, Machine Learning"
                  className={cn(
                    "h-11 rounded-xl border-input text-sm text-[#101828] placeholder:text-[#98A2B3] focus-visible:ring-[#2557D6] focus-visible:border-[#2557D6]",
                    eduErrors.fieldOfStudy &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {eduErrors.fieldOfStudy && (
                  <p className="text-xs text-destructive">
                    {eduErrors.fieldOfStudy}
                  </p>
                )}
              </div>

              {/* Start Date + End Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <EduDatePicker
                    label="Start Date"
                    value={eduForm.startDate}
                    onChange={(v) => handleEduFieldChange("startDate", v)}
                  />
                  {eduErrors.startDate && (
                    <p className="text-xs text-destructive">
                      {eduErrors.startDate}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <EduDatePicker
                    label="End Date (or expected)"
                    value={eduForm.endDate}
                    minDate={eduForm.startDate}
                    onChange={(v) => handleEduFieldChange("endDate", v)}
                  />
                </div>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                onClick={handleSaveEduModal}
                className="h-11 rounded-xl px-8 bg-[#2557D6] hover:bg-[#1D4ED8] text-white font-semibold text-sm"
              >
                {editingEduIndex !== null ? "Edit" : "Save"}
              </Button>
              {editingEduIndex !== null && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleModalInitiateDelete}
                  className="h-11 rounded-xl px-8 border-[#2557D6] text-[#2557D6] hover:bg-[#2557D6]/5 font-semibold text-sm"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ State 3: Delete Confirmation Popup ============ */}
      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancelDeleteGoBack();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            className="bg-card w-full max-w-md rounded-2xl border border-border p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200"
          >
            <h3
              id="delete-confirm-title"
              className="text-xl md:text-2xl font-bold text-[#101828] max-w-xs mx-auto leading-snug"
            >
              You sure you want to delete your education details?
            </h3>

            <div className="flex items-center justify-center gap-4 pt-2">
              <Button
                type="button"
                onClick={handleConfirmDelete}
                className="h-11 rounded-xl px-6 bg-[#2557D6] hover:bg-[#1D4ED8] text-white font-semibold text-sm"
              >
                Yes, I’m Sure
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelDeleteGoBack}
                className="h-11 rounded-xl px-6 border-[#2557D6] text-[#2557D6] hover:bg-[#2557D6]/5 font-semibold text-sm"
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ---- Date picker sub-component (DD/MM/YY display) ----
interface EduDatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
}
const EduDatePicker = ({
  label,
  value,
  onChange,
  minDate,
}: EduDatePickerProps) => {
  const [open, setOpen] = useState(false);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const current = value ? new Date(value) : new Date();
  const [month, setMonth] = useState(current.getMonth());
  const [year, setYear] = useState(current.getFullYear());

  const min = minDate ? new Date(minDate) : undefined;
  const firstYear = min ? min.getFullYear() : 1980;

  const years = Array.from(
    { length: 2100 - firstYear + 1 },
    (_, i) => firstYear + i,
  );

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-[#344054]">{label}</Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full rounded-xl border border-input bg-background px-4 py-2.5 h-11 flex items-center justify-between text-left text-sm transition-colors",
              !value ? "text-[#98A2B3]" : "text-[#101828] font-medium",
              open && "border-[#2557D6] ring-1 ring-[#2557D6]",
            )}
          >
            <span>{value ? formatDMY(value) : "DD/MM/YY"}</span>
            <ChevronDown className="h-4 w-4 text-[#667085]" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[320px] rounded-xl p-4 shadow-xl z-50">
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-[#344054]">
                Month
              </Label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:border-[#2557D6]"
              >
                {months
                  .filter((_, i) => {
                    if (!min) return true;
                    if (year > min.getFullYear()) return true;
                    return i >= min.getMonth();
                  })
                  .map((m) => (
                    <option key={m} value={months.indexOf(m)}>
                      {m}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#344054]">
                Year
              </Label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:border-[#2557D6]"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <Button
              className="w-full rounded-lg bg-[#2557D6] hover:bg-[#1D4ED8] text-white font-medium text-sm h-10"
              onClick={() => {
                onChange(`${year}-${String(month + 1).padStart(2, "0")}-01`);
                setOpen(false);
              }}
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
