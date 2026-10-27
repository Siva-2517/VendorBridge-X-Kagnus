# VendorBridge — Procurement & Vendor Management ERP
### Week 1 & Week 2: Foundation, Vendor Management, RFQ & Quotation Management

VendorBridge is an enterprise-grade Procurement & Vendor Management Enterprise Resource Planning (ERP) platform designed to streamline supplier onboarding, verification, request for quotations (RFQs), quotation comparison, multi-tier approvals, purchase orders, and 3-way matching.

> [!NOTE]
> ### 🌐 Live Production Deployment
> - **Live Frontend (Vercel):** [https://vendorbridge-gilt.vercel.app/](https://vendorbridge-gilt.vercel.app/)
> - **Live Backend API (Render):** [https://vendorbridge-s1qv.onrender.com](https://vendorbridge-s1qv.onrender.com)
> - **API Health Check:** [https://vendorbridge-s1qv.onrender.com/api/health](https://vendorbridge-s1qv.onrender.com/api/health)
> - **Cloud Database:** Neon Serverless PostgreSQL (US-East-2 / AP-Southeast-1)

---

## 1. Overview & Delivered Capabilities

### Week 1: Foundation & Vendor Management
- **Full Authentication Flow**: Persistent sessions via secure HTTP-only cookies with JWT fallback for seamless cross-domain support.
- **Role-Based Access Control (RBAC)**: Centralized authorization model with 4 distinct roles:
  1. `ADMIN` (System Administrator)
  2. `PROCUREMENT_OFFICER` (Procurement Lead)
  3. `MANAGER_APPROVER` (Finance & Approval Reviewer)
  4. `VENDOR` (Supplier Partner)
- **Vendor Management Module (Screen 4)**: Full CRUD, Indian GSTIN validation (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`), search & category filters, status tabs with counters (`Active`, `Pending`, `Blocked`), and audit-protected deletion rules (`onDelete: Restrict`).
- **Role-Tailored Procurement Dashboard (Screen 3)**: Contextual metric cards and strict vendor data isolation (vendors only see their own awarded purchase orders and statistics).

### Week 2: RFQ & Quotation Management
- **RFQ Creation & Management (Screen 5)**:
  - Procurement Officers can create structured RFQs with delivery locations, binding deadlines, multi-item Bill of Materials (BOM), and vendor assignments.
  - Multi-item table with Item Description, Quantity, Unit of Measure (UOM), and optional Target Price.
  - Multi-vendor invitation selector with supplier category and GSTIN preview chips.
  - Real-time status lifecycle: `DRAFT`, `OPEN`, `CLOSED`, `AWARDED`, `CANCELLED`.
- **Vendor Bidding & Draft Workflow (Screen 6)**:
  - Invited vendors receive isolated access to assigned RFQs. Uninvited vendors are strictly rejected (`403 Forbidden`).
  - Itemized bidding grid with Unit Price, Line Totals, and Delivery Lead Days per line item.
  - Persistent Drafts: Vendors can save drafts (`DRAFT` status) and finalize bids (`SUBMITTED` status) before the deadline.
  - **Real-Time Deadline Guard**: Server-side validation actively rejects bids if `new Date() >= rfq.deadline`—independent of background cron jobs.
  - Live summary card calculating Taxable Subtotal, GST Tax Amount, and Grand Total.
- **Side-by-Side Quotation Comparison Matrix (Screen 7)**:
  - Side-by-side comparative table of all submitted vendor bids for any RFQ.
  - **Authoritative Decimal Financials**: Handled with PostgreSQL `numeric(12, 2)` / Prisma Decimal arithmetic to eliminate IEEE 754 floating-point inaccuracies.
  - **Automated L1 Lowest Price Badge**: Highlighting the lowest evaluated bid in distinct teal styling (`L1 Lowest Bidder`), with deterministic tie-breaking for equal prices.
  - **Vendor Rating Indicators**: Displays vendor performance ratings (e.g., `4.8 ★`) or an honest `"Not yet rated"` indicator when history is not yet established.
  - **Competitor Isolation**: Vendors are strictly forbidden from viewing the comparison screen or competitor quotations.
- **Selected Quotation Integrity ("Select for Approval")**:
  - Procurement Officers can select a winning quotation via an atomic single-select database transaction.
  - Validates that the selected quotation strictly belongs to the target RFQ.
  - Updates the quotation to `SELECTED` and sets `selectedQuotationId` on the RFQ, cleanly staging the record for Week 3 Multi-Tier Approvals without preemptively approving it.
- **Persistent Binary Attachments**:
  - PostgreSQL byte storage (`Bytes` data type) ensures technical specifications and BOM sheets persist reliably across serverless/ephemeral deployments.
  - Validates MIME whitelist (`application/pdf`, images, text/plain) and 5MB payload limits with role-scoped download authorization.

---

## 2. Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS (Slate-Navy `#111827`/`#0B1220` & Muted-Teal `#36C9A5`), Lucide React, React Router v6, Vite.
- **Backend**: Node.js, Express, TypeScript, Zod, Multer, bcryptjs, jsonwebtoken, cookie-parser, cors, helmet, express-rate-limit.
- **Database & ORM**: Cloud PostgreSQL (Neon Serverless) via Prisma ORM (`Decimal(12, 2)` financial precision, `Bytes` file storage, `SystemSequence` atomic counters).
- **Testing**: Vitest & Supertest with 42 automated integration tests across Week 1 and Week 2 suites.

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
│   │   ├── schema.prisma     # PostgreSQL Prisma models (Decimal, Restrictive FKs, Bytes)
│   │   └── seed.ts           # Migration and Excalidraw baseline seed data
│   └── src/
│       ├── types/            # TypeScript domain interfaces & enums
│       ├── utils/            # Zod validation & GSTIN schemas
│       ├── middleware/       # JWT auth, upload (Multer 5MB), RBAC guards
│       ├── controllers/      # Auth, Vendor, RFQ, Quotation, and Dashboard controllers
│       ├── routes/           # REST routers (/api/auth, /api/vendors, /api/rfqs, /api/quotations)
│       ├── tests/            # Vitest integration test suites (42 tests)
│       │   ├── auth_vendor.test.ts      # Week 1 tests (28 passed)
│       │   └── rfq_quotation.test.ts    # Week 2 tests (14 passed)
│       ├── app.ts            # Express application setup
│       └── index.ts          # Server entry point
└── client/                   # Frontend React & Tailwind application
    ├── package.json
    ├── vite.config.ts        # Vite config with API proxy
    ├── tailwind.config.js    # Custom ERP dark palette
    └── src/
        ├── types/            # Frontend interfaces
        ├── services/         # Typed API clients (rfqApi, etc.)
        ├── context/          # AuthContext with persistent sessions
        ├── components/
        │   ├── layout/       # AppLayout, Navbar, Sidebar
        │   ├── rfq/          # CreateRfqModal (Screen 5 BOM)
        │   └── quotations/   # SubmitQuotationModal (Screen 6 Bidding Grid)
        └── pages/            # Dashboard, Vendors, Rfqs, RfqDetail, Quotations (Screen 7 Matrix)
```

---

## 4. Role & Navigation Permission Matrix (RBAC)

| Resource / Navigation Item | Route | Admin | Procurement Officer | Manager / Approver | Vendor |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Dashboard** | `/dashboard` | ✅ System Overview | ✅ Supplier Pipeline | ✅ Approvals & Spend | ✅ Isolated Profile & Orders |
| **Vendors Directory** | `/vendors` | ✅ Full CRUD | ✅ Create, View, Edit | ✅ View Only | ❌ (Forbidden - 403) |
| **RFQs Directory** | `/rfqs` | ✅ Full Access | ✅ Create, Edit, Publish | ✅ View Only | ✅ (Assigned RFQs Only) |
| **RFQ Detail & Specs** | `/rfqs/:id` | ✅ Full Details | ✅ Full Details | ✅ Full Details | ✅ (Assigned Only) |
| **Quotation Comparison**| `/quotations` | ✅ Matrix & Select | ✅ Matrix & Select | ✅ View Matrix | ❌ (Strict Exclusion - 403) |
| **Submit / Edit Bid** | Modal / API | ❌ | ❌ | ❌ | ✅ (Invited Vendors Only) |
| **Select for Approval** | `/api/rfqs/:id/select-quotation` | ✅ | ✅ | ❌ (Forbidden - 403) | ❌ (Forbidden - 403) |
| **Approvals (Week 3 Preview)** | `/approvals` | ✅ | ❌ | ✅ | ❌ (Access Denied - 403) |
| **Purchase Orders (Week 3 Preview)** | `/purchase-orders` | ✅ | ✅ | ✅ | ✅ (Own Awarded POs) |

---

## 5. Getting Started & Installation

### Prerequisites
- Node.js (v18.0.0 or later)
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
DATABASE_URL="postgresql://neondb_owner:password@ep-placeholder.us-east-2.aws.neon.tech/neondb?sslmode=require"

# JWT Secret
JWT_SECRET=vendorbridge_super_secure_jwt_secret_key_at_least_32_chars_long

# Role escalation guard
ADMIN_INVITE_CODE=ADMIN_SECURE_SETUP_2025
```

---

## 6. Accessing & Running the Application

### 🌐 Live Production Deployment
- **Live Frontend (Vercel):** [https://vendorbridge-gilt.vercel.app/](https://vendorbridge-gilt.vercel.app/)
- **Live Backend API (Render):** [https://vendorbridge-s1qv.onrender.com](https://vendorbridge-s1qv.onrender.com)
- **Live Health Endpoint:** [https://vendorbridge-s1qv.onrender.com/api/health](https://vendorbridge-s1qv.onrender.com/api/health)

### Local Development Mode
```bash
npm run dev
```
- **Local Frontend**: [http://localhost:3000](http://localhost:3000)
- **Local Backend API**: [http://localhost:5000](http://localhost:5000)
- **Local Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 7. Testing & Verification

Run the unified backend test suite covering Week 1 and Week 2 workflows:
```bash
cd server
npm test
```

### Test Suite Execution Output
```
 ✓ src/tests/auth_vendor.test.ts (28 tests)
 ✓ src/tests/rfq_quotation.test.ts (14 tests)

 Test Files  2 passed (2)
      Tests  42 passed (42)
```

### Production Build Verification
Validate production bundles for both frontend and backend:
```bash
# Build frontend
cd client && npm run build

# Build backend
cd ../server && npm run build
```
Both builds compile with **exit code 0** and zero TypeScript errors.

---

## 8. Demo Credentials (Pre-Seeded)

All demo accounts share the password: `VendorBridge@2025`

| Role | Email | Capabilities in Week 2 |
| :--- | :--- | :--- |
| **System Admin** | `admin@vendorbridge.com` | Full system access, vendor deletion, RFQ management, quotation selection |
| **Procurement Officer** | `officer@vendorbridge.com` | Create RFQs, invite vendors, compare bids in matrix, "Select for Approval" |
| **Manager / Approver** | `manager@vendorbridge.com` | View RFQ statuses and comparison matrices in read-only mode |
| **Vendor Partner** | `vendor@infrasupplies.com` | View assigned RFQs, save drafts, submit itemized quotations (Infra Supplies) |
| **Vendor Partner (Alt)** | `techcore@vendorbridge.com` | Competing vendor profile (TechCore Solutions) |

*Tip: Use the **Role Switcher** in the sidebar to switch between Procurement Officer and Vendor roles to experience the end-to-end RFQ dispatch $\rightarrow$ vendor bidding $\rightarrow$ comparison workflow.*

---

## 9. API Reference Summary

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register user (defaults to `VENDOR`)
- `POST /api/auth/login` — Authenticate and receive HTTP-only cookie
- `POST /api/auth/logout` — Clear session cookie
- `GET  /api/auth/me` — Retrieve active user session

### Vendors (`/api/vendors`)
- `GET    /api/vendors` — Query suppliers (`search`, `status`, `category`)
- `POST   /api/vendors` — Create supplier (Admin/Officer only; validates GSTIN)
- `GET    /api/vendors/:id` — View full vendor profile
- `PATCH  /api/vendors/:id` — Update vendor details
- `DELETE /api/vendors/:id` — Delete vendor (Admin only, `onDelete: Restrict`)

### RFQs (`/api/rfqs`)
- `GET    /api/rfqs` — List RFQs (scoped by role: all for officers, invited-only for vendors)
- `POST   /api/rfqs` — Create RFQ with BOM line items and vendor assignments
- `GET    /api/rfqs/:id` — View RFQ details, line items, and attachments
- `PATCH  /api/rfqs/:id` — Update RFQ details (Officer/Admin only)
- `POST   /api/rfqs/:id/attachments` — Upload attachment (Multer memory, 5MB limit, stored in PostgreSQL bytes)
- `GET    /api/rfqs/:id/attachments/:attachmentId` — Download attachment (authenticated & authorized)
- `GET    /api/rfqs/:id/comparison` — Side-by-side comparison matrix with L1 calculation (strictly forbidden for vendors)
- `POST   /api/rfqs/:id/select-quotation` — Select winning quotation for approval (atomic transaction)

### Quotations (`/api/quotations`)
- `GET    /api/quotations` — List quotations (filtered by `rfqId` or current vendor)
- `POST   /api/quotations` — Submit quotation or save draft (verifies deadline, status, and line items)
- `GET    /api/quotations/:id` — Get quotation details by ID
- `PATCH  /api/quotations/:id` — Edit quotation before submission deadline
