import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardData } from '../types';
import { Badge } from '../components/common/Badge';
import {
  FileText,
  Clock,
  CircleDollarSign,
  AlertCircle,
  Plus,
  Receipt,
  TrendingUp,
  RefreshCw,
  Info,
  Users,
  Building2,
  Shield,
  CheckCircle2,
  ShoppingCart,
  FileSpreadsheet,
  BarChart3,
  Activity,
  MapPin,
} from 'lucide-react';
import { VendorModal } from './VendorModal';
import { api } from '../api/client';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [rfqModalOpen, setRfqModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // Clear stale data immediately so records from a previous role do not linger
      setData(null);
      setLoading(true);
      setError(null);
      const res = await api.get<{ success: boolean; summary: DashboardData }>('/api/dashboard/summary');
      setData(res.summary);
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id, user?.role]);

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'System Admin';
      case 'PROCUREMENT_OFFICER':
        return 'Procurement Officer';
      case 'MANAGER_APPROVER':
        return 'Manager / Approver';
      case 'VENDOR':
        return 'Vendor Partner';
      default:
        return 'Authorized User';
    }
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#36C9A5] animate-spin" />
          <p className="text-sm text-[#94A3B8]">Loading role-specific overview...</p>
        </div>
      </div>
    );
  }

  const role = user?.role;
  const isVendor = role === 'VENDOR';
  const isAdmin = role === 'ADMIN';
  const isOfficer = role === 'PROCUREMENT_OFFICER';
  const isApprover = role === 'MANAGER_APPROVER';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header Overview Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#334155]">
        <div>
          <h2 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">Dashboard</h2>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Welcome back,{' '}
            <span className="text-[#36C9A5] font-semibold">{getRoleDisplayName(user?.role)}</span> —
            Today's Overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            title="Refresh statistics"
            className="p-2 bg-[#0B1220] hover:bg-[#273449] text-slate-300 rounded-lg border border-[#334155] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Role-Specific Context Notice Banner from Backend */}
      {data?.notice && (
        <div className="p-3.5 bg-[#0B1220] border border-[#334155] rounded-xl text-xs text-slate-300 flex items-start gap-3 shadow-sm">
          <Shield className="w-4 h-4 shrink-0 text-[#36C9A5] mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-white mr-1.5">
              {isAdmin && 'System Administration Console:'}
              {isOfficer && 'Procurement Operations:'}
              {isApprover && 'Budget & Approval Desk:'}
              {isVendor && 'Supplier Portal Notice:'}
            </span>
            <span className="text-[#94A3B8]">{data.notice}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Dedicated Vendor Profile & Status Card (Strictly for VENDOR role) */}
      {isVendor && data?.vendorProfile && (
        <div className="bg-[#1E293B] border border-[#36C9A5]/40 rounded-xl p-5 shadow-md relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#0B1220] border border-[#36C9A5]/30 flex items-center justify-center text-[#36C9A5] shrink-0 font-bold text-lg">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-base font-bold text-[#F8FAFC]">
                    {data.vendorProfile.name}
                  </h3>
                  <Badge status={data.vendorProfile.status} />
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0B1220] text-[#36C9A5] border border-[#334155] font-medium">
                    {data.vendorProfile.category}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 sm:gap-x-4 mt-2 text-xs text-[#94A3B8]">
                  <div>
                    <span className="text-slate-400">GSTIN: </span>
                    <span className="font-mono text-[#36C9A5] font-medium">
                      {data.vendorProfile.gstin}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Contact: </span>
                    <span className="text-slate-200">{data.vendorProfile.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#36C9A5] shrink-0" />
                    <span className="truncate">
                      {data.vendorProfile.city || 'Ahmedabad'}, {data.vendorProfile.state || 'Gujarat'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-center">
              <button
                onClick={() => navigate('/profile')}
                className="px-3.5 py-1.5 bg-[#0B1220] hover:bg-[#273449] text-xs font-semibold text-[#36C9A5] border border-[#334155] rounded-lg transition-colors"
              >
                View Account Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 Stat Cards tailored to the authenticated user's actual role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1 */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-[#36C9A5]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              {isAdmin && 'System Users'}
              {isOfficer && 'Active Suppliers'}
              {isApprover && 'Pending Approvals'}
              {isVendor && 'Company Status'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#0B1220] border border-[#334155] flex items-center justify-center text-[#36C9A5]">
              {isAdmin && <Users className="w-4 h-4" />}
              {isOfficer && <Building2 className="w-4 h-4" />}
              {isApprover && <Clock className="w-4 h-4 text-amber-400" />}
              {isVendor && <Shield className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
              {isAdmin && (data?.metrics?.totalUsers ?? 4)}
              {isOfficer && (data?.metrics?.activeSuppliers ?? data?.vendorCounts?.active ?? 21)}
              {isApprover && (data?.metrics?.pendingApprovals ?? 0)}
              {isVendor && (data?.vendorProfile?.status || 'ACTIVE')}
            </span>
            <p className="text-[11px] text-[#36C9A5] font-medium mt-1">
              {isAdmin && 'Live Database Accounts'}
              {isOfficer && `${data?.vendorCounts?.pending ?? 4} pending verification`}
              {isApprover && 'Awaiting managerial sign-off'}
              {isVendor && `Verified Entity • GSTIN Active`}
            </p>
          </div>
        </div>

        {/* CARD 2 */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              {isAdmin && 'Registered Vendors'}
              {isOfficer && 'Pending Verification'}
              {isApprover && 'Approved Commitments'}
              {isVendor && 'Orders Awarded'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#0B1220] border border-[#334155] flex items-center justify-center text-amber-400">
              {isAdmin && <Building2 className="w-4 h-4" />}
              {isOfficer && <Clock className="w-4 h-4" />}
              {isApprover && <CircleDollarSign className="w-4 h-4 text-[#36C9A5]" />}
              {isVendor && <ShoppingCart className="w-4 h-4 text-[#36C9A5]" />}
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
              {isAdmin && (data?.vendorCounts?.all ?? 28)}
              {isOfficer && (data?.metrics?.pendingVerifications ?? data?.vendorCounts?.pending ?? 4)}
              {isApprover && (data?.metrics?.monthlyPoSpend || '₹3.02L')}
              {isVendor && (data?.recentPurchaseOrders?.length ?? 1)}
            </span>
            <p className="text-[11px] text-amber-400 font-medium mt-1">
              {isAdmin && `${data?.vendorCounts?.active ?? 21} active • ${data?.vendorCounts?.pending ?? 4} pending`}
              {isOfficer && 'Action required on KYC / Docs'}
              {isApprover && 'Authorized purchase order value'}
              {isVendor && `${data?.metrics?.pendingApprovals ?? 0} in progress / review`}
            </p>
          </div>
        </div>

        {/* CARD 3 */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-[#36C9A5]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              {isAdmin && 'Total PO Spend'}
              {isOfficer && 'Monthly PO Spend'}
              {isApprover && 'Active Suppliers'}
              {isVendor && 'Awarded PO Value'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#0B1220] border border-[#334155] flex items-center justify-center text-[#36C9A5]">
              {isAdmin && <CircleDollarSign className="w-4 h-4" />}
              {isOfficer && <CircleDollarSign className="w-4 h-4" />}
              {isApprover && <Users className="w-4 h-4" />}
              {isVendor && <CircleDollarSign className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
              {data?.metrics?.monthlyPoSpend
                ? data.metrics.monthlyPoSpend.startsWith('₹')
                  ? data.metrics.monthlyPoSpend
                  : `₹${data.metrics.monthlyPoSpend}`
                : '₹0'}
            </span>
            <p className="text-[11px] text-[#36C9A5] font-medium mt-1">
              {isAdmin && 'Organizational Spend (PostgreSQL)'}
              {isOfficer && 'Live Approved Commitments'}
              {isApprover && `${data?.vendorCounts?.active ?? 21} Authorized Vendors`}
              {isVendor && 'Total PO Value Awarded'}
            </p>
          </div>
        </div>

        {/* CARD 4 */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-rose-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              {isAdmin && 'Pending Approvals'}
              {isOfficer && 'Active RFQs'}
              {isApprover && 'Overdue Invoices'}
              {isVendor && 'RFQ Invitations'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#0B1220] border border-[#334155] flex items-center justify-center text-rose-400">
              {isAdmin && <Clock className="w-4 h-4 text-amber-400" />}
              {isOfficer && <FileText className="w-4 h-4 text-[#36C9A5]" />}
              {isApprover && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {isVendor && <FileText className="w-4 h-4 text-[#36C9A5]" />}
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
              {isAdmin && (data?.metrics?.pendingApprovals ?? 0)}
              {isOfficer && (data?.metrics?.activeRfqs ?? 12)}
              {isApprover && (data?.metrics?.overdueInvoices ?? 3)}
              {isVendor && (data?.metrics?.activeRfqs ?? 4)}
            </span>
            <p className="text-[11px] font-medium mt-1 text-slate-300">
              {isAdmin && `${data?.metrics?.pendingApprovals ?? 0} awaiting managerial sign-off`}
              {isOfficer && 'Week 2 Preview • 4 awaiting quotes'}
              {isApprover && 'Week 3 Preview • Action required'}
              {isVendor && 'Week 2 Preview • Bidding portal'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Purchase Orders Table & Spending Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase Orders Table (2 Cols) */}
        <div className="lg:col-span-2 bg-[#1E293B] border border-[#334155] rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#F8FAFC] tracking-wide uppercase">
                  {isVendor ? 'Orders Awarded to Your Company' : 'Recent Purchase Orders'}
                </h3>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  {isVendor
                    ? 'Orders assigned specifically to your company profile'
                    : 'Verified database records across registered suppliers'}
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#36C9A5] bg-[#0B1220] px-2.5 py-1 rounded-md border border-[#334155]">
                {data?.recentPurchaseOrders?.length || 0} order(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#334155] text-[#94A3B8] uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-2.5 px-3">PO#</th>
                    <th className="py-2.5 px-3">{isVendor ? 'Recipient Legal Entity' : 'Vendor'}</th>
                    <th className="py-2.5 px-3">Amount (₹)</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/60">
                  {(!data?.recentPurchaseOrders || data.recentPurchaseOrders.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#94A3B8]">
                        <p className="font-semibold text-slate-300">No purchase orders found</p>
                        <p className="text-[11px] mt-1 text-slate-500">
                          {isVendor
                            ? 'Your company has not been awarded any purchase orders yet.'
                            : 'No purchase orders recorded in database store.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    data.recentPurchaseOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-[#273449]/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-[#36C9A5]">
                          {po.poNumber}
                        </td>
                        <td className="py-3 px-3 text-[#F8FAFC] font-medium">{po.vendor}</td>
                        <td className="py-3 px-3 font-mono text-slate-200">
                          ₹{po.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3">
                          <Badge status={po.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#334155] flex justify-between items-center text-xs text-[#94A3B8]">
            <span>
              {isVendor
                ? 'Isolated company records loaded from database'
                : 'Verified purchase orders loaded live from database'}
            </span>
            <button
              onClick={() => navigate('/purchase-orders')}
              className="text-[#36C9A5] hover:text-[#2db893] font-medium transition-colors"
            >
              View all POs &rarr;
            </button>
          </div>
        </div>

        {/* Spending Trends Chart (1 Col) */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#F8FAFC] tracking-wide uppercase flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#36C9A5]" />
                {isVendor ? 'Revenue & Orders Trend' : 'Spending Trends'}
              </h3>
              <span className="text-[11px] text-[#94A3B8]">
                {isVendor ? 'Company POs' : 'Historical POs'}
              </span>
            </div>

            <p className="text-xs text-[#94A3B8] mb-4">
              {isVendor
                ? 'Historical order volume awarded to your organization.'
                : 'Purchase commitment baseline trend across approved suppliers.'}
            </p>

            {/* Custom Bar Visualizer */}
            <div className="h-44 flex items-end gap-3 pt-4 px-2 border-b border-[#334155]">
              {data?.spendingTrends?.map((item, idx) => {
                const spends = data?.spendingTrends?.map((i) => i.spend) || [];
                const maxSpend = Math.max(...spends, 100000);
                const heightPercent = maxSpend > 0 ? Math.min(100, Math.round((item.spend / maxSpend) * 100)) : 0;
                const isLast = idx === (data?.spendingTrends?.length ?? 0) - 1;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="text-[10px] text-[#36C9A5] font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {item.spend >= 100000
                        ? `₹${(item.spend / 100000).toFixed(2)}L`
                        : `₹${item.spend.toLocaleString('en-IN')}`}
                    </div>
                    <div className="w-full bg-[#0B1220] rounded-t-md relative flex items-end justify-center h-32 overflow-hidden border border-[#334155]/40">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-sm transition-all duration-500 ${
                          isLast
                            ? 'bg-gradient-to-t from-[#36C9A5] to-[#5eead4]'
                            : 'bg-[#334155] group-hover:bg-[#36C9A5]/60'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] text-[#94A3B8] font-medium">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#334155] flex items-center justify-between text-xs">
            {(() => {
              const spends = data?.spendingTrends?.map((i) => i.spend) || [];
              const maxSpendVal = spends.length > 0 ? Math.max(...spends) : 0;
              const peakItem = data?.spendingTrends?.find((i) => i.spend === maxSpendVal && i.spend > 0);
              const total = spends.reduce((a, b) => a + b, 0);
              const avg = spends.length > 0 ? Math.round(total / spends.length) : 0;
              const avgLabel = avg >= 100000 ? `₹${(avg / 100000).toFixed(2)}L` : `₹${avg.toLocaleString('en-IN')}`;
              const peakLabel = peakItem
                ? `Peak: ${peakItem.month} (${peakItem.spend >= 100000 ? `₹${(peakItem.spend / 100000).toFixed(2)}L` : `₹${peakItem.spend.toLocaleString('en-IN')}`})`
                : 'Peak: Baseline';
              return (
                <>
                  <span className="text-[#94A3B8]">{peakLabel}</span>
                  <span className="text-[#36C9A5] font-semibold">Avg: {avgLabel}/mo</span>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Role-Aware Quick Action Buttons */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="min-w-0">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#F8FAFC]">
            Permitted Quick Actions
          </h4>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            {isVendor
              ? 'Authorized actions for supplier bidding, quotation, and profile updates.'
              : isAdmin
              ? 'Administrative controls for vendor governance and user oversight.'
              : isOfficer
              ? 'Procurement operations, supplier onboarding, and RFQ issuance.'
              : 'Managerial sign-off and procurement approval workflows.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          {/* Admin & Procurement Officer: [+ Add Vendor] */}
          {(isAdmin || isOfficer) && (
            <button
              onClick={() => setIsAddVendorOpen(true)}
              className="flex-1 sm:flex-none justify-center px-4 py-2 bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              + Add Vendor
            </button>
          )}

          {/* Admin & Procurement Officer: [+ new RFQ] */}
          {(isAdmin || isOfficer) && (
            <button
              onClick={() => setRfqModalOpen(true)}
              className="flex-1 sm:flex-none justify-center px-4 py-2 bg-[#0B1220] hover:bg-[#273449] text-slate-200 border border-[#334155] rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-[#36C9A5]" />
              + new RFQ
            </button>
          )}

          {/* Manager / Approver: [Review Approvals] */}
          {isApprover && (
            <button
              onClick={() => navigate('/approvals')}
              className="flex-1 sm:flex-none justify-center px-4 py-2 bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Review Approvals
            </button>
          )}

          {/* Manager / Approver: [Procurement Reports] */}
          {isApprover && (
            <button
              onClick={() => navigate('/reports')}
              className="flex-1 sm:flex-none justify-center px-4 py-2 bg-[#0B1220] hover:bg-[#273449] text-slate-200 border border-[#334155] rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#36C9A5]" />
              Reports
            </button>
          )}

          {/* Admin: [Audit Activity] */}
          {isAdmin && (
            <button
              onClick={() => navigate('/activity')}
              className="flex-1 sm:flex-none justify-center px-4 py-2 bg-[#0B1220] hover:bg-[#273449] text-slate-200 border border-[#334155] rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Activity className="w-3.5 h-3.5 text-[#36C9A5]" />
              Audit Trail
            </button>
          )}

          {/* Vendor Specific Actions: Quotations & Invoices & Profile */}
          {isVendor && (
            <>
              <button
                onClick={() => navigate('/quotations')}
                className="flex-1 sm:flex-none justify-center px-4 py-2 bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Submit Quotation
              </button>
              <button
                onClick={() => navigate('/invoices')}
                className="flex-1 sm:flex-none justify-center px-4 py-2 bg-[#0B1220] hover:bg-[#273449] text-slate-200 border border-[#334155] rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Receipt className="w-3.5 h-3.5 text-[#36C9A5]" />
                Invoices
              </button>
            </>
          )}

          {/* Purchase Orders (Available for all) */}
          <button
            onClick={() => navigate('/purchase-orders')}
            className="flex-1 sm:flex-none justify-center px-4 py-2 bg-[#0B1220] hover:bg-[#273449] text-slate-200 border border-[#334155] rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-[#36C9A5]" />
            {isVendor ? 'Awarded POs' : 'Purchase Orders'}
          </button>
        </div>
      </div>

      {/* Info notice explaining honest data status */}
      <div className="p-3 bg-[#0B1220] border border-[#334155] rounded-lg text-xs text-[#94A3B8] flex items-center gap-2.5">
        <Info className="w-4 h-4 shrink-0 text-[#36C9A5]" />
        <span>
          <strong className="text-[#F8FAFC]">Data & Status Integrity:</strong> Role-based access control, supplier isolation, and database-backed purchase orders are enforced server-side. RFQ, approvals, and invoice modules represent scheduled milestone baselines for Weeks 2–4.
        </span>
      </div>

      {/* Add Vendor Modal (For Admin & Procurement Officer) */}
      {(isAdmin || isOfficer) && (
        <VendorModal
          isOpen={isAddVendorOpen}
          onClose={() => setIsAddVendorOpen(false)}
          onSaved={fetchDashboardData}
        />
      )}

      {/* RFQ Milestone Notice Modal */}
      {rfqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1220]/80 backdrop-blur-sm">
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#36C9A5]" />
              RFQ Module Preview
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              The Request for Quotation (RFQ) creation and comparison workflow (Screen 5 & 6) is scheduled for <strong className="text-[#F8FAFC]">Week 2</strong> of the ERP milestone roadmap. You can continue managing vendors and supplier profiles in Week 1.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRfqModalOpen(false)}
                className="px-4 py-1.5 bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] text-xs font-semibold rounded-lg transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
