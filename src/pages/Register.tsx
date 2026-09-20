import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/auth.service";
import { Mail, Eye, EyeOff, X, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FileUploadButton } from "@/components/auth/FileUploadButton";
import { usePresignedUpload } from "@/hooks/usePresignedUpload";
import { useReferralCode } from "@/hooks/useReferralCode";
import { referService } from "@/services/refer.service";
import { getApiError, isEmailAlreadyRegistered } from "@/lib/api-error";
import { PendingApprovalModal } from "@/components/auth/PendingApprovalModal";

import loginIllustration from "@/assets/login-illustration1.png";

/* ── Schemas ── */
const emailSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

const studentSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must contain at least 2 characters.")
      .max(30, "First name cannot exceed 30 characters.")
      .regex(/^[A-Za-z ]+$/, "Only alphabets are allowed."),
    lastName: z
      .string()
      .trim()
      .min(2, "Last name must contain at least 2 characters.")
      .max(30, "Last name cannot exceed 30 characters.")
      .regex(/^[A-Za-z ]+$/, "Only alphabets are allowed."),
    email: z.string().trim().email("Invalid email"),
    country: z.string().min(1, "Country is required"),
    state: z.string().min(1, "state is required"),
    password: z
      .string()
      .min(1, "Password is required.")
      .min(8, "Minimum 8 characters")
      .max(12, "Password cannot exceed 12 characters.")
      .regex(/^\S*$/, "Password cannot contain spaces")
      .regex(/(?=.*[a-z])/, "One lowercase required")
      .regex(/(?=.*[A-Z])/, "One uppercase required")
      .regex(/(?=.*\d)/, "One number required")
      .regex(/(?=.*[@$!%*?&])/, "One special character required"),
    confirmPassword: z.string().min(1, "Confirm password is required."),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const instructorSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must contain at least 2 characters.")
      .max(30, "First name cannot exceed 30 characters.")
      .regex(/^[A-Za-z ]+$/, "Only alphabets are allowed."),
    lastName: z
      .string()
      .trim()
      .min(2, "Last name must contain at least 2 characters.")
      .max(30, "Last name cannot exceed 30 characters.")
      .regex(/^[A-Za-z ]+$/, "Only alphabets are allowed."),
    email: z.string().trim().email("Invalid email"),
    country: z.string().min(1, "Country is required"),
    state: z.string().min(1, "State is required"),
    password: z
      .string()
      .min(1, "Password is required.")
      .min(8, "Minimum 8 characters")
      .max(12, "Password cannot exceed 12 characters.")
      .regex(/^\S*$/, "Password cannot contain spaces")
      .regex(/(?=.*[a-z])/, "One lowercase required")
      .regex(/(?=.*[A-Z])/, "One uppercase required")
      .regex(/(?=.*\d)/, "One number required")
      .regex(/(?=.*[@$!%*?&])/, "One special character required"),
    confirmPassword: z.string().min(1, "Confirm password is required."),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const passwordRules = {
  minLength: (password: string) => password.length >= 8,
  maxLength: (password: string) => password.length <= 12,
  uppercase: (password: string) => /[A-Z]/.test(password),
  lowercase: (password: string) => /[a-z]/.test(password),
  number: (password: string) => /\d/.test(password),
  special: (password: string) => /[@$!%*?&]/.test(password),
  noSpaces: (password: string) => !/\s/.test(password),
};

const buildPasswordChecks = (password: string) => ({
  minLength: passwordRules.minLength(password),
  maxLength: passwordRules.maxLength(password),
  uppercase: passwordRules.uppercase(password),
  lowercase: passwordRules.lowercase(password),
  number: passwordRules.number(password),
  special: passwordRules.special(password),
  noSpaces: passwordRules.noSpaces(password),
});

const buildPasswordRequirements = (
  checks: ReturnType<typeof buildPasswordChecks>,
) => [
  { label: "8–12 characters", valid: checks.minLength && checks.maxLength },
  { label: "One uppercase letter", valid: checks.uppercase },
  { label: "One lowercase letter", valid: checks.lowercase },
  { label: "One number", valid: checks.number },
  { label: "One special character", valid: checks.special },
  { label: "No spaces", valid: checks.noSpaces },
];

type EmailFormData = z.infer<typeof emailSchema>;
type StudentFormData = z.infer<typeof studentSchema>;
type InstructorFormData = z.infer<typeof instructorSchema>;

const stepVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

/* ── OTP Input (fully controlled — first paste always works) ── */
interface OTPInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  disabled?: boolean;
}

const OTPInput = ({
  length,
  value,
  onChange,
  onEnter,
  disabled = false,
}: OTPInputProps) => {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const digits = useMemo(() => {
    const chars = value.split("").slice(0, length);
    return Array.from({ length }, (_, i) => chars[i] ?? "");
  }, [value, length]);

  const focusIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, length - 1));
      inputsRef.current[clamped]?.focus();
      inputsRef.current[clamped]?.select();
    },
    [length],
  );

  /* Root cause fix #1: the first box owns focus as soon as the boxes render,
     so the very first Ctrl+V / right-click paste lands on a real target. */
  useEffect(() => {
    if (disabled) return;
    inputsRef.current[0]?.focus();
  }, [disabled]);

  const applyPasted = useCallback(
    (raw: string, fromIndex: number) => {
      const pasted = raw.replace(/\D/g, "");
      if (!pasted) return;

      const next = Array.from({ length }, (_, i) => digits[i] ?? "");
      const start = pasted.length >= length ? 0 : fromIndex;

      pasted
        .slice(0, length - start)
        .split("")
        .forEach((digit, i) => {
          next[start + i] = digit;
        });

      const joined = next.join("");
      onChangeRef.current(joined);

      const filledUpTo = start + Math.min(pasted.length, length - start);
      focusIndex(filledUpTo >= length ? length - 1 : filledUpTo);
    },
    [digits, length, focusIndex],
  );

  /* Root cause fix #2: a document-level paste listener guarantees the paste is
     captured even if the browser has focus on <body> (Firefox / mobile autofill). */
  useEffect(() => {
    if (disabled) return;

    const handleDocumentPaste = (event: Event) => {
      const clipboardEvent = event as globalThis.ClipboardEvent;
      const target = clipboardEvent.target as Node | null;
      const insideOtp = target ? containerRef.current?.contains(target) : false;
      const activeInsideOtp = containerRef.current?.contains(
        document.activeElement,
      );

      if (
        insideOtp ||
        activeInsideOtp ||
        document.activeElement === document.body
      ) {
        const text = clipboardEvent.clipboardData?.getData("text") ?? "";
        if (!/\d/.test(text)) return;
        clipboardEvent.preventDefault();
        applyPasted(text, 0);
      }
    };

    document.addEventListener("paste", handleDocumentPaste, true);
    return () =>
      document.removeEventListener("paste", handleDocumentPaste, true);
  }, [applyPasted, disabled]);

  const handleChange = useCallback(
    (index: number, raw: string) => {
      const clean = raw.replace(/\D/g, "");

      if (clean.length > 1) {
        applyPasted(clean, index);
        return;
      }

      const next = Array.from({ length }, (_, i) => digits[i] ?? "");
      next[index] = clean.slice(-1);
      onChangeRef.current(next.join(""));

      if (clean && index < length - 1) focusIndex(index + 1);
    },
    [applyPasted, digits, focusIndex, length],
  );

  const handleKeyDown = useCallback(
    (index: number, event: KeyboardEvent<HTMLInputElement>) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v")
        return;

      if (event.key === "Enter") {
        event.preventDefault();
        onEnter?.();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        focusIndex(index - 1);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        focusIndex(index + 1);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        const next = Array.from({ length }, (_, i) => digits[i] ?? "");

        if (next[index]) {
          next[index] = "";
          onChangeRef.current(next.join(""));
          return;
        }

        if (index > 0) {
          next[index - 1] = "";
          onChangeRef.current(next.join(""));
          focusIndex(index - 1);
        }
      }
    },
    [digits, focusIndex, length, onEnter],
  );

  const handlePaste = useCallback(
    (index: number, event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      applyPasted(event.clipboardData.getData("text"), index);
    },
    [applyPasted],
  );

  return (
    <div ref={containerRef} className="flex gap-3">
      {digits.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          value={digit}
          disabled={disabled}
          type="text"
          inputMode="numeric"
          aria-label={`Digit ${index + 1}`}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={(e) => e.currentTarget.select()}
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl text-center text-lg font-semibold"
        />
      ))}
    </div>
  );
};

/* ── Main Component ── */
interface SignupProps {
  isModal?: boolean;
  onClose?: () => void;
  onSwitchToLogin?: () => void;
}

const Signup = ({ isModal = false, onClose, onSwitchToLogin }: SignupProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 3>(1);
  const [role, setRole] = useState<"student" | "instructor">("student");
  const [userEmail, setUserEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isInstructorPasswordFocused, setIsInstructorPasswordFocused] =
    useState(false);
  const [states, setStates] = useState<IState[]>([]);
  const [instructorStates, setInstructorStates] = useState<IState[]>([]);
  const [instructorSubmitSuccess, setInstructorSubmitSuccess] = useState(false);

  const isMountedRef = useRef(true);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const countries = useMemo(() => Country.getAllCountries(), []);

  /* AWS presigned uploads — resume (PDF) and intro video (MP4) */
  const resumeUpload = usePresignedUpload({
    uploadType: "RESUME",
    contentType: "application/pdf",
    acceptedMimeTypes: ["application/pdf"],
    acceptedExtensions: [".pdf"],
    maxSizeBytes: 10 * 1024 * 1024,
    invalidTypeMessage: "Only PDF files are allowed for the CV.",
    maxSizeMessage: "CV must be smaller than 10MB.",
  });

  const introUpload = usePresignedUpload({
    uploadType: "INTRO_VIDEO",
    contentType: "video/mp4",
    acceptedMimeTypes: ["video/mp4"],
    acceptedExtensions: [".mp4"],
    maxSizeBytes: 200 * 1024 * 1024,
    invalidTypeMessage: "Only MP4 videos are allowed for the intro video.",
    maxSizeMessage: "Intro video must be smaller than 200MB.",
  });

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    mode: "onChange",
    defaultValues: { email: "" },
  });

  const studentForm = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      country: "",
      state: "",
      password: "",
      confirmPassword: "",
    },
  });
  const {
    code: referralCode,
    valid: referralValid,
    validating: referralValidating,
    message: referralMessage,
    applyCode: applyReferralCode,
  } = useReferralCode();

  const instructorForm = useForm<InstructorFormData>({
    resolver: zodResolver(instructorSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      country: "",
      state: "",
      password: "",
      confirmPassword: "",
    },
  });

  const studentValues = studentForm.watch();
  const selectedCountry = studentValues.country;
  const studentPassword = studentValues.password ?? "";
  const studentConfirmPassword = studentValues.confirmPassword ?? "";

  const instructorValues = instructorForm.watch();
  const instructorCountry = instructorValues.country;
  const instructorPassword = instructorValues.password ?? "";
  const instructorConfirmPassword = instructorValues.confirmPassword ?? "";

  const passwordChecks = useMemo(
    () => buildPasswordChecks(studentPassword),
    [studentPassword],
  );

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const isConfirmPasswordEmpty = studentConfirmPassword.length === 0;
  const doPasswordsMatch =
    studentPassword === studentConfirmPassword &&
    studentConfirmPassword.length > 0;

  const passwordRequirements = useMemo(
    () => buildPasswordRequirements(passwordChecks),
    [passwordChecks],
  );

  const instructorPasswordChecks = useMemo(
    () => buildPasswordChecks(instructorPassword),
    [instructorPassword],
  );
  const isInstructorPasswordValid = Object.values(
    instructorPasswordChecks,
  ).every(Boolean);
  const instructorPasswordRequirements = useMemo(
    () => buildPasswordRequirements(instructorPasswordChecks),
    [instructorPasswordChecks],
  );
  const doInstructorPasswordsMatch =
    instructorPassword === instructorConfirmPassword &&
    instructorConfirmPassword.length > 0;

  /* BUG 3 — deterministic, non-stale validity for the Continue button */
  const isStudentFormComplete = useMemo(
    () =>
      studentSchema.safeParse({
        ...studentValues,
        email: userEmail || studentValues.email,
      }).success,
    [studentValues, userEmail],
  );

  const isInstructorFormComplete = useMemo(
    () =>
      instructorSchema.safeParse({
        ...instructorValues,
        email: userEmail || instructorValues.email,
      }).success,
    [instructorValues, userEmail],
  );

  const canSubmitStudent =
    !isLoading &&
    Boolean(userEmail) &&
    otpVerified &&
    role === "student" &&
    acceptTerms &&
    isStudentFormComplete;

  const isUploading = resumeUpload.isBusy || introUpload.isBusy;

  const canSubmitInstructor =
    !isLoading &&
    !isUploading &&
    Boolean(userEmail) &&
    otpVerified &&
    acceptTerms &&
    resumeUpload.isComplete &&
    introUpload.isComplete &&
    isInstructorFormComplete;

  /* Country → states (student) */
  useEffect(() => {
    if (!selectedCountry) {
      setStates([]);
      return;
    }

    const country = Country.getAllCountries().find(
      (c) => c.name === selectedCountry,
    );
    setStates(country ? State.getStatesOfCountry(country.isoCode) : []);
  }, [selectedCountry]);

  /* Country → states (instructor) */
  useEffect(() => {
    if (!instructorCountry) {
      setInstructorStates([]);
      return;
    }

    const country = Country.getAllCountries().find(
      (c) => c.name === instructorCountry,
    );
    setInstructorStates(
      country ? State.getStatesOfCountry(country.isoCode) : [],
    );
  }, [instructorCountry]);

  /* Resend timer — single interval, no leaks */
  useEffect(() => {
    if (!otpSent) return;

    const timerId = window.setInterval(() => {
      setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [otpSent]);

  const syncEmailToForms = useCallback(
    (email: string) => {
      studentForm.setValue("email", email, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
      instructorForm.setValue("email", email, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [studentForm, instructorForm],
  );

  const sendOtp = useCallback(
    async (email: string) => {
      if (requestInFlightRef.current) return;
      requestInFlightRef.current = true;

      setFormError("");
      setIsLoading(true);

      try {
        const res = await authService.sendOtp({ email });
        if (!isMountedRef.current) return;

        setUserEmail(email);
        syncEmailToForms(email);
        setOtpCode("");
        setOtpVerified(false);
        setOtpSent(true);
        setResendTimer(30);

        toast({
          title: "OTP sent",
          description: res?.message || "OTP sent successfully",
        });
      } catch (error) {
        if (!isMountedRef.current) return;
        const message = getApiError(error, "Failed to send OTP");
        setFormError(message);
        toast({
          title: "Could not send OTP",
          description: message,
          variant: "destructive",
        });
      } finally {
        requestInFlightRef.current = false;
        if (isMountedRef.current) setIsLoading(false);
      }
    },
    [syncEmailToForms, toast],
  );

  const verifyOtp = useCallback(async () => {
    if (otpCode.length < 6 || requestInFlightRef.current) return;
    requestInFlightRef.current = true;

    setFormError("");
    setIsLoading(true);

    try {
      const res = await authService.verifyRegistrationOtp(userEmail, otpCode);
      if (!isMountedRef.current) return;

      setOtpVerified(true);
      syncEmailToForms(userEmail);
      toast({
        title: "Verified",
        description: res?.message || "Email verified successfully",
      });
      setStep(3);
    } catch (error) {
      if (!isMountedRef.current) return;
      const message = getApiError(error, "Invalid or expired OTP");
      setFormError(message);
      setOtpCode("");
      toast({
        title: "Verification failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      requestInFlightRef.current = false;
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [otpCode, userEmail, syncEmailToForms, toast]);

  const handleResendOTP = useCallback(async () => {
    if (resendTimer > 0 || !userEmail || requestInFlightRef.current) return;
    requestInFlightRef.current = true;

    setFormError("");
    setIsLoading(true);

    try {
      const res = await authService.resendOtp({
        email: userEmail,
        purpose: "email_verification",
      });
      if (!isMountedRef.current) return;

      setOtpCode("");
      setResendTimer(30);
      toast({
        title: "OTP resent",
        description: res?.message || "OTP resent successfully",
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      const message = getApiError(error, "Could not resend OTP");
      setFormError(message);
      toast({
        title: "Could not resend OTP",
        description: message,
        variant: "destructive",
      });
    } finally {
      requestInFlightRef.current = false;
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [resendTimer, userEmail, toast]);

  /* BUG 2 — one submit handler drives both Enter and click for stage 1 */
  const handleStage1Submit = emailForm.handleSubmit(async (data) => {
    if (isLoading) return;
    if (!otpSent) {
      await sendOtp(data.email.trim());
      return;
    }
    await verifyOtp();
  });

  const handleStudentSubmit = async (data: StudentFormData) => {
    if (!otpVerified || !userEmail) {
      setFormError("Please verify your email first.");
      return;
    }
    if (!acceptTerms) {
      setFormError("Please accept the Terms & Conditions.");
      return;
    }
    if (requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    setFormError("");
    setIsLoading(true);

    try {
      const res = await authService.registerWithDetails({
        email: userEmail,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        country: data.country,
        city: data.state,
        role: "student",
        ...(referralCode && referralValid !== false
          ? { referralCode: referralCode.trim().toUpperCase() }
          : {}),
      });

      if (!isMountedRef.current) return;

      referService.clearStoredCode();

      toast({
        title: "Welcome to Edvanz!",
        description: res?.message || "Registration successful",
      });

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      const message = getApiError(error, "Registration failed");
      setFormError(message);
      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      requestInFlightRef.current = false;
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const handleInstructorSubmit = async (data: InstructorFormData) => {
    if (!otpVerified || !userEmail) {
      setFormError("Please verify your email first.");
      return;
    }
    if (!acceptTerms) {
      setFormError("Please accept the Terms & Conditions.");
      return;
    }
    if (!resumeUpload.isComplete || !resumeUpload.fileKey) {
      setFormError("Please upload your CV before submitting.");
      return;
    }
    if (!introUpload.isComplete || !introUpload.fileKey) {
      setFormError("Please upload your intro video before submitting.");
      return;
    }
    if (requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    setFormError("");
    setIsLoading(true);

    try {
      const res = await authService.registerInstructor({
        email: userEmail,
        role: "INSTRUCTOR",
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        country: data.country,
        city: data.state,
        introVideoFileKey: introUpload.fileKey ,
        resumeFileKey: resumeUpload.fileKey,
      });

      if (!isMountedRef.current) return;

      instructorForm.reset();
      resumeUpload.reset();
      introUpload.reset();
      setAcceptTerms(false);

      // Show the "Application Submitted Successfully" modal
      setInstructorSubmitSuccess(true);
    } catch (error) {
      if (!isMountedRef.current) return;

      if (isEmailAlreadyRegistered(error)) {
        const duplicateMessage =
          "Email already registered. Please login with your existing account.";
        instructorForm.setError("email", {
          type: "manual",
          message: duplicateMessage,
        });
        setFormError(duplicateMessage);
        toast({
          title: "Email already registered",
          description: duplicateMessage,
          variant: "destructive",
        });
        return;
      }

      const message = getApiError(error, "Registration failed");
      setFormError(message);
      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      requestInFlightRef.current = false;
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isModal && onClose) onClose();
    else navigate("/");
  };

  const handleLoginLink = (e: React.MouseEvent) => {
    if (isModal && onSwitchToLogin) {
      e.preventDefault();
      onSwitchToLogin();
    }
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="relative bg-background rounded-2xl shadow-2xl overflow-hidden w-full max-w-[860px] mx-auto"
    >
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 p-1.5 rounded-full hover:bg-muted transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <AnimatePresence mode="wait">
        {/* ── STEP 1: Email + OTP ── */}
        {step === 1 && (
          <motion.div
            key="step-1"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="flex flex-col md:flex-row"
          >
            <div className="flex items-center justify-center bg-muted/30 p-6 md:p-10 md:w-[45%]">
              <img
                src={loginIllustration}
                alt="Sign up"
                className="max-w-full h-auto"
              />
            </div>

            <div className="flex-1 p-6 md:p-10 flex flex-col justify-center">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">
                Register Your Account.
              </h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                {otpSent
                  ? "Enter the verification code sent to your email."
                  : "Enter your email address to receive a verification code."}
              </p>

              <form
                onSubmit={handleStage1Submit}
                className="flex flex-col gap-4"
                noValidate
              >
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Email
                  </label>
                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        {...emailForm.register("email")}
                        type="email"
                        placeholder="Enter email address"
                        disabled={otpSent}
                        className="pl-10 h-11 rounded-lg"
                      />
                    </div>

                    {otpSent && (
                      <div className="mt-6">
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          OTP
                        </label>
                        <OTPInput
                          length={6}
                          value={otpCode}
                          onChange={setOtpCode}
                          onEnter={() => {
                            void handleStage1Submit();
                          }}
                          disabled={isLoading}
                        />
                      </div>
                    )}
                  </div>

                  {emailForm.formState.errors.email && (
                    <p className="text-xs text-destructive mt-1">
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {formError && (
                  <p className="text-sm text-destructive">{formError}</p>
                )}

                {!otpSent ? (
                  <Button
                    type="submit"
                    disabled={isLoading || !emailForm.formState.isValid}
                  >
                    {isLoading ? "Sending..." : "Get OTP"}
                  </Button>
                ) : (
                  <>
                    <div className="text-center mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          void handleResendOTP();
                        }}
                        disabled={resendTimer > 0 || isLoading}
                        className={`text-sm font-medium ${
                          resendTimer === 0 && !isLoading
                            ? "text-[#604BD6] hover:underline cursor-pointer"
                            : "text-muted-foreground cursor-not-allowed"
                        }`}
                      >
                        {resendTimer > 0
                          ? `Resend OTP in ${resendTimer} s`
                          : "Resend OTP"}
                      </button>
                    </div>

                    <Button
                      type="submit"
                      disabled={otpCode.length < 6 || isLoading}
                    >
                      {isLoading ? "Verifying..." : "Continue"}
                    </Button>
                  </>
                )}

                <p className="text-sm text-muted-foreground text-center mt-2">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    onClick={handleLoginLink}
                    className="text-[#604BD6] font-semibold hover:underline"
                  >
                    Log In
                  </Link>
                </p>
              </form>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Role selection + form ── */}
        {step === 3 && (
          <motion.div
            key="step-3"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="p-6 md:p-10"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                  Sign Up To Your Account.
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter Credentials to continue
                </p>
              </div>
              <div className="flex rounded-full border border-border overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`px-5 py-2 text-sm font-medium transition-all ${role === "student" ? "bg-[#604BD6] text-white" : "bg-background text-foreground hover:bg-muted"}`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("instructor")}
                  className={`px-5 py-2 text-sm font-medium transition-all ${role === "instructor" ? "bg-[#604BD6] text-white" : "bg-background text-foreground hover:bg-muted"}`}
                >
                  Instructor
                </button>
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive mb-4">{formError}</p>
            )}

            <AnimatePresence mode="wait">
              {role === "student" ? (
                <motion.form
                  key="student-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={studentForm.handleSubmit(handleStudentSubmit)}
                  className="flex flex-col gap-5"
                  noValidate
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        First Name
                      </label>
                      <Input
                        {...studentForm.register("firstName")}
                        maxLength={12}
                        placeholder="First Name"
                        className="h-11 rounded-lg"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") return;
                          if (e.ctrlKey || e.metaKey || e.altKey) return;
                          if (e.key.length > 1) return;
                          if (!/^[A-Za-z ]$/.test(e.key)) e.preventDefault();
                        }}
                      />
                      {studentForm.formState.errors.firstName && (
                        <p className="text-xs text-destructive mt-1">
                          {studentForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Last Name
                      </label>
                      <Input
                        {...studentForm.register("lastName")}
                        maxLength={12}
                        placeholder="Last Name"
                        className="h-11 rounded-lg"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") return;
                          if (e.ctrlKey || e.metaKey || e.altKey) return;
                          if (e.key.length > 1) return;
                          if (!/^[A-Za-z ]$/.test(e.key)) e.preventDefault();
                        }}
                      />
                      {studentForm.formState.errors.lastName && (
                        <p className="text-xs text-destructive mt-1">
                          {studentForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Password
                      </label>
                      <div className="relative">
                        <Input
                          {...studentForm.register("password")}
                          onFocus={() => setIsPasswordFocused(true)}
                          onBlur={(e) => {
                            setIsPasswordFocused(false);
                            void studentForm.register("password").onBlur(e);
                          }}
                          maxLength={12}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter Password"
                          className={`
  pr-10
  h-11
  rounded-lg
  transition-colors
  ${
    studentForm.formState.errors.password
      ? "border-red-500 focus-visible:ring-red-500"
      : isPasswordValid
        ? "border-green-500 focus-visible:ring-green-500"
        : ""
  }
`}
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>

                        {isPasswordFocused && (
                          <div
                            className="
          absolute
          left-50
  mt-2
  z-50
  w-full
  rounded-xl
  border
  bg-background
  shadow-xl
  p-4
          "
                          >
                            <p className="text-xs font-medium mb-3">
                              Password Requirements
                            </p>

                            <div className="space-y-2">
                              {passwordRequirements.map((rule) => (
                                <div
                                  key={rule.label}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  {rule.valid ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-muted-foreground" />
                                  )}

                                  <span
                                    className={
                                      rule.valid
                                        ? "text-green-600"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {rule.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {studentForm.formState.errors.password &&
                        !isPasswordFocused && (
                          <p className="text-xs text-destructive mt-1">
                            {studentForm.formState.errors.password.message}
                          </p>
                        )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Input
                          {...studentForm.register("confirmPassword")}
                          maxLength={12}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm Password"
                          className={`
  pr-10
  h-11
  rounded-lg
  transition-colors
  ${
    doPasswordsMatch
      ? "border-green-500 focus-visible:ring-green-500"
      : studentConfirmPassword.length > 0 &&
          studentConfirmPassword.length >= studentPassword.length &&
          !doPasswordsMatch
        ? "border-red-500 focus-visible:ring-red-500"
        : ""
  }
  `}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {!isConfirmPasswordEmpty && !doPasswordsMatch && (
                        <p className="text-xs text-destructive mt-1">
                          Passwords do not match.
                        </p>
                      )}

                      {doPasswordsMatch && (
                        <p className="text-xs text-green-600 mt-1">
                          Passwords match.
                        </p>
                      )}

                      {studentForm.formState.errors.confirmPassword &&
                        isConfirmPasswordEmpty && (
                          <p className="text-xs text-destructive mt-1">
                            Confirm password is required.
                          </p>
                        )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Country
                      </label>
                      <Controller
                        name="country"
                        control={studentForm.control}
                        render={({ field }) => (
                          <SearchableSelect
                            items={countries.map((c) => ({
                              label: c.name,
                              value: c.name,
                            }))}
                            value={field.value || ""}
                            onChange={(value) => {
                              field.onChange(value);
                              studentForm.setValue("state", "", {
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true,
                              });
                            }}
                            placeholder="Select Country"
                          />
                        )}
                      />
                      {studentForm.formState.errors.country && (
                        <p className="text-xs text-destructive mt-1">
                          {studentForm.formState.errors.country.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        State
                      </label>
                      <Controller
                        name="state"
                        control={studentForm.control}
                        render={({ field }) => (
                          <SearchableSelect
                            items={states.map((s) => ({
                              label: s.name,
                              value: s.name,
                            }))}
                            value={field.value || ""}
                            onChange={(value) => field.onChange(value)}
                            placeholder={
                              selectedCountry
                                ? "Select State"
                                : "Select Country First"
                            }
                            disabled={!selectedCountry}
                          />
                        )}
                      />
                      {studentForm.formState.errors.state && (
                        <p className="text-xs text-destructive mt-1">
                          {studentForm.formState.errors.state.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {referralCode && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        Referral code:
                      </span>
                      <span className="font-semibold text-[#604BD6]">
                        {referralCode.toUpperCase()}
                      </span>
                      {referralValidating ? (
                        <span className="text-muted-foreground">
                          Validating...
                        </span>
                      ) : referralMessage ? (
                        <span
                          className={
                            referralValid
                              ? "text-green-600"
                              : "text-destructive"
                          }
                        >
                          {referralMessage}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => applyReferralCode(referralCode)}
                        className="text-[#604BD6] hover:underline"
                      >
                        Re-check
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="terms"
                      checked={acceptTerms}
                      onCheckedChange={(v) => setAcceptTerms(v === true)}
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm text-muted-foreground"
                      onClick={() => navigate("/terms-and-conditions")}
                    >
                      I've read and accept all the{" "}
                      <span className="text-[#604BD6] hover:underline cursor-pointer">
                        Terms &amp; Conditions.
                      </span>
                    </label>
                  </div>

                  <Button type="submit" disabled={!canSubmitStudent}>
                    {isLoading ? "Creating..." : "Continue"}
                  </Button>

                  <p className="text-sm text-muted-foreground text-center">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      onClick={handleLoginLink}
                      className="text-[#604BD6] font-semibold hover:underline"
                    >
                      Log In
                    </Link>
                  </p>
                </motion.form>
              ) : (
                <motion.form
                  key="instructor-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={instructorForm.handleSubmit(handleInstructorSubmit)}
                  className="flex flex-col gap-5"
                  noValidate
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="instructor-first-name"
                        className="text-sm font-medium text-foreground mb-1.5 block"
                      >
                        First Name
                      </label>
                      <Input
                        id="instructor-first-name"
                        {...instructorForm.register("firstName")}
                        maxLength={30}
                        placeholder="First Name"
                        className="h-11 rounded-lg"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") return;
                          if (e.ctrlKey || e.metaKey || e.altKey) return;
                          if (e.key.length > 1) return;
                          if (!/^[A-Za-z ]$/.test(e.key)) e.preventDefault();
                        }}
                      />
                      {instructorForm.formState.errors.firstName && (
                        <p className="text-xs text-destructive mt-1">
                          {instructorForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="instructor-last-name"
                        className="text-sm font-medium text-foreground mb-1.5 block"
                      >
                        Last Name
                      </label>
                      <Input
                        id="instructor-last-name"
                        {...instructorForm.register("lastName")}
                        maxLength={30}
                        placeholder="Last Name"
                        className="h-11 rounded-lg"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") return;
                          if (e.ctrlKey || e.metaKey || e.altKey) return;
                          if (e.key.length > 1) return;
                          if (!/^[A-Za-z ]$/.test(e.key)) e.preventDefault();
                        }}
                      />
                      {instructorForm.formState.errors.lastName && (
                        <p className="text-xs text-destructive mt-1">
                          {instructorForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="instructor-password"
                        className="text-sm font-medium text-foreground mb-1.5 block"
                      >
                        Enter Password
                      </label>
                      <div className="relative">
                        <Input
                          id="instructor-password"
                          {...instructorForm.register("password")}
                          onFocus={() => setIsInstructorPasswordFocused(true)}
                          onBlur={(e) => {
                            setIsInstructorPasswordFocused(false);
                            void instructorForm.register("password").onBlur(e);
                          }}
                          maxLength={12}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter Password"
                          className={`pr-10 h-11 rounded-lg transition-colors ${
                            instructorForm.formState.errors.password
                              ? "border-red-500 focus-visible:ring-red-500"
                              : isInstructorPasswordValid
                                ? "border-green-500 focus-visible:ring-green-500"
                                : ""
                          }`}
                        />
                        <button
                          type="button"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>

                        {isInstructorPasswordFocused && (
                          <div className="absolute mt-2 z-50 w-full rounded-xl border bg-background shadow-xl p-4">
                            <p className="text-xs font-medium mb-3">
                              Password Requirements
                            </p>
                            <div className="space-y-2">
                              {instructorPasswordRequirements.map((rule) => (
                                <div
                                  key={rule.label}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  {rule.valid ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <span
                                    className={
                                      rule.valid
                                        ? "text-green-600"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {rule.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {instructorForm.formState.errors.password &&
                        !isInstructorPasswordFocused && (
                          <p className="text-xs text-destructive mt-1">
                            {instructorForm.formState.errors.password.message}
                          </p>
                        )}
                    </div>

                    <div>
                      <label
                        htmlFor="instructor-confirm-password"
                        className="text-sm font-medium text-foreground mb-1.5 block"
                      >
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Input
                          id="instructor-confirm-password"
                          {...instructorForm.register("confirmPassword")}
                          maxLength={12}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm Password"
                          className={`pr-10 h-11 rounded-lg transition-colors ${
                            doInstructorPasswordsMatch
                              ? "border-green-500 focus-visible:ring-green-500"
                              : instructorConfirmPassword.length > 0 &&
                                  !doInstructorPasswordsMatch
                                ? "border-red-500 focus-visible:ring-red-500"
                                : ""
                          }`}
                        />
                        <button
                          type="button"
                          aria-label={
                            showConfirmPassword
                              ? "Hide confirm password"
                              : "Show confirm password"
                          }
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {instructorConfirmPassword.length > 0 &&
                        !doInstructorPasswordsMatch && (
                          <p className="text-xs text-destructive mt-1">
                            Passwords do not match.
                          </p>
                        )}
                      {doInstructorPasswordsMatch && (
                        <p className="text-xs text-green-600 mt-1">
                          Passwords match.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Country
                      </label>
                      <Controller
                        name="country"
                        control={instructorForm.control}
                        render={({ field }) => (
                          <SearchableSelect
                            items={countries.map((c) => ({
                              label: c.name,
                              value: c.name,
                            }))}
                            value={field.value || ""}
                            onChange={(value) => {
                              field.onChange(value);
                              instructorForm.setValue("state", "", {
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true,
                              });
                            }}
                            placeholder="Enter Country"
                          />
                        )}
                      />
                      {instructorForm.formState.errors.country && (
                        <p className="text-xs text-destructive mt-1">
                          {instructorForm.formState.errors.country.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        State
                      </label>
                      <Controller
                        name="state"
                        control={instructorForm.control}
                        render={({ field }) => (
                          <SearchableSelect
                            items={instructorStates.map((s) => ({
                              label: s.name,
                              value: s.name,
                            }))}
                            value={field.value || ""}
                            onChange={(value) => field.onChange(value)}
                            placeholder={
                              instructorCountry
                                ? "Enter state"
                                : "Select Country First"
                            }
                            disabled={!instructorCountry}
                          />
                        )}
                      />
                      {instructorForm.formState.errors.state && (
                        <p className="text-xs text-destructive mt-1">
                          {instructorForm.formState.errors.state.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {instructorForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {instructorForm.formState.errors.email.message}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="terms-i"
                      checked={acceptTerms}
                      onCheckedChange={(v) => setAcceptTerms(v === true)}
                    />
                    <label
                      htmlFor="terms-i"
                      className="text-sm text-muted-foreground"
                    >
                      I've read and I accept the all the{" "}
                      <span className="text-[#604BD6] hover:underline cursor-pointer">
                        Terms &amp; Conditions.
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FileUploadButton
                      label="Upload CV"
                      accept="application/pdf,.pdf"
                      upload={resumeUpload}
                      variant="outline"
                      disabled={isLoading}
                    />
                    <FileUploadButton
                      label="Upload Intro Video"
                      accept="video/mp4,.mp4"
                      upload={introUpload}
                      variant="solid"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex justify-center pt-2">
                    <Button
                      type="submit"
                      disabled={!canSubmitInstructor}
                      className="px-12 h-12 rounded-full text-base font-semibold bg-[#604BD6] hover:bg-[#604BD6]/90 text-white shadow-lg transition-all"
                    >
                      {isLoading
                        ? "Submitting..."
                        : isUploading
                          ? "Uploading files..."
                          : "Wait For Approval"}
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      onClick={handleLoginLink}
                      className="text-[#604BD6] font-semibold hover:underline"
                    >
                      Log In
                    </Link>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const handleSubmittedModalClose = useCallback(() => {
    setInstructorSubmitSuccess(false);
    if (isModal && onClose) {
      onClose();
    }
    navigate("/", { replace: true });
  }, [isModal, onClose, navigate]);

  const applicationSubmittedModal = (
    <PendingApprovalModal
      open={instructorSubmitSuccess}
      onOpenChange={(open) => {
        if (!open) {
          handleSubmittedModalClose();
        } else {
          setInstructorSubmitSuccess(open);
        }
      }}
      onBackToHome={handleSubmittedModalClose}
    />
  );

  if (instructorSubmitSuccess) {
    return applicationSubmittedModal;
  }

  if (isModal) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center p-4 bg-background"
    >
      {content}
    </motion.div>
  );
};

export default Signup;
