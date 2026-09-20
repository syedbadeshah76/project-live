import { apiClient } from "@/lib/api-client";
import { coursesService } from "@/services/courses.service";
import { usersService } from "@/services/users.service";
import type {
  CreateGiftApiRequest,
  CreateGiftApiResponse,
  GiftHistoryItem,
} from "@/types/gift.types";

// ============= Gift API Service =============

export const giftService = {
  /**
   * POST /api/gifts
   * Creates gifts for one or more courses in a single request.
   */
  createGift: (payload: CreateGiftApiRequest): Promise<CreateGiftApiResponse> =>
    apiClient.post<CreateGiftApiResponse>("/gifts", payload, {
      headers: { "X-Tenant-Id": undefined },
    }),

  /**
   * GET /api/gifts/history
   * Fetches the full gift history for the current authenticated user.
   */
  getGiftHistory: (): Promise<GiftHistoryItem[]> =>
    apiClient.get<GiftHistoryItem[]>("/gifts/history", {
      headers: { "X-Tenant-Id": undefined },
    }),

  /**
   * GET /api/gifts/{giftId}
   * Fetches single gift details by gift ID with fallback to history lookup.
   */
  getGiftDetails: async (giftId: string): Promise<GiftHistoryItem> => {
    try {
      const res = await apiClient.get<GiftHistoryItem>(`/gifts/${giftId}`, {
        headers: { "X-Tenant-Id": undefined },
      });
      if (res && typeof res === "object" && (res.giftId || res.courseId)) {
        return res;
      }
    } catch {
      /* fallback to history lookup */
    }

    const history = await giftService.getGiftHistory();
    const match = history.find(
      (g) =>
        String(g.giftId) === giftId ||
        String(g.courseId) === giftId ||
        String(g.productId || g.product_id) === giftId
    );

    if (!match) {
      throw new Error(`Gift with ID "${giftId}" was not found.`);
    }

    return match;
  },

  /**
   * Consolidated Loader — Hydrates gift history items with full real course & student details from backend services.
   */
  hydrateGiftItem: async (rawGift: GiftHistoryItem): Promise<GiftHistoryItem> => {
    const targetProductId = (
      rawGift.productId ||
      rawGift.product_id ||
      rawGift.courseId ||
      ""
    ).trim();

    const targetStudentId = (
      rawGift.studentId ||
      rawGift.student_id ||
      ""
    ).trim();

    // Parallel requests: course details & student profile (if student_id present)
    const [courseResult, studentResult] = await Promise.all([
      targetProductId
        ? coursesService.getCourse(targetProductId).catch(() => null)
        : Promise.resolve(null),
      targetStudentId
        ? usersService.getUser(targetStudentId).catch(() => null)
        : Promise.resolve(null),
    ]);

    const cData: any = courseResult?.data ?? courseResult;
    const sData: any = studentResult?.data ?? studentResult;

    // Merge course details from course service
    const title =
      cData?.title ||
      rawGift.course?.title ||
      rawGift.courseTitle ||
      "Gifted Course";

    const thumbnail =
      cData?.thumbnailUrl ||
      cData?.thumbnail ||
      rawGift.course?.thumbnail ||
      rawGift.courseThumbnail ||
      "";

    const description =
      cData?.description ||
      rawGift.course?.description ||
      rawGift.courseDescription ||
      "";

    const lessons =
      cData?.totalLessons ??
      cData?.lessons ??
      rawGift.course?.lessons ??
      rawGift.lessons ??
      0;

    const totalMins = Number(
      cData?.totalDurationMinutes ?? cData?.durationMinutes ?? 0
    );
    const duration =
      cData?.duration ||
      (totalMins > 0 ? `${totalMins} Mins` : undefined) ||
      rawGift.course?.duration ||
      rawGift.duration ||
      "Self-paced";

    const rating = Number(
      cData?.avgRating ??
        cData?.rating ??
        rawGift.course?.rating ??
        rawGift.rating ??
        5.0
    );

    const enrolledCount = Number(
      cData?.students ??
        cData?.enrolledCount ??
        rawGift.course?.enrolledCount ??
        rawGift.enrolledCount ??
        0
    );

    // Merge recipient/student details from user profile
    const recipientName =
      sData?.fullName || sData?.name || rawGift.recipientName || "Recipient";
    const recipientEmail =
      sData?.email || rawGift.recipientEmail || "";
    const recipientPhone =
      sData?.phoneNumber || sData?.phone || rawGift.recipientPhone || "";

    return {
      ...rawGift,
      productId: targetProductId || rawGift.productId,
      product_id: targetProductId || rawGift.product_id,
      recipientName,
      recipientEmail,
      recipientPhone,
      courseTitle: title,
      courseThumbnail: thumbnail,
      courseDescription: description,
      lessons,
      duration,
      rating,
      enrolledCount,
      course: {
        title,
        thumbnail,
        description,
        lessons,
        duration,
        rating,
        enrolledCount,
      },
    };
  },

  /**
   * POST /api/gifts/{giftId}/redeem
   * Redeems a pending gift for the current authenticated user.
   */
  redeemGift: (giftId: string): Promise<void> =>
    apiClient.post<void>(`/gifts/${giftId}/redeem`, undefined, {
      headers: { "X-Tenant-Id": undefined },
    }),
};
