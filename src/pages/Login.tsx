import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { PendingApprovalModal } from "@/components/auth/PendingApprovalModal";
import { RejectedInstructorModal } from "@/components/auth/RejectedInstructorModal";
import {
  getApiError,
  isInstructorPendingApproval,
  isInstructorRejected,
} from "@/lib/api-error";
import loginIllustration from "@/assets/login-illustration1.png";

const otpLength = 6;

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginProps {
  isModal?: boolean;
  onClose?: () => void;
  onSwitchToSignup?: () => void;
}

const Login = ({ isModal = false, onClose, onSwitchToSignup }: LoginProps) => {
  const navigate = useNavigate();
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(
    Array(otpLength).fill(""),
  );
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [formError, setFormError] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [pendingApprovalOpen, setPendingApprovalOpen] = useState(false);
  const [rejectedOpen, setRejectedOpen] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const { isAuthenticated, user, loginWithToken, logout } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (
      isAuthenticated &&
      user &&
      !isModal &&
      !pendingApprovalOpen &&
      !rejectedOpen
    ) {
      const target =
        user.role === "admin"
          ? "/admin"
          : user.role === "instructor"
            ? "/instructor"
            : "/dashboard";
      navigate(target, { replace: true });
    }
  }, [
    isAuthenticated,
    user,
    navigate,
    isModal,
    pendingApprovalOpen,
    rejectedOpen,
  ]);

  const processPendingCart = (role: string) => {
    if (role !== "student") return;
    const pending = localStorage.getItem("edvanz_pending_cart");
    if (pending) {
      try {
        const item = JSON.parse(pending);
        addToCart(item);
        localStorage.removeItem("edvanz_pending_cart");
        toast({
          title: "Course added to cart!",
          description: `${item.title} was added to your cart.`,
        });
      } catch {
        localStorage.removeItem("edvanz_pending_cart");
      }
    }
  };

  useEffect(() => {
    if (!otpSent || resendTimer === 0) return;
    const timerId = window.setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [otpSent, resendTimer]);

  const focusOtpInput = (index: number) => {
    otpRefs.current[index]?.focus();
  };

  const handlePendingApproval = () => {
    setPendingApprovalOpen(true);
    setFormError("");
  };

  const handleRejectedInstructor = () => {
    setRejectedOpen(true);
    setFormError("");
  };

  const resetAndLeave = () => {
    setOtpSent(false);
    setOtpValues(Array(otpLength).fill(""));
    try {
      logout();
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
    if (isModal && onClose) onClose();
    navigate("/", { replace: true });
  };

  const handleBackToHome = () => {
    setPendingApprovalOpen(false);
    resetAndLeave();
  };

  const handleRejectedBackToHome = () => {
    setRejectedOpen(false);
    resetAndLeave();
  };

  /** Returns true when the error was handled by a dedicated modal. */
  const handleInstructorAuthState = (error: unknown): boolean => {
    if (isInstructorPendingApproval(error)) {
      handlePendingApproval();
      return true;
    }
    if (isInstructorRejected(error)) {
      handleRejectedInstructor();
      return true;
    }
    return false;
  };

  const handleSendOtp = async (data: LoginFormData) => {
    setFormError("");
    setIsSending(true);
    try {
      await authService.login({ email: data.email });
      setEmailAddress(data.email);
      setOtpSent(true);
      setOtpValues(Array(otpLength).fill(""));
      setResendTimer(30);
      toast({ title: "OTP sent successfully to your email" });
      setTimeout(() => focusOtpInput(0), 100);
    } catch (error: unknown) {
      if (handleInstructorAuthState(error)) {
        return;
      }
      const message = getApiError(error);
      setFormError(message);
      toast({
        title: "Could not send OTP",
        description: message,
        variant: "destructive",
      });
      focusOtpInput(0);
    } finally {
      setIsSending(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || !emailAddress) return;
    setFormError("");
    setIsSending(true);
    try {
      const res = await authService.resendOtp({
        email: emailAddress,
        purpose: "login",
      });
      setOtpValues(Array(otpLength).fill(""));
      setResendTimer(30);
      toast({
        title: "OTP resent",
        description: res?.message || "OTP resent successfully",
      });
      setTimeout(() => focusOtpInput(0), 100);
    } catch (error: unknown) {
      if (handleInstructorAuthState(error)) {
        return;
      }
      const message = getApiError(error);
      setFormError(message);
      toast({
        title: "Could not resend OTP",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otpValues.join("");
    if (otpCode.length < otpLength) {
      setFormError("Please enter the 6-digit OTP.");
      return;
    }

    setFormError("");
    setIsVerifying(true);
    try {
      const response = await authService.verifyLoginOtp(emailAddress, otpCode);

      const token = response?.data?.token;
      const refreshToken = response?.data?.refreshToken;
      const role = response?.data?.role;
      const email = response?.data?.email;

      if (!token || !refreshToken || !role || !email) {
        throw new Error("OTP verification failed");
      }

      loginWithToken(token, refreshToken, role, email);
      processPendingCart(role.toLowerCase());
      toast({ title: "Login successful" });

      switch (role) {
        case "ADMIN":
          navigate("/admin");
          break;
        case "INSTRUCTOR":
          navigate("/instructor");
          break;
        case "STUDENT":
          navigate("/dashboard");
          break;
        default:
          navigate("/");
      }
    } catch (error: unknown) {
      if (handleInstructorAuthState(error)) {
        return;
      }
      const message = getApiError(error);
      setFormError(message);
      toast({
        title: "OTP verification failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    if (!otpSent) {
      await handleSendOtp(data);
      return;
    }
    await handleVerifyOtp();
  });

  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "");

    if (!digits) {
      const next = [...otpValues];
      next[index] = "";
      setOtpValues(next);
      return;
    }

    const next = [...otpValues];

    if (digits.length === 1) {
      next[index] = digits;
      setOtpValues(next);

      if (index < otpLength - 1) {
        focusOtpInput(index + 1);
      }

      return;
    }

    // Handles autofill/paste
    digits
      .slice(0, otpLength)
      .split("")
      .forEach((digit, i) => {
        next[i] = digit;
      });

    setOtpValues(next);

    focusOtpInput(Math.min(digits.length - 1, otpLength - 1));
  };

  const handleOtpKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    // Allow Ctrl/Cmd shortcuts
    if (event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();

      event.currentTarget.form?.requestSubmit();

      return;
    }
    if (event.key === "Backspace") {
      if (otpValues[index]) {
        const next = [...otpValues];
        next[index] = "";
        setOtpValues(next);
      } else if (index > 0) {
        focusOtpInput(index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft") {
      if (index > 0) focusOtpInput(index - 1);
      return;
    }

    if (event.key === "ArrowRight") {
      if (index < otpLength - 1) focusOtpInput(index + 1);
      return;
    }

    const allowedKeys = ["Delete", "Tab"];

    if (!allowedKeys.includes(event.key) && !/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    const pastedData = e.clipboardData.getData("text");
    const digits = pastedData.replace(/\D/g, "").slice(0, otpLength);

    if (!digits) return;

    const newOtp = Array(otpLength).fill("");

    digits.split("").forEach((digit, index) => {
      newOtp[index] = digit;
    });

    setOtpValues(newOtp);

    const focusIndex = Math.min(digits.length - 1, otpLength - 1);
    setTimeout(() => focusOtpInput(focusIndex), 0);
  };

  const handleClose = () => {
    if (isModal && onClose) onClose();
    else navigate("/");
  };

  const handleSignupLink = (e: React.MouseEvent) => {
    if (isModal && onSwitchToSignup) {
      e.preventDefault();
      onSwitchToSignup();
    }
  };

  const buttonLabel = isSending
    ? "Sending..."
    : isVerifying
      ? "Verifying..."
      : otpSent
        ? "Continue"
        : "Get OTP";
  const buttonDisabled =
    isSending ||
    isVerifying ||
    (otpSent && otpValues.join("").length < otpLength);

  const authModals = (
    <>
      <PendingApprovalModal
        open={pendingApprovalOpen}
        onOpenChange={setPendingApprovalOpen}
        onBackToHome={handleBackToHome}
      />
      <RejectedInstructorModal
        open={rejectedOpen}
        onOpenChange={setRejectedOpen}
        onBackToHome={handleRejectedBackToHome}
      />
    </>
  );

  const content = (
    <div className="relative bg-background rounded-2xl shadow-2xl  overflow-hidden w-full max-w-[780px] mx-auto flex flex-col md:flex-row">
      {/* Close */}
      <button
        onClick={handleClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 p-1.5 rounded-full hover:bg-muted transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Left illustration */}
      <div className="flex items-center justify-center bg-muted/30 p-8 md:p-10 md:w-[45%]">
        <img
          src={loginIllustration}
          alt="Login"
          className="max-w-full h-auto"
        />
      </div>

      {/* Right form */}
      <div className="flex-1 p-6 md:p-10 flex flex-col justify-center">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">
          Log In To Your Account.
        </h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          Enter your email and the OTP sent to your inbox
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                {...register("email")}
                type="email"
                placeholder="Enter email address"
                disabled={otpSent}
                className="pl-10 h-11 rounded-lg"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {otpSent && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                OTP
              </label>
              <div className="flex gap-2">
                {otpValues.map((value, index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    aria-label={`Digit ${index + 1}`}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={otpLength}
                    value={value}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className="w-12 h-12 text-center text-base rounded-lg"
                  />
                ))}
              </div>

              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || isSending}
                  className={`text-sm font-medium ${
                    resendTimer === 0 && !isSending
                      ? "text-[#604BD6] hover:underline cursor-pointer"
                      : "text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {resendTimer > 0 ? "Resend OTP in" : "Resend OTP"}
                </button>

                {resendTimer > 0 && (
                  <span className="text-sm text-muted-foreground ml-1">
                    {String(resendTimer).padStart(2, "0")} s
                  </span>
                )}
              </div>
            </div>
          )}

          {formError && (
            <p className="text-xs text-destructive mt-1">{formError}</p>
          )}

          <Button
            type="submit"
            disabled={buttonDisabled}
            className="w-full h-12 rounded-full text-base font-semibold bg-[#604BD6] hover:bg-[#604BD6]/90 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            {buttonLabel}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-5">
          Don't have an account?{" "}
          <Link
            to="/register"
            onClick={handleSignupLink}
            className="text-[#604BD6] font-semibold hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );

  if (isModal)
    return (
      <>
        {content}
        {authModals}
      </>
    );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen flex items-center justify-center p-4 bg-background"
      >
        {content}
      </motion.div>
      {authModals}
    </>
  );
};

export default Login;
