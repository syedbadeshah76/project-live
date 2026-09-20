# Edvanz LMS Frontend — Complete Project Structure Documentation

This document defines the architectural structure, responsibilities, and guidelines for every major folder and file in the **Edvanz LMS Frontend** codebase.

---

## 1. Top-Level Folder Structure

```text
edvanz_frontend/
├── docs/                          # Architectural and API documentation
│   ├── API_USAGE_AUDIT.md
│   ├── PROJECT_STRUCTURE.md
│   ├── DEVELOPMENT_GUIDELINES.md
│   └── API_DEPENDENCY_MAP.md
├── public/                        # Static assets, favicon, manifest
├── src/
│   ├── assets/                    # Static images, logos, media files
│   ├── components/                # Modular React UI components
│   │   ├── admin/                 # Admin module components
│   │   ├── announcements/         # Announcement components
│   │   ├── auth/                  # Login, OTP, ProtectedRoute components
│   │   ├── badges/                # Student badges components
│   │   ├── course-player/         # Video player, curriculum navigation
│   │   ├── courses/               # Public and student course cards & filters
│   │   ├── dashboard/             # Student dashboard layouts & components
│   │   ├── ez-copilot/            # AI assistant drawer & components
│   │   ├── gift/                  # Course gifting modals & flows
│   │   ├── home/                  # Public landing page sections
│   │   ├── instructor/            # Instructor module layout, charts & forms
│   │   ├── layout/                # Global Navbar, Footer, ProfileDropdown
│   │   ├── meetings/              # Live class meeting components
│   │   ├── notifications/         # Notification drawer & badge
│   │   ├── practice-tests/        # Quiz & practice test UI
│   │   ├── profile/               # Profile settings & avatar forms
│   │   ├── quiz/                  # Quiz player & leaderboard
│   │   ├── reminders/             # Meeting reminder UI
│   │   ├── ui/                    # Base Shadcn/Radix UI components
│   │   ├── video/                 # Video player components
│   │   └── wallet/                # EZ Coins wallet UI
│   ├── constants/                 # Shared system constants & defaults
│   ├── contexts/                  # React Context Providers for global state
│   │   ├── AuthContext.tsx        # Authentication state, login/logout, tokens
│   │   ├── CartContext.tsx        # Shopping cart state & coupon handling
│   │   ├── EZCopilotContext.tsx   # AI Copilot chat state & isolation
│   │   ├── GiftCheckoutContext.tsx# Gifting workflow state
│   │   ├── WalletContext.tsx      # EZ Coins balance & redemption state
│   │   └── WishlistContext.tsx    # Student wishlist state
│   ├── data/                      # Local fallback & mock datasets
│   ├── hooks/                     # Custom React hooks
│   │   ├── use-toast.ts           # Toast notifications hook
│   │   ├── useLogoutFlow.ts       # Centralized logout confirmation hook
│   │   ├── useMeetingReminders.ts # Live meeting notification hook
│   │   └── useReferralCode.ts     # Referral code URL capture hook
│   ├── lib/                       # Utility libraries & core API client
│   │   ├── api-client.ts          # Central Axios client with interceptors
│   │   ├── api-error.ts           # Error normalization utility
│   │   ├── razorpay.ts            # Razorpay SDK initialization wrapper
│   │   └── utils.ts               # Classname merge (clsx + tailwind-merge)
│   ├── pages/                     # Application routes / page containers
│   │   ├── admin/                 # Admin module pages (/admin/*)
│   │   ├── dashboard/             # Student dashboard pages (/dashboard/*)
│   │   ├── help-center/           # Support & help center pages
│   │   ├── instructor/            # Instructor module pages (/instructor/*)
│   │   ├── legal/                 # Terms & privacy policy pages
│   │   ├── profile/               # Profile routing pages
│   │   ├── About.tsx              # Public About Us page
│   │   ├── Contact.tsx            # Public Contact page
│   │   ├── CourseDetail.tsx       # Course detail view
│   │   ├── CoursePlayer.tsx       # Interactive student course player
│   │   ├── Courses.tsx            # Public course discovery catalog
│   │   ├── Index.tsx              # Landing homepage
│   │   ├── Login.tsx              # Login modal/page
│   │   └── Register.tsx           # Registration modal/page
│   ├── services/                  # Backend API integration services (50+ service files)
│   ├── types/                     # TypeScript interfaces and DTOs
│   ├── validations/               # Zod validation schemas
│   ├── App.css / index.css        # Global CSS and Tailwind variables
│   ├── App.tsx                    # Root App component, Router & Providers
│   └── main.tsx                   # React DOM entrypoint
├── index.html                     # HTML root template
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript configuration
└── vite.config.ts                 # Vite build configuration
```

---

## 2. Directory Responsibilities & Guidelines

### `src/services/`
- **Purpose**: Pure async functions for all HTTP API communication with the backend.
- **Do**: Use `apiClient` from `@/lib/api-client`. Normalize DTO responses into clean TypeScript interfaces. Handle API error responses.
- **Do NOT**: Render JSX/UI elements here. Do not create duplicate service files or bypass `apiClient`.

### `src/contexts/`
- **Purpose**: Global application state (Auth, Cart, Wishlist, Wallet, Copilot, Gift Checkout).
- **Do**: Keep state scoped strictly to relevant roles. Check authentication before executing backend queries.
- **Do NOT**: Put page-specific UI state here. Avoid triggering unauthenticated API calls on app mount.

### `src/pages/`
- **Purpose**: Page containers corresponding to specific routes.
- **Do**: Fetch necessary page data on mount via services. Handle loading and error states.
- **Do NOT**: Put shared global component logic directly in page files.

### `src/components/`
- **Purpose**: Reusable UI components grouped by feature domain.
- **Do**: Keep components focused, presentation-driven, and reusable.
- **Do NOT**: Trigger page-specific or role-specific API calls inside shared header/layout components without proper role boundaries.

### `src/lib/api-client.ts`
- **Purpose**: The single source of truth Axios client.
- **Responsibility**: Appends `Authorization: Bearer <token>`, handles 401 token refreshes automatically, resolves base API URL from environment variables.
- **Rule**: Protected core system. Do not create secondary Axios instances.
