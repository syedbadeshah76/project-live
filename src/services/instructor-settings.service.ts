import { apiClient, unwrapData } from "@/lib/api-client";
import { profileService } from "@/services/profile.service";

export interface InstructorProfilePayload {
  fullName: string;
  bio?: string;
  expertiseTags?: string;
  socialLink?: string;
  introVideo?: string;
}

export interface InstructorPasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface InstructorPayoutPayload {
  payoutMethod?: string;
  accountNumber?: string;
  payoutSchedule?: string;
}

export interface InstructorPreferencesPayload {
  meetingPlatform?: string;
  newEnrollmentNotifications?: boolean;
  qaReplyAlerts?: boolean;
  adminApprovalAlerts?: boolean;
  revenueUpdates?: boolean;
  emailNotifications?: boolean;
}

export interface InstructorSettingsResponse {
  profile?: InstructorProfilePayload;
  payout?: InstructorPayoutPayload;
  preferences?: InstructorPreferencesPayload;
}

export const instructorSettingsService = {
  async getProfile() {
    const res = await profileService.getProfile();
    return res.data;
  },

  async updateProfile(payload: InstructorProfilePayload) {
    const parts = (payload.fullName || "").trim().split(" ");
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    const link = payload.socialLink || payload.introVideo || "";
    return await profileService.updateProfile({
      firstName,
      lastName,
      bio: payload.bio || "",
      avatar: payload.avatarUrl || undefined,
      socialLink: link,
      socials: link ? { website: link } : undefined,
    });
  },

  async updatePassword(payload: InstructorPasswordPayload) {
    return await apiClient.put("/auth/password", {
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    });
  },

  async uploadAvatar(file: File): Promise<{ url: string }> {
    const res = await profileService.updateAvatar(file);
    return { url: res.data?.avatar || "" };
  },

  async getPreferences(): Promise<InstructorPreferencesPayload | null> {
    const res = await apiClient.get<unknown>("/instructor/preferences");
    return unwrapData<InstructorPreferencesPayload>(res);
  },

  async updatePreferences(payload: InstructorPreferencesPayload) {
    const res = await apiClient.put<unknown>("/instructor/preferences", payload);
    return unwrapData(res);
  },
};

