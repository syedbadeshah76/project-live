# Edvanz LMS Frontend — API Dependency Map

This document maps out the complete end-to-end relationship between **Routes**, **Pages/Layouts**, **Components/Contexts**, **Services**, and **Backend Endpoints** across all user roles in Edvanz LMS Frontend.

---

## 1. Authentication & Session Flow

```text
Route: /login or /register (Modal / Page)
 └── Page: Login.tsx / Register.tsx
      └── Service: auth.service.ts
           ├── POST /api/auth/login
           └── POST /api/auth/verify-otp
                └── Response: accessToken + refreshToken
                     └── Action: AuthContext.loginWithToken()
                          └── Service: auth.service.ts
                               └── GET /api/auth/me (Hydrate session & user.id)
```

---

## 2. Public / Marketing Module Flow (Role: Unauthenticated / Public)

```text
Route: /
 └── Layout: MainLayout.tsx
      ├── Component: Navbar.tsx (renders logo, public links, Login/Signup triggers)
      ├── Component: HeroSection.tsx
      ├── Component: DomainsSection.tsx
      └── Component: StatsSection.tsx

Route: /courses
 └── Layout: MainLayout.tsx
      └── Page: Courses.tsx
           └── Service: courses.service.ts
                └── GET /api/courses

Route: /courses/:id
 └── Layout: MainLayout.tsx
      └── Page: CourseDetail.tsx
           ├── Service: courses.service.ts
           │    ├── GET /api/courses/:id
           │    └── GET /api/courses/:id/curriculum
           ├── Service: liveCourses.service.ts (if live course)
           │    └── GET /api/live-courses/:id
           ├── Service: enrollment.service.ts
           │    └── GET /api/live-courses/:id/enrolled-count (for live courses)
           └── Service: reviews.service.ts
                └── GET /api/reviews/course/:id
```

---

## 3. Student Dashboard Module Flow (Role: Student)

```text
Route: /dashboard
 └── Layout: DashboardLayout.tsx
      ├── Component: DashboardSidebar.tsx
      ├── Component: NotificationsPanel.tsx (Role: Authenticated)
      │    └── Service: notifications.service.ts
      │         └── GET /api/notifications/count (Polled every 30s)
      └── Page: DashboardHome.tsx
           ├── Service: enrollment.service.ts
           │    └── GET /api/student/courses
           ├── Service: courses.service.ts
           │    └── GET /api/student/courses/:id/progress
           └── Service: meeting.service.ts
                └── GET /api/meetings/student

Route: /dashboard/my-courses
 └── Page: MyCourses.tsx
      └── Service: enrollment.service.ts
           └── GET /api/student/courses

Route: /course/:id/learn
 └── Page: CoursePlayer.tsx
      ├── Service: courses.service.ts
      │    ├── GET /api/student/courses/:id
      │    ├── GET /api/student/lessons/:id/session
      │    └── PUT /api/student/courses/:id/complete
      └── Service: notes.service.ts
           ├── GET /api/student/courses/:id/notes
           └── POST /api/student/courses/:id/notes

Route: /dashboard/cart & /checkout
 └── Context: CartContext.tsx
      └── Service: cart.service.ts
           ├── GET /api/cart (Guarded by isAuthenticated check)
           ├── POST /api/cart/items
           └── DELETE /api/cart/items/:id
```

---

## 4. Instructor Dashboard Module Flow (Role: Instructor)

```text
Route: /instructor
 └── Layout: InstructorLayout.tsx
      └── Page: InstructorDashboard.tsx
           ├── Service: instructor-dashboard.service.ts
           │    └── GET /api/instructor/dashboard
           ├── Service: instructor.service.ts
           │    └── GET /api/instructor/courses
           ├── Service: liveClassService.ts
           │    └── GET /api/live-classes/instructor
           └── Service: qna.service.ts
                └── GET /api/qna/instructor/pending

Route: /instructor/courses
 └── Page: InstructorCourses.tsx
      └── Service: instructor.service.ts
           └── GET /api/instructor/courses

Route: /instructor/qna
 └── Page: InstructorQnA.tsx
      ├── Service: instructor-dashboard.service.ts
      │    └── GET /api/instructor/dashboard
      ├── Service: liveCourses.service.ts
      │    └── GET /api/live-courses
      └── Service: qna.service.ts
           ├── GET /api/discussions
           ├── GET /api/discussions/:id/replies
           └── POST /api/discussions/:id/replies
```

---

## 5. Admin Dashboard Module Flow (Role: Admin)

```text
Route: /admin
 └── Layout: AdminLayout.tsx
      └── Page: AdminDashboard.tsx
           ├── Service: platform.service.ts
           │    └── GET /api/admin/dashboard
           ├── Service: admin-users.service.ts
           │    └── GET /api/admin/users
           └── Service: admin-analytics.service.ts
                └── GET /api/admin/analytics/summary
```
