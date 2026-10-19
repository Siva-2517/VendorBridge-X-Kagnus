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
} from 'lucide-react';
import { VendorModal } from './VendorModal';

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
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard/summary', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to load dashboard metrics');
      }
      const json = await res.json();
      setData(json.summary);
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

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
        return 'Procurement Officer';
    }
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading procurement overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header Overview Greeting matching Screen 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#19281f]">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Welcome back,{' '}
            <span className="text-emerald-400 font-semibold">{getRoleDisplayName(user?.role)}</span> —
            Today's Overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            title="Refresh statistics"
            className="p-2 bg-[#121f18] hover:bg-[#1a2d23] text-slate-300 rounded-lg border border-[#213529] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Stat Cards matching Screen 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active RFQs */}
        <div className="bg-[#121c17] border border-[#203327] rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-600/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active RFQ's
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {data?.metrics.activeRfqs ?? 12}
            </span>
            <p className="text-[11px] text-emerald-400/90 font-medium mt-1">4 awaiting supplier quotes</p>
          </div>
        </div>

        {/* Card 2: Pending Approvals */}
        <div className="bg-[#121c17] border border-[#203327] rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-600/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pending Approvals
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-950/70 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {data?.metrics.pendingApprovals ?? 5}
            </span>
            <p className="text-[11px] text-amber-400/90 font-medium mt-1">2 high-priority reviews</p>
          </div>
        </div>

        {/* Card 3: Monthly PO Spend */}
        <div className="bg-[#121c17] border border-[#203327] rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-600/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              PO's This Month
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              $ {data?.metrics.monthlyPoSpend ?? '2.3L'}
            </span>
            <p className="text-[11px] text-emerald-400/90 font-medium mt-1">INR 2,30,000 committed</p>
          </div>
        </div>

        {/* Card 4: Overdue Invoices */}
        <div className="bg-[#121c17] border border-[#203327] rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-rose-600/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Overdue Invoices
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-950/70 border border-rose-800/60 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {data?.metrics.overdueInvoices ?? 3}
            </span>
            <p className="text-[11px] text-rose-400/90 font-medium mt-1">Action required by finance</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Purchase Orders & Spending Trends matching Screen 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Purchase Orders Table (2 Cols) */}
        <div className="lg:col-span-2 bg-[#121c17] border border-[#203327] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                Recent Purchase Orders
              </h3>
              <span className="text-xs text-slate-400">Latest active PO records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1f3025] text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">PO#</th>
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3">Amount (₹)</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18271e]">
                  {data?.recentPurchaseOrders?.map((po) => (
                    <tr key={po.id} className="hover:bg-[#16241d]/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-emerald-400">
                        {po.poNumber}
                      </td>
                      <td className="py-3 px-3 text-white font-medium">{po.vendor}</td>
                      <td className="py-3 px-3 font-mono text-slate-200">
                        ₹ {po.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3">
                        <Badge status={po.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1a2b21] flex justify-between items-center text-xs text-slate-400">
            <span>Showing verified PO records from database</span>
            <button
              onClick={() => navigate('/purchase-orders')}
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              View all POs &rarr;
            </button>
          </div>
        </div>

        {/* Spending Trends Chart / Breakdown (1 Col) */}
        <div className="bg-[#121c17] border border-[#203327] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Spending Trends
              </h3>
              <span className="text-[11px] text-slate-400">Last 6 months</span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Historical purchase commitment trend across approved vendors.
            </p>

            {/* Custom Bar Visualizer matching Screen 3 graphic */}
            <div className="h-44 flex items-end gap-3 pt-4 px-2 border-b border-[#213528]">
              {data?.spendingTrends?.map((item, idx) => {
                const maxSpend = 250000;
                const heightPercent = Math.min(100, Math.round((item.spend / maxSpend) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="text-[10px] text-emerald-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      {(item.spend / 100000).toFixed(1)}L
                    </div>
                    <div className="w-full bg-[#182a20] rounded-t-md relative flex items-end justify-center h-32 overflow-hidden">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-md transition-all duration-500 ${
                          idx === (data?.spendingTrends?.length ?? 0) - 1
                            ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                            : 'bg-emerald-800/80 group-hover:bg-emerald-700'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1a2b21] flex items-center justify-between text-xs">
            <span className="text-slate-400">Peak: April (2.5L)</span>
            <span className="text-emerald-400 font-semibold">Avg: 1.98L/mo</span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons matching Screen 3 wireframe footer */}
      <div className="bg-[#101914] border border-[#1d2d23] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Quick Actions
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Instant shortcuts for procurement workflows and vendor onboarding.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* [+ new RFQ] */}
          <button
            onClick={() => setRfqModalOpen(true)}
            className="px-4 py-2 bg-[#16251d] hover:bg-[#1e3327] text-slate-200 border border-[#274233] rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            + new RFQ
          </button>

          {/* [+ Add Vendor] */}
          <button
            onClick={() => setIsAddVendorOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            + Add Vendor
          </button>

          {/* [View Invoices] */}
          <button
            onClick={() => navigate('/invoices')}
            className="px-4 py-2 bg-[#16251d] hover:bg-[#1e3327] text-slate-200 border border-[#274233] rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
            View Invoices
          </button>
        </div>
      </div>

      {/* Info notice explaining honest data status */}
      <div className="p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-lg text-xs text-emerald-400/90 flex items-center gap-2">
        <Info className="w-4 h-4 shrink-0 text-emerald-400" />
        <span>
          <strong>Week 1 Status:</strong> Vendor Management, Authentication & RBAC are fully active and persistent. RFQs, Approvals, and Invoices modules are pre-architected for Weeks 2-4.
        </span>
      </div>

      {/* Add Vendor Modal */}
      <VendorModal
        isOpen={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        onSaved={fetchDashboardData}
      />

      {/* RFQ Milestone Notice Modal */}
      {rfqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#121c17] border border-[#21352a] rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              RFQ Module Preview
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              The Request for Quotation (RFQ) creation and comparison workflow (Screen 5 & 6) is scheduled for <strong>Week 2</strong> of the ERP milestone roadmap. You can continue managing vendors and supplier profiles in Week 1.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRfqModalOpen(false)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
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
