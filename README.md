# 🛡️ Social Media Activity Verification Portal

An enterprise-grade full-stack platform designed to verify creator campaign activities across major social media networks (**Instagram**, **LinkedIn**, **Facebook**) with **3-Tier Role-Based Access Control (RBAC)**: **Super Admin**, **Admin**, and **Normal User**.

---

## 📌 Project Architecture

```
Social Media Verification Portal/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   │   └── 20260930185800_init_portal_schema/
│   │   │       └── migration.sql # Complete PostgreSQL schema migration
│   │   └── schema.prisma         # Models: User, SocialAccount, Submission, Review, Notification
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js             # PrismaClient singleton & connection health check
│   │   │   └── env.js            # Environment variables loader
│   │   ├── controllers/
│   │   │   └── healthController.js # Health, DB status & schema telemetry endpoints
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.js  # JWT validation & role-based authorization
│   │   │   └── errorHandler.js   # Global express error handler
│   │   ├── routes/
│   │   │   ├── healthRoutes.js   # Endpoints (/api/health, /api/database/status, /api/info)
│   │   │   └── index.js          # Main API routing registry
│   │   ├── utils/
│   │   │   ├── hash.js           # bcrypt password hashing and comparison
│   │   │   └── jwt.js            # JWT signing and verification
│   │   ├── app.js                # Express app setup (CORS, parser, logger)
│   │   └── server.js             # Resilient server listener with port conflict fallback
│   ├── .env                      # Local backend environment (PORT=5001)
│   ├── .env.example              # Example environment template
│   ├── .gitignore                # Backend gitignore
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DevDatabaseDashboard.jsx # Development Database & Telemetry Inspector
│   │   │   ├── Footer.jsx        # Branding and footer metadata
│   │   │   ├── Header.jsx        # Navigation, view switcher & dual status pills
│   │   │   ├── HealthCheckWidget.jsx # Interactive telemetry tester
│   │   │   ├── Hero.jsx          # Hero section with CTA & metrics
│   │   │   ├── RoleOverview.jsx  # Interactive 3-tier role cards
│   │   │   └── TechStackBadge.jsx # Architecture breakdown
│   │   ├── services/
│   │   │   └── api.js            # API client wrapper (fetchHealth, fetchDatabaseStatus)
│   │   ├── styles/
│   │   │   ├── app.css           # Layouts, components, and dashboard styles
│   │   │   └── index.css         # Design system tokens and glassmorphism
│   │   ├── App.jsx               # Main application routing (Portal & Dev DB Console)
│   │   └── main.jsx              # React DOM entrypoint
│   ├── index.html                # HTML5 template with Google Fonts & SEO
│   ├── vite.config.js            # Vite config with backend proxy (/api -> :5001)
│   ├── .env                      # Local frontend environment (VITE_API_BASE_URL)
│   ├── .env.example              # Example environment template
│   ├── .gitignore                # Frontend gitignore
│   └── package.json
│
├── .gitignore                    # Monorepo root gitignore
├── package.json                  # Root scripts & workspaces orchestration
└── README.md                     # Documentation
```

---

## 🗄️ PostgreSQL Database Schema (Prisma)

### Enums
- **`Role`**: `SUPER_ADMIN`, `ADMIN`, `USER`
- **`UserStatus`**: `ACTIVE`, `INACTIVE`, `SUSPENDED`
- **`Platform`**: `INSTAGRAM`, `LINKEDIN`, `FACEBOOK`
- **`ActionType`**: `LIKE`, `COMMENT`, `STORY`
- **`SubmissionStatus`**: `PENDING`, `APPROVED`, `REJECTED`
- **`NotificationType`**: `SUBMISSION_UPDATE`, `REVIEW_FEEDBACK`, `ACCOUNT_ALERT`, `SYSTEM`

### Models & Relational Architecture

#### 1. `User`
- **Fields**: `id` (UUID, PK), `name`, `email` (Unique), `password` (bcrypt hash), `role` (`Role`), `status` (`UserStatus`), `createdAt`, `updatedAt`
- **Relations**:
  - `socialAccounts`: One-to-many with `SocialAccount`
  - `submissions`: One-to-many with `Submission`
  - `reviews`: One-to-many with `Review` (when user role is `ADMIN`)
  - `notifications`: One-to-many with `Notification`
- **Indexes**: `email`, `role`, `status`

#### 2. `SocialAccount`
- **Fields**: `id` (UUID, PK), `userId` (FK -> User), `platform` (`Platform`), `handle`, `profileUrl`, `isVerified`, `createdAt`, `updatedAt`
- **Relations**:
  - `user`: Belongs to `User` (onDelete: Cascade)
  - `submissions`: One-to-many with `Submission`
- **Constraints & Indexes**: `@@unique([userId, platform, handle])`, `userId`, `platform`

#### 3. `Submission`
- **Fields**: `id` (UUID, PK), `userId` (FK -> User), `socialAccountId` (FK -> SocialAccount), `platform` (`Platform`), `actionType` (`ActionType`), `postUrl`, `screenshotUrl`, `description`, `status` (`SubmissionStatus`), `createdAt`, `updatedAt`
- **Relations**:
  - `user`: Belongs to `User` (onDelete: Cascade)
  - `socialAccount`: Belongs to official `SocialAccount` (onDelete: Restrict)
  - `reviews`: One-to-many with `Review`
- **Indexes**: `userId`, `socialAccountId`, `[platform, actionType]`, `status`, `createdAt`

#### 4. `Review`
- **Fields**: `id` (UUID, PK), `submissionId` (FK -> Submission), `adminId` (FK -> User), `status` (`SubmissionStatus`), `feedback`, `createdAt`, `updatedAt`
- **Relations**:
  - `submission`: Belongs to `Submission` (onDelete: Cascade)
  - `admin`: Belongs to `User` reviewer (onDelete: Restrict)
- **Indexes**: `submissionId`, `adminId`, `status`, `createdAt`

#### 5. `Notification`
- **Fields**: `id` (UUID, PK), `userId` (FK -> User), `type` (`NotificationType`), `title`, `message`, `isRead`, `metadata` (JSONB), `createdAt`, `updatedAt`
- **Relations**:
  - `user`: Belongs to `User` (onDelete: Cascade)
- **Indexes**: `userId`, `isRead`, `createdAt`

---

## ⚡ Tech Stack

| Layer | Technology | Key Details |
|---|---|---|
| **Frontend** | React 19 + Vite 6 | Fast modern JSX with instant HMR |
| **Styling** | Pure Vanilla CSS | Custom glassmorphism, HSL dark mode palette, zero Tailwind/Bootstrap |
| **Backend** | Node.js + Express.js | Modular REST architecture, CORS, structured logging |
| **Database** | PostgreSQL | Relational schema for users, accounts, submissions, reviews, notifications |
| **ORM** | Prisma 6 | Declarative data modeling, migrations, and type-safe client |
| **Auth Foundation** | JWT + bcryptjs | Token-based sessions with role claims & salted password hashes |

---

## 👥 3-Tier Role Governance

1. **Super Admin (`SUPER_ADMIN`)**
   - Full platform administration and global settings.
   - User and administrator lifecycle management.
   - Global verification policies, audit logs, and system metrics.

2. **Admin (`ADMIN`)**
   - Operational queue of submitted activities.
   - Evidence validation (links, proofs, engagement metrics).
   - Approval, rejection, and review feedback.

3. **Normal User (`USER`)**
   - Connect social identities (**Instagram**, **LinkedIn**, **Facebook**).
   - Submit campaign activity proofs and verification requests.
   - Live status tracking (`PENDING`, `APPROVED`, `REJECTED`).

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** >= 18 (Tested on Node v24)
- **npm** >= 9
- **PostgreSQL** instance (optional for initial health check, required for running migrations)

### 2. Installation
Install all dependencies across root, backend, and frontend with a single command:
```bash
npm run install:all
```

### 3. Environment Setup

#### Backend (`backend/.env`):
```env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/social_verification_portal?schema=public
JWT_SECRET=super_secret_jwt_key_verification_portal_2026
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

#### Frontend (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:5001/api
```

### 4. Database Setup & Migrations (Prisma + PostgreSQL)
Generate the Prisma Client:
```bash
npm run prisma:generate
```

Apply database migrations:
```bash
npm run prisma:migrate
```

Open Prisma Studio:
```bash
npx prisma studio --schema backend/prisma/schema.prisma
```

---

## 🖥️ Running the Application

### Option A: Run Both Concurrently (Recommended)
From the root directory:
```bash
npm run dev
```
- Frontend will be live at: [http://localhost:5173](http://localhost:5173)
- Backend will be live at: [http://localhost:5001](http://localhost:5001)

### Option B: Run Independently

#### Run Backend:
```bash
npm run dev:backend
# or: cd backend && npm run dev
```

#### Run Frontend:
```bash
npm run dev:frontend
# or: cd frontend && npm run dev
```

---

## 📡 API Endpoints

- `GET /api/health`: Health status, server uptime, environment, and DB status summary.
- `GET /api/database/status`: Detailed PostgreSQL connection status, models list, and schema definition.
- `GET /api/info`: Portal description and 3-tier role descriptions.
