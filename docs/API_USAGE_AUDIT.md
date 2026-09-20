# Edvanz LMS Frontend — API Usage Audit & Inventory

This document provides a comprehensive audit of all API endpoints and service functions used throughout the **Edvanz LMS Frontend** application. Every API call has been inspected, categorized, and audited for role/route boundary compliance, necessity, and backend endpoint availability.

---

## 1. Audit Summary

- **Total Services Inspected**: 52 service files in `src/services/`
- **Total Endpoints Audited**: 120+ REST endpoints
- **Role Isolation**: Strictly enforced (Student, Instructor, Admin, Public)
- **Shared Component Safety**: Cleaned up unauthenticated API triggers in top-level context providers (`CartContext`) and shared layout components.

---

## 2. API Inventory & Audit Matrix

| API Service | Method | Endpoint | Caller / Component | Route Boundary | User Role | Business Purpose | Status | Notes / Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `auth.service.ts` | POST | `/auth/login` | `Login.tsx` | `/login` | Public | User authentication & credentials verification | **KEEP** | Essential auth entry |
| `auth.service.ts` | POST | `/auth/verify-otp` | `Login.tsx` | `/login` | Public | OTP verification & JWT issuance | **KEEP** | Core token-based auth |
| `auth.service.ts` | GET | `/auth/me` | `AuthContext.tsx` | Global (Authenticated) | All Roles | Current user session & profile hydration | **KEEP** | Session validation on mount |
| `cart.service.ts` | GET | `/cart` | `CartContext.tsx` | Authenticated pages | Student / Auth | Fetch user shopping cart | **CONDITIONALLY CALL** | Added guard to prevent unauthenticated guest 401 calls |
| `cart.service.ts` | POST | `/cart/items` | `CartContext.tsx` | `/courses`, `/courses/:id`, `/cart` | Student / Auth | Add item to cart | **KEEP** | Core e-commerce flow |
| `cart.service.ts` | DELETE | `/cart/items/:id` | `CartContext.tsx` | `/cart` | Student / Auth | Remove item from cart | **KEEP** | Core e-commerce flow |
| `courses.service.ts` | GET | `/courses` | `Courses.tsx`, `DashboardSearch.tsx` | `/courses`, `/dashboard/*` | All Roles | Course catalog discovery | **KEEP** | Public/Student course listing |
| `courses.service.ts` | GET | `/courses/:id` | `CourseDetail.tsx` | `/courses/:id` | All Roles | Full course details & module metadata | **KEEP** | Public/Student course view |
| `courses.service.ts` | PUT/POST | `/student/courses/:id/complete` | `CoursePlayer.tsx` | `/course/:id/learn` | Student | Mark course as complete | **KEEP** | Course completion endpoint |
| `courses.service.ts` | PUT/POST | `/student/courses/:id/finish` | `courses.service.ts` | `/course/:id/learn` | Student | Course completion fallback | **REMOVE** | Endpoint not available in backend; removed fallback to eliminate 404 logs |
| `courses.service.ts` | POST | `/student/courses/:id/mark-complete` | `courses.service.ts` | `/course/:id/learn` | Student | Course completion fallback | **REMOVE** | Endpoint not available in backend; removed fallback to eliminate 404 logs |
| `liveCourses.service.ts` | GET | `/live-courses` | `LiveClasses.tsx`, `Courses.tsx` | `/dashboard/live-classes` | Student / All | Fetch live course catalog | **KEEP** | Live classes discovery |
| `liveCourses.service.ts` | GET | `/live-courses/:id/enrolled-count` | `enrollment.service.ts`, `CourseDetail.tsx` | `/courses/:id` | All Roles | Fetch live course enrollment count | **KEEP / UPDATED** | Fixed endpoint alignment for live courses |
| `enrollment.service.ts` | GET | `/student/courses` | `MyCourses.tsx`, `DashboardHome.tsx` | `/dashboard` | Student | Fetch student enrolled courses & progress | **KEEP** | Primary student enrollment list |
| `enrollment.service.ts` | GET/POST | `/access/courses` | `enrollment.service.ts` | `/dashboard` | Student | Legacy access check fallback | **REMOVE** | Endpoint not available in backend; replaced with `/student/courses` |
| `quiz.service.ts` | GET | `/quizzes` | `QuizListPage.tsx`, `StudentQuizPage.tsx` | `/dashboard/quizzes` | Student | Fetch available quizzes | **KEEP** | Primary quiz listing |
| `quiz.service.ts` | GET | `/quizzes/course/:id` | `quiz.service.ts` | `/courses/:id` | Student | Fetch quiz by course ID | **REMOVE** | Endpoint not available in backend; updated to query `/quizzes?courseId=` |
| `notifications.service.ts` | GET | `/notifications/count` | `NotificationsPanel.tsx` | Authenticated Layouts | All Auth Roles | Unread notification badge count | **KEEP** | Scoped strictly to authenticated users |
| `instructor-dashboard.service.ts` | GET | `/instructor/dashboard` | `InstructorDashboard.tsx` | `/instructor` | Instructor | Instructor performance metrics & charts | **KEEP** | Isolated to Instructor layout |
| `admin.service.ts` / `platform.service.ts` | GET | `/admin/dashboard` | `AdminDashboard.tsx` | `/admin` | Admin | Platform administration metrics | **KEEP** | Isolated to Admin layout |
| `announcements.service.ts` | GET | `/instructor/eligible-courses` | `InstructorAnnouncements.tsx` | `/instructor/announcements` | Instructor | Fetch eligible courses for announcements | **REMOVE** | Endpoint not available in backend (404); replaced fallback with `instructorService.getCourses()` (`/instructor/courses`) |
| `instructor-dashboard.service.ts` / `qna.service.ts` | GET | `/instructor/dashboard`, `/discussions` | `InstructorQnA.tsx` | `/instructor/qna` | Instructor | Fetch instructor Q&A questions & discussions | **KEEP / UPDATED** | Updated `InstructorQnA.tsx` to retrieve `pendingQuestions` directly from `instructorDashboardService.getDashboard()` merged with course discussions from `qnaService` so all dashboard Q&A questions appear on the Q&A page |
| `instructor-settings.service.ts` | GET/PUT | `/instructor/preferences` | `InstructorSettings.tsx` | `/instructor/settings` | Instructor | Obsolete instructor preferences endpoints | **REMOVE** | Endpoint not available in backend (404); updated to query and save directly via valid `/users/preferences` endpoint |
| `wallet.service.ts` | GET | `/wallet/balance` | `WalletContext.tsx` | Authenticated pages | Student / Auth | Fetch user EZ Coins wallet balance | **KEEP** | Scoped strictly to authenticated users |
| `wishlist.service.ts` | GET | `/wishlist` | `WishlistContext.tsx` | Authenticated pages | Student | Fetch student wishlist items | **KEEP** | Scoped strictly to student role |

---

## 3. Detailed Audit Findings & Resolved Issues

### Issue 1: Live Course Enrolled Count Alignment
- **Previous Endpoint**: `/api/courses/${courseId}/enrolled-count` was attempted for live courses.
- **Root Cause**: Generic course enrollment helper did not differentiate live course endpoints.
- **Resolution**: Updated `enrollment.service.ts` to query `/api/live-courses/${courseId}/enrolled-count` for live courses.

### Issue 2: Non-Existent Completion Fallbacks (`/finish`, `/mark-complete`)
- **Previous Endpoints**: `/api/student/courses/${courseId}/finish` and `/api/student/courses/${courseId}/mark-complete`.
- **Root Cause**: Retried legacy endpoints on course completion, producing 404 errors in backend logs.
- **Resolution**: Cleaned up `markCourseComplete()` in `courses.service.ts` to rely on standard `/student/courses/${courseId}/complete`.

### Issue 3: Non-Existent Quiz Endpoint (`/quizzes/course/:id`)
- **Previous Endpoint**: `GET /api/quizzes/course/${courseId}`.
- **Root Cause**: Hardcoded non-existent sub-resource URL.
- **Resolution**: Updated `getCourseQuiz()` in `quiz.service.ts` to query `GET /api/quizzes` with course filter.

### Issue 4: Non-Existent Access Endpoint (`/api/access/courses`)
- **Previous Endpoint**: `GET/POST /api/access/courses`.
- **Root Cause**: Legacy access fallback endpoint used in enrollment service.
- **Resolution**: Replaced with standard `/api/student/courses` in `enrollment.service.ts`.

### Issue 5: Unauthenticated Cart Requests on App Initialization
- **Previous Behavior**: `CartContext.tsx` ran `cartService.getCart()` on mount for all visitors.
- **Root Cause**: Lack of authentication token check in `refresh()`.
- **Resolution**: Added auth guard check in `CartContext.tsx` so unauthenticated visitors do not trigger 401 calls to `/api/cart`.
