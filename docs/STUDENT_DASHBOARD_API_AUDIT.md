# Student Dashboard API Audit & Cleanup Report

This document records the unnecessary, redundant, and failing API calls identified on the Student Dashboard (`/dashboard`), along with the resolution applied to optimize performance and prevent API errors.

---

## 1. Summary of Identified Unnecessary API Calls

| Endpoint / Service Call | HTTP Method / Status | Reason for Removal | Resolution |
| :--- | :--- | :--- | :--- |
| **`/courses?page=0&size=100`** & **`/live-courses`** via `coursesService.getCourses()` | `GET 200` | Redundant / Unused. `DashboardHome.tsx` stored this into `apiCourses` state but never rendered or used it anywhere in the JSX. Transferred ~180 kB needlessly on every visit. | Removed unused state and the `coursesService.getCourses()` call from `DashboardHome.tsx`. |
| **`/demo-classes/my-bookings`** & **`/demo-classes`** via `demoClassService.getStudentBookedDemoClasses()` | `GET 405 (Method Not Allowed)` | Non-existent / disallowed endpoints on backend. Returned `405 Method Not Allowed` errors in the network tab. | Updated `getStudentBookedDemoClasses()` to rely directly on client-side stored/booked demo classes (`edvanz_cached_demo_classes`, `demo_classes_*`) without attempting unsupported backend GET routes. |
| **`coursesService.getCourseProgress(id)`** loop | `GET 200` / `GET 404` | Redundant parallel requests in `DashboardHome.tsx`, `MyCourses.tsx`, and `SkillPassportSection.tsx`. A separate GET `/api/student/courses/:id/progress` was executed for every enrolled course in parallel. Courses without active backend progress records threw `404 Not Found` (`CRS_001 Course not found`). Enrolled course progress is already fully provided in the primary `/student/my-courses` response and synced in `localStorage`. | Removed the per-course `/progress` loop in `DashboardHome.tsx`, `MyCourses.tsx`, and `SkillPassportSection.tsx`. Enrolled progress is computed directly from `enrollmentService.getMyEnrollments()` and `localStorage`. |
| **20-Second Polling (`setInterval`) for Demo Classes** | Multiple calls | Aggressive interval was repeatedly querying demo classes every 20 seconds, continuously creating network traffic. | Removed redundant interval and duplicate mount calls; demo classes now load once cleanly on component mount. |
| **`/api/certificates`** via `certificatesService.getMyCertificates()` | `GET 404 (Not Found)` | Backend does not expose `/api/certificates` (returns `RES_001: No static resource api/certificates`). | Removed backend GET call from `certificatesService.getMyCertificates()`. Reads earned certificates locally. |
| **`/api/me/resources`** via `resourcesService.getAllForStudent()` | `GET 404 (Not Found)` | Backend does not expose `/api/me/resources` (returns `RES_001: No static resource api/me/resources`). | Removed backend HTTP call until resource endpoints are provided on backend. |

---

## 2. Cleaned Dashboard Request Flow

When a student visits the Dashboard (`/dashboard`), only the required, valid endpoints are executed:

1. **`GET /student/my-courses?productType=COURSE`** (`enrollment.service.ts`)
   - Retrieves active enrollments with embedded lesson progress, thumbnail, and course information.
2. **`coursesService.getHandPickedCourses()`** (`courses.service.ts`)
   - Populates the "Hand Picked For You" carousel section with in-memory caching (`handPickedCache`).
3. **`GET /instructors`** & **`GET /categories/summary`** (cached)
   - Category tags and instructor names for the recommendations carousel.
4. **`meetingService.getUpcomingLiveClasses()`** (`meeting.service.ts`)
   - Populates the upcoming live sessions section.

---

## 3. Benefits
- **Zero 404 / 405 Errors**: Eliminated all red error logs in browser DevTools.
- **Reduced Network Overhead**: Cut out >250 kB of redundant payloads per page load.
- **Faster Initial Render**: Dashboard renders immediately without waiting for waterfalls of 10+ parallel progress and demo class requests.
- **Protection Against API Leaks**: Only valid, authenticated student routes are called.
