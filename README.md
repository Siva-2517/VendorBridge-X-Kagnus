# VendorBridge — Procurement & Vendor Management ERP
### Week 1: Foundation & Vendor Management

VendorBridge is an enterprise-grade Procurement & Vendor Management Enterprise Resource Planning (ERP) platform designed to streamline supplier onboarding, verification, request for quotations (RFQs), multi-tier approvals, purchase orders, and 3-way matching.

---

## 1. Overview & Week 1 Features

### Authentication & User Management
- **Full Authentication Flow**: User registration, login, persistent session handling via secure HTTP-only cookies (with JWT fallback), and logout.
- **Role-Based Access Control (RBAC)**: Centralized authorization model with four distinct roles:
  1. `ADMIN` (System Administrator)
  2. `PROCUREMENT_OFFICER` (Procurement Lead)
  3. `MANAGER_APPROVER` (Finance & Approval Reviewer)
  4. `VENDOR` (Supplier Partner)
- **Privilege Escalation Protection**: Public registration defaults strictly to `VENDOR`. Creating elevated accounts requires an organization setup code (`ADMIN_SECURE_SETUP_2025`).
- **Secure Password Reset**: Single-use, expiring token generation and reset workflow.

### Vendor Management Module (Screen 4)
- **Full Vendor CRUD**: Create, read, update, and safely delete supplier records.
- **15-Character GSTIN Validation**: Form validation enforcing standard Indian Goods and Services Tax Identification Number (GSTIN) syntax (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`).
- **Dynamic Search & Filtering**: Multi-field search across vendor name, GSTIN, category, contact person, phone, and email.
- **Status Tabs with Real-Time Counters**: Filter by `All (28)`, `Active (21)`, `Pending (4)`, and `Blocked (3)`.
- **Compliance & Profile Inspector**: Modal drawer displaying operating address, primary contact representative, tax compliance notes, and timestamps.
- **Administrative Protection**: Destructive deletion is restricted exclusively to the `ADMIN` role with an explicit safety confirmation dialog.

### Role-Tailored Procurement Dashboard (Screen 3)
- **Role-Aware Context Banner**: Welcome banner and server-generated status notice tailored to the user's active role.
- **Role-Tailored Metric Cards**:
  - **Admin**: System Users (4), Registered Vendors (28: 21 Active, 4 Pending), Total PO Spend (₹3.02L), Pending Approvals (1).
  - **Procurement Officer**: Active Suppliers (21), Pending Verifications (4), Live PO Commitments (₹3.02L), Active RFQs (12).
  - **Manager / Approver**: Pending Approvals Queue (1), Approved Spend (₹3.02L), Active Suppliers (21), Overdue Invoices (3).
  - **Vendor Partner**: Dedicated Company Profile Card (Legal Entity, GSTIN, PAN, Category, Address, Contact), Company Status (`ACTIVE`), Orders Awarded, Awarded PO Value, RFQ Invitations.
- **Strict Vendor Data Isolation**:
  - Vendor dashboard displays **only** purchase orders awarded to that vendor's organization (`Infra Supplies Pvt Ltd`).
  - Competitor orders are never leaked in tables, totals, or trends.
- **Spending Trends Chart**: 6-month historical purchase and revenue visualization.
- **Permitted Quick Actions**: Contextual shortcuts (`+ Add Vendor`, `+ new RFQ`, `Review Approvals`, `View Invoices`, `Submit Quotation`).
- **Honest Future-Module Placeholders**: Informative previews for modules scheduled for Weeks 2–4 (RFQs, Quotations, Approvals, Purchase Orders, Invoices, Reports, Audit Logs).

### Public Landing Page & Deployment
- **Public Homepage (`/`)**: Interactive product showcase featuring live role capabilities, workflow architecture, security assurances, and direct access to authentication.
- **Production Deployment Ready**: Pre-configured for deployment with **Frontend on Vercel** (`client/vercel.json` SPA rewrites) and **Backend on Render** (`render.yaml` Blueprint).
- **Dual-Mode Cross-Domain Authentication**: Supports secure cross-site cookies (`SameSite=None; Secure`) and `Authorization: Bearer <token>` fallback, guaranteeing seamless authentication between Vercel and Render domains.

---

## 2. Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS (Slate-Navy `#111827`/`#0B1220` & Muted-Teal `#36C9A5`), Lucide React, React Router v6, Vite.
- **Backend**: Node.js, Express, TypeScript, Zod, bcryptjs, jsonwebtoken, cookie-parser, cors, helmet, express-rate-limit.
- **Database & ORM**: PostgreSQL (Cloud Neon Serverless) via Prisma ORM.
- **Testing**: Vitest & Supertest with 28 automated integration tests.

---

## 3. Directory Structure

```
d:\Kagnus/
├── package.json              # Monorepo orchestration scripts
├── .env.example              # Environment variables template
├── README.md                 # Complete system documentation
├── server/                   # Backend Express & Prisma API
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma     # PostgreSQL Prisma models
│   │   └── seed.ts           # Database migration & seed script
│   └── src/
│       ├── types/            # TypeScript domain interfaces & enums
│       ├── utils/            # Zod validation & GSTIN schemas
│       ├── middleware/       # JWT auth & RBAC authorization guards
│       ├── controllers/      # Auth, Vendor, and Dashboard controllers
│       ├── routes/           # REST endpoint routers
│       ├── tests/            # Vitest integration test suite (28 tests)
│       ├── app.ts            # Express application setup
│       └── index.ts          # Server entry point
└── client/                   # Frontend React & Tailwind application
    ├── package.json
    ├── vite.config.ts        # Vite config with API proxy
    ├── tailwind.config.js    # Custom ERP dark palette
    └── src/
        ├── types/            # Frontend interfaces
        ├── context/          # AuthContext with session persistence
        ├── api/              # Centralized typed API client
        ├── components/       # Layout, Navbar, Badges, Modals, AccessDenied
        └── pages/            # Login, Register, Dashboard, Vendors, Profile
```

---

## 4. Role & Navigation Permission Matrix (RBAC)

| Resource / Navigation Item | Route | Admin | Procurement Officer | Manager / Approver | Vendor |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Dashboard** | `/dashboard` | ✅ System Overview | ✅ Supplier Pipeline | ✅ Approvals & Spend | ✅ Scoped Company Profile & Orders |
| **Vendors Directory** | `/vendors` | ✅ Full CRUD | ✅ Create, View, Edit | ✅ View Only | ❌ (Access Denied - 403) |
| **RFQs (Week 2 Preview)** | `/rfqs` | ✅ | ✅ | ✅ | ❌ (Access Denied - 403) |
| **Quotations (Week 2 Preview)** | `/quotations` | ✅ | ✅ | ✅ | ✅ (Supplier Bids) |
| **Approvals (Week 3 Preview)** | `/approvals` | ✅ | ❌ | ✅ | ❌ (Access Denied - 403) |
| **Purchase Orders (Week 3 Preview)** | `/purchase-orders` | ✅ | ✅ | ✅ | ✅ (Own Awarded POs) |
| **Invoices (Week 3 Preview)** | `/invoices` | ✅ | ✅ | ✅ | ✅ (Supplier Invoices) |
| **Reports (Week 4 Preview)** | `/reports` | ✅ | ✅ | ✅ | ❌ (Access Denied - 403) |
| **Audit Activity (Week 4 Preview)**| `/activity` | ✅ | ❌ | ❌ | ❌ (Access Denied - 403) |
| **User Administration** | Backend | ✅ | ❌ (Forbidden - 403) | ❌ (Forbidden - 403) | ❌ (Forbidden - 403) |
| **Delete Vendor Records** | `/api/vendors/:id` | ✅ | ❌ (Forbidden - 403) | ❌ (Forbidden - 403) | ❌ (Forbidden - 403) |
| **Modify Vendor GSTIN / Status** | `/api/vendors/:id` | ✅ | ✅ | ❌ (Forbidden - 403) | ❌ (Forbidden - 403) |

---

## 5. Getting Started & Installation

### Prerequisites
- Node.js (v18.0.0 or later, v24+ recommended)
- npm (v9.0.0 or later)

### Installation
```bash
# Clone the repository
cd d:\Kagnus

# Install all monorepo dependencies (root, server, and client)
npm run install:all
```

### Environment Configuration
Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```

Key variables in `server/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000

# Cloud PostgreSQL (Neon DB) Connection
DATABASE_URL="postgresql://neondb_owner:password@ep-cool-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"

# JWT Secret
JWT_SECRET=vendorbridge_super_secure_jwt_secret_key_at_least_32_chars_long

# Role escalation guard
ADMIN_INVITE_CODE=ADMIN_SECURE_SETUP_2025
```

---

## 6. Running the Application

### Development Mode (Concurrent Server & Client)
```bash
npm run dev
```
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### Running Services Individually
```bash
# Start backend server only
npm run dev:server

# Start frontend client only
npm run dev:client
```

---

## 7. Testing & Verification

Run the comprehensive integration test suite (28 tests covering authentication, password reset, GSTIN validation, vendor CRUD, role authorization, and vendor data isolation):
```bash
npm test
```
*Current test suite status: 28 / 28 tests passing.*

### Production Build
Validate production bundles for both frontend and backend:
```bash
# Build frontend
cd client && npm run build

# Build backend
cd ../server && npm run build
```

---

## 8. Demo Credentials (Pre-Seeded)

All demo accounts share the password: `VendorBridge@2025`

| Role | Email | Capabilities |
| :--- | :--- | :--- |
| **System Admin** | `admin@vendorbridge.com` | Full system access, vendor deletion, user management |
| **Procurement Officer** | `officer@vendorbridge.com` | Create vendors, edit profiles, view procurement metrics |
| **Manager / Approver** | `manager@vendorbridge.com` | Review vendor compliance, oversee spending trends |
| **Vendor Partner** | `vendor@infrasupplies.com` | View & update own supplier profile (Infra Supplies Pvt Ltd) |

*Tip: Use the convenient **Role Switcher** widget in the sidebar to effortlessly test any role with a single click during evaluation.*

---

## 9. API Reference Summary

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register user (with privilege escalation guard)
- `POST /api/auth/login` — Authenticate and receive HTTP-only cookie
- `POST /api/auth/logout` — Clear session cookie
- `GET  /api/auth/me` — Retrieve active user session
- `POST /api/auth/forgot-password` — Generate expiring password-reset token
- `POST /api/auth/reset-password` — Reset password using token

### Vendors (`/api/vendors`)
- `GET    /api/vendors` — Query suppliers (`search`, `status`, `category`)
- `POST   /api/vendors` — Create supplier (Admin/Officer only; validates GSTIN)
- `GET    /api/vendors/:id` — View full vendor profile
- `PATCH  /api/vendors/:id` — Update vendor details
- `DELETE /api/vendors/:id` — Delete vendor (Admin only)

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard/summary` — Overview metrics, recent POs, and spending trend

---

## 10. Roadmap (Upcoming Milestones)

- **Week 2**: Request for Quotations (RFQs), Multi-Line Items & Automated L1 Quotation Comparison Matrix.
- **Week 3**: Multi-Tier Approvals Workflow (L1, L2, Finance), Purchase Order Generation & 3-Way Invoice Matching.
- **Week 4**: Executive Analytics, OTIF Supplier Scorecards, Department Spend Breakdown & Immutable Audit Logs.
