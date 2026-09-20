import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput, validatePhoneForCountry, countries } from "@/components/ui/phone-input";
import { usersService } from "@/services/users.service";
import { useToast } from "@/hooks/use-toast";

interface OtpVerificationModalProps {
  type: "phone" | "email";
  isOpen: boolean;
  onClose: () => void;
  onVerified: (value?: string) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const OtpVerificationModal = ({ type, isOpen, onClose, onVerified }: OtpVerificationModalProps) => {
  const { toast } = useToast();
  const [phoneFull, setPhoneFull] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("IN");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setOtp(["", "", "", ""]);
    setTimer(30);
    setCanResend(false);
    setPhoneFull("");
    setPhoneLocal("");
    setEmail("");
    setFieldError("");
    setOtpSent(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !otpSent || timer <= 0) {
      if (timer <= 0) setCanResend(true);
      return;
    }
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [isOpen, timer, otpSent]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const validateField = (): string | null => {
    if (type === "phone") {
      const country = countries.find((c) => c.code === phoneCountry);
      if (!country) return "Please select a country";
      return validatePhoneForCountry(phoneLocal, country);
    }
    if (!email.trim()) return "Email is required";
    if (!EMAIL_RE.test(email.trim())) return "Enter a valid email address";
    return null;
  };

  const handleSendOtp = async () => {
    const err = validateField();
    if (err) {
      setFieldError(err);
      return;
    }
    setFieldError("");
    setSending(true);
    try {
      if (type === "phone") {
        await usersService.sendPhoneOtp(phoneFull);
      } else {
        await usersService.sendEmailOtp(email.trim());
      }
      setOtpSent(true);
      setTimer(30);
      setCanResend(false);
      toast({ title: "OTP sent", description: `We sent a 4-digit code to your ${type}.` });
    } catch {
      toast({ title: "Failed to send OTP", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    setOtp(["", "", "", ""]);
    await handleSendOtp();
  };

  const handleContinue = async () => {
    const code = otp.join("");
    if (code.length < 4) return;
    setIsVerifying(true);
    try {
      const value = type === "phone" ? phoneFull : email.trim();
      const res = type === "phone"
        ? await usersService.verifyPhoneOtp(value, code)
        : await usersService.verifyEmailOtp(value, code);
      if (res.success) {
        toast({ title: `${type === "phone" ? "Phone" : "Email"} verified` });
        onVerified(value);
      } else {
        toast({ title: "Invalid OTP", variant: "destructive" });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm bg-foreground/30"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-card rounded-2xl shadow-xl w-full max-w-md p-8 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>

          <h2 className="text-2xl font-bold text-card-foreground mb-1">
            {type === "phone" ? "Verify Phone Number" : "Verify Email"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {type === "phone"
              ? "Enter your phone number and the OTP sent to your WhatsApp."
              : "Enter your email and the OTP sent to your inbox."}
          </p>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="font-semibold text-card-foreground">
                {type === "phone" ? "Phone Number" : "Email"}
              </Label>
              {type === "phone" ? (
                <PhoneInput
                  value={phoneFull}
                  defaultCountry={phoneCountry}
                  error={fieldError}
                  onChange={(full, code, local) => {
                    setPhoneFull(full);
                    setPhoneCountry(code);
                    setPhoneLocal(local);
                    if (fieldError) setFieldError("");
                  }}
                />
              ) : (
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldError) setFieldError("");
                    }}
                    className="pl-10"
                  />
                  {fieldError && <p className="text-xs text-destructive mt-1">{fieldError}</p>}
                </div>
              )}
            </div>

            {!otpSent ? (
              <Button
                onClick={handleSendOtp}
                disabled={sending}
                className="w-full h-12 rounded-xl text-base font-semibold bg-[#604BD6] hover:bg-[#604BD6]/90"
              >
                {sending ? "Sending..." : "Send OTP"}
              </Button>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="font-semibold text-card-foreground">OTP</Label>
                  <div className="flex gap-3">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        className="w-16 h-14 text-center text-xl font-semibold border-2 rounded-lg bg-card text-card-foreground border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                      />
                    ))}
                  </div>
                </div>

                <div className="text-center text-sm">
                  <button
                    onClick={handleResend}
                    disabled={!canResend}
                    className={`font-medium ${canResend ? "text-[#604BD6] hover:underline cursor-pointer" : "text-muted-foreground"}`}
                  >
                    Resend
                  </button>{" "}
                  {!canResend && <span className="text-muted-foreground">{formatTime(timer)}</span>}
                </div>

                <Button
                  onClick={handleContinue}
                  disabled={otp.join("").length < 4 || isVerifying}
                  className="w-full h-12 rounded-xl text-base font-semibold bg-[#604BD6] hover:bg-[#604BD6]/90"
                >
                  {isVerifying ? "Verifying..." : "Continue"}
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

