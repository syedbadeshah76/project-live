// ============= Referral Service =============
// Backend contract (Spring Boot):
//   POST   /instructor/referrals                         — instructor submits new referral
//   GET    /instructor/referrals                         — list current instructor's referrals
//   GET    /instructor/referrals/stats                   — { total, pending, approved, earnings }
//   GET    /admin/referrals                              — list all referrals (filter: status)
//   GET    /admin/referrals/:id                          — get single referral
//   PATCH  /admin/referrals/:id                          — { status: 'approved' | 'rejected', reason? }
//     Side effects on 'approved':
//       - Creates instructor user account (role=instructor, status=active)
//       - Credits referring instructor with reward
//       - Sends onboarding email + bell notification
//     Side effects on 'rejected':
//       - Marks referred user (if pre-created) as rejected → login shows rejection screen
//       - Sends rejection email to both referrer and referred user
import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/lib/api-client";

const MOCK_MODE = true;

export type ReferralStatus = "pending" | "approved" | "rejected";

export interface ReferralPayload {
  fullName: string;
  email: string;
  expertise: string;
  message?: string;
}

export interface Referral extends ReferralPayload {
  id: string;
  referrerId: string;
  referrerName: string;
  status: ReferralStatus;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  reward?: number;
  // Enrichment for admin review card (mirrors instructor application)
  location?: string;
  experienceYears?: number;
  rating?: number;
  tags?: string[];
  phone?: string;
  bio?: string;
}

export interface ReferralStats {
  total: number;
  pending: number;
  approved: number;
  earnings: number;
}

const REWARD_PER_APPROVAL = 100;

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

const mockReferrals: Referral[] = [
  {
    id: "ref-1", referrerId: "3", referrerName: "John Davis",
    fullName: "Priya Sharma", email: "priya@email.com",
    expertise: "UI/UX", tags: ["UI/UX", "Figma"],
    status: "approved", submittedAt: "2024-01-15", reviewedAt: "2024-01-16",
    reward: REWARD_PER_APPROVAL, location: "Bangalore, IN", experienceYears: 4, rating: 4.7,
    phone: "+91 90000 11111", bio: "Product designer with a strong UX research background.",
  },
  {
    id: "ref-2", referrerId: "3", referrerName: "John Davis",
    fullName: "David Lee", email: "david@email.com",
    expertise: "React", tags: ["React", "TypeScript"],
    status: "approved", submittedAt: "2024-01-12", reviewedAt: "2024-01-13",
    reward: REWARD_PER_APPROVAL, location: "Seoul, KR", experienceYears: 6, rating: 4.9,
    phone: "+82 10 1234 5678", bio: "Frontend architect specializing in React ecosystems.",
  },
  {
    id: "ref-3", referrerId: "3", referrerName: "John Davis",
    fullName: "Sarah Chen", email: "sarah@example.com",
    expertise: "Web Development", tags: ["Web Development", "React", "JavaScript"],
    status: "pending", submittedAt: "2024-01-18",
    location: "San Francisco, CA", experienceYears: 5, rating: 4.8,
    phone: "+1 (555) 234-5678",
    bio: "Passionate educator with 5+ years of teaching experience in web development and modern JavaScript frameworks.",
  },
  {
    id: "ref-4", referrerId: "4", referrerName: "Emily Watson",
    fullName: "Michael Rodriguez", email: "michael@example.com",
    expertise: "Data Science", tags: ["Data Science", "Python", "Machine Learning"],
    status: "pending", submittedAt: "2024-01-17",
    location: "New York, NY", experienceYears: 3, rating: 4.2,
    phone: "+1 (555) 987-6543",
    bio: "Data science expert with background in statistics and AI.",
  },
];

// Users referred but not yet approved / rejected (drives login screen state)
export const referredUserStatus = new Map<string, ReferralStatus>(
  mockReferrals.map((r) => [r.email.toLowerCase(), r.status])
);

export const referralService = {
  async submit(payload: ReferralPayload, referrer: { id: string; name: string }): Promise<ApiResponse<Referral>> {
    if (MOCK_MODE) {
      await delay(400);
      const ref: Referral = {
        ...payload,
        id: `ref-${Date.now()}`,
        referrerId: referrer.id,
        referrerName: referrer.name,
        status: "pending",
        submittedAt: new Date().toISOString(),
        tags: payload.expertise.split(",").map((t) => t.trim()).filter(Boolean),
      };
      mockReferrals.unshift(ref);
      referredUserStatus.set(ref.email.toLowerCase(), "pending");
      return { success: true, data: ref };
    }
    return apiClient.post<ApiResponse<Referral>>("/instructor/referrals", payload);
  },

  async listMine(referrerId: string): Promise<ApiResponse<Referral[]>> {
    if (MOCK_MODE) {
      await delay(200);
      // In mock mode, show referrer id 3 by default so demo instructor sees the list
      const items = mockReferrals.filter((r) => r.referrerId === referrerId || referrerId === "3");
      return { success: true, data: items };
    }
    return apiClient.get<ApiResponse<Referral[]>>("/instructor/referrals");
  },

  async myStats(referrerId: string): Promise<ApiResponse<ReferralStats>> {
    if (MOCK_MODE) {
      await delay(150);
      const mine = mockReferrals.filter((r) => r.referrerId === referrerId || referrerId === "3");
      const approved = mine.filter((r) => r.status === "approved").length;
      return {
        success: true,
        data: {
          total: mine.length,
          pending: mine.filter((r) => r.status === "pending").length,
          approved,
          earnings: approved * REWARD_PER_APPROVAL,
        },
      };
    }
    return apiClient.get<ApiResponse<ReferralStats>>("/instructor/referrals/stats");
  },

  async listAll(status?: ReferralStatus): Promise<ApiResponse<Referral[]>> {
    if (MOCK_MODE) {
      await delay(200);
      const items = status ? mockReferrals.filter((r) => r.status === status) : [...mockReferrals];
      return { success: true, data: items };
    }
    return apiClient.get<ApiResponse<Referral[]>>("/admin/referrals", { params: { status } });
  },

  async get(id: string): Promise<ApiResponse<Referral>> {
    if (MOCK_MODE) {
      await delay(120);
      const r = mockReferrals.find((x) => x.id === id);
      if (!r) throw { success: false, message: "Not found", statusCode: 404 };
      return { success: true, data: r };
    }
    return apiClient.get<ApiResponse<Referral>>(`/admin/referrals/${id}`);
  },

  async review(id: string, status: "approved" | "rejected", rejectionReason?: string): Promise<ApiResponse<Referral>> {
    if (MOCK_MODE) {
      await delay(300);
      const idx = mockReferrals.findIndex((x) => x.id === id);
      if (idx === -1) throw { success: false, message: "Not found", statusCode: 404 };
      mockReferrals[idx] = {
        ...mockReferrals[idx],
        status,
        reviewedAt: new Date().toISOString(),
        rejectionReason,
        reward: status === "approved" ? REWARD_PER_APPROVAL : undefined,
      };
      referredUserStatus.set(mockReferrals[idx].email.toLowerCase(), status);
      // eslint-disable-next-line no-console
      console.info(`[MOCK] Referral ${status}: ${mockReferrals[idx].email}`);
      return { success: true, data: mockReferrals[idx] };
    }
    return apiClient.patch<ApiResponse<Referral>>(`/admin/referrals/${id}`, { status, rejectionReason });
  },
};
