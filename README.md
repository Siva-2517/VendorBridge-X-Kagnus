# VendorBridge — Procurement & Vendor Management ERP
### Complete Platform: Weeks 1–4 (Approvals, POs, Invoices, Notifications, Activity Logs & Analytics)

VendorBridge is an enterprise-grade Procurement & Vendor Management Enterprise Resource Planning (ERP) platform designed to streamline supplier onboarding, verification, request for quotations (RFQs), quotation comparison, managerial approvals, purchase orders, 3-way matching, PDF generation, invoice lifecycle management, real-time notifications, immutable audit timelines, and financial reports & analytics.

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

### Week 3: Approvals, PO Generation, Invoicing & 3-Way Matching
- **Managerial Approval Workflow**:
  - Automatically generates an `ApprovalRequest` record (`PENDING` status) upon quotation selection.
  - Dedicated approval queue (`/approvals`) for `ADMIN` and `MANAGER_APPROVER` roles.
  - Explicit decision actions: `APPROVE` or `REJECT` with mandatory remarks.
  - Immutable audit history persisted via `ApprovalHistory` tracking actor, timestamp, action, and remarks.
  - Quotation status transitions from `SELECTED` $\rightarrow$ `APPROVED` (or returns to eligible state upon rejection).
- **Purchase Order Generation & Management**:
  - Atomic sequence generation: `PO-YYYY-XXXX` using row-level locking (`SELECT ... FOR UPDATE`) in PostgreSQL.
  - Authorized generation: Only approved quotations can generate purchase orders.
  - Strict 1:1 constraint: Database unique constraint (`quotationId`) prevents duplicate PO generation.
  - Complete line item copying from approved quotation with unit prices, UOM, and commercial terms.
  - Server-side Decimal calculations for subtotal, GST tax, and grand totals.
- **Invoice Management & Authoritative 3-Way Matching**:
  - Invoices generated against eligible purchase orders (`APPROVED` or `ISSUED`).
  - Sequence generation: `INV-YYYY-XXXX` atomic sequence numbering.
  - 1:1 PO-to-Invoice enforcement via database unique constraint (`purchaseOrderId`) with concurrent request serialization (`409 Conflict` safety).
  - **3-Way Matching Engine**: Reconciles Quotation $\leftrightarrow$ Purchase Order $\leftrightarrow$ Invoice across:
    1. Line items, descriptions, quantities, UOM, and unit prices.
    2. Subtotals, tax rates, intra-state/inter-state tax breakdown, and grand totals.
    3. Persists reconciliation outcome (`MATCHED` vs `DISCREPANCY`) with detailed discrepancy reasons.
- **Indian GST Tax Calculation Service**:
  - Authoritative calculation using `Prisma.Decimal` (zero IEEE 754 floating-point drift).
  - Resolves vendor state from validated 15-character GSTIN (`^[0-9]{2}[A-Z0-9]{13}$`) and buyer state from delivery location.
  - Intra-state transactions: Splits tax equally into CGST + SGST with exact 0-drift rounding.
  - Inter-state transactions: Assigns full tax to IGST.
  - Zero hardcoded defaults: Fails closed with descriptive errors if source tax rate, vendor state, or delivery location state cannot be resolved.
- **PDF Invoice Generation & Streaming**:
  - Server-side streaming binary PDF generation using PDFKit.
  - Professional tabular layout: Buyer & Seller GSTIN details, line item table, CGST/SGST/IGST breakdown, and payment status badge.
  - Streamed directly with `Content-Type: application/pdf` and `Content-Disposition: inline/attachment`.
- **SMTP Email Transmission & Anti-Exfiltration Security**:
  - Transmits invoice PDFs via standard SMTP (using Nodemailer).
  - Strict recipient whitelist: Vendors may only dispatch invoices to their verified company email, their logged-in user email, or the authorized procurement officer. Arbitrary recipients return `403 Forbidden`.
  - Truthful reporting: Returns `code: "EMAIL_NOT_CONFIGURED"` when SMTP credentials are not present in server environment; no fake success indicators.
  - Sanitized responses: Server hostnames, authentication credentials, and internal error stacks are never leaked.
- **Invoice Payment Authorization**:
  - Only `ADMIN` role is authorized to mark invoices as `PAID`.
  - Enforces `403 Forbidden` for Procurement Officers, Managers, and Vendors.
  - Records timestamp (`paidAt`), custom payment notes (e.g., bank UTR number), and audit trail entry.

### Week 4: Notifications, Structured Activity Audit Trail & Reports Analytics
- **Database-Backed Real-Time Notifications**:
  - Atomic notification dispatch within Prisma transactions for all business lifecycle events:
    - RFQ Creation & Updates (invites assigned suppliers)
    - Quotation Submissions (alerts procurement officers)
    - Selection for Approval (alerts manager approvers)
    - Approval Decisions (notifies procurement lead and vendor)
    - Purchase Order Generation (notifies supplier)
    - Invoice Creation (notifies billing team)
    - Invoice Payment (notifies supplier and officer)
  - Model `Notification` with types: `RFQ_UPDATE`, `APPROVAL_ALERT`, `INVOICE_UPDATE`, `SYSTEM_NOTICE`.
  - Built-in deduplication key (`dedupeKey`) prevents duplicate notification spam upon retries.
  - Notification management API: `GET /api/notifications` (paginated, unread filter), `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`.
  - UI Header Dropdown: Real-time badge counter, unread indicators, mark-as-read, and deep-linking to relevant resources.
- **Structured & Immutable Activity / Audit Trail**:
  - Model `AuditLog` enriched with `category` (`RFQ`, `APPROVAL`, `PO`, `INVOICE`, `VENDOR`, `AUTH`, `SYSTEM`), `entityType`, `entityId`, `entityIdentifier`, and sanitized `metadata`.
  - **Database-Level Trigger Protection**: PostgreSQL trigger `trg_prevent_audit_log_mutation` strictly blocks `UPDATE` or `DELETE` queries (`ERROR: AuditLog records are immutable`).
  - Strict RBAC: Read-only API (`GET /api/activity`) with role-based filtering:
    - `ADMIN` & `PROCUREMENT_OFFICER`: Full operational visibility across all categories.
    - `MANAGER_APPROVER`: Approvals, purchase orders, invoices, and spend events.
    - `VENDOR`: Tenant-isolated exclusively to their own user events and assigned RFQs, bids, POs, and invoices.
  - Zero mutation routes: `POST`, `PATCH`, `PUT`, `DELETE` on `/api/activity` return `404 Not Found`.
  - UI Activity Page (`/activity`): Category filters, search input, date range filters, and paginated timeline cards.
- **Reports & Analytics Dashboard (`/reports`)**:
  - Live PostgreSQL data aggregation across 5 key procurement KPIs:
    1. **Total Spend**: Total value of all `PAID` invoices within the period.
    2. **Total PO Commitment**: Total value of all approved/issued purchase orders.
    3. **Invoices Paid Count**: Total count of settled invoices.
    4. **Hardened PO Fulfillment Rate**: Percentage of POs where a matching invoice is `PAID` and covers at least 99% of PO commitment value (safeguards against partial/unpaid invoices).
    5. **Active Suppliers**: Clearly labeled as a *current registered snapshot* rather than an artificial period-bound count.
  - Zero-denominator division protection across all rate calculations.
  - SVG Data Visualizations:
    - Monthly Spend & PO Trajectory trendline
    - Category Spend Breakdown (Constructions, IT Hardware, Services, etc.)
    - Top Suppliers Leaderboard with fulfillment tracking
    - PO & Invoice Status Distributions
    - Supplier Performance Scorecard
  - Currency standard: Standardized to Indian Rupee (INR / ₹) with `en-IN` number formatting.
- **Financial CSV Export with Formula Injection Mitigation (`/api/reports/export`)**:
  - Server-side streaming CSV download based on filtered PostgreSQL invoice records.
  - **Formula Injection Sanitization**: The `sanitizeCsvCell` function prepends a single quote `'` to any cell beginning with dangerous trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) to neutralize Excel/Calc formula execution vulnerabilities.
  - Role-aware vendor data scoping: Vendor users can only export invoices for their own company.

---

## 2. Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS (Slate-Navy `#111827`/`#0B1220` & Muted-Teal `#36C9A5`), Lucide React, React Router v6, Vite.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Zod, PDFKit, Nodemailer, bcryptjs, jsonwebtoken, cookie-parser, cors, helmet, express-rate-limit.
- **Database & ORM**: Cloud PostgreSQL (Neon Serverless) via Prisma ORM (`Decimal(12, 2)` financial precision, `Bytes` file storage, `SystemSequence` atomic counters, database-level immutability triggers).
- **Testing**: Vitest & Supertest with **208 automated integration tests** across 15 test suites.

---

## 3. Directory Structure

```
d:\Kagnus/
├── package.json              # Monorepo orchestration scripts
├── .env.example              # Environment variables template
├── README.md                 # Complete system documentation
├── docs/
│   └── screenshots/          # 13 authoritative UI screenshots
├── server/                   # Backend Express & Prisma API
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma     # PostgreSQL Prisma models (Decimal, Restrictive FKs, Sequences, Notifications, AuditLog)
│   │   ├── migrations/       # Version-controlled migration history
│   │   │   ├── 0_init/
│   │   │   ├── 20261027120000_week2_rfq_quotations/
│   │   │   ├── 20261028120000_week3_approvals_po_invoices/
│   │   │   └── 20261106120000_week4_notifications_audit_analytics/
│   │   └── seed.ts           # Migration and baseline seed data
│   └── src/
│       ├── types/            # TypeScript domain interfaces & enums
│       ├── utils/            # Tax calculation, 3-way matching, PDF generator, email service, RFQ validation
│       ├── middleware/       # JWT auth, upload (Multer 5MB), RBAC guards
│       ├── controllers/      # Auth, Vendor, RFQ, Quotation, Approval, PO, Invoice, Activity, Notification, Reports
│       ├── routes/           # REST routers (/api/auth, /api/vendors, /api/rfqs, /api/approvals, /api/purchase-orders, /api/invoices, /api/activity, /api/notifications, /api/reports)
│       ├── services/         # AuditService, NotificationService, ReportsService, TaxService
│       ├── tests/            # Vitest integration test suites (208 tests across 15 suites)
│       │   ├── auth_vendor.test.ts          # Week 1 tests (28 passed)
│       │   ├── rfq_quotation.test.ts        # Week 2 tests (14 passed)
│       │   ├── approval_workflow.test.ts    # Week 3 Approval tests (15 passed)
│       │   ├── po_generation.test.ts        # Week 3 PO tests (11 passed)
│       │   ├── invoice_matching.test.ts     # Week 3 Invoice & Matching tests (30 passed)
│       │   ├── e2e_audit_workflow.test.ts   # Week 3 E2E Suite (12 passed)
│       │   ├── notifications_audit.test.ts  # Week 4 Notifications & Audit tests (15 passed)
│       │   ├── activity_rbac.test.ts        # Week 4 Activity RBAC tests (15 passed)
│       │   ├── reports_analytics.test.ts    # Week 4 Reports & Analytics tests (23 passed)
│       │   ├── week4_e2e_integration.test.ts # Week 4 Final E2E Suite (17 passed)
│       │   ├── sequence_live_pg.test.ts     # PostgreSQL sequence tests (2 passed)
│       │   ├── sequence_isolated.test.ts    # Sequence isolated tests (7 passed)
│       │   ├── attachment_security.test.ts  # Attachment tests (7 passed)
│       │   ├── test_db_guard.test.ts        # Guard tests (7 passed)
│       │   └── comparison_adapter.test.ts   # Adapter tests (5 passed)
│       ├── app.ts            # Express application setup
│       └── index.ts          # Server entry point
└── client/                   # Frontend React & Tailwind application
    ├── package.json
    ├── vite.config.ts        # Vite config with API proxy
    ├── tailwind.config.js    # Custom ERP dark palette
    └── src/
        ├── types/            # Frontend interfaces
        ├── services/         # Typed API clients (rfqApi, approvalApi, poApi, invoiceApi, activityApi, reportsApi)
        ├── context/          # AuthContext with persistent sessions
        ├── components/
        │   ├── layout/       # AppLayout, Navbar, Sidebar
        │   ├── common/       # Badge, Status indicators
        │   ├── rfq/          # CreateRfqModal (Screen 5 BOM)
        │   └── quotations/   # SubmitQuotationModal (Screen 6 Bidding Grid)
        └── pages/            # Dashboard, Vendors, Rfqs, Approvals, PurchaseOrders, Invoices, Activity, Reports
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
| **Manager Approvals** | `/approvals` | ✅ Queue & Decide | ❌ (Forbidden - 403) | ✅ Queue & Decide | ❌ (Forbidden - 403) |
| **Purchase Orders** | `/purchase-orders` | ✅ Full Access | ✅ Create & Manage | ✅ View Only | ✅ (Own Awarded POs Only) |
| **Invoices Directory** | `/invoices` | ✅ Full Access | ✅ Create & View | ✅ View Only | ✅ (Own Invoices Only) |
| **Download Invoice PDF** | `/api/invoices/:id/pdf` | ✅ | ✅ | ✅ | ✅ (Own Invoices Only) |
| **Transmit Invoice Email** | `/api/invoices/:id/email` | ✅ | ✅ | ❌ | ✅ (Trusted Company Address) |
| **Mark Invoice Paid** | `/api/invoices/:id/mark-paid` | ✅ (Authorized) | ❌ (Forbidden - 403) | ❌ (Forbidden - 403) | ❌ (Forbidden - 403) |
| **Activity Timeline** | `/activity` | ✅ Complete Timeline | ✅ Complete Timeline | ✅ Spend & Approval Events | ✅ (Isolated Own Events) |
| **Reports & Analytics** | `/reports` | ✅ Full Analytics | ✅ Full Analytics | ✅ Full Analytics | ✅ (Isolated Own Spend) |
| **CSV Spend Export** | `/api/reports/export` | ✅ Full Financials | ✅ Full Financials | ✅ Full Financials | ✅ (Isolated Own Invoices) |
| **Notifications Dropdown**| Header Nav | ✅ Active Alerts | ✅ Active Alerts | ✅ Active Alerts | ✅ (Assigned Alerts Only) |

---

## 5. Getting Started & Installation

### Prerequisites
- Node.js (v18.0.0 or later)
- npm (v9.0.0 or later)
- PostgreSQL (v15 or later, or Cloud Neon PostgreSQL)

### Installation
```bash
# Clone the repository
cd d:\Kagnus

# Install all monorepo dependencies (root, server, and client)
npm run install:all
```

### Environment Configuration & Variables Reference

Copy `.env.example` to `server/.env`:
```bash
cp server/.env.example server/.env
```

#### Required Environment Variables
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `CLIENT_ORIGIN` | Allowed CORS origin(s) | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?schema=public` |
| `JWT_SECRET` | Secret key for JWT session signing (min 32 chars) | `your_secure_random_jwt_secret_here_32_chars` |
| `JWT_EXPIRES_IN` | Token validity period | `7d` |
| `ADMIN_INVITE_CODE` | Code required to register privileged roles | `ADMIN_SECURE_SETUP_2025` |

#### Optional SMTP Environment Variables (Email Transmission)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `SMTP_HOST` | Outgoing SMTP mail server hostname | `smtp.gmail.com` / `smtp.mailgun.org` |
| `SMTP_PORT` | SMTP port (465 for SSL, 587 for TLS) | `587` |
| `SMTP_USER` | SMTP username or account email | `billing@vendorbridge.com` |
| `SMTP_PASS` | SMTP password or app-specific password | `app_password_here` |
| `SMTP_FROM` | Sender display name and address | `VendorBridge Billing <billing@vendorbridge.com>` |

*Note: If SMTP credentials are not configured, the system gracefully and truthfully returns `code: "EMAIL_NOT_CONFIGURED"` without crashing or faking delivery.*

### Database Migration & Seeding

Deploy schema migrations and seed the idempotent baseline dataset:
```bash
# Navigate to backend directory
cd server

# 1. Apply all versioned migrations in chronological order
npx prisma migrate deploy

# 2. Seed pre-configured baseline accounts, vendors, and RFQs
npx ts-node prisma/seed.ts
```

---

## 6. Accessing & Running the Application

### Local Development Mode
```bash
npm run dev
```
- **Local Frontend**: [http://localhost:3000](http://localhost:3000)
- **Local Backend API**: [http://localhost:5000](http://localhost:5000)
- **Local Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 7. Testing & Verification

Run the comprehensive automated test suite covering all Week 1, Week 2, Week 3, and Week 4 workflows:
```bash
cd server
npm test
```

To run test files sequentially against a local PostgreSQL test database:
```bash
cd server
$env:TEST_DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/test_db?schema=public"; npx vitest run --no-file-parallelism
```

### Complete Test Suite Execution Output (208 Tests Passing)
```
 ✓ src/tests/invoice_matching.test.ts (30 tests)
 ✓ src/tests/auth_vendor.test.ts (28 tests)
 ✓ src/tests/reports_analytics.test.ts (23 tests)
 ✓ src/tests/week4_e2e_integration.test.ts (17 tests)
 ✓ src/tests/approval_workflow.test.ts (15 tests)
 ✓ src/tests/notifications_audit.test.ts (15 tests)
 ✓ src/tests/activity_rbac.test.ts (15 tests)
 ✓ src/tests/rfq_quotation.test.ts (14 tests)
 ✓ src/tests/e2e_audit_workflow.test.ts (12 tests)
 ✓ src/tests/po_generation.test.ts (11 tests)
 ✓ src/tests/sequence_isolated.test.ts (7 tests)
 ✓ src/tests/attachment_security.test.ts (7 tests)
 ✓ src/tests/test_db_guard.test.ts (7 tests)
 ✓ src/tests/comparison_adapter.test.ts (5 tests)
 ✓ src/tests/sequence_live_pg.test.ts (2 tests)

 Test Files  15 passed (15)
      Tests  208 passed (208)
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

## 8. Local Demo & Development Seed Credentials

> [!CAUTION]
> **LOCAL DEMO / DEVELOPMENT ONLY**: The credentials listed below are strictly for local evaluation, automated integration testing, and development demonstration using the seeded baseline database (`prisma/seed.ts`). They must **NEVER** be used in, shared with, or presented as production credentials. Production deployments enforce unique administrator secrets, strong randomly generated credentials, and individual user-set passwords.

All pre-seeded local development accounts share the default development password: `VendorBridge@2025`

| Role | Email | Status in Seed Data | Capabilities Across Weeks 1–4 |
| :--- | :--- | :---: | :--- |
| **System Admin** | `admin@vendorbridge.com` | Pre-Seeded | Full system access, vendor management, quotation approvals, mark invoices as PAID, view all audit logs and system analytics |
| **Procurement Officer** | `officer@vendorbridge.com` | Pre-Seeded | Create RFQs, compare bids, select quotations, generate POs, generate Invoices, view operational activity |
| **Manager / Approver** | `manager@vendorbridge.com` | Pre-Seeded | Review approval queue (`/approvals`), APPROVE or REJECT quotation commercial terms, view financial reports |
| **Vendor Partner** | `vendor@infrasupplies.com` | Pre-Seeded | View assigned RFQs, submit quotations, view awarded POs, download own invoice PDFs, view own activity timeline |
| **Self-Registered Vendor** | Register via `/register` | Dynamic | Any new user registered without an invite code automatically defaults to `VENDOR` role for testing multi-vendor isolation |

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
- `POST   /api/rfqs/:id/select-quotation` — Select winning quotation for approval

### Quotations (`/api/quotations`)
- `GET    /api/quotations` — List quotations (filtered by `rfqId` or current vendor)
- `POST   /api/quotations` — Submit quotation or save draft (verifies deadline, status, and line items)
- `GET    /api/quotations/:id` — Get quotation details by ID

### Approvals (`/api/approvals`)
- `GET    /api/approvals` — Query approval requests (`status=PENDING`, `status=APPROVED`, etc.)
- `GET    /api/approvals/:id` — Get approval details, quotation line items, and audit history
- `POST   /api/approvals/:id/decide` — Record managerial decision (`APPROVE` or `REJECT`) with remarks

### Purchase Orders (`/api/purchase-orders`)
- `GET    /api/purchase-orders` — List POs with status filters and vendor scoping
- `GET    /api/purchase-orders/:id` — View full PO details, line items, and financial totals
- `POST   /api/purchase-orders/generate` — Generate PO from approved quotation (`PO-YYYY-XXXX`)

### Invoices (`/api/invoices`)
- `GET    /api/invoices` — List invoices (filtered by status, search, or vendor isolation)
- `GET    /api/invoices/:id` — View invoice details, 3-way matching result, and tax breakdown
- `POST   /api/invoices` — Generate invoice from eligible PO (`INV-YYYY-XXXX`)
- `GET    /api/invoices/:id/pdf` — Stream official PDF invoice document
- `POST   /api/invoices/:id/email` — Transmit invoice PDF via SMTP (with vendor recipient whitelist)
- `POST   /api/invoices/:id/mark-paid` — Mark invoice as paid (Admin only, records audit trail)

### Activity & Audit Logs (`/api/activity`)
- `GET /api/activity` — Query structured audit logs (`page`, `limit`, `category`, `action`, `search`, `startDate`, `endDate`). Role-gated and vendor-isolated.
- *Mutation methods (`POST`, `PATCH`, `DELETE`) return `404 Not Found` (immutable).*

### Notifications (`/api/notifications`)
- `GET   /api/notifications` — List paginated notifications for current user (`unreadOnly`, `type`)
- `GET   /api/notifications/unread-count` — Count unread notifications
- `PATCH /api/notifications/:id/read` — Mark a single notification as read
- `PATCH /api/notifications/read-all` — Mark all notifications as read for current user

### Reports & Analytics (`/api/reports`)
- `GET /api/reports/overview` — Fetch KPI summaries, monthly spend trend, category breakdown, and supplier scorecard (`period=30d|90d|6m|12m|all`)
- `GET /api/reports/export` — Stream financial report as RFC 4180 CSV with formula injection mitigation

---

## 10. Deployment Checklist & Rollback Procedures

### Pre-Deployment Checklist
1. **Database Safety Check**:
   - Ensure target database is a dedicated staging or production PostgreSQL instance (Neon).
   - Verify connection string `DATABASE_URL` uses SSL (`sslmode=require`).
   - Run `npx prisma validate` to confirm schema integrity.
2. **Environment Variable Configuration**:
   - Verify all required variables are set (`DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `NODE_ENV=production`).
   - Confirm `JWT_SECRET` is at least 32 characters long.
   - If SMTP is enabled, verify `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`.
3. **Build & Test Verification**:
   - Run full regression test suite: `cd server && npm test` (all 15 test files must pass).
   - Verify server compilation: `cd server && npm run build`.
   - Verify client compilation: `cd client && npm run build`.
4. **Migration Sequence Execution**:
   - Execute migrations via: `npx prisma migrate deploy`.
   - Verify the database trigger `trg_prevent_audit_log_mutation` is installed.

### Post-Deployment Health Check
1. Probe API health endpoint: `GET /api/health` $\rightarrow$ Expect `{ status: "ok" }`.
2. Probe login endpoint with admin credentials.
3. Access `/reports` and confirm live KPI computation without server-side errors.
4. Download CSV export from `/api/reports/export` and verify headers and formula sanitization.

### Rollback Procedure
If a critical production regression is encountered:
1. **Frontend Rollback**:
   - In Vercel, navigate to Deployments and redeploy the previous successful release.
2. **Backend Rollback**:
   - In Render, trigger a manual deploy pointing to the previous release commit (`965ac5a`).
3. **Database Migration Safety**:
   - The Week 4 migration is strictly **additive** (`Notification` model, optional columns on `AuditLog`). No existing tables, columns, or data were dropped.
   - Rolling back backend code to Week 3 will operate safely on the additive schema without database rollbacks.

---

## 11. Manual Screenshot & UI Verification Evidence

The genuine application screenshots captured from the local development environment are stored under `docs/screenshots/` and referenced below:

### 1. RFQ Creation (Screen 5)
- **Route:** `/rfqs` → Click `+ Create RFQ`
- **Recommended User:** `officer@vendorbridge.com` (Procurement Officer)
- **Key Elements Shown:** Delivery location, submission deadline datepicker, multi-item BOM table (description, quantity, UOM, target price), and vendor invitation multi-select.

![01 - RFQ Creation](docs/screenshots/01_rfq_creation.png)

---

### 2. Quotation Comparison Matrix (Screen 7)
- **Route:** `/quotations` (or click `Compare Bids` on any closed/submitted RFQ)
- **Recommended User:** `officer@vendorbridge.com` (Procurement Officer)
- **Key Elements Shown:** Side-by-side comparison matrix, itemized rates from competing vendors, automated `L1 Lowest Bidder` badge in muted teal, and `Select for Approval` action button.

![02 - Quotation Comparison Matrix](docs/screenshots/02_quotation_comparison.png)

---

### 3. Approvals Queue & Managerial Decision
- **Route:** `/approvals`
- **Recommended User:** `manager@vendorbridge.com` (Manager / Approver)
- **Key Elements Shown:** Pending approvals queue, source RFQ and quotation summaries, and the decision modal with remarks field and `APPROVE` / `REJECT` actions.

![03 - Approvals Queue & Decision](docs/screenshots/03_approvals_decision.png)

---

### 4. Purchase Order List & Details
- **Route:** `/purchase-orders` → View any PO detail modal or page
- **Recommended User:** `officer@vendorbridge.com` or `admin@vendorbridge.com`
- **Key Elements Shown:** `PO-YYYY-XXXX` atomic sequence number, `APPROVED` badge, copied line items, vendor details, and server-side Decimal totals.

![04 - Purchase Orders](docs/screenshots/04_purchase_orders.png)

---

### 5. Invoice Management & 3-Way Matching
- **Route:** `/invoices` → Click any invoice to view details
- **Recommended User:** `officer@vendorbridge.com` or `admin@vendorbridge.com`
- **Key Elements Shown:** `INV-YYYY-XXXX` sequence number, `PENDING_PAYMENT` badge, intra-state CGST+SGST or inter-state IGST tax breakdown, and the green `3-Way Matching Verified` badge.

![05 - Invoice & 3-Way Matching](docs/screenshots/05_invoice_matching.png)

---

### 6. Official PDF Invoice Document
- **Route:** `/invoices` → Click `Download PDF` (or `/api/invoices/:id/pdf`)
- **Recommended User:** Any authorized user or vendor owner
- **Key Elements Shown:** Downloaded or rendered PDF document showing company header, vendor details, GSTIN, line items table, GST breakdown, and verification footer.

![06 - Invoice PDF Document](docs/screenshots/06_invoice_pdf.png)

---

### 7. Administrator Payment Authorization Modal
- **Route:** `/invoices` → Click `Mark as Paid` on an eligible invoice
- **Recommended User:** `admin@vendorbridge.com` (Admin only)
- **Key Elements Shown:** Payment authorization modal with transaction reference notes input (e.g., bank UTR number) prior to submission.

![07 - Admin Payment Authorization](docs/screenshots/07_admin_payment.png)

---

### 8. Vendor Data Isolation View
- **Route:** `/dashboard`, `/purchase-orders`, `/invoices`
- **Recommended User:** `vendor@infrasupplies.com` (Vendor Partner)
- **Key Elements Shown:** Vendor portal restricted strictly to their own awarded purchase orders and invoices, with no access to competitor quotations, internal approval queues, or other vendors' documents.

![08 - Vendor Data Isolation](docs/screenshots/08_vendor_isolation.png)

---

### 9. Completed Invoice Payment Confirmation
- **Route:** `/invoices` → Click on paid invoice
- **Recommended User:** `admin@vendorbridge.com` or `officer@vendorbridge.com`
- **Key Elements Shown:** Invoice detail displaying updated `PAID` status badge in emerald green, `Paid on:` timestamp, line items, and the authoritative 3-Way Match Verification Card (`100% RECONCILED`).

![09 - Invoice Paid Confirmation](docs/screenshots/09_invoice_paid_confirmation.png)

---

### 10. Real-Time Activity & Audit Logs Timeline
- **Route:** `/activity`
- **Recommended User:** `admin@vendorbridge.com` or `officer@vendorbridge.com`
- **Key Elements Shown:** Chronological activity stream with category pills (RFQ, Approval, PO, Invoice, Auth, Vendor), actor roles, formatted timestamps, and entity identifier badges.

![10 - Activity Timeline](docs/screenshots/10_activity_timeline.png)

---

### 11. Activity Filters & Dynamic Search
- **Route:** `/activity`
- **Recommended User:** `admin@vendorbridge.com`
- **Key Elements Shown:** Filtering by category tab, search input with instant debounced filtering, and immutable database record details.

![11 - Activity Filters & Search](docs/screenshots/11_activity_filters_search.png)

---

### 12. Reports & Analytics Overview
- **Route:** `/reports`
- **Recommended User:** `admin@vendorbridge.com` or `manager@vendorbridge.com`
- **Key Elements Shown:** Live KPI metric cards (Total Spend in INR ₹, PO Commitment, Invoices Paid, Hardened PO Fulfillment Rate, Active Suppliers snapshot) and period selector (30d, 90d, 6m, 12m, All).

![12 - Reports Overview](docs/screenshots/12_reports_overview.png)

---

### 13. Reports Charts, Top Suppliers Leaderboard & CSV Export
- **Route:** `/reports` → Scroll to visual analytics
- **Recommended User:** `admin@vendorbridge.com` or `officer@vendorbridge.com`
- **Key Elements Shown:** Monthly Spend & PO Trajectory SVG trendline, Category Spend Distribution, Top Suppliers Leaderboard, Status breakdown pies, and the `Export CSV` action button.

![13 - Reports Charts & Export](docs/screenshots/13_reports_charts_export.png)
