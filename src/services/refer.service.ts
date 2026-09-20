// src/services/refer.service.ts
import { apiClient } from "@/lib/api-client";

export interface MyReferralLink {
  referralCode: string;
  referralLink: string;
}

export interface ReferResponse {
  message: string;
}

export interface ValidateReferralResponse {
  valid: boolean;
  message: string;
}

export interface ReferredItem {
  referralId: string;
  referredUserId: string;
  name: string;
  email: string;
  profilePicture: string | null;
  status: string;
  displayStatus: string;
  rewardCoins: number;
  createdAt: string;
}

export interface MyReferralDetails {
  referralCode: string;
  totalReferrals: number;
  successfulReferrals: number;
  totalReferralRewards: number;
  referrals: ReferredItem[];
}

const REFERRAL_CODE_STORAGE_KEY = "edvanz_referral_code";

export const referService = {
  /** GET {{gateway_url}}/api/referral/my-link */
  getMyLink() {
    return apiClient.get<MyReferralLink>("/referral/my-link");
  },

  /** GET {{gateway_url}}/api/referral/my-details */
  getMyDetails() {
    return apiClient.get<MyReferralDetails>("/referral/my-details");
  },

  /** GET {{gateway_url}}/api/referral/refer  (body: { email }) */
  refer(email: string) {
    return apiClient.get<ReferResponse>("/referral/refer", {
      data: { email: email.trim() },
    });
  },

  /** GET {{gateway_url}}/api/referral/validate/{code} — public */
  validate(code: string) {
    return apiClient.get<ValidateReferralResponse>(
      `/referral/validate/${encodeURIComponent(code.trim().toUpperCase())}`
    );
  },

  /* ---------- referral code capture helpers (used by signup) ---------- */

  captureCodeFromUrl(search: string = window.location.search) {
    const code = new URLSearchParams(search).get("code");
    if (code) {
      try {
        localStorage.setItem(REFERRAL_CODE_STORAGE_KEY, code.toUpperCase());
      } catch {
        /* storage unavailable */
      }
      return code.toUpperCase();
    }
    return referService.getStoredCode();
  },

  getStoredCode(): string | null {
    try {
      return localStorage.getItem(REFERRAL_CODE_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  clearStoredCode() {
    try {
      localStorage.removeItem(REFERRAL_CODE_STORAGE_KEY);
    } catch {
      /* noop */
    }
  },
};

export { REFERRAL_CODE_STORAGE_KEY };

