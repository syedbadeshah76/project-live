import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, type SubmitHandler, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const WEB3FORMS_ACCESS_KEY =
  import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || "1168d565-b18d-46c8-bd96-d976845c0ba2";
const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const EMAIL_SUBJECT = "New Edvanz Enquiry";
const EMAIL_FROM_NAME = "Edvanz Website";

const learnerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  category: z.string().min(1, "Please choose a category"),
  message: z.string().max(1000, "Keep under 1000 characters").optional().or(z.literal("")),
  consent: z.literal(true, { errorMap: () => ({ message: "Please accept to continue" }) }),
});

const instructorSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  subject: z.string().min(1, "Please choose a subject"),
  consent: z.literal(true, { errorMap: () => ({ message: "Please accept to continue" }) }),
});

type LearnerValues = z.infer<typeof learnerSchema>;
type InstructorValues = z.infer<typeof instructorSchema>;

const learnerCategories = [
  "Web Development",
  "App Development",
  "Business & Marketing",
  "Creative Design",
  "Information Technology",
  "AI & Machine Learning",
  "Career Skills",
  "Academic Learning",
  "Not Sure Yet",
];

const instructorSubjects = [
  "Web Development",
  "App Development",
  "Data Science",
  "AI & Machine Learning",
  "Cloud Computing",
  "Cyber Security",
  "Digital Marketing",
  "UI/UX Design",
  "Business",
  "Finance",
  "Soft Skills",
  "Academic Subjects",
  "Other",
];

type Mode = "learn" | "instructor";

interface Web3FormsResponse {
  success: boolean;
  message?: string;
}

async function submitToWeb3Forms(formData: FormData): Promise<Web3FormsResponse> {
  formData.append("access_key", WEB3FORMS_ACCESS_KEY);
  formData.append("subject", EMAIL_SUBJECT);
  formData.append("from_name", EMAIL_FROM_NAME);
  const res = await fetch(WEB3FORMS_ENDPOINT, {
    method: "POST",
    body: formData,
  });
  const data = (await res.json()) as Web3FormsResponse;
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Submission failed");
  }
  return data;
}

export default function EnquiryForm({ onNavigate }: { onNavigate?: (page: string) => void } = {}) {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "learn";
    return (localStorage.getItem("edvanz.enquiryMode") as Mode) || "learn";
  });

  const setModeAndPersist = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem("edvanz.enquiryMode", m);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="relative mx-auto w-full max-w-xl px-0 py-2 sm:py-4">
      <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-primary/10 to-transparent blur-2xl" />
      <div className="rounded-3xl border border-border/60 bg-card/95 p-5 sm:p-7 shadow-2xl backdrop-blur-md">
        <header className="mb-5 text-center">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Choose Your Journey with Edvanz
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Quick enquiry — we'll get back within 24 hours.
          </p>
        </header>

        {/* Segmented toggle */}
        <div className="relative mx-auto mb-6 grid w-full max-w-xs grid-cols-2 rounded-full bg-muted p-1">
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 shadow"
            style={{ left: mode === "learn" ? 4 : "calc(50% + 0px)" }}
          />
          {(["learn", "instructor"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModeAndPersist(m)}
              className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                mode === m ? "text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "learn" ? (
                <GraduationCap className="h-4 w-4" aria-hidden />
              ) : (
                <Briefcase className="h-4 w-4" aria-hidden />
              )}
              {m === "learn" ? "Learn" : "Instructor"}
            </button>
          ))}
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            {mode === "learn" ? (
              <motion.div
                key="learn"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <LearnerForm onNavigate={onNavigate} />
              </motion.div>
            ) : (
              <motion.div
                key="instructor"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <InstructorForm onNavigate={onNavigate} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ---------- Shared field primitives ---------- */

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-foreground/90">
      {children}
      {required && (
        <span className="ml-0.5 text-destructive" aria-hidden>
          *
        </span>
      )}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <div id={id} role="alert" aria-live="polite" className="min-h-[1.25rem] pt-1 text-[11px] text-destructive">
      {message ? (
        <span className="inline-flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden /> {message}
        </span>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground";

/* ---------- Learner Form ---------- */

function LearnerForm({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LearnerValues>({
    resolver: zodResolver(learnerSchema),
    mode: "onTouched",
  });

  const onSubmit: SubmitHandler<LearnerValues> = async (values) => {
    try {
      const fd = new FormData();
      fd.append("form_type", "Learner Enquiry");
      fd.append("name", values.name);
      fd.append("email", values.email);
      fd.append("mobile", values.mobile);
      fd.append("category", values.category);
      fd.append("message", values.message ?? "");
      fd.append("replyto", values.email);
      await submitToWeb3Forms(fd);
      setSubmitted(true);
      reset();
      toast.success("Enquiry sent! We'll get back within 24 hours.");
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(msg);
    }
  };

  if (submitted) return <SuccessCard title="Enquiry received — we'll be in touch!" />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-3">
      <div>
        <h3 className="text-sm sm:text-base font-bold text-foreground">Start Your Learning Journey</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tell us a little about yourself and we'll help you find the right learning path.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="l-name" required>
            Full Name
          </FieldLabel>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              id="l-name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "l-name-err" : undefined}
              className={`${inputBase} pl-9 ${errors.name ? "border-destructive" : "border-input"}`}
              {...register("name")}
            />
          </div>
          <FieldError id="l-name-err" message={errors.name?.message} />
        </div>
        <div>
          <FieldLabel htmlFor="l-email" required>
            Email
          </FieldLabel>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              id="l-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "l-email-err" : undefined}
              className={`${inputBase} pl-9 ${errors.email ? "border-destructive" : "border-input"}`}
              {...register("email")}
            />
          </div>
          <FieldError id="l-email-err" message={errors.email?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mobile Number */}
        <div>
          <FieldLabel htmlFor="l-mobile" required>
            Mobile Number
          </FieldLabel>

          <div className="relative">
            <Phone
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden
            />

            <input
              id="l-mobile"
              type="tel"
              autoComplete="tel"
              inputMode="numeric"
              placeholder="9876543210"
              maxLength={10}
              aria-invalid={!!errors.mobile}
              aria-describedby={errors.mobile ? "l-mobile-err" : undefined}
              className={`${inputBase} pl-9 ${errors.mobile ? "border-destructive" : "border-input"}`}
              onInput={(e) => {
                e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "").slice(0, 10);
              }}
              {...register("mobile")}
            />
          </div>

          <FieldError id="l-mobile-err" message={errors.mobile?.message} />
        </div>

        {/* Learning Category */}
        <div>
          <FieldLabel htmlFor="l-category" required>
            Learning Category
          </FieldLabel>

          <select
            id="l-category"
            aria-invalid={!!errors.category}
            aria-describedby={errors.category ? "l-category-err" : undefined}
            className={`${inputBase} ${errors.category ? "border-destructive" : "border-input"}`}
            defaultValue=""
            {...register("category")}
          >
            <option value="" disabled>
              Select a category
            </option>

            {learnerCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <FieldError id="l-category-err" message={errors.category?.message} />
        </div>
      </div>

      <ConsentBlock
        id="l-consent"
        register={register("consent")}
        error={errors.consent?.message as string | undefined}
        note="Your information is secure and will only be used to help you get started with Edvanz."
        onNavigate={onNavigate}
      />

      <SubmitButton loading={isSubmitting}>Get Course Guidance</SubmitButton>
    </form>
  );
}

/* ---------- Instructor Form ---------- */

function InstructorForm({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InstructorValues>({
    resolver: zodResolver(instructorSchema),
    mode: "onTouched",
  });

  const onSubmit: SubmitHandler<InstructorValues> = async (values) => {
    try {
      const fd = new FormData();
      fd.append("form_type", "Instructor Application");
      fd.append("name", values.name);
      fd.append("email", values.email);
      fd.append("mobile", values.mobile);
      fd.append("subject", values.subject);
      fd.append("replyto", values.email);
      await submitToWeb3Forms(fd);
      setSubmitted(true);
      reset();
      toast.success("Application received — thanks for joining Edvanz!");
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(msg);
    }
  };

  if (submitted) return <SuccessCard title="Application received — thanks for joining Edvanz!" />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-3">
      <div>
        <h3 className="text-sm sm:text-base font-bold text-foreground">Become an Instructor</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Share your expertise and inspire learners through practical, industry-focused courses.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="i-name" required>
            Full Name
          </FieldLabel>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              id="i-name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "i-name-err" : undefined}
              className={`${inputBase} pl-9 ${errors.name ? "border-destructive" : "border-input"}`}
              {...register("name")}
            />
          </div>
          <FieldError id="i-name-err" message={errors.name?.message} />
        </div>
        <div>
          <FieldLabel htmlFor="i-email" required>
            Email
          </FieldLabel>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              id="i-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "i-email-err" : undefined}
              className={`${inputBase} pl-9 ${errors.email ? "border-destructive" : "border-input"}`}
              {...register("email")}
            />
          </div>
          <FieldError id="i-email-err" message={errors.email?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mobile Number */}
        <div>
          <FieldLabel htmlFor="i-mobile" required>
            Mobile Number
          </FieldLabel>

          <div className="relative">
            <Phone
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden
            />

            <input
              id="i-mobile"
              type="tel"
              autoComplete="tel"
              inputMode="numeric"
              placeholder="9876543210"
              maxLength={10}
              aria-invalid={!!errors.mobile}
              aria-describedby={errors.mobile ? "i-mobile-err" : undefined}
              className={`${inputBase} pl-9 ${errors.mobile ? "border-destructive" : "border-input"}`}
              onInput={(e) => {
                e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "").slice(0, 10);
              }}
              {...register("mobile")}
            />
          </div>

          <FieldError id="i-mobile-err" message={errors.mobile?.message} />
        </div>

        {/* What do you teach? */}
        <div>
          <FieldLabel htmlFor="i-subject" required>
            What do you want to teach?
          </FieldLabel>

          <select
            id="i-subject"
            aria-invalid={!!errors.subject}
            aria-describedby={errors.subject ? "i-subject-err" : undefined}
            className={`${inputBase} ${errors.subject ? "border-destructive" : "border-input"}`}
            defaultValue=""
            {...register("subject")}
          >
            <option value="" disabled>
              Select a subject
            </option>

            {instructorSubjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <FieldError id="i-subject-err" message={errors.subject?.message} />
        </div>
      </div>

      <ConsentBlock
        id="i-consent"
        register={register("consent")}
        error={errors.consent?.message as string | undefined}
        note="Your information is secure and will only be used to review your instructor application and contact you regarding your enquiry."
        onNavigate={onNavigate}
      />

      <SubmitButton loading={isSubmitting}>Join Our Instructor Community</SubmitButton>
    </form>
  );
}

/* ---------- Consent + Submit + Success ---------- */

function ConsentBlock({
  id,
  register,
  error,
  note,
  onNavigate,
}: {
  id: string;
  register: UseFormRegisterReturn;
  error?: string;
  note: string;
  onNavigate?: (page: string) => void;
}) {
  const navigate = useNavigate();
  const handlePrivacyClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate("privacy");
    } else {
      e.preventDefault();
      navigate("/privacy");
    }
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] leading-relaxed text-muted-foreground">{note}</p>
      <label htmlFor={id} className="group flex cursor-pointer items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-input text-primary accent-primary focus:ring-2 focus:ring-primary/30"
          {...register}
        />
        <span className="text-xs leading-relaxed text-foreground/80">
          I agree to be contacted by Edvanz regarding my enquiry and accept the{" "}
          <Link
            to="/privacy"
            onClick={handlePrivacyClick}
            className="rounded-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}

function SubmitButton({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="submit"
      disabled={loading}
      whileHover={{ scale: loading ? 1 : 1.01 }}
      whileTap={{ scale: loading ? 1 : 0.99 }}
      className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:opacity-70 cursor-pointer"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Sending…
        </>
      ) : (
        <>
          {children}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </>
      )}
    </motion.button>
  );
}

function SuccessCard({ title }: { title: string }) {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-green-200 bg-green-50/90 p-6 text-center"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-6 w-6 text-green-600" aria-hidden />
      </div>
      <h3 className="mt-3 font-bold text-green-800">{title}</h3>
      <p className="mt-1 text-sm text-green-700/90">
        Our team will reach out to you within 24 hours.
      </p>
    </motion.div>
  );
}
