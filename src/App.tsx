import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { GiftCheckoutProvider } from "@/contexts/GiftCheckoutContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublicOnlyRoute } from "@/components/auth/PublicOnlyRoute";
import Index from "./pages/Index";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import CoursePlayer from "./pages/CoursePlayer";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AuthRedirect from "./pages/AuthRedirect";
import BecomeInstructor from "./pages/BecomeInstructor";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import OrderConfirmation from "./pages/OrderConfirmation";
import SearchPage from "./pages/Search";
import Streak from "./pages/Streak";
// import Profile from "./pages/Profile.tsx";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import MyCourses from "./pages/dashboard/MyCourses";
import LearningAnalytics from "./pages/dashboard/LearningAnalytics";
import DashboardSettings from "./pages/dashboard/DashboardSettings";
import OrderHistory from "./pages/dashboard/OrderHistory";
import Ezai from "./pages/dashboard/Ezai";
import Certificates from "./pages/dashboard/Certificates";
import DashboardSearch from "./pages/dashboard/DashboardSearch";
import GiftCourse from "./pages/dashboard/GiftCourse";
import { InstructorLayout } from "./components/instructor/InstructorLayout";
import InstructorDashboard from "./pages/instructor/InstructorDashboard";
import InstructorCourses from "./pages/instructor/InstructorCourses";
import InstructorStudents from "./pages/instructor/InstructorStudents";
import InstructorAnalytics from "./pages/instructor/InstructorAnalytics";
import InstructorSettings from "./pages/instructor/InstructorSettings";
import InstructorRevenue from "./././components/instructor/revenue/InstructorRevenue";

import InstructorAnnouncements from "./pages/instructor/InstructorAnnouncements";

import CourseEditor from "./pages/instructor/CourseEditor";
import QuizEditor from "./pages/instructor/QuizEditor";
import InstructorQuizBuilder from "./pages/instructor/InstructorQuizBuilder";
import InstructorQuizAnalytics from "./pages/instructor/InstructorQuizAnalytics";
import InstructorQnA from "./pages/instructor/InstructorQnA";
import InstructorMeetings from "./pages/instructor/InstructorMeetings";
import InstructorUpload from "./pages/instructor/InstructorUpload";
import InstructorReferrals from "./pages/instructor/InstructorReferrals";
import InstructorPlaceholder from "./pages/instructor/InstructorPlaceholder";
import InstructorPendingApproval from "./pages/InstructorPendingApproval";
import { EZCopilotProvider } from "./contexts/EZCopilotContext";
import InstructorReviewAndRating from "./pages/instructor/InstructorReviewAndRating";
// import InstructorQuizAnalytics from "./pages/instructor/InstructorQuizAnalytics";
import StudentQuizPage from "./pages/StudentQuizPage";
import QuizListPage from "./pages/QuizListPage";
import QuizLeaderboard from "./pages/QuizLeaderboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminUpload from "./pages/admin/AdminUpload";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminRevenue from "./pages/admin/AdminRevenue";
import AdminReferralApproval from "./pages/admin/AdminReferralApproval";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminStudentMonitoring from "./pages/admin/AdminStudentMonitoring";
import AdminInviteStudents from "./pages/admin/AdminInviteStudents";

import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminSendNotification from "@/pages/admin/AdminSendNotification";

import AdminInstructorApprovals from "./pages/admin/AdminInstructorApprovals";
import AdminInstructorApprovalDetail from "./pages/admin/AdminInstructorApprovalDetail";
import AdminAIInsights from "./pages/admin/AdminAIInsights";
import AdminMeetings from "./pages/admin/AdminMeetings";
import AdminScheduleMeeting from "./pages/admin/AdminScheduleMeeting";
import AdminReviewApproval from "./pages/admin/AdminReviewApproval";
import AdminCourseDetail from "./pages/admin/AdminCourseDetail";
import AdminCourseForm from "./pages/admin/AdminCourseForm";
import AdminPlaceholder from "./pages/admin/AdminPlaceholder";
import ForgotPassword from "./pages/ForgotPassword";
import ProfileRouter from "./pages/profile/ProfileRouter";
import NotFound from "./pages/NotFound";
import RedeemGift from "./pages/dashboard/RedeemGift";
import RedeemCenter from "./pages/dashboard/RedeemCenter";

import ScheduleLiveClass from "./pages/instructor/ScheduleLiveClass";

import LiveClasses from "./pages/dashboard/LiveClasses";
import ReferFriend from "./pages/dashboard/ReferFriend";
import MeetingRoom from "./pages/MeetingRoom";
import { useMeetingReminders } from "./hooks/useMeetingReminders";
import { PracticeTestsListPage } from "./components/practice-tests/PracticeTestsListPage";
import { PracticeTestDetailsPage } from "./components/practice-tests/PracticeTestDetailsPage";
import { PracticeTestAttemptPage } from "./components/practice-tests/PracticeTestAttemptPage";
import { PracticeTestResultPage } from "./components/practice-tests/PracticeTestResultPage";
import HelpCenterHome from "./pages/help-center/HelpCenterHome";
import HelpCategoryPage from "./pages/help-center/HelpCategoryPage";
import HelpArticlePage from "./pages/help-center/HelpArticlePage";
import TermsAndConditions from "./pages/legal/TermsAndConditions";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import Badges from "./pages/dashboard/Badges";
import BadgeDetail from "./pages/dashboard/BadgeDetail";
import PublicBadgeVerify from "./pages/PublicBadgeVerify";
import { CartRouteGate } from "./pages/CartRouteGate";
import InstructorCourseFormPage from "./pages/instructor/InstructorCourseForm";
import InstructorResourceList from "./pages/instructor/InstructorResourceList";
import InstructorPracticeTestPage from "./pages/instructor/InstructorPracticeTestPage";
const queryClient = new QueryClient();

function RedirectPracticeTestsToDashboard() {
  return <Navigate to="/dashboard/practice-tests" replace />;
}

function RedirectPracticeTestDetailsToDashboard() {
  const { testId = "" } = useParams<{ testId: string }>();
  return <Navigate to={`/dashboard/practice-tests/${testId}`} replace />;
}

function RedirectPracticeTestResultToDashboard() {
  const { testId = "", attemptId = "" } = useParams<{
    testId: string;
    attemptId: string;
  }>();
  return (
    <Navigate
      to={`/dashboard/practice-tests/${testId}/result/${attemptId}`}
      replace
    />
  );
}

function MeetingReminderProvider({ children }: { children: ReactNode }) {
  useMeetingReminders();
  return <>{children}</>;
}

/**
 * Redirects /referral/learner/signup?code=REF... to /register?code=REF...
 * so the existing useReferralCode() hook captures the code from the URL.
 */
function ReferralSignupRedirect() {
  const [params] = useSearchParams();
  const code = params.get("code");
  return <Navigate to={code ? `/register?code=${code}` : "/register"} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WalletProvider>
        <CartProvider>
          <GiftCheckoutProvider>
            <WishlistProvider>
              <EZCopilotProvider>
                {" "}
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <MeetingReminderProvider>
                    <BrowserRouter>
                      <Routes>
                        <Route
                          path="/"
                          element={
                            <PublicOnlyRoute>
                              <Index />
                            </PublicOnlyRoute>
                          }
                        />
                        <Route
                          path="/badge/:token"
                          element={<PublicBadgeVerify />}
                        />
                        <Route
                          path="/badge/:token"
                          element={<PublicBadgeVerify />}
                        />
                        <Route path="/courses" element={<Courses />} />
                        <Route path="/courses/:id" element={<CourseDetail />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route
                          path="/login"
                          element={<AuthRedirect mode="login" />}
                        />
                        <Route
                          path="/register"
                          element={<AuthRedirect mode="signup" />}
                        />
                        {/* Referral signup redirect — preserves ?code=REF... */}
                        <Route
                          path="/referral/learner/signup"
                          element={<ReferralSignupRedirect />}
                        />
                        <Route
                          path="/become-instructor"
                          element={<BecomeInstructor />}
                        />
                        <Route
                          path="/forgot-password"
                          element={<ForgotPassword />}
                        />
                        <Route path="/cart" element={<CartRouteGate />} />
                        {/* <Route path="/wishlist" element={<Wishlist />} /> */}
                        <Route
                          path="/checkout"
                          element={<Navigate to="/dashboard/checkout" replace />}
                        />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                        <Route path="/terms" element={<TermsAndConditions />} />
                        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                        <Route
                          path="/streak"
                          element={
                            <ProtectedRoute allowedRoles={["student"]}>
                              <Navigate to="/dashboard/streaks" replace />
                            </ProtectedRoute>
                          }
                        />

                        
                        <Route
                          path="/meeting-room/:meetingId"
                          element={<MeetingRoom />}
                        />
                        <Route
                          path="/practice-tests"
                          element={<RedirectPracticeTestsToDashboard />}
                        />
                        <Route
                          path="/practice-tests/:testId"
                          element={<RedirectPracticeTestDetailsToDashboard />}
                        />
                        <Route
                          path="/practice-tests/:testId/attempt/:attemptId"
                          element={<PracticeTestAttemptPage />}
                        />
                        <Route
                          path="/practice-tests/:testId/result/:attemptId"
                          element={<RedirectPracticeTestResultToDashboard />}
                        />
                        <Route
                          path="/leaderboard"
                          element={
                            <ProtectedRoute allowedRoles={["student"]}>
                              <QuizLeaderboard />
                            </ProtectedRoute>
                          }
                        />

                        {/* Course Player */}
                        <Route
                          path="/learn/:courseId"
                          element={
                            <ProtectedRoute allowedRoles={["student"]}>
                              <CoursePlayer />
                            </ProtectedRoute>
                          }
                        />

                        {/* Student Dashboard */}
                        <Route
                          path="/dashboard"
                          element={
                            <ProtectedRoute allowedRoles={["student"]}>
                              <DashboardLayout />
                            </ProtectedRoute>
                          }
                        >
                          <Route index element={<DashboardHome />} />

                          <Route path="courses" element={<MyCourses />} />
                          <Route
                            path="learn/:courseId"
                            element={<CoursePlayer />}
                          />
                          {/* <Route path="/badge/:token" element={<PublicBadgeVerify />} /> */}
                          <Route path="wishlist" element={<Wishlist />} />
                          <Route path="cart" element={<Cart embedded />} />
                          <Route path="checkout" element={<Checkout />} />
                          <Route path="search" element={<DashboardSearch />} />
                          <Route path="gift-course" element={<GiftCourse />} />
                          <Route path="gift-course/:courseId" element={<GiftCourse />} />
                          <Route path="gift/:courseId" element={<GiftCourse />} />
                          <Route path="redeem-gift" element={<RedeemGift />} />
                          <Route path="redeem-gift/:giftId" element={<RedeemGift />} />
                          <Route path="redeem-center" element={<RedeemCenter />} />
                          <Route path="payment-success/:paymentId" element={<PaymentSuccess embedded />} />
                          <Route path="help-center" element={<HelpCenterHome />} />
                          <Route
                            path="help-center/:categorySlug"
                            element={<HelpCategoryPage />}
                          />
                          <Route
                            path="help-center/:categorySlug/:articleSlug"
                            element={<HelpArticlePage />}
                          />

                          <Route
                            path="privacy-policy"
                            element={<PrivacyPolicy />}
                          />
                          <Route
                            path="terms-and-conditions"
                            element={<TermsAndConditions />}
                          />

<Route
                          path="payment-success/:paymentId"
                          element={<PaymentSuccess />}
                        />
                        <Route path="payment-failed" element={<PaymentFailed />} />
                        <Route
                          path="order-confirmation/:orderId"
                          element={<OrderConfirmation />}
                        />


                          <Route
                            path="help-center/:categorySlug"
                            element={<HelpCategoryPage />}
                          />
                          <Route
                            path="help-center/:categorySlug/:articleSlug"
                            element={<HelpArticlePage />}
                          />

                          <Route
                            path="privacy-policy"
                            element={<PrivacyPolicy />}
                          />
                          <Route path="refer" element={<ReferFriend />} />
                          <Route path="live-classes" element={<LiveClasses />} />
                          <Route path="analytics" element={<LearningAnalytics />} />
                          <Route path="ezai" element={<Ezai />} />
                          <Route path="certificates" element={<Certificates />} />
                          <Route path="orders" element={<OrderHistory />} />
                          <Route path="badges" element={<Badges />} />
                          <Route path="badges/:id" element={<BadgeDetail />} />
                          {/* <Route path="/badge/:token" element={<PublicBadgeVerify />} /> */}
                          <Route path="settings" element={<DashboardSettings />} />
                          <Route path="streaks" element={<Streak />} />
                          <Route path="profile" element={<ProfileRouter />} />
                          <Route path="profile/edit" element={<ProfileRouter />} />
                          <Route
                            path="skill-passport"
                            element={<ProfileRouter />}
                          />
                          <Route
                            path="practice-tests"
                            element={<PracticeTestsListPage />}
                          />
                          <Route
                            path="practice-tests/:testId"
                            element={<PracticeTestDetailsPage />}
                          />
                          <Route
                            path="practice-tests/:testId/attempt/:attemptId"
                            element={<PracticeTestAttemptPage />}
                          />
                          <Route
                            path="practice-tests/:testId/result/:attemptId"
                            element={<PracticeTestResultPage />}
                          />
                        </Route>
                        {/* Instructor */}
                        <Route
                          path="/instructor"
                          element={
                            <ProtectedRoute allowedRoles={["instructor"]}>
                              <InstructorLayout />
                            </ProtectedRoute>
                          }
                        >
                          <Route
                            index
                            element={<Navigate to="dashboard" replace />}
                          />
                          <Route
                            path="dashboard"
                            element={<InstructorDashboard />}
                          />
                          <Route path="courses" element={<InstructorCourses />} />
                          <Route
                            path="courses/new"
                            element={<InstructorCourseFormPage mode="create" />}
                          />
                          <Route
                            path="courses/:id/edit"
                            element={<InstructorCourseFormPage mode="edit" />}
                          />
                          <Route path="courses/:id" element={<AdminCourseDetail />} />
                          <Route path="meetings" element={<InstructorMeetings />} />
                          <Route
                            path="quizzes"
                            element={<InstructorQuizBuilder />}
                          />
                          <Route
                            path="quiz-analytics"
                            element={<InstructorQuizAnalytics />}
                          />
                          <Route path="quiz/new" element={<QuizEditor />} />
                          <Route path="quiz/:id" element={<QuizEditor />} />
                          <Route path="students" element={<InstructorStudents />} />
                          <Route
                            path="/instructor/reviews"
                            element={<InstructorReviewAndRating />}
                          />
                          <Route
                            path="analytics"
                            element={<InstructorAnalytics />}
                          />
                          <Route path="upload" element={<InstructorUpload />} />
                          <Route path="settings" element={<InstructorSettings />} />
                          <Route
                            path="referrals"
                            element={<InstructorReferrals />}
                          />
                          <Route path="qna" element={<InstructorQnA />} />
                          <Route path="revenue" element={<InstructorRevenue />} />
                          <Route path="practice-tests" element={<InstructorPracticeTestPage />} />

                          {/* <Route
                        path="/instructor"
                        element={
                          <ProtectedRoute allowedRoles={["instructor"]}>
                            <InstructorLayout />
                          </ProtectedRoute>
                        }
                      > */}
                          <Route
                            index
                            element={<Navigate to="dashboard" replace />}
                          />

                          <Route
                            path="dashboard"
                            element={<InstructorDashboard />}
                          />

                          <Route path="courses" element={<InstructorCourses />} />

                          <Route
                            path="courses/new"
                            element={<AdminCourseForm mode="create" />}
                          />

                          <Route
                            path="courses/:id/edit"
                            element={<AdminCourseForm mode="edit" />}
                          />

                          <Route path="courses/:id" element={<AdminCourseDetail />} />

                          <Route path="meetings" element={<InstructorMeetings />} />

                          <Route
                            path="meetings/schedule"
                            element={<ScheduleLiveClass />}
                          />

                          <Route
                            path="quizzes"
                            element={<InstructorQuizBuilder />}
                          />

                          <Route
                            path="quiz-analytics"
                            element={<InstructorQuizAnalytics />}
                          />

                          <Route path="quiz/new" element={<QuizEditor />} />

                          <Route path="quiz/:id" element={<QuizEditor />} />

                          <Route path="students" element={<InstructorStudents />} />

                          <Route
                            path="announcements"
                            element={<InstructorAnnouncements />}
                          />

                          <Route
                            path="analytics"
                            element={<InstructorAnalytics />}
                          />

                          <Route path="upload" element={<InstructorUpload />} />

                          <Route path="settings" element={<InstructorSettings />} />

                          <Route
                            path="referrals"
                            element={<InstructorReferrals />}
                          />

                          <Route path="qna" element={<InstructorQnA />} />

                          <Route path="revenue" element={<InstructorRevenue />} />

                          <Route
                            path="announcements"
                            element={
                              <InstructorPlaceholder
                                title="Announcements"
                                description="Broadcast announcements to your enrolled students."
                              />
                            }
                          />

                          <Route
                            path="revenue"
                            element={
                              <InstructorPlaceholder
                                title="Revenue"
                                description="Track earnings and payouts."
                              />
                            }
                          />

                          <Route
                            path="reviews"
                            element={
                              <InstructorPlaceholder
                                title="Reviews & Ratings"
                                description="See feedback from your students."
                              />
                            }
                          />

                          <Route
                            path="*"
                            element={<Navigate to="dashboard" replace />}
                          />
                        </Route>

                        {/* Instructor pending approval landing (referred users) */}

                        <Route
                          path="/instructor-pending"
                          element={<InstructorPendingApproval />}
                        />

                        {/* Admin */}
                        <Route
                          path="/admin"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminDashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/analytics"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminAnalytics />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/users"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminUsers />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/courses"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminCourses />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/courses/new"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminCourseForm mode="create" />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/courses/:id"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminCourseDetail />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/courses/:id/edit"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminCourseForm mode="edit" />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/reviews"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminReviewApproval />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/meetings/new"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminScheduleMeeting />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/referrals"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminPlaceholder
                                title="Referrals Approvals"
                                description="Approve and manage referral submissions."
                              />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/categories"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminCategories />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/upload"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminUpload />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/settings"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminSettings />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/revenue"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminRevenue />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/coupons"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminCoupons />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/students"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminStudentMonitoring />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/students"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminStudentMonitoring />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/students/invite"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminInviteStudents />
                            </ProtectedRoute>
                          }
                        />
                        {/* Admin */}
                        <Route
                          path="/admin"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminDashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/analytics"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminAnalytics />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/users"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminUsers />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/courses"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminCourses />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/courses/new"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminCourseForm mode="create" />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/courses/:id"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminCourseDetail />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/courses/:id/edit"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminCourseForm mode="edit" />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/reviews"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminReviewApproval />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/meetings/new"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminScheduleMeeting />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/referrals"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminPlaceholder
                                title="Referrals Approvals"
                                description="Approve and manage referral submissions."
                              />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/categories"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminCategories />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/upload"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminUpload />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/settings"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminSettings />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/revenue"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminRevenue />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/coupons"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminCoupons />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/students"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminStudentMonitoring />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/students"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminStudentMonitoring />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/students/invite"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminInviteStudents />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/admin/notifications"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminNotifications />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/notifications"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminNotifications />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/admin/notifications/send"
                          element={<AdminSendNotification />}
                        />
                        <Route
                          path="/admin/notifications/send"
                          element={<AdminSendNotification />}
                        />

                        <Route
                          path="/admin/instructor-approvals"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminInstructorApprovals />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/instructor-approvals/:id"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminInstructorApprovalDetail />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/ai-insights"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminAIInsights />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/meetings"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminMeetings />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/instructor-approvals"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminInstructorApprovals />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/instructor-approvals/:id"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminInstructorApprovalDetail />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/ai-insights"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminAIInsights />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/meetings"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminMeetings />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/admin/notifications/send"
                          element={<AdminSendNotification />}
                        />

                        <Route
                          path="/admin/instructor-approvals"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminInstructorApprovals />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/instructor-approvals/:id"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminInstructorApprovalDetail />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/ai-insights"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminAIInsights />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/meetings"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminMeetings />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/referrals"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminReferralApproval />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/profile"
                          element={
                            <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                              <ProfileRouter />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/profile"
                          element={
                            <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                              <ProfileRouter />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/profile"
                          element={
                            <ProtectedRoute allowedRoles={["admin", "instructor"]}>
                              <ProfileRouter />
                            </ProtectedRoute>
                          }
                        />
                      </Routes>
                    </BrowserRouter>
                  </MeetingReminderProvider>
                </TooltipProvider>
              </EZCopilotProvider>
            </WishlistProvider>
          </GiftCheckoutProvider>
        </CartProvider>
      </WalletProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
