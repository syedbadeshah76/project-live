# Edvanz LMS — Frontend Platform

**Edvanz** is a modern, enterprise-grade Learning Management System (LMS) frontend application built with React, TypeScript, Tailwind CSS, Vite, and Axios. The platform provides comprehensive learning and teaching experiences across recorded courses, live classes, practice tests, AI-assisted learning (EZ Copilot), gamified rewards (EZ Coins wallet), and full administrative controls.

---

## 🏗 Technology Stack

- **Core**: React 18, TypeScript, Vite
- **Routing**: React Router v6 (`react-router-dom`)
- **Styling**: Vanilla CSS, Tailwind CSS, Framer Motion (animations), Lucide React (iconography)
- **UI Components**: Radix UI Primitives, Custom Shadcn-inspired UI components
- **HTTP & API**: Axios (Centralized `apiClient` with request/response interceptors)
- **Payment Integration**: Protected Razorpay Payment Gateway integration (`src/services/razorpay.service.ts`)
- **Data Visualization**: Recharts (Analytics and performance metrics)

---

## 📁 Architecture & Folder Structure

```text
src/
├── assets/         # Static media, logos, illustrations
├── components/     # Modular React components organized by feature domain
│   ├── admin/      # Admin dashboard widgets & controls
│   ├── auth/       # Authentication dialogs, OTP forms, ProtectedRoute
│   ├── courses/    # Course cards, catalog filters, domain selectors
│   ├── dashboard/  # Student dashboard layouts & components
│   ├── instructor/ # Instructor layouts, analytics charts, course editors
│   ├── layout/     # Global Navbar, Footer, ProfileDropdownMenu
│   ├── notifications/# Notifications panel & polling drawer
│   └── ui/         # Base UI primitives (Button, Dialog, Select, etc.)
├── constants/      # App-wide static constants & default configs
├── contexts/       # React Context Providers for global state
│   ├── AuthContext.tsx         # JWT token management & session state
│   ├── CartContext.tsx         # E-commerce cart & coupon state
│   ├── EZCopilotContext.tsx    # Isolated AI chat state per session
│   ├── GiftCheckoutContext.tsx # Course gifting checkout state
│   ├── WalletContext.tsx       # EZ Coins balance & redemption quote state
│   └── WishlistContext.tsx     # Student wishlist persistence & state
├── hooks/          # Reusable custom React hooks
├── lib/            # Core singletons (`api-client.ts`, `razorpay.ts`, `utils.ts`)
├── pages/          # Route containers (Student, Instructor, Admin, Public)
├── services/       # 50+ Backend REST API integration services
├── types/          # Shared TypeScript interfaces & DTO schemas
└── validations/    # Zod schema definitions for form inputs
```

---

## 🔒 Authentication & Role Architecture

The platform uses JWT-based Bearer token authentication with automated 401 refresh handling.

### Supported Roles & Boundaries:
1. **Public / Visitor**: Browse marketing pages (`/`), domain listings, public course catalog (`/courses`), course detail pages (`/courses/:id`). Cannot access dashboard or trigger protected APIs.
2. **Student**: Full access to Student Dashboard (`/dashboard/*`), Course Player (`/course/:id/learn`), practice tests, EZ Coins wallet, live classes, wishlist, and cart.
3. **Instructor**: Isolated access to Instructor Portal (`/instructor/*`), course editor, quiz builder, live class scheduler, and revenue analytics.
4. **Admin**: Isolated access to Admin Panel (`/admin/*`), user management, instructor approvals, platform analytics, and system configurations.

---

## 🌐 API & Service Architecture

All API calls are routed through the centralized Axios client defined in `src/lib/api-client.ts`.

- **Base API URL**: Resolved via `import.meta.env.VITE_API_BASE_URL` (defaults to `/api` proxy in dev).
- **Request Interceptor**: Attaches `Authorization: Bearer <accessToken>` automatically if stored in `localStorage`.
- **Response Interceptor**: Intercepts 401 unauthorized errors and handles token refresh gracefully.
- **Service Layer**: Located in `src/services/`. Every service file encapsulates endpoint endpoints for a specific feature domain (e.g. `courses.service.ts`, `instructor.service.ts`, `enrollment.service.ts`).

---

## 🚀 Running Locally

### Prerequisites
- Node.js >= 18.x
- npm >= 9.x

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
VITE_API_BASE_URL=https://api-dev.edvanz.co/api
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## 📖 Comprehensive Documentation

Additional architectural documents are available in the [`docs/`](./docs/) directory:

- [📷 **API Usage Audit**](./docs/API_USAGE_AUDIT.md): Complete matrix of all REST endpoints, callers, routes, roles, and cleaned-up endpoints.
- [📂 **Project Structure Guide**](./docs/PROJECT_STRUCTURE.md): Detailed breakdown of directory responsibilities and placement guidelines.
- [📜 **Development Guidelines**](./docs/DEVELOPMENT_GUIDELINES.md): Mandatory rules for adding APIs, components, and role boundaries.
- [🗺 **API Dependency Map**](./docs/API_DEPENDENCY_MAP.md): End-to-end visual mapping of Routes → Pages → Services → Endpoints.

---

## ⚠️ Important Developer Rules

1. **Do NOT create duplicate API clients**: Always import `apiClient` from `@/lib/api-client`.
2. **Do NOT trigger unauthenticated API calls on public pages**: Ensure context providers check authentication status before executing backend requests.
3. **Respect Role Boundaries**: Do not invoke instructor or admin services on student or public routes.
4. **Protected Core System**: The Razorpay payment flow (`src/services/razorpay.service.ts` and `@/lib/razorpay.ts`) is protected. Do not alter payment verification logic without explicit approval.
