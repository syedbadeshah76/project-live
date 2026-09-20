import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { useGiftCheckout } from "@/contexts/GiftCheckoutContext";
import { GiftCoursePreviewPanel } from "@/components/gift/GiftCoursePreviewPanel";
import { coursesService } from "@/services/courses.service";
import type { GiftCourseItem } from "@/types/gift.types";

// ============= Validation Schema (Page 1) =============
const stepOneSchema = z.object({
  recipientName: z.string().trim().min(2, "Recipient name must be at least 2 characters").max(80),
  recipientEmail: z.string().trim().email("Enter a valid email address").max(200),
  recipientPhone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  message: z.string().max(500).optional(),
});

export default function GiftCourse() {
  const navigate = useNavigate();
  const params = useParams<{ courseId?: string }>();
  const [searchParams] = useSearchParams();
  const targetCourseId = params.courseId || searchParams.get("courseId");

  const {
    selectedCourses,
    recipientName: savedName,
    recipientEmail: savedEmail,
    recipientPhone: savedPhone,
    giftMessage: savedMessage,
    setSelectedCourses,
    setRecipientDetails,
    setConfirmation,
    activateGiftCheckout,
  } = useGiftCheckout();

  const [step, setStep] = useState<1 | 2>(1);
  const [loadingParamCourse, setLoadingParamCourse] = useState(false);

  useEffect(() => {
    if (selectedCourses.length === 0 && targetCourseId) {
      setLoadingParamCourse(true);
      coursesService
        .getCourse(targetCourseId)
        .then((res: any) => {
          const raw = res?.data || res;
          if (raw) {
            const pid = (raw.productId || raw.product_id || raw.id || targetCourseId).toString();
            const isLive = !!(raw.isLive || raw.courseType === "Live Course" || raw.courseType === "LIVE");
            const priceVal = Number(raw.discountPrice ?? raw.basePrice ?? raw.price ?? 0);
            const originalPriceVal = Number(raw.strikeOutPrice ?? raw.originalPrice ?? Math.round(priceVal * 1.2));
            const totalMins = Number(raw.totalDurationMinutes ?? raw.totalDuration ?? raw.durationMinutes ?? 0);
            const durationHours = raw.duration ?? raw.totalDurationHours ?? (totalMins > 0 ? Math.round((totalMins / 60) * 10) / 10 : 0);
            const durationDisplay = totalMins > 0
              ? (totalMins >= 60 ? `${(totalMins / 60).toFixed(1)} Hours` : `${totalMins} Mins`)
              : `${durationHours} Hours`;

            const item: GiftCourseItem = {
              courseId: String(raw.id || targetCourseId),
              product_id: pid,
              productId: pid,
              title: raw.title || "Course",
              thumbnail: raw.thumbnailUrl || raw.thumbnail || "",
              description: raw.tagline || raw.description || "Practical coding skills and course materials.",
              price: priceVal,
              originalPrice: originalPriceVal,
              duration: durationDisplay,
              modules: Array.isArray(raw.modules) ? raw.modules.length : 1,
              certificate: raw.certificate || "After Completion",
              courseType: raw.courseType || (isLive ? "Live Course" : "Recorded Course"),
              occurrence: raw.occurrence || "Flexible",
              lessons: raw.lessons ?? raw.totalLessons ?? 1,
              rating: raw.rating ?? 5.0,
              instructor: typeof raw.instructor === "object" ? raw.instructor?.name : raw.instructorName ?? "Instructor",
            };
            setSelectedCourses([item]);
          }
        })
        .catch(() => {
          // Silently handle — guard will show fallback UI if selectedCourses remains empty
        })
        .finally(() => {
          setLoadingParamCourse(false);
        });
    }
  }, [selectedCourses.length, targetCourseId, setSelectedCourses]);

  // ============= Step 1 State =============
  const [recipientName, setRecipientName] = useState(savedName);
  const [recipientEmail, setRecipientEmail] = useState(savedEmail);
  const [recipientPhone, setRecipientPhone] = useState(savedPhone);
  const [message, setMessage] = useState(savedMessage);
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});

  // ============= Step 2 State =============
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmPhone, setConfirmPhone] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  // ============= Step 1 Handlers =============
  const handleStepOne = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = stepOneSchema.safeParse({
      recipientName,
      recipientEmail,
      recipientPhone,
      message,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = String(issue.path[0]);
        if (!errors[key]) errors[key] = issue.message;
      });
      setStep1Errors(errors);
      return;
    }

    setStep1Errors({});

    // Store recipient details in GiftCheckoutContext
    setRecipientDetails({
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim().toLowerCase(),
      recipientPhone: recipientPhone.trim(),
      giftMessage: message.trim(),
    });

    setStep(2);
  };

  // ============= Step 2 Validation =============
  const normalizeEmail = (e: string) => e.trim().toLowerCase();
  const normalizePhone = (p: string) => p.replace(/\D/g, "").slice(-10);

  const emailMatch = normalizeEmail(confirmEmail) === normalizeEmail(recipientEmail);
  const phoneMatch = normalizePhone(confirmPhone) === normalizePhone(recipientPhone);

  const emailError =
    emailTouched && confirmEmail.length > 0 && !emailMatch
      ? "Email does not match the recipient email entered previously."
      : "";

  const phoneError =
    phoneTouched && confirmPhone.length > 0 && !phoneMatch
      ? "Phone number does not match the recipient phone entered previously."
      : "";

  const canCheckout =
    confirmEmail.length > 0 &&
    confirmPhone.length > 0 &&
    emailMatch &&
    phoneMatch;

  // ============= Step 2 Handlers =============
  const handleCheckout = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!canCheckout) return;

      setConfirmation({
        confirmedEmail: confirmEmail.trim(),
        confirmedPhone: confirmPhone.trim(),
      });

      activateGiftCheckout();
      navigate("/dashboard/checkout?mode=gift");
    },
    [canCheckout, confirmEmail, confirmPhone, setConfirmation, activateGiftCheckout, navigate],
  );

  // ============= Guards =============
  if (loadingParamCourse) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 text-center">
        <p className="text-muted-foreground text-sm animate-pulse">Loading course details for gifting...</p>
      </div>
    );
  }

  if (selectedCourses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-7xl mx-auto px-4 md:px-6 py-10"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Gift a course</h1>
        <p className="text-muted-foreground">
          No courses selected. Please go back to your{" "}
          <button
            onClick={() => navigate("/dashboard/cart")}
            className="text-primary underline hover:no-underline font-medium"
          >
            cart
          </button>{" "}
          or{" "}
          <button
            onClick={() => navigate("/courses")}
            className="text-primary underline hover:no-underline font-medium"
          >
            explore courses
          </button>{" "}
          and select courses to gift.
        </p>
      </motion.div>
    );
  }

  // ============= Render =============
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-7xl mx-auto px-4 md:px-6 py-6"
    >
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Gift a course</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* ============ Form (left ~45%) ============ */}
        <div className="bg-card rounded-2xl p-5 md:p-6 border border-border/50">
          {step === 1 ? (
            <form onSubmit={handleStepOne} className="space-y-5 max-w-md mx-auto">
              {/* Recipient Name */}
              <div className="space-y-1.5">
                <Label htmlFor="rname" className="text-sm font-semibold">
                  Recipient's Name:
                </Label>
                <Input
                  id="rname"
                  placeholder="Full Name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="h-11"
                  aria-invalid={!!step1Errors.recipientName}
                />
                {step1Errors.recipientName && (
                  <p className="text-xs text-destructive">{step1Errors.recipientName}</p>
                )}
              </div>

              {/* Recipient Email */}
              <div className="space-y-1.5">
                <Label htmlFor="remail" className="text-sm font-semibold">
                  Recipient's Email:
                </Label>
                <Input
                  id="remail"
                  type="email"
                  placeholder="example@gmail.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="h-11"
                  aria-invalid={!!step1Errors.recipientEmail}
                />
                {step1Errors.recipientEmail && (
                  <p className="text-xs text-destructive">{step1Errors.recipientEmail}</p>
                )}
              </div>

              {/* Recipient Phone */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Recipient's Phone:</Label>
                <PhoneInput
                  value={recipientPhone}
                  onChange={(full) => setRecipientPhone(full)}
                />
                {step1Errors.recipientPhone && (
                  <p className="text-xs text-destructive">{step1Errors.recipientPhone}</p>
                )}
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <Label htmlFor="msg" className="text-sm font-semibold">
                  Message:
                </Label>
                <Textarea
                  id="msg"
                  placeholder="Write a message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
              </div>

              {/* Continue Button */}
              <div className="pt-2 flex justify-center">
                <Button type="submit" size="lg" variant="gradient" className="px-12">
                  Continue
                </Button>
              </div>
            </form>
          ) : (
            /* ============ Step 2: Confirmation ============ */
            <form onSubmit={handleCheckout} className="space-y-5 max-w-md mx-auto">
              {/* Re-enter Email */}
              <div className="space-y-1.5">
                <Label htmlFor="cemail" className="text-sm font-semibold">
                  Re-enter Recipient's Email:
                </Label>
                <Input
                  id="cemail"
                  type="email"
                  placeholder="example@gmail.com"
                  value={confirmEmail}
                  onChange={(e) => {
                    setConfirmEmail(e.target.value);
                    if (!emailTouched) setEmailTouched(true);
                  }}
                  onBlur={() => setEmailTouched(true)}
                  className={`h-11 ${emailError ? "border-destructive" : ""}`}
                  aria-invalid={!!emailError}
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
              </div>

              {/* Re-enter Phone */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">
                  Re-enter Recipient's Phone:
                </Label>
                <PhoneInput
                  value={confirmPhone}
                  onChange={(full) => {
                    setConfirmPhone(full);
                    if (!phoneTouched) setPhoneTouched(true);
                  }}
                />
                {phoneError && (
                  <p className="text-xs text-destructive">{phoneError}</p>
                )}
              </div>

              {/* Checkout + Back Buttons */}
              <div className="pt-2 flex justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  variant="gradient"
                  className="px-12"
                  disabled={!canCheckout}
                >
                  Checkout
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* ============ Course preview (right ~55%) ============ */}
        <GiftCoursePreviewPanel courses={selectedCourses} />
      </div>
    </motion.div>
  );
}
