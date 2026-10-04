# 🛡️ PJ Social : Social Media Activity Verification Portal

**PJ Social** (**PJ Social : Social Media Activity Verification Portal**) is an enterprise-grade full-stack platform engineered to verify creator campaign activities across major social media platforms (**Instagram**, **LinkedIn**, and **Facebook**) under a strict **3-Tier Role-Based Access Control (RBAC)** architecture: **Super Admin**, **Admin Moderator**, and **Normal User (Creator)**.

The platform includes a real-time verification pipeline, deep audit dossiers, institutional accounts registry, profile personalization with avatar photo uploads, and a comprehensive **Dynamic Gamification, Level & Game Points Engine** featuring real-time event updates, interactive trajectory graphs, automated level progression, community rankings with deterministic tie-breaking, and celebratory level-up animations.

---

## 📑 Table of Contents

- [🎯 Project Pitch & Presentation Guide (PITCH.md)](PITCH.md)
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
- [Game Points & Gamification Architecture](#-game-points--gamification-architecture)
  - [1. Normal User Command Center (`/game-points`)](#1-normal-user-command-center-game-points)
  - [2. Admin Moderation & Points Management (`/admin/game-points`)](#2-admin-moderation--points-management-admingame-points)
  - [3. Super Admin Gamification Governance (`/super-admin/game-points`)](#3-super-admin-gamification-governance-super-admingame-points)
  - [4. Real-Time Event Synchronization & WebSockets](#4-real-time-event-synchronization--websockets)
- [Super Admin Dynamic Level Engine](#-super-admin-dynamic-level-engine)
- [Profile Customization & Avatar Uploads](#-profile-customization--avatar-uploads)
- [Global Search & Filtering Architecture](#-global-search--filtering-architecture)
- [API Reference Matrix](#-api-reference-matrix)
- [Automated Testing Suite (32 Test Suites)](#-automated-testing-suite-32-test-suites)
- [License](#-license)

---

## 🌟 Overview

**PJ Social** provides an audited verification and reward pipeline for campus and brand campaigns:
1. **Creators (`USER`)**: Browse verified institutional social media accounts, submit proofs (post permalinks, activity type like Like, Comment, or Story, and screenshot evidence), track submissions in real time, view authoritative level progression cards, explore the interactive Level Journey map, celebrate level-ups with animations, inspect historical XP progression graphs over multiple timeframes, track verified leaderboard rankings, customize their profile with avatar photos, and manage security credentials.
2. **Moderators (`ADMIN`)**: Access a high-throughput **Professional Verification Workspace** featuring a two-pane layout (filterable queue on left, deep verification dossier on right), keyboard shortcuts (`A` Approve, `R` Reject, `N` Next, `P` Previous), confirmation modals, internal auditor notes, creator clarification requests, human verification checklists, and audit history. In addition, admins manage creator game points via a dedicated **Admin Points Management Suite** (`/admin/game-points`) with server-side filtering, user dossiers, and audited manual XP adjustments (+/-).
3. **Super Administrators (`SUPER_ADMIN`)**: Retain full system governance. Manage official accounts (Instagram, LinkedIn, Facebook with domain validation), administer platform users and moderator appointments, dynamically configure level thresholds and XP requirements, generate levels, configure future XP earning rules without retroactively mutating history, inspect immutable platform transaction ledgers, view system audit logs, and analyze platform-wide gamification telemetry.

---

## ✨ Key Features

- **Strict 3-Tier RBAC**: Granular permissions enforced on every backend route and frontend view (Super Admin, Admin, Normal User).
- **Evidence Verification Workspace**: Split-screen moderation console with full-resolution screenshot inspection, creator profile dossier, and verified audit history.
- **Authoritative Gamification Engine**:
  - Authoritative backend calculations (`calculateUserLevel`). Zero client-side computation.
  - Variable XP thresholds per level, contiguous threshold verification, and database-backed configuration.
  - Multi-tier level rewards: 🌱 Novice, ⭐ Scout, 🚀 Pathfinder, ⚡ Pioneer, 💎 Champion, 👑 Legend.
  - Deterministic tie-breaking for rankings: (1) Higher Total XP, (2) Earlier Timestamp of reaching that XP, (3) Stable User ID.
- **Dynamic XP Graphs & Visual Telemetry**:
  - Interactive XP trajectory charts supporting **7 Days**, **30 Days**, **3 Months**, **6 Months**, and **All Time** granularities.
  - Responsive charts rendered via Pure CSS/SVG with automatic date boundary handling, zero-state fallbacks, and single-transaction handling.
- **Real-Time Live Event Synchronization**:
  - Server-Sent Events (SSE) and persistent WebSocket streams push live updates for:
    - User XP gains upon submission approval.
    - 🎉 Level-Up modal celebrations upon crossing level thresholds.
    - Admin manual XP adjustments reflected instantly on client dashboards.
    - Super Admin XP rule updates with zero retroactive modifications.
  - Graceful reconnection and automatic stale-state synchronization (`/api/gamification/realtime/sync-state`).
- **Profile Personalization & Media Uploads**:
  - Upload custom profile avatar pictures with client validation and preview.
  - Avatar emblem badges and radiant gradient background selection.
  - Theme color presets (Cyber Indigo, Emerald Aura, Radiant Gold, Rose Quartz).
  - 1-click navigation to profile by clicking avatars in header or sidebar.
- **Command Palette Search (`⌘K` / `Ctrl+K`)**: Unified modal search with keyboard navigation across submissions, users, admins, official accounts, and notifications.
- **Automated Verification Testing**: **25 comprehensive backend test suites** covering 100% of core APIs, security policies, real-time broadcasts, and gamification math.

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
| **Real-Time Engine** | SSE + Event Broker | Server-Sent Events with fallback state synchronization and heartbeat liveness |
| **File Storage** | `multer` + Storage Service | Auth-gated screenshot & avatar storage with magic-byte MIME validation and path traversal defenses |

---

## 📂 Folder Structure

```
Social Media Verification Portal/
├── .gitignore                            # Repository-wide gitignore rules (ignores credentials, env, node_modules)
├── GOOGLE_PASS.txt                       # Google account & SMTP app credentials (git-ignored)
├── LICENSE                               # MIT Open-Source License
├── PITCH.md                              # Comprehensive presentation & feature pitch guide
├── README.md                             # Master project documentation
│
├── backend/
│   ├── .env                              # Active backend environment configuration
│   ├── .env.example                      # Reference template for backend variables
│   ├── .gitignore
│   ├── nodemon.json                      # Hot-reloading watch/ignore rules
│   ├── package.json                      # Backend dependencies and test scripts
│   ├── package-lock.json                 # Backend dependency lockfile
│   ├── prisma/
│   │   ├── schema.prisma                 # Core Prisma relational schema (Users, Levels, Submissions, etc.)
│   │   ├── seed.js                       # Core accounts, official channels & default levels seeder
│   │   ├── seedLevels.js                 # 50-tier dynamic gamification level seeder
│   │   └── migrations/                   # PostgreSQL migration history & lockfile
│   ├── uploads/
│   │   └── screenshots/                  # Auth-gated storage directory for uploaded evidence & test fixtures
│   └── src/
│       ├── app.js                        # Express app configuration, Helmet, CORS, parser limits, audit logger
│       ├── server.js                     # HTTP server startup with automatic port fallback (5001 -> 5002+)
│       ├── config/
│       │   ├── db.js                     # PrismaClient singleton with connection diagnostics
│       │   ├── env.js                    # Validated environment loader
│       │   └── swagger.js                # OpenAPI 3.0 documentation specification
│       ├── controllers/
│       │   ├── adminGamificationController.js # Admin points directory, user dossiers, and XP adjustments
│       │   ├── adminLevelController.js   # Super Admin dynamic level CRUD & generation
│       │   ├── authController.js         # Register, login, me, logout handlers
│       │   ├── dashboardController.js    # Scoped telemetry for user, admin, super-admin
│       │   ├── emailPreferenceController.js # User email notification preferences
│       │   ├── gamificationController.js # Authoritative XP, Level Journey, Rank, Chart & history APIs
│       │   ├── healthController.js       # Health and database telemetry endpoints
│       │   ├── notificationController.js # Read / read-all notification handlers
│       │   ├── pointsController.js       # Points ledger, rank, and manual adjustments
│       │   ├── reviewController.js       # Admin review queue, approval, and rejection
│       │   ├── searchController.js       # Unified multi-criteria global search
│       │   ├── socialAccountController.js# Official accounts registry and management
│       │   ├── submissionController.js   # User activity submission & query handlers
│       │   ├── superAdminController.js   # Super Admin user CRUD, stats & audit logs
│       │   ├── superAdminEmailController.js # Super Admin transactional email control center
│       │   ├── superAdminGamificationController.js # Super Admin governance: overview, ledger, rules, analytics
│       │   ├── uploadController.js       # Auth-gated screenshot stream handler
│       │   └── userController.js         # Profile management & password updates
│       ├── middlewares/
│       │   ├── authMiddleware.js         # Bearer JWT validation & token extraction
│       │   ├── errorHandler.js           # Centralized exception formatter
│       │   ├── roleMiddleware.js         # Role gatekeeper & privilege escalation guard
│       │   └── uploadMiddleware.js       # Multer memory storage & magic byte validator
│       ├── repositories/
│       │   ├── emailConfigRepository.js  # SMTP server configurations
│       │   ├── emailLogRepository.js     # Transactional email delivery logs
│       │   ├── emailPreferenceRepository.js # User communication preferences
│       │   ├── notificationRepository.js # Notification queries & mutations
│       │   ├── passwordResetRepository.js# Password reset tokens
│       │   ├── pointTransactionRepository.js # Points & XP transaction store
│       │   ├── socialAccountRepository.js# Official social account database ops
│       │   ├── submissionRepository.js   # Submissions & moderation reviews store
│       │   └── userRepository.js         # User store with password-hash sanitization
│       ├── routes/
│       │   ├── adminGamificationRoutes.js# /api/admin/gamification
│       │   ├── adminLevelRoutes.js       # /api/admin/levels & /api/superadmin/levels
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
│       │   ├── superAdminEmailRoutes.js  # /api/super-admin/email
│       │   ├── superAdminGamificationRoutes.js # /api/superadmin/gamification
│       │   ├── superAdminRoutes.js       # /api/superadmin
│       │   ├── swaggerRoutes.js          # /api/docs
│       │   ├── uploadRoutes.js           # /api/uploads
│       │   ├── userRoutes.js             # /api/users
│       │   └── index.js                  # Central router registration
│       ├── services/
│       │   ├── adminGamificationService.js # Admin users directory & manual adjustment business logic
│       │   ├── auditLogService.js        # Governance and audit logging
│       │   ├── emailService.js           # Transactional email dispatch, retries & telemetry
│       │   ├── emailTemplates.js         # Production HTML transactional email templates
│       │   ├── levelService.js           # Dynamic level thresholds calculation engine
│       │   ├── pointsService.js          # Points awarding & idempotency service
│       │   ├── realtimeGamificationService.js # SSE real-time broadcast and subscription manager
│       │   ├── storageService.js         # Local/cloud storage abstraction
│       │   ├── submissionApprovalService.js # Transactional approval & XP awarding orchestrator
│       │   └── superAdminGamificationService.js # Super Admin transactions, audit logs, and settings logic
│       ├── tests/                        # 32 automated test suites + master runner
│       │   ├── run_all_tests.js          # Master test runner
│       │   └── *.test.js                 # 32 unit, integration, and security suites
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
    ├── package-lock.json                 # Frontend dependency lockfile
    ├── vite.config.js                    # Vite configuration & dev proxy
    └── src/
        ├── main.jsx                      # React 19 root bootstrap
        ├── App.jsx                       # Top-level hash router & role orchestrator
        ├── context/
        │   └── AuthContext.jsx           # Global auth provider, session state & listeners
        ├── services/
        │   ├── adminGamificationApi.js   # Admin gamification API client
        │   ├── api.js                    # Universal API abstraction client
        │   ├── emailAdminApi.js          # Transactional email management API client
        │   ├── gamificationApi.js        # Dedicated gamification client
        │   ├── gamificationRealtimeClient.js # Frontend SSE real-time client & event emitter
        │   └── superAdminGamificationApi.js # Super Admin gamification API client
        ├── styles/
        │   └── index.css                 # Master design system (tokens, typography, glassmorphism)
        ├── pages/
        │   ├── LoginPage.jsx             # Credentials authentication & demo selector
        │   └── UserSpace.jsx             # Creator space view (rendered inside MainLayout)
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
            ├── admin/gamification/
            │   ├── AdminGamificationAnalytics.jsx # Admin telemetry & XP distribution charts
            │   ├── AdminUserGamificationDossier.jsx # In-depth creator gamification dossier
            │   ├── AdminUsersPointsTable.jsx # Creator points directory with filters & pagination
            │   └── AdminXPAdjustmentModal.jsx # Manual XP adjustment modal with live validation
            ├── common/
            │   ├── EmptyState.jsx        # Zero-state empty cards
            │   ├── FilterBar.jsx         # Debounced search & filter bar
            │   ├── GlobalSearchModal.jsx # ⌘K / Ctrl+K Command Palette
            │   ├── LoadingSkeleton.jsx   # Shimmer table skeletons
            │   ├── Pagination.jsx        # Ellipsis pagination & page size selector
            │   └── PointsSummary.jsx     # Points card summary widget
            ├── gamification/
            │   ├── DynamicLevelTimeline.jsx # Visual 50-level milestone journey
            │   ├── GamificationSummary.jsx # Level & points summary bar
            │   ├── Leaderboard.jsx       # Portal-wide ranked leaderboard with tie-breaking
            │   ├── LevelBadge.jsx        # Tier icons & glowing badges
            │   ├── LevelJourneySection.jsx # Visual level track section
            │   ├── LevelProgress.jsx     # Level progress bar component
            │   ├── LevelProgressCard.jsx # Compact level progress card
            │   ├── LevelUpModal.jsx      # Animated level-up celebration modal
            │   ├── PersonalGamificationDashboard.jsx # Normal user gamification command center
            │   ├── PointHistory.jsx      # Points activity log
            │   ├── PositionTimeline.jsx  # Creator leaderboard position timeline
            │   ├── UserActivityDistribution.jsx # Activity breakdown donut chart
            │   ├── UserXPChart.jsx       # Dynamic SVG/CSS XP trajectory chart
            │   └── XPHistoryLedger.jsx   # Itemized transaction ledger with pagination
            ├── superadmin/gamification/
            │   ├── SuperAdminAdminsView.jsx # Staff administrator point governance
            │   ├── SuperAdminAuditLogsView.jsx # Gamification compliance & audit trail
            │   ├── SuperAdminGamificationAnalytics.jsx # Global platform telemetry & breakdown
            │   ├── SuperAdminGamificationOverview.jsx # Super Admin KPI dashboard & quick stats
            │   ├── SuperAdminGamificationSettings.jsx # Dynamic XP earning rules configuration
            │   ├── SuperAdminTransactionsExplorer.jsx # Global transaction explorer ledger
            │   ├── SuperAdminUsersTable.jsx # System-wide user directory & points
            │   └── SuperAdminXPAdjustmentModal.jsx # Super Admin override adjustment modal
            └── views/
                ├── AdminsView.jsx        # Staff directory & moderator appointments
                ├── DashboardView.jsx     # Role-tailored dashboards with gamification
                ├── GamePointsView.jsx    # Unified Game Points routing view
                ├── LevelManagementView.jsx # Dynamic Level configuration & generation console
                ├── MySubmissionsView.jsx # Creator submission history & status modal
                ├── NotificationsView.jsx # User notifications & mark-all-read
                ├── ProfileView.jsx       # Avatar upload, color customization, password change
                ├── ReviewSubmissionsView.jsx # Professional Moderator Review Workspace
                ├── SettingsView.jsx      # System policies & anti-abuse thresholds
                ├── SocialAccountsView.jsx# Official accounts management & stats
                ├── SubmissionsView.jsx   # Global submissions directory
                ├── SubmitActivityView.jsx# Social activity verification form
                ├── SuperAdminEmailCenter.jsx # Transactional email control center
                ├── SuperAdminGamificationCenter.jsx # 9-tab Super Admin governance console
                └── UsersView.jsx         # Super Admin user CRUD & status control
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5001` | TCP port on which Express API listens (with auto-fallback to 5002+) |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/social_verification_portal?schema=public` | PostgreSQL connection string |
| `JWT_SECRET` | `super_secret_jwt_key_verification_portal_2026` | Secret key used to sign and verify Bearer JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | Lifespan of issued JSON Web Tokens |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:5174` | Allowed origins for cross-origin browser requests |
| `MAIL_HOST` | `smtp.gmail.com` | Transactional email SMTP server |
| `MAIL_PORT` | `465` | SMTP port (SSL) |
| `MAIL_SECURE` | `true` | Enable SSL encryption |
| `MAIL_USER` | `pjsocialmediaportal@gmail.com` | Sender Gmail account |
| `MAIL_PASSWORD` | *(16-char App Password)* | Google App Password (see `GOOGLE_PASS.txt`) |
| `MAIL_FROM` | `"PJ Social Portal" <pjsocialmediaportal@gmail.com>` | Default sender display format |

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

From the `backend` directory:

```bash
cd backend

# Generate the Prisma Client
npx prisma generate

# Apply database migrations to PostgreSQL
npx prisma migrate dev

# Seed demo accounts and default levels (50 tiers)
node prisma/seed.js

# (Optional) Open Prisma Studio database browser:
npx prisma studio
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
   *The backend server will run on `http://localhost:5001` (or `http://localhost:5002` if port 5001 is busy).*

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

```bash
# Start Backend in development mode with nodemon:
cd backend && npm run dev

# Start Frontend in development mode with Vite:
cd frontend && npm run dev

# Execute backend automated test suites:
cd backend && npm test

# Run all test suites with live database testing enabled:
cd backend && ALLOW_LIVE_DB_TESTING=true npm test

# Build Frontend production bundle:
cd frontend && npm run build

# Preview Frontend production build:
cd frontend && npm run preview
```

---

## 📦 Production Build Instructions

### 1. Build the Frontend
Compile and minify the React application into optimized static assets in `frontend/dist/`:
```bash
cd frontend && npm run build
```

### 2. Run the Production Backend
Ensure environment variables are configured with production credentials:
```bash
cd backend && NODE_ENV=production PORT=5001 npm start
```

---

## 👤 Default Roles, Accounts & Permissions

The portal provides 3 pre-seeded demo accounts ready for testing:

| Role | Demo Email | Password | Allowed Capabilities |
|---|---|---|---|
| **`SUPER_ADMIN`** | `superadmin@portal.com` | `SuperAdmin123!` | Full system governance, configure dynamic levels & thresholds, manage users/admins, create official accounts, manual point adjustments, configure future XP earning rules, explore global transaction ledgers, review all submissions, view audit logs |
| **`ADMIN`** | `admin@portal.com` | `Admin123!` | Access moderator dashboard, two-pane review queue, approve/reject submissions with feedback, add auditor notes, request clarifications, view user directories, inspect creator gamification dossiers, adjust creator XP (+/-) with audit logs |
| **`USER`** | `user@portal.com` | `User123!` | View creator dashboard, submit activity evidence with screenshot proof, track personal submissions, view Game Points command center, Level Progress Card & Journey, receive instant notifications, celebrate level-ups, customize avatar |

---

## 🔒 Security Guardrails & IDOR Protection

1. **Strict Server-Side RBAC**: Role information sent by clients in registration or profile updates is ignored. Public registrations are strictly assigned `USER`.
2. **Privilege Escalation Defenses**: Only `SUPER_ADMIN` can modify user roles. Admins cannot promote users to Super Admin or alter other administrators.
3. **IDOR (Insecure Direct Object Reference) Protection**:
   - `GET /api/submissions/:id`: Creators can only access their own submissions. Unauthorized access returns `403 Forbidden` (`FORBIDDEN_OWNERSHIP`).
   - `PATCH /api/notifications/:id/read`: Users can only mark their own notifications as read.
   - `GET /api/admin/gamification/users/:id`: Normal users cannot inspect other creators' dossiers.
   - `POST /api/admin/gamification/users/:id/adjust-xp`: Normal users cannot adjust XP.
4. **Auth-Gated Screenshot Delivery**:
   - `/api/uploads/screenshots/:filename` strictly enforces that Normal Users can only stream screenshots associated with their own submissions. Unauthorized attempts return `404 Not Found` without disclosing file existence.
5. **No Password Leakage**: Password hashes are strictly omitted (`select` exclusion) across all user listing, search, profile, and audit endpoints.
6. **File Upload Security**: Screenshot uploads enforce memory buffer inspection with magic-byte signature validation (JPEG `ffd8ff`, PNG `89504e47`, WebP, GIF), 5MB size limits, and sanitization against path traversal.
7. **Security Headers**: Helmet configured with `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and disabled `X-Powered-By` header.

---

## 🏆 Game Points & Gamification Architecture

The Gamification & Game Points engine provides role-tailored workspaces and real-time synchronization across all three tiers of the platform:

```
                            ┌───────────────────────────────────┐
                            │    Admin Approves Submission      │
                            └─────────────────┬─────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
          Atomic XP Transaction (+XP)                    Prisma Level Recalculation
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              │
                         ┌────────────────────┴────────────────────┐
                         ▼                                         ▼
            Real-Time Broadcast (SSE)                  In-App Notification
                         │                                         │
             ┌───────────┴───────────┐                             │
             ▼                       ▼                             ▼
     User UI Updated         Admin UI Updated              Creator Notified
  (XP, Level, Rank, Graph)   (Points Directory)          (Approval Feedback)
```

### 1. Normal User Command Center (`/game-points`)
Component: [`PersonalGamificationDashboard.jsx`](file:///Users/piyush/Documents/Social%20Media%20Verification%20Portal/frontend/src/components/gamification/PersonalGamificationDashboard.jsx)
- **Authoritative Progress Card**: Displays active level tier, badge icon, current XP, threshold to next tier, XP remaining, and smooth progress percentage.
- **Rank & Percentile**: Real-time position (e.g., `#28 out of 100 creators`) computed via PostgreSQL with deterministic tie-breaking. Shows points needed to overtake the creator ahead.
- **Interactive XP Trajectory Chart** (`UserXPChart.jsx`): Date-aggregated chart supporting `7D`, `30D`, `3M`, `6M`, and `All Time` views with clean zero-states and SVG rendering.
- **Position Timeline** (`PositionTimeline.jsx`): Tracks rank changes over time.
- **Level Milestone Journey** (`DynamicLevelTimeline.jsx`): Visual progression roadmap mapping past, current, and locked tiers across 50 dynamic levels.
- **Itemized History Ledger** (`XPHistoryLedger.jsx`): Paginated transaction log showing source, date, delta XP, and activity status.

### 2. Admin Moderation & Points Management (`/admin/game-points`)
Component: [`GamePointsView.jsx`](file:///Users/piyush/Documents/Social%20Media%20Verification%20Portal/frontend/src/components/views/GamePointsView.jsx)
- **Creators Points Directory Table** (`AdminUsersPointsTable.jsx`): Server-side search, level filtering, activity status filtering, min/max XP bounds, and sorting.
- **User Dossier View** (`/admin/game-points/user/:id` / `AdminUserGamificationDossier.jsx`): Deep creator inspect view showing XP trajectory, submission history, activity distribution, and audit log events.
- **Manual XP Adjustments** (`AdminXPAdjustmentModal.jsx`): Allows administrators to manually grant or deduct XP (+/-) with mandatory audit justifications. Recalculates level and creates immutable audit entries automatically.
- **Admin Telemetry & Analytics** (`AdminGamificationAnalytics.jsx`): Live metrics for total XP distributed, average XP per user, active creators, and level distributions.

### 3. Super Admin Gamification Governance (`/super-admin/game-points`)
Component: [`SuperAdminGamificationCenter.jsx`](file:///Users/piyush/Documents/Social%20Media%20Verification%20Portal/frontend/src/components/views/SuperAdminGamificationCenter.jsx)
- **9-Tab Command Center**:
  1. 📊 **Overview**: Platform KPI metrics, top-tier distributions, and system health.
  2. 👥 **All Users**: Comprehensive creator directory with points and level status.
  3. 🛡️ **All Admins**: Staff governance and moderation activity overview.
  4. 🧾 **Transactions Explorer** (`/super-admin/game-points/transactions`): Global searchable ledger of all historical point awards, deductions, and adjustments.
  5. ⚡ **Levels**: Direct link to Level Management console for tier curve tuning.
  6. ⚙️ **XP Rules & Settings**: Configure dynamic XP earning rules (e.g. `LIKE = 1 XP`, `COMMENT = 2 XP`, `STORY = 2 XP`). *Historical transactions are strictly immutable; new rules only apply to future approvals.*
  7. 🏆 **Leaderboard**: Portal-wide community standings with timeframes (`all_time`, `this_month`, `this_week`).
  8. 📈 **Analytics**: Global platform growth charts, level cohorts, and activity breakdowns.
  9. 📋 **Audit Logs**: Filterable audit trail tracking all level edits, XP adjustments, and rule modifications.

### 4. Real-Time Event Synchronization & WebSockets
- **Event Broker Service** (`gamificationRealtimeService.js`): Uses Server-Sent Events (SSE) and WebSocket channels to stream events:
  - `xp_updated`: Pushes delta XP, updated total XP, new level, and progress to the affected user.
  - `level_up`: Triggers the 🎉 Level-Up Celebration Modal on the user's screen in real time.
  - `admin_user_xp_updated`: Pushes balance changes to admin points tables without requiring a manual browser refresh.
  - `rules_updated`: Broadcasts rule configuration updates to connected administrative clients.
- **Fallback State Synchronization** (`/api/gamification/realtime/sync-state`): When a client reconnects or detects a missed event, this endpoint compares local cached timestamps and hydrates the latest authoritative state.

---

## ⚙️ Super Admin Dynamic Level Engine

Super Administrators have full authority over the platform's progression structure via `LevelManagementView.jsx` and `/api/admin/levels`:
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
| `/api/gamification/me/rank` | `GET` | Authenticated | Current rank, total participants, percentile, and rank change |
| `/api/gamification/me/rank-history` | `GET` | Authenticated | Verified position timeline history |
| `/api/gamification/me/chart` | `GET` | Authenticated | XP progression over time (7D, 30D, 3M, 6M, All Time) |
| `/api/gamification/me/journey` | `GET` | Authenticated | Full interactive 50-level progression roadmap |
| `/api/gamification/me/history` | `GET` | Authenticated | Paginated XP transaction ledger with filters |
| `/api/gamification/leaderboard` | `GET` | Authenticated | Verified ranked leaderboard with deterministic tie-breaking |
| `/api/gamification/realtime/stream` | `GET` | Authenticated | Server-Sent Events (SSE) live event channel |
| `/api/gamification/realtime/sync-state` | `POST` | Authenticated | Reconnection & stale-state synchronization |
| `/api/admin/gamification/users` | `GET` | `ADMIN`, `SUPER_ADMIN` | Filterable and paginated creator points directory |
| `/api/admin/gamification/users/:id` | `GET` | `ADMIN`, `SUPER_ADMIN` | Detailed user gamification dossier |
| `/api/admin/gamification/users/:id/adjust-xp` | `POST` | `ADMIN`, `SUPER_ADMIN` | Manual XP adjustment (+/-) with audit logging |
| `/api/admin/gamification/analytics` | `GET` | `ADMIN`, `SUPER_ADMIN` | Admin gamification telemetry & XP distributions |
| `/api/superadmin/gamification/overview` | `GET` | `SUPER_ADMIN` | High-level governance KPIs and summary stats |
| `/api/superadmin/gamification/users` | `GET` | `SUPER_ADMIN` | System-wide user directory with XP and role filtering |
| `/api/superadmin/gamification/admins` | `GET` | `SUPER_ADMIN` | Staff administrator directory & audit governance |
| `/api/superadmin/gamification/transactions` | `GET` | `SUPER_ADMIN` | Global transactions ledger explorer with filters |
| `/api/superadmin/gamification/settings` | `GET`, `PUT` | `SUPER_ADMIN` | View and modify dynamic XP earning rules |
| `/api/superadmin/gamification/analytics` | `GET` | `SUPER_ADMIN` | Global analytics, cohorts, and daily/weekly trends |
| `/api/superadmin/gamification/audit-logs` | `GET` | `SUPER_ADMIN` | Gamification audit trail & rule change log |
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
| `/api/admin/levels` | `GET`, `POST` | `SUPER_ADMIN` | List and create dynamic levels |
| `/api/admin/levels/:id` | `PUT`, `DELETE`| `SUPER_ADMIN` | Edit or delete dynamic level entities |
| `/api/admin/levels/generate` | `POST` | `SUPER_ADMIN` | Bulk generate level progression curves |
| `/api/superadmin/users` | `GET`, `POST` | `SUPER_ADMIN` | Paginated user directory & account creation |
| `/api/superadmin/users/:id` | `PATCH`| `SUPER_ADMIN` | Update user details or reset password |
| `/api/superadmin/users/:id/status`| `PATCH`| `SUPER_ADMIN` | Toggle user status (Active / Inactive / Suspended) |
| `/api/superadmin/system-stats`| `GET` | `SUPER_ADMIN` | Platform analytics and distribution telemetry |
| `/api/superadmin/audit-logs` | `GET` | `SUPER_ADMIN` | System event audit logs |

---

## 🧪 Automated Testing Suite (32 Test Suites)

The repository includes a comprehensive 32-suite automated test harness verifying every layer of the platform:

```bash
# Run all test suites sequentially (safety protected by default)
cd backend && npm test

# Run all test suites with live database testing enabled:
cd backend && ALLOW_LIVE_DB_TESTING=true npm test

# Run a specific test suite directly:
cd backend && node src/tests/level_engine.test.js
cd backend && node src/tests/gamification_production_e2e.test.js
```

### Included Test Suites:

1. **`rbac.test.js`**: Automated tests validating the role-based permission matrix across all platform endpoints.
2. **`security_audit.test.js`**: Tests security headers, payload limits, JWT tamper resistance, IDOR protections, and file path traversal defenses.
3. **`workflow.test.js`**: Tests the complete submission lifecycle: creation, review, approval, rejection, state transitions, and creator notifications.
4. **`admin_review_workspace.test.js`**: Validates the professional Admin Review Workspace: RBAC on review APIs, dossier retrieval, queue navigation, internal notes, clarification requests, and human verification integrity.
5. **`search_and_filter.test.js`**: Validates server-side searching, multi-criteria filtering (status, platform, role, date range), sorting (asc/desc), pagination, and strict RBAC enforcement.
6. **`notification.test.js`**: Validates notification delivery, unread count tracking, cross-user isolation, and bulk read operations.
7. **`official_social_accounts.test.js`**: Validates official accounts CRUD, domain checks, handle formatting, and creator targeting.
8. **`profile_management.test.js`**: Validates password changes, policy checks, name updates, and privilege escalation prevention.
9. **`superadmin_dashboard.test.js`**: Tests superadmin metrics, arithmetic consistency, platform breakdown, and audit trails.
10. **`superadmin_users.test.js`**: Tests user management, pagination, role assignment, password hashing, and sole superadmin safeguards.
11. **`points_system.test.js`**: Validates point calculations (LIKE = 1, COMMENT = 2, STORY = 2), approval-triggered point awards, duplicate award prevention, 0 points on rejection, and points ledger consistency.
12. **`gamification_level_system.test.js`**: Validates authoritative 50-level calculations, dynamic variable thresholds, `/api/gamification/me`, XP transaction ledger, and guardrails against direct XP manipulation.
13. **`superadmin_levels.test.js`**: Validates Super Admin level management APIs, strict RBAC, CRUD operations, dynamic cumulative threshold recalculations, bulk level generation, and user XP baseline safety.
14. **`game_points_verification.test.js`**: End-to-end verification of points issuance, transaction ledger entries, and creator dashboard integration.
15. **`swagger.test.js`**: Validates Swagger / OpenAPI documentation endpoints and route definitions.
16. **`admin_gamification.test.js`**: Validates admin users points directory, user dossiers, manual XP adjustments (+/-), and admin telemetry.
17. **`superadmin_gamification.test.js`**: Validates super admin governance APIs: overview telemetry, global transaction ledger, dynamic XP earning rules, and audit logs.
18. **`complete_gamification_audit.test.js`**: Complete audit of transaction immutability, points ledger balance reconciliation, and level boundary compliance.
19. **`submission_xp_awarding.test.js`**: Tests automated XP awarding on submission approval, rejection handling, and duplicate approval prevention.
20. **`level_engine.test.js`**: Mathematical tests for the dynamic level curve: non-uniform thresholds, maximum level handling, deactivated tiers, and edge cases.
21. **`gamification_analytics_graphs.test.js`**: Tests backend chart aggregation across 7D, 30D, 3M, 6M, and All Time, single transactions, empty datasets, and date boundary handling.
22. **`gamification_authorization_audit.test.js`**: Rigorous penetration test suite attempting privilege escalations, IDOR attacks, and unauthorized access across user, admin, and superadmin endpoints (verifies `401 Unauthorized` and `403 Forbidden`).
23. **`gamification_comprehensive_system.test.js`**: 32-point specification test suite covering XP math, level engine, ranking, RBAC, audit logging, notifications, and database transaction atomicity.
24. **`gamification_realtime_system.test.js`**: Tests real-time SSE / WebSocket event streams, live XP broadcasts, level-up celebrations, admin table refreshes, and stale-state synchronization.
25. **`gamification_production_e2e.test.js`**: Comprehensive 18-step production lifecycle test verifying the entire workflow from user registration and submission approval to manual adjustment, rule updates, historical immutability, mobile pagination, and authorization defense.
26. **`transactional_email_system.test.js`**: Verifies transactional email pipeline, nodemailer SMTP integration, live mail telemetry, delivery status, and graceful error trapping.
27. **`superadmin_email_control_center.test.js`**: Validates Super Admin transactional email control center APIs, event toggles, template previews, and test email sending.
28. **`portal_activity_email_integration.test.js`**: End-to-end integration tests verifying email dispatch on registration, submission received, review feedback, XP awarded, and level up.
29. **`ranking_system.test.js`**: Validates PostgreSQL window ranking, deterministic tie-breaking, percentile computation, and pagination.
30. **`strict_submission_verification.test.js`**: Strict validation tests for URL structures, supported platforms, magic-byte verified file buffers, and duplicate submission blocks.
31. **`xp_adjustment_system.test.js`**: Audited manual XP balance adjustment verification, positive bonuses, negative penalties, and non-negative floor enforcement.
32. **`admin_user_visibility.test.js`**: Validates moderator directory scoping, creator dossier inspection, and RBAC visibility isolation.

---

## 📄 License & Copyright

Copyright © 2026 [**Piyush Jain**](https://linkedin.com/in/piyushjain1857). All rights reserved.

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for complete license terms and permissions.
