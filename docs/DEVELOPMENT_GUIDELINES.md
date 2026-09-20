# Edvanz LMS Frontend — Development Guidelines & Architectural Rules

This document establishes mandatory development rules, coding conventions, and architectural standards for all developers working on the **Edvanz LMS Frontend**.

---

## 1. Core API Integration Rules

1. **Single API Client**: Always use `apiClient` from `@/lib/api-client`. Never instantiate a secondary Axios client, call raw `fetch()` directly, or hardcode API base URLs.
2. **Authentication Guards**: Always check user authentication status before triggering authenticated API calls in Context Providers or shared components.
3. **Role-Based API Scoping**:
   - **Student APIs**: Call only within Student Dashboard pages (`/dashboard/*`) or Student Course Player (`/course/:id/learn`).
   - **Instructor APIs**: Call only within Instructor Layout/Pages (`/instructor/*`). Never trigger instructor APIs from student or public screens.
   - **Admin APIs**: Call only within Admin Layout/Pages (`/admin/*`).
   - **Public APIs**: Call only public endpoints (e.g. course catalog, domain list, login/register) on unauthenticated routes (`/`, `/courses`, `/about`, `/contact`).
4. **Shared Components Safety**:
   - Shared components like `Navbar`, `Footer`, `ProfileDropdownMenu`, and `Sidebar` must remain presentationally decoupled from feature-specific APIs.
   - Global widgets (e.g., `NotificationsPanel`) must check `isAuthenticated` before triggering polling intervals or count requests.
5. **No Duplicate API Requests**:
   - Reuse existing services and contexts instead of firing duplicate GET requests for the same dataset during a single page lifecycle.
6. **No Non-Existent Endpoint Fallbacks**:
   - Do not add random retry endpoints for missing backend APIs. If an API contract changes, update the service definition directly.

---

## 2. Component & Layout Rules

1. **Shared Layout Boundaries**:
   - `MainLayout`: Used for public marketing pages (`/`, `/about`, `/contact`, `/courses`).
   - `DashboardLayout`: Used for authenticated Student Dashboard pages.
   - `InstructorLayout`: Used for authenticated Instructor pages.
   - `AdminLayout`: Used for authenticated Admin pages.
2. **Design System & Tailwind**:
   - Use existing Tailwind tokens, CSS variables, and Shadcn UI primitives in `src/components/ui/`.
   - Maintain dark/light mode compatibility and glassmorphism styling standards.
3. **Protected Payment System**:
   - Treat the existing Razorpay payment integration (`src/services/razorpay.service.ts` and `@/lib/razorpay.ts`) as a protected core system. Do not alter payment verification logic without explicit authorization.

---

## 3. Workflow for Implementing Future Changes

Whenever adding or modifying a feature in Edvanz:

1. **Locate Existing Service**: Check `src/services/` to see if a service function already exists for the backend endpoint before creating new methods.
2. **Check Role & Route**: Verify which role owns the feature and ensure the API call is triggered within the corresponding page lifecycle.
3. **Update Documentation**: If an API endpoint or service structure is modified, update `docs/API_USAGE_AUDIT.md` and `docs/API_DEPENDENCY_MAP.md`.
4. **Run Verification**: Run `npm run build` locally to verify TypeScript compilation and build integrity before submitting changes.
