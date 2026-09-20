// src/hooks/useReferralCode.ts
import { useEffect, useState } from "react";
import { referService } from "@/services/refer.service";

/**
 * Captures ?code=XXXX from the signup URL (e.g. /referral/learner/signup?code=REFCC654D42),
 * persists it, and validates it against the public endpoint.
 *
 * Use the returned `code` in your signup payload so the backend can credit
 * 5 EZ Coins to the referring student after a successful signup.
 */
export function useReferralCode() {
  const [code, setCode] = useState<string | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const captured = referService.captureCodeFromUrl();
    setCode(captured);

    if (!captured) return;

    let mounted = true;
    setValidating(true);

    referService
      .validate(captured)
      .then((res: any) => {
        const data = res?.data?.valid !== undefined ? res.data : res;
        if (!mounted) return;
        setValid(!!data?.valid);
        setMessage(data?.message ?? "");
        if (!data?.valid) referService.clearStoredCode();
      })
      .catch((err: any) => {
        if (!mounted) return;
        setValid(false);
        setMessage(err?.response?.data?.message ?? "Invalid referral code");
      })
      .finally(() => {
        if (mounted) setValidating(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const applyCode = async (next: string) => {
    const trimmed = next.trim().toUpperCase();
    setCode(trimmed || null);
    if (!trimmed) {
      setValid(null);
      setMessage("");
      referService.clearStoredCode();
      return false;
    }
    try {
      setValidating(true);
      const res: any = await referService.validate(trimmed);
      const data = res?.data?.valid !== undefined ? res.data : res;
      setValid(!!data?.valid);
      setMessage(data?.message ?? "");
      return !!data?.valid;
    } catch (err: any) {
      setValid(false);
      setMessage(err?.response?.data?.message ?? "Invalid referral code");
      return false;
    } finally {
      setValidating(false);
    }
  };

  return { code, valid, validating, message, applyCode };
}
