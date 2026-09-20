// ============= Help Center content registry =============
// Backend-ready: replace this static registry with GET /help/categories
// and GET /help/articles/:slug from your Spring Boot CMS endpoints.
import {
  Rocket,
  ShoppingCart,
  User,
  BookOpen,
  Award,
  Trash2,
  Gift,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

export interface HelpArticle {
  slug: string;
  title: string;
  /** Markdown / rich body. Empty for now — wired later via CMS. */
  body?: string;
}

export interface HelpCategory {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  audience: "student" | "instructor" | "both";
  articles: HelpArticle[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    slug: "get-started",
    title: "Get Started",
    description: "Learn how Edvanz works",
    icon: Rocket,
    audience: "both",
    articles: [
      { slug: "welcome", title: "Welcome to Edvanz" },
      { slug: "create-account", title: "Create your account" },
      { slug: "enroll-first-course", title: "Enroll in your first course" },
      { slug: "navigate-dashboard", title: "Navigate the dashboard" },
    ],
  },
  {
    slug: "payments-billing",
    title: "Purchase/refunds",
    description: "Learn about purchasing courses, how to send gifts, and refunds.",
    icon: ShoppingCart,
    audience: "both",
    articles: [
      { slug: "payment-methods", title: "Payment methods on EDVANZ" },
      { slug: "troubleshoot-payments", title: "Troubleshooting payment failures" },
      { slug: "refund-policy", title: "Refund status: common questions" },
      { slug: "currencies", title: "Currencies: FAQ" },
    ],
  },
  {
    slug: "account-profile",
    title: "Account/ Profile",
    description: "Manage your account settings",
    icon: User,
    audience: "both",
    articles: [
      { slug: "update-profile", title: "Update your profile" },
      { slug: "change-password", title: "Change your password" },
      { slug: "notification-preferences", title: "Notification preferences" },
    ],
  },
  {
    slug: "courses-learning",
    title: "Courses",
    description: "Learn how Edvanz works",
    icon: BookOpen,
    audience: "both",
    articles: [
      { slug: "course-progress", title: "Track course progress" },
      { slug: "video-playback", title: "Video playback tips" },
      { slug: "quizzes", title: "Quizzes & practice tests" },
    ],
  },
  {
    slug: "certificates-badges",
    title: "Certificates",
    description: "How to achieve certification",
    icon: Award,
    audience: "both",
    articles: [
      { slug: "earn-certificate", title: "How to earn a certificate" },
      { slug: "share-badges", title: "Sharing badges on LinkedIn" },
      { slug: "verify-certificate", title: "Verify a certificate" },
    ],
  },
  {
    slug: "delete-profile",
    title: "Delete Profile",
    description: "Terms and process of deleting profile",
    icon: Trash2,
    audience: "both",
    articles: [
      { slug: "delete-account", title: "How to delete your account" },
      { slug: "data-retention", title: "What happens to your data" },
    ],
  },
  {
    slug: "gift-redeem",
    title: "Gift & Redeem Courses",
    description: "Send a course or redeem a gifted course",
    icon: Gift,
    audience: "student",
    articles: [
      { slug: "send-gift", title: "How to gift a course" },
      { slug: "redeem-gift", title: "How to redeem a gift" },
    ],
  },
  {
    slug: "technical-support",
    title: "Technical Support",
    description: "Get help with technical issues",
    icon: LifeBuoy,
    audience: "both",
    articles: [
      { slug: "contact-support", title: "Contact EDVANZ support" },
      { slug: "browser-issues", title: "Troubleshooting browser issues" },
    ],
  },
];

export const POPULAR_TOPICS = [
  { label: "Get Started", to: "/dashboard/help-center/get-started" },
  { label: "Pricing", to: "/dashboard/help-center/payments-billing" },
  { label: "Gift Course", to: "/dashboard/help-center/gift-redeem" },
  { label: "Troubleshoot Streaks", to: "/dashboard/help-center/technical-support" },
];

export const RELATED_ARTICLES = [
  { label: "Troubleshooting payment failures", to: "/dashboard/help-center/payments-billing/troubleshoot-payments" },
  { label: "How to contact EDVANZ Support", to: "/dashboard/help-center/technical-support/contact-support" },
  { label: "Refund status: common questions", to: "/dashboard/help-center/payments-billing/refund-policy" },
  { label: "Currencies: FAQ", to: "/dashboard/help-center/payments-billing/currencies" },
  { label: "Troubleshooting Payment Issues in India", to: "/dashboard/help-center/payments-billing/troubleshoot-payments" },
  { label: "Getting started", to: "/dashboard/help-center/get-started" },
  { label: "Account/profile", to: "/dashboard/help-center/account-profile" },
  { label: "Troubleshooting", to: "/dashboard/help-center/technical-support" },
  { label: "Learning experience", to: "/dashboard/help-center/courses-learning" },
  { label: "Purchase/refunds", to: "/dashboard/help-center/payments-billing" },
  { label: "Mobile", to: "/dashboard/help-center/technical-support" },
  { label: "Trust & Safety", to: "/dashboard/help-center/account-profile" },
];

export const findCategory = (slug: string) =>
  HELP_CATEGORIES.find((c) => c.slug === slug);
export const findArticle = (catSlug: string, articleSlug: string) =>
  findCategory(catSlug)?.articles.find((a) => a.slug === articleSlug);
