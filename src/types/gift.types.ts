// ============= Gift a Course Types =============
// Backend-ready: matches Spring Boot endpoints under /api/gifts

export type GiftStatus = "PENDING" | "REDEEMED";

/** A course selected for gifting — carries all data needed for preview, checkout, and gift creation. */
export interface GiftCourseItem {
  courseId: string;
  product_id?: string;
  productId?: string;
  title: string;
  thumbnail: string;
  description: string;
  price: number;
  originalPrice: number;
  duration: string;
  modules: number;
  certificate: string;
  courseType: string;
  occurrence: string;
  lessons: number;
  rating: number;
  instructor: string;
}

/** POST /api/gifts request body */
export interface CreateGiftApiRequest {
  productIds: string[];
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  giftMessage: string;
}

export type GiftRequest = CreateGiftApiRequest;

/** POST /api/gifts response body */
export interface CreateGiftApiResponse {
  giftId: string;
  courseId?: string;
  productId?: string;
  product_id?: string;
  recipientEmail: string;
  giftMessage: string;
  status: GiftStatus;
}

export interface GiftSender {
  name?: string;
  avatar?: string;
}

export interface GiftCourseInfo {
  title?: string;
  thumbnail?: string;
  description?: string;
  lessons?: number;
  duration?: string;
  rating?: number;
  enrolledCount?: number;
}

/** GET /api/gifts/history response item */
export interface GiftHistoryItem {
  giftId: string;
  courseId: string;
  productId?: string;
  product_id?: string;
  studentId?: string;
  student_id?: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone?: string;
  status: GiftStatus | "EXPIRED" | "PROCESSING" | string;
  sender?: GiftSender;
  senderName?: string;
  senderAvatar?: string;
  giftMessage?: string;
  course?: GiftCourseInfo;
  courseTitle?: string;
  courseThumbnail?: string;
  courseDescription?: string;
  lessons?: number;
  duration?: string;
  rating?: number;
  enrolledCount?: number;
  createdAt?: string;
  giftDate?: string;
  orderId?: string;
}

/** POST /api/gifts/{giftId}/redeem — 200 OK, no body expected */
export type RedeemGiftResponse = void;

/** Tracks per-course gift creation outcome for partial failure recovery. */
export interface GiftCreationResult {
  courseId: string;
  courseTitle: string;
  status: "success" | "failed" | "pending";
  giftId?: string;
  error?: string;
}

/** Full state stored in GiftCheckoutContext. */
export interface GiftCheckoutState {
  /** Courses selected for gifting from the cart dialog. */
  selectedCourses: GiftCourseItem[];

  /** Recipient details (Page 1). */
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  giftMessage: string;

  /** Confirmation details (Page 2). */
  confirmedEmail: string;
  confirmedPhone: string;
  confirmationCompleted: boolean;

  /** Checkout mode flag. */
  isGiftCheckout: boolean;

  /** Gift creation tracking for partial failure recovery. */
  giftCreationResults: GiftCreationResult[];

  /** The order ID used for this gift checkout (set after order creation). */
  giftOrderId: string | null;
}

/** Metadata attached to gift orders in order history. */
export interface GiftOrderMetadata {
  isGift: boolean;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  giftMessage: string;
  giftIds: string[];
}
