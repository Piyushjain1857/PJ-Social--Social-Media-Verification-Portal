# 🛡️ VeriSocial: Social Media Activity Verification Portal

VeriSocial is an enterprise-grade full-stack platform engineered to verify creator campaign activities across major social media platforms (**Instagram**, **LinkedIn**, and **Facebook**) under a strict **3-Tier Role-Based Access Control (RBAC)** architecture: **Super Admin**, **Admin Moderator**, and **Normal User (Creator)**.

---

## 📑 Table of Contents

- [Overview](#-overview)
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
- [API Reference Matrix](#-api-reference-matrix)
- [Automated Testing Suite](#-automated-testing-suite)
- [Global Search & Filtering Architecture](#-global-search--filtering-architecture)
- [Gamification & Points System](#-gamification--points-system)

---

## 🌟 Overview

The Social Media Verification Portal provides an audited pipeline for college and brand campaigns:
1. **Creators (`USER`)**: Browse verified official college social media accounts, submit evidence proofs (post permalinks, activity types like Like, Comment, or Story, and screenshot evidence), track their submissions in real-time, receive instant notifications on moderation verdicts, and manage their profile and passwords.
2. **Moderators (`ADMIN`)**: Access a high-throughput **Professional Verification Workspace** featuring a two-pane layout (filterable queue on left, deep verification dossier on right), keyboard shortcuts (`A` Approve, `R` Reject, `N` Next, `P` Previous), confirmation modals for destructive verdicts, internal auditor notes, creator clarification requests, human verification inspection checklists, and queue navigation with audit history.
3. **Super Administrators (`SUPER_ADMIN`)**: Retain full system governance. Manage official institutional accounts (Instagram, LinkedIn, Facebook with domain validation), administer all platform users and moderator appointments, inspect audit trails, adjust verification policies, review any submission, and view platform-wide telemetry.

---

## ⚡ Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React 19 + Vite 6 | Modern modular SPA with lightning-fast HMR and build optimization |
| **Styling** | Pure Vanilla CSS | Bespoke glassmorphism design system, HSL dark mode palette, zero third-party CSS bloat |
| **Backend** | Node.js + Express.js | Enterprise RESTful architecture, helmet security headers, and modular layering |
| **Database** | PostgreSQL | Robust relational database hosting models for users, accounts, submissions, reviews, and notifications |
| **ORM** | Prisma 6 | Declarative data modeling, automated SQL migrations, and type-safe client |
| **Security & Auth** | JWT (`jsonwebtoken`) + `bcryptjs` | Stateless signed tokens, salt rounds of 12, IDOR protections, and server-side role gating |
| **File Storage** | `multer` + Storage Service | Auth-gated screenshot storage with magic-byte MIME validation and path traversal defenses |

---

## 📂 Folder Structure

```
Social Media Verification Portal/
├── package.json                          # Monorepo workspaces orchestrator & root scripts
├── package-lock.json
├── .gitignore
├── README.md                             # Comprehensive project manual
│
├── backend/
│   ├── .env                              # Active backend environment configuration
│   ├── .env.example                      # Reference template for backend variables
│   ├── .gitignore
│   ├── package.json                      # Backend dependencies and test scripts
│   ├── prisma/
│   │   ├── schema.prisma                 # Core Prisma relational schema
│   │   ├── seed.js                       # Demo accounts seeding script
│   │   └── migrations/
│   │       └── 20260930185800_init_portal_schema/
│   │           └── migration.sql         # Baseline PostgreSQL migration
│   ├── uploads/
│   │   └── screenshots/                  # Auth-gated storage directory for uploaded evidence
│   └── src/
│       ├── app.js                        # Express app configuration, Helmet, CORS, parser limits
│       ├── server.js                     # HTTP server startup with automatic port fallback
│       ├── config/
│       │   ├── db.js                     # PrismaClient singleton with connection diagnostics
│       │   └── env.js                    # Validated environment loader
│       ├── controllers/
│       │   ├── authController.js         # Register, login, me, logout handlers
│       │   ├── dashboardController.js    # Scoped telemetry for user, admin, super-admin
│       │   ├── healthController.js       # Health and database telemetry endpoints
│       │   ├── notificationController.js # Read / read-all notification handlers
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
│       │   ├── socialAccountRepository.js# Official social account database ops
│       │   ├── submissionRepository.js   # Submissions & moderation reviews store
│       │   └── userRepository.js         # User store with password-hash sanitization
│       ├── routes/
│       │   ├── authRoutes.js             # /api/auth
│       │   ├── dashboardRoutes.js        # /api/dashboard
│       │   ├── healthRoutes.js           # /api/health, /api/database/status, /api/info
│       │   ├── notificationRoutes.js     # /api/notifications
│       │   ├── reviewRoutes.js           # /api/reviews
│       │   ├── socialAccountRoutes.js    # /api/social-accounts
│       │   ├── submissionRoutes.js       # /api/submissions
│       │   ├── superAdminRoutes.js       # /api/superadmin
│       │   ├── uploadRoutes.js           # /api/uploads
│       │   ├── userRoutes.js             # /api/users
│       │   └── index.js                  # Central router registration
│       ├── tests/
│       │   ├── notification.test.js      # Notifications workflow & isolation tests
│       │   ├── official_social_accounts.test.js # Official account governance tests
│       │   ├── profile_management.test.js# Profile & password security tests
│       │   ├── rbac.test.js              # 42-point core role authorization suite
│       │   ├── run_all_tests.js          # Master automated test runner
│       │   ├── security_audit.test.js    # Headers, IDOR, and privilege escalation tests
│       │   ├── superadmin_dashboard.test.js # Analytics & metrics integrity tests
│       │   ├── superadmin_users.test.js  # User lifecycle CRUD & safeguards tests
│       │   └── workflow.test.js          # End-to-end submission & review cycle tests
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
        │   └── api.js                    # Universal API abstraction client
        ├── styles/
        │   ├── app.css                   # Component-level layout rules & badges
        │   ├── index.css                 # Color tokens, typography, glassmorphism
        │   └── layout.css                # Responsive sidebar, drawer, and grids
        ├── pages/
        │   ├── LoginPage.jsx             # Credentials authentication & quick demo selector
        │   ├── UserSpace.jsx             # Standalone creator space (legacy support)
        │   ├── AdminSpace.jsx            # Standalone admin moderator space (legacy support)
        │   └── SuperAdminSpace.jsx       # Standalone superadmin space (legacy support)
        └── components/
            ├── Header.jsx                # Public navigation header & latency monitor
            ├── Footer.jsx                # Public footer
            ├── Hero.jsx                  # Hero section with primary CTAs
            ├── MainLayout.jsx            # Authenticated application shell & sidebar
            ├── ProtectedRoute.jsx        # Role clearance router guard
            ├── RoleOverview.jsx          # Interactive 3-tier role cards
            ├── ScreenshotImage.jsx       # Authenticated blob image loader for screenshots
            ├── TechStackBadge.jsx        # Architecture details pill
            ├── Unauthorized403.jsx       # Dedicated 403 Forbidden Access Denied page
            ├── HealthCheckWidget.jsx     # Live backend connectivity tester
            ├── DevDatabaseDashboard.jsx  # Interactive database telemetry console
            └── views/
                ├── DashboardView.jsx     # Role-specific dashboard (User, Admin, Super Admin)
                ├── SubmitActivityView.jsx# Creator submission form with drag-and-drop
                ├── MySubmissionsView.jsx # Creator submission history & status modal
                ├── ReviewSubmissionsView.jsx # Moderator review queue & verdict modal
                ├── SubmissionsView.jsx   # Global submissions directory
                ├── UsersView.jsx         # Super Admin user CRUD & status control
                ├── AdminsView.jsx        # Administrative staff directory & governance
                ├── SocialAccountsView.jsx# Official accounts management & stats
                ├── NotificationsView.jsx # User notifications & mark-all-read
                ├── ProfileView.jsx       # Profile editor & password change
                └── SettingsView.jsx      # System policies & anti-abuse thresholds
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5001` | TCP port on which the Express API server listens |
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

From the project root or the `backend` directory:

```bash
# Generate the Prisma Client
npm run prisma:generate

# Apply pending database migrations to PostgreSQL
npm run prisma:migrate

# Seed demo accounts (Super Admin, Admin, Normal User)
npm run db:seed --prefix backend

# (Optional) Open Prisma Studio visual database browser:
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

# Execute all automated test suites (8 comprehensive test suites)
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
# or from frontend directory: npm run build
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
| **`SUPER_ADMIN`** | `superadmin@portal.com` | `SuperAdmin123!` | Full system governance, view telemetry, manage users/admins, create/toggle official social accounts, review all submissions, view audit logs |
| **`ADMIN`** | `admin@portal.com` | `Admin123!` | Access moderator dashboard, inspect review queue, approve/reject submissions with feedback, view users directory (cannot manage roles) |
| **`USER`** | `user@portal.com` | `User123!` | View creator dashboard, submit activity evidence, upload screenshot proof, view personal submission history, receive notifications, update profile |

---

## 🔒 Security Guardrails & IDOR Protection

1. **Strict Server-Side RBAC**: Role information sent by clients in registration or profile updates is ignored. Public registrations are strictly assigned `USER`.
2. **Privilege Escalation Defenses**: Only `SUPER_ADMIN` can modify user roles. Admins cannot promote users to Super Admin or alter other administrators.
3. **IDOR (Insecure Direct Object Reference) Protection**:
   - `GET /api/submissions/:id`: Creators can only access their own submissions. Attempting to view another user's submission returns `403 Forbidden` (`FORBIDDEN_OWNERSHIP`).
   - `PATCH /api/notifications/:id/read`: Users can only mark their own notifications as read.
4. **Auth-Gated Screenshot Delivery**:
   - `/api/uploads/screenshots/:filename` strictly enforces that Normal Users can only stream screenshots associated with their own submissions. Unauthorized attempts return `404 Not Found` without disclosing file existence.
5. **No Password Leakage**: Password hashes are strictly omitted (`select` exclusion) across all user listing, search, profile, and audit endpoints.
6. **File Upload Security**: Screenshot uploads enforce memory buffer inspection with magic-byte signature validation (JPEG `ffd8ff`, PNG `89504e47`, WebP, GIF), 5MB size limits, and sanitization against path traversal.
7. **Security Headers**: Helmet configured with `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and disabled `X-Powered-By` header.

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
| `/api/social-accounts/active` | `GET` | Authenticated | List official active accounts available for submission |
| `/api/submissions` | `POST` | `USER` | Submit activity proof with screenshot evidence |
| `/api/submissions/my` | `GET` | Authenticated | List submissions owned by the authenticated caller |
| `/api/submissions/:id` | `GET` | Authenticated | View submission details (IDOR protected for creators) |
| `/api/submissions` | `GET` | `ADMIN`, `SUPER_ADMIN` | View all platform submissions for moderation |
| `/api/reviews/pending` | `GET` | `ADMIN`, `SUPER_ADMIN` | Filterable and paginated moderation review queue |
| `/api/reviews/submission/:id` | `GET` | `ADMIN`, `SUPER_ADMIN` | Comprehensive submission review dossier with creator history & audit details |
| `/api/reviews/:id/navigation` | `GET` | `ADMIN`, `SUPER_ADMIN` | Queue navigation metrics (`prevId`, `nextId`, `currentIndex`, `totalQueue`) |
| `/api/reviews/:id/notes` | `POST` | `ADMIN`, `SUPER_ADMIN` | Add internal auditor notes attached to the submission dossier |
| `/api/reviews/:id/clarification` | `POST` | `ADMIN`, `SUPER_ADMIN` | Request clarification from creator with automated notification |
| `/api/reviews/:id/history` | `GET` | `ADMIN`, `SUPER_ADMIN` | Complete timeline of audit reviews, internal notes, and clarifications |
| `/api/reviews/:id/approve` | `POST` | `ADMIN`, `SUPER_ADMIN` | Approve submission and generate creator notification |
| `/api/reviews/:id/reject` | `POST` | `ADMIN`, `SUPER_ADMIN` | Reject submission with mandatory structured feedback |
| `/api/notifications` | `GET` | Authenticated | Retrieve user notifications & unread badge count |
| `/api/notifications/:id/read`| `PATCH`| Authenticated | Mark a notification as read (ownership protected) |
| `/api/notifications/read-all`| `PATCH`| Authenticated | Mark all notifications as read for current user |
| `/api/uploads/screenshots/:fn`| `GET` | Authenticated | Auth-gated screenshot stream (ownership validated) |
| `/api/superadmin/users` | `GET` | `SUPER_ADMIN` | Paginated user directory with search and filter |
| `/api/superadmin/users` | `POST`| `SUPER_ADMIN` | Create user or administrator account |
| `/api/superadmin/users/:id` | `PATCH`| `SUPER_ADMIN` | Update user details or reset password |
| `/api/superadmin/users/:id/status`| `PATCH`| `SUPER_ADMIN` | Toggle user status (Active / Inactive / Suspended) |
| `/api/superadmin/social-accounts` | `GET` | `SUPER_ADMIN` | List and manage official social media accounts |
| `/api/superadmin/social-accounts` | `POST`| `SUPER_ADMIN` | Register official social media account with URL validation |
| `/api/superadmin/system-stats`| `GET` | `SUPER_ADMIN` | Platform analytics and distribution telemetry |
| `/api/superadmin/audit-logs` | `GET` | `SUPER_ADMIN` | System event audit logs |

---

## 🧪 Automated Testing Suite

The repository includes a comprehensive 10-suite test harness verifying every layer of the platform:

```bash
npm test
```

### Included Test Suites:
1. **`rbac.test.js`**: 42 automated tests validating the role-based permission matrix across all endpoints.
2. **`security_audit.test.js`**: Tests security headers, payload limits, JWT tamper resistance, IDOR protections, and file path traversal.
3. **`workflow.test.js`**: Tests the complete submission lifecycle: creation, review, approval, rejection, state transitions, and creator notifications.
4. **`admin_review_workspace.test.js`**: Validates the professional Admin Review Workspace: RBAC protection on review APIs, dossier retrieval, queue navigation, internal notes, clarification requests, and human verification integrity.
5. **`notification.test.js`**: Validates notification delivery, unread count tracking, cross-user isolation, and bulk read operations.
6. **`official_social_accounts.test.js`**: Validates official accounts CRUD, domain checks, handle formatting, and creator targeting.
7. **`profile_management.test.js`**: Validates password changes, policy checks, name updates, and privilege escalation prevention.
8. **`superadmin_dashboard.test.js`**: Tests superadmin metrics, arithmetic consistency, platform breakdown, and audit trails.
9. **`superadmin_users.test.js`**: Tests user management, pagination, role assignment, password hashing, and sole superadmin safeguards.
10. **`search_and_filter.test.js`**: Validates server-side searching, multi-criteria filtering (status, platform, role, date range, reviewer, user), sorting (asc/desc), pagination, result count metrics, and strict RBAC enforcement across all directory endpoints.
11. **`points_system.test.js`**: Validates point calculations (LIKE = 1, COMMENT = 2, STORY = 2), approval-triggered point awards, duplicate award prevention, 0 points on rejection, points history pagination, RBAC on point inspection and adjustments, and audit consistency.

---

## 🔍 Global Search & Filtering Architecture

VeriSocial implements a high-performance, server-side search and filtering engine across all key portals:
- **Global Search Modal (`⌘K` / `Ctrl+K`)**: Instant modal search accessible anywhere in the portal with keyboard navigation (`↑`/`↓`/`Enter`/`Esc`), live categorization, and direct deep-linking into Submissions, Users, Admins, Social Accounts, and Notifications.
- **Unified `/api/search` Endpoint**: Server-side cross-entity search returning grouped results with strict RBAC:
  - `USER`: searches only user's own submissions, user's own notifications, and active official accounts.
  - `ADMIN`: searches all submissions, creator users, notifications, and official accounts.
  - `SUPER_ADMIN`: searches all submissions, all users, administrators, official accounts, and system notifications.
- **Submissions & My Submissions**: Filter by `status` (PENDING, APPROVED, REJECTED), `platform` (INSTAGRAM, LINKEDIN, FACEBOOK), `actionType` (LIKE, COMMENT, STORY), `reviewerId` (moderator), `userId` (creator), date range (`startDate`, `endDate`), and text search across post permalinks, notes, or creator names.
- **Platform Directory (Users & Admins)**: Search by name or email, filter by `role` (USER, ADMIN, SUPER_ADMIN), `status` (ACTIVE, INACTIVE, SUSPENDED), date range, and sort by registration date, name, or role.
- **Official Social Accounts**: Search handles or descriptions, filter by platform and active status, and sort by creation date or name.
- **Notification Center**: Search alert titles or messages, filter by alert category (APPROVAL, REJECTION, ACCOUNT_ALERT, SYSTEM_ALERT) and read status (UNREAD, READ), with date range and sort controls.

### Performance & Database Optimizations:
- **Database Indexes**: Compound indexes in PostgreSQL/Prisma on `Submission(status, createdAt)`, `Submission(userId, status, createdAt)`, `Submission(platform, status)`, `User(role, status)`, `User(name)`, `SocialAccount(platform, isActive)`, and `Notification(userId, isRead, createdAt)`.
- **Reusable Frontend Components**: Modular UI primitives in `frontend/src/components/common/`:
  - `GlobalSearchModal.jsx`: Command-palette style global search with keyboard navigation (`⌘K` / `Ctrl+K`).
  - `FilterBar.jsx`: Debounced search, multi-filter dropdowns, date pickers, sort toggles, and clear filters.
  - `Pagination.jsx`: Smart ellipsis pagination, page size selector, and result count summaries.
  - `EmptyState.jsx`: Clean glassmorphic zero-state cards with reset actions.
  - `LoadingSkeleton.jsx`: Shimmer table and card skeletons.
- **Server-Side Pagination & Filtering**: Zero client-side bloat — queries leverage Prisma `skip`, `take`, and `count` to maintain lightning-fast response times even on large datasets.

---

## 🏆 Gamification & Points System

VeriSocial features a unified, auditable gamification engine that rewards creators for verified institutional social media engagement:

### Point Rules:
- **Like (`LIKE`)**: **+1 Point** for liking an official post or update.
- **Comment (`COMMENT`)**: **+2 Points** for substantive commentary or feedback on official discussion threads.
- **Story (`STORY`)**: **+2 Points** for sharing campaign collateral to an active 24-hr story.
- **Bonus / Adjustment (`BONUS` / `ADJUSTMENT`)**: Variable points awarded for special campus campaigns or authorized administrative adjustments.

### Configurable Level System:
Levels are calculated on the backend via `calculateUserLevel`:
- **Level 1 — Beginner** (`0–99 pts`): Initial onboarding tier with sprout badge 🌱
- **Level 2 — Active** (`100–249 pts`): Consistent engagement tier with electric badge ⚡
- **Level 3 — Contributor** (`250–499 pts`): High-value contributor tier with rocket badge 🚀
- **Level 4 — Elite** (`500–999 pts`): Campus ambassador tier with diamond badge 💎
- **Level 5 — Champion** (`1000+ pts`): Top-tier institutional champion with crown badge 👑

### Lifecycle & Guardrails:
1. **Approval Gating**: Points are awarded **ONLY** when a submission receives an `APPROVED` verdict from an authenticated Admin or Super Admin.
2. **Zero Points for Pending / Rejected**: Submissions in `PENDING` or `REJECTED` status award zero points.
3. **Strict Duplicate Prevention**: The points service enforces submission idempotency: once points are awarded for a submission, subsequent approval calls or duplicates are strictly blocked.
4. **Auditable Transaction Ledger**: Points are never stored solely as a mutable scalar. Every point change creates an immutable `PointTransaction` record linked to the user, submission, and reviewer.
5. **Super Admin Adjustments**: Only Super Admins can execute manual adjustments via `POST /api/points/adjust`, requiring a mandatory target user, point delta, and audit justification reason.
6. **Automated Notifications**: Users receive instant notifications when points are awarded and whenever their balance pushes them into a new level tier.
7. **Privacy-Preserving Leaderboard**: Public leaderboard rankings expose only display names, levels, and point metrics. Private emails, phone numbers, and security credentials remain protected.

### Reusable Gamification Components:
Located in `frontend/src/components/gamification/`:
- **`LevelBadge.jsx`**: Renders tier icons, level titles, and glowing borders (`sm`, `md`, `lg`).
- **`LevelProgress.jsx`**: Animated progress bar displaying current level, next level threshold, progress percentage, and remaining points needed.
- **`PointsCard.jsx`**: Metric cards for total points (⭐), points earned this week (📈), points earned this month (📊), and activity breakdown pills (❤️ Likes, 💬 Comments, 📱 Stories).
- **`RankCard.jsx`**: Displays caller's rank (`#14`), points, and exact point difference to overtake the next higher rank (`#13`).
- **`PointHistory.jsx`**: Paginated transaction history table with search, action type filter, date range pickers, and status tags.
- **`Leaderboard.jsx`**: Portal-wide leaderboard with timeframe tabs (`All Time`, `This Month`, `This Week`), top 3 podium layout, and current-user row highlighting.
- **`GamificationSummary.jsx`**: Comprehensive multi-tab gamification portal uniting overview metrics, leaderboard, transaction history, admin overview, and Super Admin audit ledger.

### Gamification Endpoints:
| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/api/points/me` | Authenticated | Fetch caller's points summary, level, weekly/monthly earnings, and breakdown |
| `GET` | `/api/points/me/rank` | Authenticated | Fetch caller's leaderboard rank and distance to next higher rank |
| `GET` | `/api/points/me/history` | Authenticated | Paginated point transactions with search, filter, and sort controls |
| `GET` | `/api/leaderboard` | Authenticated | Portal-wide leaderboard sorted by points with `all_time`, `this_month`, `this_week` timeframes |
| `GET` | `/api/points/admin/overview` | `ADMIN`, `SUPER_ADMIN` | Creator directory overview with levels, total points, and approved submissions count |
| `GET` | `/api/points/user/:id` | `ADMIN`, `SUPER_ADMIN` | Inspect another user's verified points and level details |
| `GET` | `/api/points/all` | `SUPER_ADMIN` | Global platform-wide point transaction audit ledger |
| `POST` | `/api/points/adjust` | `SUPER_ADMIN` | Execute manual balance adjustments with mandatory justification reason |


