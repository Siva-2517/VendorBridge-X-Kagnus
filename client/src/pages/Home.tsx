import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  Building2,
  CircleDollarSign,
  FileText,
  Receipt,
  Activity,
  Lock,
  Database,
  ChevronRight,
} from 'lucide-react';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeRoleTab, setActiveRoleTab] = useState<'admin' | 'officer' | 'manager' | 'vendor'>('officer');

  const roleShowcases = {
    officer: {
      title: 'Procurement Officer Operations',
      subtitle: 'Supplier verification, RFQ dispatch, and live purchase order commitments.',
      badge: 'Operational Lead',
      metrics: [
        { label: 'Active Suppliers', value: '21 Verified', detail: '4 pending KYC review' },
        { label: 'Live Commitments', value: '₹3,02,000', detail: 'Approved purchase orders' },
        { label: 'RFQ Pipeline', value: '12 Active RFQs', detail: '4 awaiting supplier quotes' },
      ],
      actions: ['+ Add Vendor', '+ new RFQ', 'Dispatch Quotation Requests', 'Review Invoices'],
    },
    admin: {
      title: 'System Administration & Governance',
      subtitle: 'Complete enterprise oversight, audit compliance, and user identity management.',
      badge: 'Full Governance',
      metrics: [
        { label: 'Registered Suppliers', value: '28 Enterprise', detail: '21 active, 4 pending, 3 blocked' },
        { label: 'System User Accounts', value: '4 Core Roles', detail: 'Database-backed RBAC' },
        { label: 'Audit Logging', value: 'Tamper-Evident', detail: 'PO integrity constraint checks' },
      ],
      actions: ['User Governance', 'Vendor Deletion (Admin-Only)', 'Security Policy', 'Audit Activity Log'],
    },
    manager: {
      title: 'Managerial Approvals & Financial Control',
      subtitle: 'High-value purchase requisition review, budget compliance, and sign-offs.',
      badge: 'Financial Approver',
      metrics: [
        { label: 'Approval Queue', value: '1 Pending', detail: 'Awaiting managerial sign-off' },
        { label: 'Authorized Spend', value: '₹3.02L', detail: 'Budget baseline tracked' },
        { label: 'Invoice Aging', value: '3 Under Review', detail: '3-way matching validation' },
      ],
      actions: ['Sign-off Purchase Requisitions', 'Budget Analysis', 'Supplier Performance', 'Procurement Reports'],
    },
    vendor: {
      title: 'Supplier Portal & Self-Service',
      subtitle: 'Isolated supplier workspace: bid submission, awarded orders, and profile compliance.',
      badge: 'Vendor Partner',
      metrics: [
        { label: 'Company Profile', value: 'Infra Supplies Pvt Ltd', detail: 'GSTIN: 27AABC1576214B0' },
        { label: 'Awarded Orders', value: '1 Approved PO', detail: 'PO-2025-001 (₹87,000)' },
        { label: 'Data Isolation', value: '100% Private', detail: 'Competitor data strictly hidden' },
      ],
      actions: ['Submit Bid Quotation', 'Download Purchase Order', 'Upload Tax Invoice', 'Update Company Profile'],
    },
  };

  const activeContent = roleShowcases[activeRoleTab];

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#36C9A5]/30 selection:text-[#36C9A5]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#0B1220]/80 backdrop-blur-md border-b border-[#334155]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#36C9A5]/10 border border-[#36C9A5]/30 flex items-center justify-center text-[#36C9A5] font-bold text-sm tracking-tight shadow-sm">
              VB
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight">VendorBridge</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#36C9A5]"></span>
              <span className="hidden sm:inline-block text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider">
                ERP Suite
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#94A3B8]">
            <a href="#architecture" className="hover:text-white transition-colors">
              Architecture
            </a>
            <a href="#roles" className="hover:text-white transition-colors">
              Role Matrix
            </a>
            <a href="#roadmap" className="hover:text-white transition-colors">
              Roadmap
            </a>
            <a href="#security" className="hover:text-white transition-colors">
              Security & DB
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-3.5 py-1.5 text-slate-300 hover:text-white hover:bg-[#1E293B] rounded-lg text-xs font-semibold transition-colors"
                >
                  Sign in
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-4 py-1.5 bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-[#334155]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Mission & Core Value */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E293B] border border-[#334155] text-xs text-[#94A3B8]">
                <span className="w-2 h-2 rounded-full bg-[#36C9A5] animate-pulse"></span>
                <span className="text-white font-medium">Week 1 Foundation Milestone Active</span>
                <span className="text-slate-500">•</span>
                <span>PostgreSQL Cloud Neon</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
                Next-generation procurement and vendor governance for modern enterprises.
              </h1>

              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed max-w-2xl">
                VendorBridge replaces fragmented spreadsheets with an integrated procurement ERP. Built from the ground up for strict 15-character GSTIN validation, multi-level approval hierarchies, role-isolated vendor portals, and permanent cloud database persistence.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => navigate(user ? '/dashboard' : '/login')}
                  className="px-6 py-3 bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg transition-all"
                >
                  <span>{user ? 'Enter Procurement Dashboard' : 'Launch ERP Demo'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => navigate(user ? '/vendors' : '/register')}
                  className="px-5 py-3 bg-[#1E293B] hover:bg-[#273449] text-white border border-[#334155] rounded-xl text-xs sm:text-sm font-semibold transition-colors"
                >
                  {user ? 'View Supplier Directory' : 'Register Supplier Account'}
                </button>
              </div>

              {/* Trust signals */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-[#334155]/60 max-w-xl text-xs">
                <div>
                  <div className="text-lg font-extrabold text-white font-mono">28</div>
                  <div className="text-[11px] text-[#94A3B8] mt-0.5">Enterprise Suppliers</div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-[#36C9A5] font-mono">100%</div>
                  <div className="text-[11px] text-[#94A3B8] mt-0.5">GSTIN Validated</div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-white font-mono">4 Roles</div>
                  <div className="text-[11px] text-[#94A3B8] mt-0.5">Strict Server RBAC</div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Command Center Terminal */}
            <div className="lg:col-span-5">
              <div className="bg-[#111827] border border-[#334155] rounded-2xl p-5 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#334155]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[11px] font-mono text-[#94A3B8] ml-2">vendorbridge-core</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#36C9A5] bg-[#36C9A5]/10 px-2 py-0.5 rounded border border-[#36C9A5]/30">
                    ERP Online
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Card 1: Live PO Commitments */}
                  <div className="p-3 bg-[#1E293B] rounded-xl border border-[#334155] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                        Live Purchase Commitments
                      </p>
                      <p className="text-lg font-extrabold text-white font-mono mt-0.5">₹3,02,000</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#0B1220] border border-[#334155] flex items-center justify-center text-[#36C9A5]">
                      <CircleDollarSign className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Card 2: Supplier Compliance */}
                  <div className="p-3 bg-[#1E293B] rounded-xl border border-[#334155] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                        Supplier Status Breakdown
                      </p>
                      <p className="text-xs text-white font-medium mt-0.5">
                        <span className="text-emerald-400 font-bold">21 Active</span> •{' '}
                        <span className="text-amber-400 font-bold">4 Pending</span> •{' '}
                        <span className="text-rose-400 font-bold">3 Blocked</span>
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#0B1220] border border-[#334155] flex items-center justify-center text-[#36C9A5]">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Card 3: Security & Database */}
                  <div className="p-3 bg-[#0B1220] rounded-xl border border-[#334155] text-[11px] text-[#94A3B8] space-y-1.5">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Database Engine</span>
                      <span className="font-mono text-[#36C9A5]">PostgreSQL (Neon Cloud)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Session Architecture</span>
                      <span className="font-mono text-white">HTTP-Only JWT Cookie</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>GSTIN Verification</span>
                      <span className="font-mono text-emerald-400">Strict 15-char Regex</span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/login')}
                    className="w-full py-2 bg-[#0B1220] hover:bg-[#273449] text-white border border-[#334155] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Sign in with Pre-Seeded Accounts</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#36C9A5]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Experience Showcase */}
      <section id="roles" className="py-16 md:py-20 border-b border-[#334155]/60 bg-[#111827]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div>
            <span className="text-[11px] font-bold text-[#36C9A5] uppercase tracking-widest font-mono">
              Role-Based Access Control
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              Purpose-built experiences for every procurement stakeholder.
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1.5 max-w-2xl">
              VendorBridge eliminates generic one-size-fits-all screens. Every user sees exactly what their responsibilities require, with permissions strictly validated on the backend.
            </p>
          </div>

          {/* Role selector tabs */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-[#0B1220] border border-[#334155] rounded-xl max-w-xl text-xs">
            <button
              onClick={() => setActiveRoleTab('officer')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg font-semibold transition-all ${
                activeRoleTab === 'officer'
                  ? 'bg-[#36C9A5] text-[#0B1220] shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Procurement Officer
            </button>
            <button
              onClick={() => setActiveRoleTab('admin')}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg font-semibold transition-all ${
                activeRoleTab === 'admin'
                  ? 'bg-[#36C9A5] text-[#0B1220] shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              System Admin
            </button>
            <button
              onClick={() => setActiveRoleTab('manager')}
              className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg font-semibold transition-all ${
                activeRoleTab === 'manager'
                  ? 'bg-[#36C9A5] text-[#0B1220] shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Manager / Approver
            </button>
            <button
              onClick={() => setActiveRoleTab('vendor')}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg font-semibold transition-all ${
                activeRoleTab === 'vendor'
                  ? 'bg-[#36C9A5] text-[#0B1220] shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vendor Partner
            </button>
          </div>

          {/* Active Tab Showcase Card */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#334155] pb-6">
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#0B1220] text-[#36C9A5] border border-[#334155]">
                  {activeContent.badge}
                </span>
                <h3 className="text-xl font-bold text-white mt-2">{activeContent.title}</h3>
                <p className="text-xs text-[#94A3B8] mt-1">{activeContent.subtitle}</p>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="self-start md:self-auto px-4 py-2 bg-[#0B1220] hover:bg-[#273449] text-white border border-[#334155] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>Log in as this role</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#36C9A5]" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              {activeContent.metrics.map((m, idx) => (
                <div key={idx} className="p-4 bg-[#0B1220] border border-[#334155] rounded-xl">
                  <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                    {m.label}
                  </span>
                  <div className="text-lg font-bold text-white mt-1">{m.value}</div>
                  <div className="text-[11px] text-[#36C9A5] mt-0.5">{m.detail}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-[#334155]">
              <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block mb-3">
                Authorized Platform Capabilities
              </span>
              <div className="flex flex-wrap gap-2">
                {activeContent.actions.map((act, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B1220] border border-[#334155] text-xs text-slate-200 font-medium"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#36C9A5]" />
                    {act}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Week Milestone Roadmap */}
      <section id="roadmap" className="py-16 md:py-20 border-b border-[#334155]/60 bg-[#0B1220]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div>
            <span className="text-[11px] font-bold text-[#36C9A5] uppercase tracking-widest font-mono">
              Product Roadmap & Progression
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              Phased enterprise ERP implementation.
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1.5 max-w-2xl">
              Week 1 delivers the secure foundation and vendor management module. Weeks 2–4 build upon this core with honest, non-mocked milestone placeholders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Week 1 */}
            <div className="p-5 bg-[#1E293B] border-2 border-[#36C9A5] rounded-xl shadow-lg relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-[#36C9A5] font-mono uppercase">
                    Week 1 • Delivered
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-[#36C9A5]" />
                </div>
                <h4 className="text-base font-bold text-white">Foundation & Vendor Management</h4>
                <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                  Authentication, session handling, 28-vendor database registry, 15-char GSTIN validation, and role-tailored dashboards.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#334155] text-[11px] text-emerald-400 font-semibold">
                ✔ 100% Implemented & Tested
              </div>
            </div>

            {/* Week 2 */}
            <div className="p-5 bg-[#111827] border border-[#334155] rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-slate-400 font-mono uppercase">
                    Week 2 • Scheduled
                  </span>
                  <FileText className="w-4 h-4 text-slate-400" />
                </div>
                <h4 className="text-base font-bold text-slate-200">RFQs & Quotation Matrix</h4>
                <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                  Multi-line requisition tables, supplier quotation portal, comparative tax breakdown, and automated L1 price calculation.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#334155] text-[11px] text-slate-500 font-medium">
                Preview Placeholder Active
              </div>
            </div>

            {/* Week 3 */}
            <div className="p-5 bg-[#111827] border border-[#334155] rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-slate-400 font-mono uppercase">
                    Week 3 • Scheduled
                  </span>
                  <Receipt className="w-4 h-4 text-slate-400" />
                </div>
                <h4 className="text-base font-bold text-slate-200">Approvals & 3-Way Matching</h4>
                <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                  Hierarchical approval chains (L1, L2, Finance), automated purchase order generation, and PO-GRN-Invoice matching.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#334155] text-[11px] text-slate-500 font-medium">
                Preview Placeholder Active
              </div>
            </div>

            {/* Week 4 */}
            <div className="p-5 bg-[#111827] border border-[#334155] rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-slate-400 font-mono uppercase">
                    Week 4 • Scheduled
                  </span>
                  <Activity className="w-4 h-4 text-slate-400" />
                </div>
                <h4 className="text-base font-bold text-slate-200">Reports & Audit Activity</h4>
                <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                  Executive analytics, OTIF supplier scorecards, department spend breakdown, and immutable compliance audit trails.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#334155] text-[11px] text-slate-500 font-medium">
                Preview Placeholder Active
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Cloud Database Architecture */}
      <section id="security" className="py-16 md:py-20 bg-[#111827] border-b border-[#334155]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div>
            <span className="text-[11px] font-bold text-[#36C9A5] uppercase tracking-widest font-mono">
              Enterprise Engineering
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              Production-grade architectural standards.
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1.5 max-w-2xl">
              Zero fake client-side persistence. Built with cloud-native PostgreSQL, robust cryptographic hashing, and automated test coverage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="p-5 bg-[#0B1220] border border-[#334155] rounded-xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#36C9A5]">
                <Database className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Neon PostgreSQL Database</h4>
              <p className="text-[#94A3B8] leading-relaxed">
                Persistent relational data store via Prisma ORM. Live tables for Users, Vendors, Purchase Orders, and Password Tokens.
              </p>
            </div>

            <div className="p-5 bg-[#0B1220] border border-[#334155] rounded-xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#36C9A5]">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Cryptographic Security</h4>
              <p className="text-[#94A3B8] leading-relaxed">
                Bcrypt password hashing with 10 salt rounds. HTTP-only session cookies protected from client-side XSS and token hijacking.
              </p>
            </div>

            <div className="p-5 bg-[#0B1220] border border-[#334155] rounded-xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#36C9A5]">
                <Shield className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Automated Test Verification</h4>
              <p className="text-[#94A3B8] leading-relaxed">
                28 integration tests executed via Vitest & Supertest, validating GSTIN integrity, role restrictions, and vendor isolation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#0B1220] text-xs text-[#94A3B8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">VendorBridge</span>
            <span>• Procurement & Vendor Management ERP</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Week 1 Milestone Completed</span>
            <span>•</span>
            <button
              onClick={() => navigate('/login')}
              className="text-[#36C9A5] hover:text-[#2db893] transition-colors font-semibold"
            >
              Sign In to ERP &rarr;
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
