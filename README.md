# 🛡️ VeriSocial: Social Media Activity Verification Portal

VeriSocial is an enterprise-grade full-stack platform engineered to verify creator campaign activities across major social media platforms (**Instagram**, **LinkedIn**, and **Facebook**) under a strict **3-Tier Role-Based Access Control (RBAC)** architecture: **Super Admin**, **Admin Moderator**, and **Normal User (Creator)**.

The platform includes a real-time verification pipeline, deep audit dossiers, institutional accounts registry, profile personalization with avatar photo uploads, and a comprehensive **Dynamic Gamification & Level Engine** with interactive user journey tracking and celebratory level-up animations.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Folder Structure](#-folder-structure)
- [Environment Variables](#-environment-variables)
- [PostgreSQL & Prisma Setup](#-postgresql--prisma-setup)
- [Prisma Migration Commands](#-prisma-migration-commands)
- [Backend Setup & Run](#-backend-setup--run)
- [Frontend Setup & Run](#-frontend-setup--run)
- [Development Commands](#-development-commands)
- [Production Build Instructions](#-production-build-instructions)
- [Default Roles, Accounts & Permissions](#-default-roles-accounts--permissions)
- [Security Guardrails & IDOR Protection](#-security-guardrails--idor-protection)
- [User Level Experience & Gamification](#-user-level-experience--gamification)
- [Super Admin Dynamic Level Engine](#-super-admin-dynamic-level-engine)
- [Profile Customization & Avatar Uploads](#-profile-customization--avatar-uploads)
- [Global Search & Filtering Architecture](#-global-search--filtering-architecture)
- [API Reference Matrix](#-api-reference-matrix)
- [Automated Testing Suite (13 Test Suites)](#-automated-testing-suite-13-test-suites)

---

## 🌟 Overview

VeriSocial provides an audited verification and reward pipeline for campus and brand campaigns:
1. **Creators (`USER`)**: Browse verified institutional social media accounts, submit proofs (post permalinks, activity type like Like, Comment, or Story, and screenshot evidence), track submissions in real time, view authoritative level progression cards, explore the interactive Level Journey map, celebrate level-ups with animations, customize their profile with avatar photos, and manage security credentials.
2. **Moderators (`ADMIN`)**: Access a high-throughput **Professional Verification Workspace** featuring a two-pane layout (filterable queue on left, deep verification dossier on right), keyboard shortcuts (`A` Approve, `R` Reject, `N` Next, `P` Previous), confirmation modals, internal auditor notes, creator clarification requests, human verification checklists, and audit history.
3. **Super Administrators (`SUPER_ADMIN`)**: Retain full system governance. Manage official accounts (Instagram, LinkedIn, Facebook with domain validation), administer platform users and moderator appointments, dynamically configure level thresholds and XP requirements, generate levels, execute manual point adjustments with audit justifications, inspect audit trails, and inspect platform telemetry.

---

## ✨ Key Features

- **Strict 3-Tier RBAC**: Granular permissions enforced on every backend route and frontend view.
- **Evidence Verification Workspace**: Split-screen moderation console with full-resolution screenshot inspection, creator profile dossier, and verified audit history.
- **Dynamic Gamification Engine**:
  - Authoritative backend calculations (`calculateUserLevel`). Zero client-side computation.
  - Variable XP thresholds per level, contiguous threshold verification, and database-backed configuration.
  - Multi-tier level rewards: 🌱 Beginner, ⚡ Active, 🚀 Contributor, 💎 Elite, 👑 Champion, and Legend ranks.
- **User-Facing Level Experience**:
  - **Level Progress Card**: Shows Level badge, level name, current XP, next level target, remaining XP, and percentage progress with glowing gradient fills.
  - **Level Journey Map**: Visual progression roadmap showing completed (`✓`), current (`→`), and locked (`🔒`) levels across all 50 tiers with auto-scroll to active level.
  - **Level-Up Celebration Modal**: Celebratory popup with spinning light rays, rising particle bursts, pulsing rings, and level statistics upon level advancement.
  - **Sidebar & Profile Integration**: Compact level status widget embedded into navigation sidebar and profile view.
- **Profile Personalization & Media Uploads**:
  - Upload custom profile avatar pictures with client validation and preview.
  - Avatar emblem badges and radiant gradient background selection.
  - Theme color presets (Cyber Indigo, Emerald Aura, Radiant Gold, Rose Quartz).
  - 1-click navigation to profile by clicking avatars in header or sidebar.
- **Command Palette Search (`⌘K` / `Ctrl+K`)**: Unified modal search with keyboard navigation across submissions, users, admins, official accounts, and notifications.
- **Automated Verification Testing**: 13 comprehensive backend test suites covering 100% of core APIs, security policies, and gamification math.

---

## ⚡ Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React 19 + Vite 6 | Modern modular SPA with lightning-fast HMR and optimized production bundles |
| **Styling** | Pure Vanilla CSS | Custom glassmorphism design system, HSL color tokens, dark mode, zero third-party CSS bloat |
| **Backend** | Node.js + Express.js | Enterprise RESTful architecture, helmet security headers, and modular layering |
| **Database** | PostgreSQL | Robust relational database hosting models for users, accounts, submissions, reviews, levels, and notifications |
| **ORM** | Prisma 6 | Declarative data modeling, automated SQL migrations, and type-safe client |
| **Security & Auth** | JWT (`jsonwebtoken`) + `bcryptjs` | Stateless signed tokens, salt rounds of 12, IDOR protections, and server-side role gating |
| **File Storage** | `multer` + Storage Service | Auth-gated screenshot & avatar storage with magic-byte MIME validation and path traversal defenses |

---

## 📂 Folder Structure

```
Social Media Verification Portal/
├── package.json                          # Monorepo workspaces orchestrator & root scripts
├── package-lock.json
├── .gitignore                            # Root gitignore rules
├── README.md                             # Comprehensive project documentation
│
├── backend/
│   ├── .env                              # Active backend environment configuration
│   ├── .env.example                      # Reference template for backend variables
│   ├── .gitignore
│   ├── package.json                      # Backend dependencies and test scripts
│   ├── prisma/
│   │   ├── schema.prisma                 # Core Prisma relational schema (Users, Levels, Submissions, etc.)
│   │   ├── seed.js                       # Demo accounts & default levels seeding script
│   │   └── migrations/                   # PostgreSQL migration history
│   ├── uploads/
│   │   └── screenshots/                  # Auth-gated storage directory for uploaded evidence
│   └── src/
│       ├── app.js                        # Express app configuration, Helmet, CORS, parser limits
│       ├── server.js                     # HTTP server startup with automatic port fallback
│       ├── config/
│       │   ├── db.js                     # PrismaClient singleton with connection diagnostics
│       │   └── env.js                    # Validated environment loader
│       ├── controllers/
│       │   ├── adminLevelController.js   # Super Admin dynamic level CRUD & generation
│       │   ├── authController.js         # Register, login, me, logout handlers
│       │   ├── dashboardController.js    # Scoped telemetry for user, admin, super-admin
│       │   ├── gamificationController.js # Authoritative XP, Level Journey & history APIs
│       │   ├── healthController.js       # Health and database telemetry endpoints
│       │   ├── notificationController.js # Read / read-all notification handlers
│       │   ├── pointsController.js       # Points ledger, rank, and manual adjustments
│       │   ├── reviewController.js       # Admin review queue, approval, and rejection
│       │   ├── socialAccountController.js# Official accounts registry and management
│       │   ├── submissionController.js   # User activity submission & query handlers
│       │   ├── superAdminController.js   # Super Admin user CRUD, stats & audit logs
│       │   ├── uploadController.js       # Auth-gated screenshot stream handler
│       │   └── userController.js         # Profile management & password updates
│       ├── middlewares/
│       │   ├── authMiddleware.js         # Bearer JWT validation & token extraction
│       │   ├── errorHandler.js           # Centralized exception formatter
│       │   ├── roleMiddleware.js         # Role gatekeeper & privilege escalation guard
│       │   └── uploadMiddleware.js       # Multer memory storage & magic byte validator
│       ├── repositories/
│       │   ├── notificationRepository.js # Notification queries & mutations
│       │   ├── pointTransactionRepository.js # Points & XP transaction store
│       │   ├── socialAccountRepository.js# Official social account database ops
│       │   ├── submissionRepository.js   # Submissions & moderation reviews store
│       │   └── userRepository.js         # User store with password-hash sanitization
│       ├── routes/
│       │   ├── adminLevelRoutes.js       # /api/admin/levels
│       │   ├── authRoutes.js             # /api/auth
│       │   ├── dashboardRoutes.js        # /api/dashboard
│       │   ├── gamificationRoutes.js     # /api/gamification
│       │   ├── healthRoutes.js           # /api/health, /api/database/status, /api/info
│       │   ├── notificationRoutes.js     # /api/notifications
│       │   ├── pointsRoutes.js           # /api/points
│       │   ├── reviewRoutes.js           # /api/reviews
│       │   ├── searchRoutes.js           # /api/search
│       │   ├── socialAccountRoutes.js    # /api/social-accounts
│       │   ├── submissionRoutes.js       # /api/submissions
│       │   ├── superAdminRoutes.js       # /api/superadmin
│       │   ├── uploadRoutes.js           # /api/uploads
│       │   ├── userRoutes.js             # /api/users
│       │   └── index.js                  # Central router registration
│       ├── services/
│       │   ├── levelService.js           # Dynamic level thresholds calculation engine
│       │   └── pointsService.js          # Points awarding & idempotency service
│       ├── tests/
│       │   ├── admin_review_workspace.test.js
│       │   ├── gamification_level_system.test.js
│       │   ├── notification.test.js
│       │   ├── official_social_accounts.test.js
│       │   ├── points_system.test.js
│       │   ├── profile_management.test.js
│       │   ├── rbac.test.js
│       │   ├── run_all_tests.js
│       │   ├── search_and_filter.test.js
│       │   ├── security_audit.test.js
│       │   ├── superadmin_dashboard.test.js
│       │   ├── superadmin_levels.test.js
│       │   ├── superadmin_users.test.js
│       │   └── workflow.test.js
│       └── utils/
│           ├── hash.js                   # bcrypt helper functions
│           ├── jwt.js                    # JWT signing and verification utility
│           └── urlValidator.js           # Domain & URL structure validation
│
└── frontend/
    ├── .env                              # Active frontend environment configuration
    ├── .env.example                      # Reference template for frontend variables
    ├── .gitignore
    ├── index.html                        # Application entrypoint with SEO meta
    ├── package.json                      # React 19, Vite, and scripts
    ├── vite.config.js                    # Vite configuration & dev proxy
    └── src/
        ├── main.jsx                      # React 19 root bootstrap
        ├── App.jsx                       # Top-level hash router & role orchestrator
        ├── context/
        │   └── AuthContext.jsx           # Global auth provider, session state & listeners
        ├── services/
        │   ├── api.js                    # Universal API abstraction client
        │   └── gamificationApi.js        # Dedicated gamification client
        ├── styles/
        │   ├── app.css                   # Component-level layout rules & badges
        │   ├── gamification.css          # Level cards, journey track, modals, leaderboard
        │   ├── index.css                 # Color tokens, typography, glassmorphism
        │   └── layout.css                # Responsive sidebar, drawer, and grids
        ├── pages/
        │   ├── LoginPage.jsx             # Credentials authentication & demo selector
        │   ├── UserSpace.jsx             # Creator space view
        │   ├── AdminSpace.jsx            # Admin moderator space view
        │   └── SuperAdminSpace.jsx       # Super Admin space view
        └── components/
            ├── Header.jsx                # Navigation header, user avatar & search trigger
            ├── Footer.jsx                # Public footer
            ├── Hero.jsx                  # Hero section with primary CTAs
            ├── MainLayout.jsx            # Authenticated application shell, sidebar & LevelUpModal
            ├── ProtectedRoute.jsx        # Role clearance router guard
            ├── RoleOverview.jsx          # Interactive 3-tier role cards
            ├── ScreenshotImage.jsx       # Authenticated blob image loader for screenshots
            ├── TechStackBadge.jsx        # Architecture details pill
            ├── Unauthorized403.jsx       # Dedicated 403 Forbidden page
            ├── HealthCheckWidget.jsx     # Live backend connectivity tester
            ├── DevDatabaseDashboard.jsx  # Interactive database telemetry console
            ├── common/
            │   ├── EmptyState.jsx        # Zero-state empty cards
            │   ├── FilterBar.jsx         # Debounced search & filter bar
            │   ├── GlobalSearchModal.jsx # ⌘K / Ctrl+K Command Palette
            │   ├── LoadingSkeleton.jsx   # Shimmer table skeletons
            │   └── Pagination.jsx        # Ellipsis pagination & page size selector
            ├── gamification/
            │   ├── GamificationSummary.jsx # Comprehensive gamification tab hub
            │   ├── Leaderboard.jsx       # Portal-wide ranked leaderboard
            │   ├── LevelBadge.jsx        # Tier icons & glowing badges
            │   ├── LevelJourneySection.jsx # Full interactive level journey roadmap
            │   ├── LevelProgress.jsx     # Visual level bar
            │   ├── LevelProgressCard.jsx # Premium Level Progress Card
            │   ├── LevelUpModal.jsx      # Animated level-up celebration modal
            │   ├── PointHistory.jsx      # Paginated transaction ledger
            │   ├── PointsCard.jsx        # Points balance & activity breakdown
            │   └── RankCard.jsx          # Current rank & gap to next rank
            └── views/
                ├── AdminsView.jsx        # Staff directory & moderator appointments
                ├── DashboardView.jsx     # Role-tailored dashboards with gamification
                ├── MySubmissionsView.jsx # Creator submission history & status modal
                ├── NotificationsView.jsx # User notifications & mark-all-read
                ├── ProfileView.jsx       # Avatar upload, color customization, password change
                ├── ReviewSubmissionsView.jsx # Professional Moderator Review Workspace
                ├── SettingsView.jsx      # System policies & anti-abuse thresholds
                ├── SocialAccountsView.jsx# Official accounts management & stats
                ├── SubmissionsView.jsx   # Global submissions directory
                ├── SuperAdminLevelsView.jsx # Dynamic Level configuration & generation console
                └── UsersView.jsx         # Super Admin user CRUD & status control
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5001` | TCP port on which Express API listens (with auto-fallback) |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/social_verification_portal?schema=public` | PostgreSQL connection string |
| `JWT_SECRET` | `super_secret_jwt_key_verification_portal_2026` | Secret key used to sign and verify Bearer JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | Lifespan of issued JSON Web Tokens |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:5174` | Allowed origins for cross-origin browser requests |

### Frontend (`frontend/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5001/api` | Base URL of the backend REST API |

---

## 🗄️ PostgreSQL & Prisma Setup

### 1. Ensure PostgreSQL Is Running
Create a database named `social_verification_portal`:
```bash
# Using psql:
createdb social_verification_portal
```

### 2. Configure `backend/.env`
Verify that `DATABASE_URL` in `backend/.env` points to your PostgreSQL database instance:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/social_verification_portal?schema=public"
```

---

## 🔄 Prisma Migration Commands

From the repository root or the `backend` directory:

```bash
# Generate the Prisma Client
npm run prisma:generate

# Apply database migrations to PostgreSQL
npm run prisma:migrate

# Seed demo accounts and default levels (50 tiers)
npm run db:seed --prefix backend

# (Optional) Open Prisma Studio database browser:
npx prisma studio --schema backend/prisma/schema.prisma
```

---

## 🚀 Backend Setup & Run

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate client & seed database:
   ```bash
   npx prisma generate
   node prisma/seed.js
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend server will run on `http://localhost:5001`.*

---

## 💻 Frontend Setup & Run

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend application will run on `http://localhost:5173`.*

---

## 🛠️ Development Commands

From the repository root:

```bash
# Run both Backend and Frontend concurrently
npm run dev

# Run only Backend in development mode (nodemon)
npm run dev:backend

# Run only Frontend in development mode (vite)
npm run dev:frontend

# Execute all automated backend test suites (13 suites)
npm test

# Build Frontend production bundle
npm run build:frontend
```

---

## 📦 Production Build Instructions

### 1. Build the Frontend
Compile and minify the React application into optimized static assets in `frontend/dist/`:
```bash
npm run build:frontend
# or from frontend directory:
npm run build
```

### 2. Run the Production Backend
Ensure environment variables are configured with production credentials:
```bash
NODE_ENV=production PORT=5001 npm run start --prefix backend
```

---

## 👤 Default Roles, Accounts & Permissions

The portal provides 3 pre-seeded demo accounts ready for testing:

| Role | Demo Email | Password | Allowed Capabilities |
|---|---|---|---|
| **`SUPER_ADMIN`** | `superadmin@portal.com` | `SuperAdmin123!` | Full system governance, configure dynamic levels & thresholds, manage users/admins, create official accounts, manual point adjustments, review all submissions, view audit logs |
| **`ADMIN`** | `admin@portal.com` | `Admin123!` | Access moderator dashboard, two-pane review queue, approve/reject submissions with feedback, add auditor notes, request clarifications, view user directories |
| **`USER`** | `user@portal.com` | `User123!` | View creator dashboard, submit activity evidence with screenshot proof, track personal submissions, view Level Progress Card & Journey, receive instant notifications, customize avatar |

---

## 🔒 Security Guardrails & IDOR Protection

1. **Strict Server-Side RBAC**: Role information sent by clients in registration or profile updates is ignored. Public registrations are strictly assigned `USER`.
2. **Privilege Escalation Defenses**: Only `SUPER_ADMIN` can modify user roles. Admins cannot promote users to Super Admin or alter other administrators.
3. **IDOR (Insecure Direct Object Reference) Protection**:
   - `GET /api/submissions/:id`: Creators can only access their own submissions. Unauthorized access returns `403 Forbidden` (`FORBIDDEN_OWNERSHIP`).
   - `PATCH /api/notifications/:id/read`: Users can only mark their own notifications as read.
4. **Auth-Gated Screenshot Delivery**:
   - `/api/uploads/screenshots/:filename` strictly enforces that Normal Users can only stream screenshots associated with their own submissions. Unauthorized attempts return `404 Not Found` without disclosing file existence.
5. **No Password Leakage**: Password hashes are strictly omitted (`select` exclusion) across all user listing, search, profile, and audit endpoints.
6. **File Upload Security**: Screenshot uploads enforce memory buffer inspection with magic-byte signature validation (JPEG `ffd8ff`, PNG `89504e47`, WebP, GIF), 5MB size limits, and sanitization against path traversal.
7. **Security Headers**: Helmet configured with `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and disabled `X-Powered-By` header.

---

## 🏆 User Level Experience & Gamification

### 1. Authoritative Backend Calculation
All level computations originate strictly from the backend via `levelService.js` and `calculateUserLevel`:
- **Current XP**: Authoritative verified XP derived from approved activities.
- **Current Level**: Active tier number (1 to 50).
- **Next Level**: Targeted level number.
- **XP Required**: Authoritative cumulative milestone to reach the next level.
- **XP Remaining**: Direct difference (`targetNextLevelXP - currentXP`).
- **Progress Percentage**: Authoritative precision calculation (`(currentXP / targetNextLevelXP) * 100`).

### 2. User Level Card (`LevelProgressCard.jsx`)
Features a high-end glassmorphic presentation:
- **Badge**: `🏆 LEVEL 17` with level-themed glowing aura.
- **Name**: `Explorer` (or configured title).
- **Stats Grid**:
  - `⚡ Current XP`: e.g. `4,120 XP`
  - `🎯 Next Level`: e.g. `Level 18`
  - `🎯 XP Required`: e.g. `4,250 XP`
  - `⏳ Remaining`: e.g. `130 XP`
  - `📈 Progress`: Animated gradient bar with shimmer effect and `96.9%` badge.
- **Action**: Dedicated `🗺️ View Level Journey` button to expand the roadmap.

### 3. Interactive Level Journey (`LevelJourneySection.jsx`)
- Visual roadmap for all 50 tiers fetched from `/api/gamification/me/journey`.
- **Completed**: Marked with soft green background and `✓` badge.
- **Current**: Highlighted with cyan neon border, drop glow, and pulsing active dot. Automatically scrolls into viewport on load.
- **Locked**: Semi-transparent card with required milestone and rank title.
- Expand/collapse control to toggle full journey view.

### 4. Level-Up Celebration Modal (`LevelUpModal.jsx`)
- Automatically triggered upon level increment detected by metrics polling or manual refresh.
- Displays animated spinning light rays, rising particle effects, pulsing concentric tier rings, and next level preview.
- Closes with celebration CTA button or `Escape` key.

---

## ⚙️ Super Admin Dynamic Level Engine

Super Administrators have full authority over the platform's progression structure via `SuperAdminLevelsView.jsx` and `/api/admin/levels`:
- **Dynamic Level Definitions**: Levels are stored as database entities (`Level` model) with custom XP requirement, badge icon, rank name, description, and active status.
- **Contiguous Cumulative Calculation**: `buildLevelThresholds` continuously re-computes start and end bounds without gaps or overlaps.
- **Bulk Level Generation**: Safely generates 1–100 levels with linear or exponential XP curves.
- **Historical Data Safety**: User transaction records and baseline XP remain strictly immutable even when level definitions are modified.

---

## 🎨 Profile Customization & Avatar Uploads

The user profile section (`ProfileView.jsx`) supports full creator personalization:
- **Custom Profile Photo**: File upload supporting JPEG, PNG, and WebP images with instant preview and local persistence.
- **Avatar Emblem**: Custom emoji badges (`👑`, `⚡`, `🚀`, `🦅`, `💎`, `🎯`, etc.) overlaying the user's avatar.
- **Gradient Backgrounds**: 6 curated gradient options (Indigo Aura, Sunset Blaze, Emerald Glow, Cyberpunk Violet, Midnight Nebula, Solar Flare).
- **Interactive Links**: Clicking user avatars anywhere in the application (sidebar footer or top navigation header) opens the Profile customization screen directly.

---

## 🔍 Global Search & Filtering Architecture

- **Global Search Modal (`⌘K` / `Ctrl+K`)**: Instant modal search accessible anywhere with keyboard navigation (`↑`/`↓`/`Enter`/`Esc`), live categorization, and deep-linking into Submissions, Users, Admins, Social Accounts, and Notifications.
- **Unified `/api/search` Endpoint**: Server-side cross-entity search returning grouped results with strict RBAC enforcement.
- **Server-Side Pagination & Filtering**: Filter submissions by status, platform, action type, moderator, creator, and date range with zero client-side lag.

---

## 📡 API Reference Matrix

| Route | Method | Clearance | Description |
|---|---|---|---|
| `/api/health` | `GET` | Public | System uptime & database connection status |
| `/api/auth/register` | `POST` | Public | Register new creator account (enforced `USER` role) |
| `/api/auth/login` | `POST` | Public | Authenticate credentials and receive Bearer JWT |
| `/api/auth/me` | `GET` | Authenticated | Retrieve authenticated caller profile |
| `/api/users/me` | `GET` | Authenticated | Retrieve profile details and role-tailored stats |
| `/api/users/me` | `PUT` | Authenticated | Update user name (role/email/status protected) |
| `/api/users/change-password` | `PUT` | Authenticated | Change authenticated user's password |
| `/api/gamification/me` | `GET` | Authenticated | Authoritative level status, total XP, and progress |
| `/api/gamification/me/journey` | `GET` | Authenticated | Full interactive 50-level progression roadmap |
| `/api/gamification/me/history` | `GET` | Authenticated | Paginated XP transaction ledger with filters |
| `/api/gamification/levels` | `GET` | Authenticated | Active dynamic level configurations |
| `/api/gamification/user/:id` | `GET` | `ADMIN`, `SUPER_ADMIN` | Inspect any user's authoritative gamification dossier |
| `/api/points/me` | `GET` | Authenticated | Fetch caller's points summary and activity breakdown |
| `/api/points/me/rank` | `GET` | Authenticated | Fetch caller's leaderboard rank and distance to next rank |
| `/api/leaderboard` | `GET` | Authenticated | Portal-wide leaderboard with timeframe filtering |
| `/api/points/adjust` | `POST` | `SUPER_ADMIN` | Manual point adjustment with audit justification |
| `/api/social-accounts/active` | `GET` | Authenticated | List official active institutional accounts |
| `/api/submissions` | `POST` | `USER` | Submit activity proof with screenshot evidence |
| `/api/submissions/my` | `GET` | Authenticated | List submissions owned by the authenticated caller |
| `/api/submissions/:id` | `GET` | Authenticated | View submission details (IDOR protected for creators) |
| `/api/submissions` | `GET` | `ADMIN`, `SUPER_ADMIN` | View all platform submissions for moderation |
| `/api/reviews/pending` | `GET` | `ADMIN`, `SUPER_ADMIN` | Filterable and paginated moderation review queue |
| `/api/reviews/submission/:id` | `GET` | `ADMIN`, `SUPER_ADMIN` | Detailed review dossier with creator audit details |
| `/api/reviews/:id/approve` | `POST` | `ADMIN`, `SUPER_ADMIN` | Approve submission, award points/XP & notify creator |
| `/api/reviews/:id/reject` | `POST` | `ADMIN`, `SUPER_ADMIN` | Reject submission with structured feedback (0 points) |
| `/api/reviews/:id/notes` | `POST` | `ADMIN`, `SUPER_ADMIN` | Add internal auditor notes to submission |
| `/api/reviews/:id/clarification` | `POST` | `ADMIN`, `SUPER_ADMIN` | Request clarification from creator |
| `/api/notifications` | `GET` | Authenticated | Retrieve user notifications & unread badge count |
| `/api/notifications/:id/read`| `PATCH`| Authenticated | Mark a notification as read (ownership protected) |
| `/api/notifications/read-all`| `PATCH`| Authenticated | Mark all notifications as read for current user |
| `/api/uploads/screenshots/:fn`| `GET` | Authenticated | Auth-gated screenshot stream (ownership validated) |
| `/api/admin/levels` | `GET` | `SUPER_ADMIN` | List all dynamic levels and engine telemetry |
| `/api/admin/levels` | `POST` | `SUPER_ADMIN` | Create dynamic level entity |
| `/api/admin/levels/:id` | `PUT` | `SUPER_ADMIN` | Edit dynamic level thresholds and attributes |
| `/api/admin/levels/:id` | `DELETE`| `SUPER_ADMIN` | Safely remove level with audit log |
| `/api/admin/levels/generate` | `POST` | `SUPER_ADMIN` | Bulk generate level progression curves |
| `/api/superadmin/users` | `GET` | `SUPER_ADMIN` | Paginated user directory with search and filter |
| `/api/superadmin/users` | `POST`| `SUPER_ADMIN` | Create user or administrator account |
| `/api/superadmin/users/:id` | `PATCH`| `SUPER_ADMIN` | Update user details or reset password |
| `/api/superadmin/users/:id/status`| `PATCH`| `SUPER_ADMIN` | Toggle user status (Active / Inactive / Suspended) |
| `/api/superadmin/system-stats`| `GET` | `SUPER_ADMIN` | Platform analytics and distribution telemetry |
| `/api/superadmin/audit-logs` | `GET` | `SUPER_ADMIN` | System event audit logs |

---

## 🧪 Automated Testing Suite (13 Test Suites)

The repository features a comprehensive 13-suite automated test harness verifying every layer of the platform:

```bash
npm test
```

### Included Test Suites:
1. **`rbac.test.js`**: 42 automated tests validating the role-based permission matrix across all endpoints.
2. **`security_audit.test.js`**: Tests security headers, payload limits, JWT tamper resistance, IDOR protections, and file path traversal.
3. **`workflow.test.js`**: Tests the complete submission lifecycle: creation, review, approval, rejection, state transitions, and creator notifications.
4. **`admin_review_workspace.test.js`**: Validates the professional Admin Review Workspace: RBAC on review APIs, dossier retrieval, queue navigation, internal notes, clarification requests, and human verification integrity.
5. **`notification.test.js`**: Validates notification delivery, unread count tracking, cross-user isolation, and bulk read operations.
6. **`official_social_accounts.test.js`**: Validates official accounts CRUD, domain checks, handle formatting, and creator targeting.
7. **`profile_management.test.js`**: Validates password changes, policy checks, name updates, and privilege escalation prevention.
8. **`superadmin_dashboard.test.js`**: Tests superadmin metrics, arithmetic consistency, platform breakdown, and audit trails.
9. **`superadmin_users.test.js`**: Tests user management, pagination, role assignment, password hashing, and sole superadmin safeguards.
10. **`search_and_filter.test.js`**: Validates server-side searching, multi-criteria filtering (status, platform, role, date range), sorting (asc/desc), pagination, and strict RBAC enforcement.
11. **`points_system.test.js`**: Validates point calculations (LIKE = 1, COMMENT = 2, STORY = 2), approval-triggered point awards, duplicate award prevention, 0 points on rejection, and points ledger consistency.
12. **`gamification_level_system.test.js`**: Validates authoritative 50-level calculations, dynamic variable thresholds, `/api/gamification/me`, XP transaction ledger, and guardrails against direct XP manipulation.
13. **`superadmin_levels.test.js`**: Validates Super Admin level management APIs, strict RBAC, CRUD operations, dynamic cumulative threshold recalculations, bulk level generation, and user XP baseline safety.

---

## 📄 License

This project is licensed under the MIT License.
