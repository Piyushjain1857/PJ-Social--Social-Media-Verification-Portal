# 🛡️ Social Media Activity Verification Portal

An enterprise-grade full-stack platform designed to verify creator campaign activities across major social media channels (Twitter/X, YouTube, Instagram, LinkedIn, Facebook, TikTok) featuring **3-Tier Role-Based Access Control (RBAC)**.

---

## 📌 Project Architecture

```
Social Media Verification Portal/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Prisma Schema: User, SocialAccount, ActivitySubmission
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js             # PrismaClient singleton configuration
│   │   │   └── env.js            # Environment variables loader
│   │   ├── controllers/
│   │   │   └── healthController.js # System health check and diagnostics
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.js  # JWT validation & role-based authorization
│   │   │   └── errorHandler.js   # Global express error handler
│   │   ├── routes/
│   │   │   ├── healthRoutes.js   # Health endpoints (/api/health, /api/info)
│   │   │   └── index.js          # API routing registry
│   │   ├── utils/
│   │   │   ├── hash.js           # bcrypt password hashing and comparison
│   │   │   └── jwt.js            # JWT signing and verification
│   │   ├── app.js                # Express app setup (CORS, parser, logger)
│   │   └── server.js             # Server listener & graceful shutdown
│   ├── .env                      # Local backend environment
│   ├── .env.example              # Example environment template
│   ├── .gitignore                # Backend gitignore
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Footer.jsx        # Branding and footer metadata
│   │   │   ├── Header.jsx        # Navigation & live API status indicator
│   │   │   ├── HealthCheckWidget.jsx # Interactive telemetry tester
│   │   │   ├── Hero.jsx          # Hero section with CTA & metrics
│   │   │   ├── RoleOverview.jsx  # Interactive 3-tier role cards
│   │   │   └── TechStackBadge.jsx # Architecture breakdown
│   │   ├── services/
│   │   │   └── api.js            # API client wrapper
│   │   ├── styles/
│   │   │   ├── app.css           # Layouts and component styles
│   │   │   └── index.css         # Design system tokens and glassmorphism
│   │   ├── App.jsx               # Main landing application
│   │   └── main.jsx              # React DOM entrypoint
│   ├── index.html                # HTML5 template with Google Fonts & SEO
│   ├── vite.config.js            # Vite config with backend proxy (/api)
│   ├── .env                      # Local frontend environment
│   ├── .env.example              # Example environment template
│   ├── .gitignore                # Frontend gitignore
│   └── package.json
│
├── .gitignore                    # Monorepo root gitignore
├── package.json                  # Root scripts & workspaces orchestration
└── README.md                     # Documentation
```

---

## ⚡ Tech Stack

| Layer | Technology | Key Details |
|---|---|---|
| **Frontend** | React 19 + Vite 6 | Fast modern JSX with instant HMR |
| **Styling** | Pure Vanilla CSS | Custom glassmorphism, HSL dark mode palette, zero Tailwind/Bootstrap |
| **Backend** | Node.js + Express.js | Modular REST architecture, CORS, structured logging |
| **Database** | PostgreSQL | Relational schema for users, accounts, and submissions |
| **ORM** | Prisma 6 | Declarative data models and migrations |
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
   - Approval, rejection, and dispute notes.

3. **Normal User (`USER`)**
   - Connect social identities (Twitter/X, YouTube, Instagram, LinkedIn, etc.).
   - Submit campaign activity proofs and verification requests.
   - Live status tracking (`PENDING`, `UNDER_REVIEW`, `VERIFIED`, `REJECTED`).

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** >= 18 (Tested on Node v24)
- **npm** >= 9
- **PostgreSQL** instance (optional for initial health check, required for database migrations)

### 2. Installation
Install all dependencies across root, backend, and frontend with a single command:
```bash
npm run install:all
```

Or install in respective directories:
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Environment Setup

#### Backend (`backend/.env`):
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/social_verification_portal?schema=public
JWT_SECRET=super_secret_jwt_key_verification_portal_2026
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

#### Frontend (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 4. Database Setup (Prisma + PostgreSQL)
Generate the Prisma Client:
```bash
npm run prisma:generate
```

Apply database migrations (when PostgreSQL is running):
```bash
npm run prisma:migrate
```

---

## 🖥️ Running the Application

### Option A: Run Both Concurrently (Recommended)
From the root directory:
```bash
npm run dev
```
- Frontend will be live at: [http://localhost:5173](http://localhost:5173)
- Backend will be live at: [http://localhost:5000](http://localhost:5000)

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

## 📡 API Health & Diagnostics

The backend includes a health-check endpoint:

```http
GET /api/health
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "Social Media Activity Verification Portal API",
    "version": "1.0.0",
    "environment": "development",
    "timestamp": "2026-09-30T11:58:00.000Z",
    "uptimeSeconds": 42,
    "database": {
      "status": "connected",
      "latencyMs": 4
    },
    "roles": ["SUPER_ADMIN", "ADMIN", "USER"],
    "endpoints": {
      "health": "/api/health",
      "info": "/api/info"
    }
  }
}
```
