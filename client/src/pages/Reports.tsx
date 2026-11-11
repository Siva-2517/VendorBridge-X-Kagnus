import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportsApi } from '../services/reportsApi';
import {
  ReportsOverviewResponse,
} from '../types';
import {
  BarChart3,
  CircleDollarSign,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  RefreshCw,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  Award,
  Info,
  AlertCircle,
  Percent,
} from 'lucide-react';

type PeriodType = '30d' | '90d' | '6m' | '12m' | 'all';

const PERIOD_OPTIONS: Array<{ key: PeriodType; label: string }> = [
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: '6m', label: '6 Months' },
  { key: '12m', label: '12 Months' },
  { key: 'all', label: 'All Time' },
];

const CATEGORY_COLORS = [
  { bg: 'bg-[#36C9A5]', text: 'text-[#36C9A5]', border: 'border-[#36C9A5]/40', fill: '#36C9A5' },
  { bg: 'bg-sky-400', text: 'text-sky-400', border: 'border-sky-400/40', fill: '#38BDF8' },
  { bg: 'bg-indigo-400', text: 'text-indigo-400', border: 'border-indigo-400/40', fill: '#818CF8' },
  { bg: 'bg-amber-400', text: 'text-amber-400', border: 'border-amber-400/40', fill: '#FBBF24' },
  { bg: 'bg-rose-400', text: 'text-rose-400', border: 'border-rose-400/40', fill: '#FB7185' },
  { bg: 'bg-purple-400', text: 'text-purple-400', border: 'border-purple-400/40', fill: '#C084FC' },
];

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodType>('12m');
  const [data, setData] = useState<ReportsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTrendIdx, setActiveTrendIdx] = useState<number | null>(null);

  const fetchReports = async (selectedPeriod: PeriodType = period) => {
    try {
      setLoading(true);
      setError(null);
      const res = await reportsApi.getReportsOverview({ period: selectedPeriod });
      setData(res);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError(err.message || 'Failed to load reports and analytics overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(period);
  }, [period]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await reportsApi.downloadCsv({ period });
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Failed to download CSV export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const isVendor = user?.role === 'VENDOR';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* 1. Header Overview Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#334155]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">Reports & Analytics</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#36C9A5]/10 text-[#36C9A5] border border-[#36C9A5]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#36C9A5] animate-pulse" />
              Live Reporting
            </span>
          </div>
          <p className="text-sm text-[#94A3B8] mt-1">
            {isVendor
              ? 'Real-time revenue, order fulfillment velocity, invoice aging, and contract compliance scorecards.'
              : 'Executive procurement analytics, expenditure trends, supplier performance scorecards, and audit exports.'}
          </p>
        </div>

        {/* Action Controls: Period Selector & CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector Tabs */}
          <div className="inline-flex bg-[#0B1220] p-1 rounded-xl border border-[#334155]">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  period === opt.key
                    ? 'bg-[#36C9A5] text-[#0B1220] shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchReports(period)}
            disabled={loading}
            title="Refresh analytics data"
            className="p-2 bg-[#1E293B] hover:bg-[#273449] text-slate-300 border border-[#334155] rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#36C9A5]' : ''}`} />
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] text-xs font-bold rounded-xl transition-all shadow-md shadow-[#36C9A5]/10 disabled:opacity-50"
          >
            <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-bounce' : ''}`} />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchReports(period)}
            className="px-3 py-1 bg-rose-900/60 hover:bg-rose-800 text-xs font-semibold rounded-lg border border-rose-700 text-rose-200 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-[#1E293B] border border-[#334155] rounded-xl p-4" />
            ))}
          </div>
          <div className="h-72 bg-[#1E293B] border border-[#334155] rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-[#1E293B] border border-[#334155] rounded-xl" />
            <div className="h-64 bg-[#1E293B] border border-[#334155] rounded-xl" />
          </div>
        </div>
      )}

      {/* 2. KPI Cards Grid (5 Cards) */}
      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* KPI 1: Total Spend */}
            <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-[#36C9A5]/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  {isVendor ? 'Total Earned Revenue' : 'Total Settled Spend'}
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#0B1220] border border-[#334155] flex items-center justify-center text-[#36C9A5]">
                  <CircleDollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
                  {data.kpis.formattedTotalSpend}
                </span>
                <p className="text-[11px] text-[#94A3B8] mt-1 flex items-center gap-1">
                  <span className="text-emerald-400 font-semibold">PAID</span> status invoices
                </p>
              </div>
            </div>

            {/* KPI 2: Active Vendors */}
            <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-sky-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  {isVendor ? 'Supplier Account' : 'Active Vendors'}
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#0B1220] border border-[#334155] flex items-center justify-center text-sky-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
                  {isVendor ? (data.kpis.activeVendors === 1 ? 'ACTIVE' : 'PENDING') : data.kpis.activeVendors}
                </span>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  {isVendor ? 'Verified profile status (current)' : 'Active directory snapshot (current)'}
                </p>
              </div>
            </div>

            {/* KPI 3: PO Fulfillment Rate */}
            <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  PO Fulfillment Rate
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#0B1220] border border-[#334155] flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
                  {data.kpis.poFulfillmentRate}%
                </span>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  {data.kpis.fulfilledPOsCount} of {data.kpis.totalEligiblePOsCount} orders paid
                </p>
              </div>
            </div>

            {/* KPI 4: Pending Invoices */}
            <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-amber-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Pending Invoices
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#0B1220] border border-[#334155] flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
                  {data.kpis.pendingInvoices}
                </span>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  Awaiting payment processing
                </p>
              </div>
            </div>

            {/* KPI 5: Overdue Invoices */}
            <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-rose-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Overdue Invoices
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#0B1220] border border-[#334155] flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
                  {data.kpis.overdueInvoices}
                </span>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  Past net payment term deadline
                </p>
              </div>
            </div>
          </div>

          {/* 3. Monthly Spend & Commitment Trend Chart */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#F8FAFC] tracking-wide uppercase flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#36C9A5]" />
                  <span>Monthly Procurement & Spend Trajectory</span>
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Chronological breakdown of settled invoice expenditures and approved purchase order commitments
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#36C9A5]" />
                  <span className="text-slate-300">Paid Invoices (₹)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-sky-400" />
                  <span className="text-slate-300">PO Commitments (₹)</span>
                </div>
              </div>
            </div>

            {/* Custom Interactive SVG/HTML Visualizer */}
            {data.monthlySpendTrend.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#94A3B8]">
                No transactional records recorded within the selected period ({period}).
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-56 flex items-end gap-2 sm:gap-4 pt-6 px-2 border-b border-[#334155]">
                  {(() => {
                    const maxVal = Math.max(
                      ...data.monthlySpendTrend.map((t) => Math.max(t.spend, t.poAmount)),
                      10000
                    );

                    return data.monthlySpendTrend.map((item, idx) => {
                      const spendHeight = Math.round((item.spend / maxVal) * 100);
                      const poHeight = Math.round((item.poAmount / maxVal) * 100);
                      const isHovered = activeTrendIdx === idx;

                      return (
                        <div
                          key={item.month}
                          onMouseEnter={() => setActiveTrendIdx(idx)}
                          onMouseLeave={() => setActiveTrendIdx(null)}
                          className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group relative"
                        >
                          {/* Tooltip on Hover */}
                          {isHovered && (
                            <div className="absolute -top-16 z-20 bg-[#0B1220] border border-[#334155] rounded-lg p-2 text-[11px] shadow-xl whitespace-nowrap pointer-events-none">
                              <div className="font-bold text-[#F8FAFC]">{item.monthLabel}</div>
                              <div className="text-[#36C9A5]">Paid Spend: ₹{item.spend.toLocaleString('en-IN')}</div>
                              <div className="text-sky-400">PO Total: ₹{item.poAmount.toLocaleString('en-IN')}</div>
                              <div className="text-[#94A3B8]">{item.invoiceCount} settled invoice(s)</div>
                            </div>
                          )}

                          {/* Bars container */}
                          <div className="w-full flex items-end justify-center gap-1 h-full">
                            {/* Paid Spend Bar */}
                            <div
                              style={{ height: `${Math.max(spendHeight, 4)}%` }}
                              className={`w-1/2 rounded-t transition-all ${
                                isHovered ? 'bg-[#36C9A5] shadow-lg shadow-[#36C9A5]/30' : 'bg-[#36C9A5]/80 group-hover:bg-[#36C9A5]'
                              }`}
                            />
                            {/* PO Commitment Bar */}
                            <div
                              style={{ height: `${Math.max(poHeight, 4)}%` }}
                              className={`w-1/2 rounded-t transition-all ${
                                isHovered ? 'bg-sky-400 shadow-lg shadow-sky-400/30' : 'bg-sky-400/70 group-hover:bg-sky-400'
                              }`}
                            />
                          </div>

                          {/* Month Label */}
                          <span className="text-[10px] text-[#94A3B8] group-hover:text-[#F8FAFC] transition-colors truncate">
                            {item.monthLabel.split(' ')[0]}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Footer Trend Summary */}
                <div className="flex flex-wrap items-center justify-between text-xs text-[#94A3B8] pt-1">
                  <span>
                    Aggregate Trend Period: <strong className="text-[#F8FAFC]">{data.monthlySpendTrend.length}</strong> months
                  </span>
                  <span>
                    Avg Monthly Spend: <strong className="text-[#36C9A5]">
                      ₹{(data.kpis.totalSpend / Math.max(data.monthlySpendTrend.length, 1)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4. Two-Column Grid: Spend by Category & Top Vendors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 4.1 Spend by Category */}
            <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#F8FAFC] tracking-wide uppercase flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#36C9A5]" />
                  <span>Expenditure by Procurement Category</span>
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Proportional distribution of settled invoice capital across procurement disciplines
                </p>
              </div>

              {data.spendByCategory.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#94A3B8]">
                  No settled invoices found for category classification in this timeframe.
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {/* Segmented Stacked Bar */}
                  <div className="h-3 w-full bg-[#0B1220] rounded-full overflow-hidden flex border border-[#334155]">
                    {data.spendByCategory.map((cat, idx) => {
                      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                      return (
                        <div
                          key={cat.category}
                          style={{ width: `${cat.percentage}%` }}
                          title={`${cat.category}: ${cat.percentage}% (₹${cat.amount.toLocaleString('en-IN')})`}
                          className={`${color.bg} transition-all`}
                        />
                      );
                    })}
                  </div>

                  {/* Category Breakdown Rows */}
                  <div className="space-y-2 pt-2">
                    {data.spendByCategory.map((cat, idx) => {
                      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                      return (
                        <div
                          key={cat.category}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#0B1220]/50 border border-[#334155]/60 hover:border-[#334155] transition-all"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${color.bg}`} />
                            <span className="font-semibold text-[#F8FAFC]">{cat.category}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-300 font-mono">₹{cat.amount.toLocaleString('en-IN')}</span>
                            <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${color.bg}/20 ${color.text} border ${color.border}`}>
                              {cat.percentage}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 4.2 Top Vendors by Paid Spend */}
            <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#F8FAFC] tracking-wide uppercase flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>{isVendor ? 'Company Revenue Distribution' : 'Top Suppliers by Disbursed Spend'}</span>
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {isVendor
                    ? 'Total settled payments awarded to your legal entity'
                    : 'Ranked supplier leaderboard by verified settled invoice disbursement'}
                </p>
              </div>

              {data.topVendors.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#94A3B8]">
                  No settled invoices to rank suppliers in this timeframe.
                </div>
              ) : (
                <div className="space-y-2.5 pt-2">
                  {data.topVendors.map((vendor, idx) => (
                    <div
                      key={vendor.vendorId}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#0B1220]/60 border border-[#334155] hover:border-amber-500/40 transition-all text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-[#1E293B] border border-[#334155] flex items-center justify-center font-bold text-amber-400 text-xs">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-[#F8FAFC]">{vendor.vendorName}</div>
                          <div className="text-[11px] text-[#94A3B8]">
                            {vendor.invoiceCount} invoice(s) • {vendor.poCount} purchase order(s)
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#36C9A5] font-mono text-sm">
                          ₹{vendor.paidAmount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">Disbursed</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 5. Status Distributions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 5.1 PO Status Distribution */}
            <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#F8FAFC] tracking-wide uppercase flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-400" />
                  <span>Purchase Order Status Breakdown</span>
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Distribution of purchase order records across operational approval and issuance stages
                </p>
              </div>

              {data.poStatusDistribution.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#94A3B8]">
                  No purchase orders recorded in this timeframe.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {data.poStatusDistribution.map((item) => (
                    <div
                      key={item.status}
                      className="p-3 rounded-lg bg-[#0B1220]/60 border border-[#334155] text-xs space-y-1"
                    >
                      <span className="text-[#94A3B8] font-medium block truncate">{item.label}</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-lg font-extrabold text-[#F8FAFC]">{item.count}</span>
                        <span className="text-[11px] font-bold text-sky-400">{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5.2 Invoice Status Distribution */}
            <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#F8FAFC] tracking-wide uppercase flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Tax Invoice Settlement Breakdown</span>
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Distribution of vendor tax invoices across payment verification and aging cycles
                </p>
              </div>

              {data.invoiceStatusDistribution.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#94A3B8]">
                  No tax invoices recorded in this timeframe.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {data.invoiceStatusDistribution.map((item) => (
                    <div
                      key={item.status}
                      className="p-3 rounded-lg bg-[#0B1220]/60 border border-[#334155] text-xs space-y-1"
                    >
                      <span className="text-[#94A3B8] font-medium block truncate">{item.label}</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-lg font-extrabold text-[#F8FAFC]">{item.count}</span>
                        <span className="text-[11px] font-bold text-emerald-400">{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 6. Measurable Vendor Performance Scorecard */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] tracking-wide uppercase flex items-center gap-2">
                <Percent className="w-4 h-4 text-[#36C9A5]" />
                <span>Supplier Performance & Operational Efficiency Scorecard</span>
              </h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Calculated strictly from persisted bidding invitations, quotation awards, and invoice payment cycles
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {/* Metric 1 */}
              <div className="p-4 rounded-xl bg-[#0B1220] border border-[#334155] space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  RFQ Response Rate
                </span>
                <div className="text-2xl font-extrabold text-[#36C9A5]">
                  {data.vendorPerformance.rfqResponseRate}%
                </div>
                <p className="text-[10px] text-[#94A3B8]">
                  Supplier quotation submissions per invitation
                </p>
              </div>

              {/* Metric 2 */}
              <div className="p-4 rounded-xl bg-[#0B1220] border border-[#334155] space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Quotation Win Rate
                </span>
                <div className="text-2xl font-extrabold text-sky-400">
                  {data.vendorPerformance.quotationAwardRate}%
                </div>
                <p className="text-[10px] text-[#94A3B8]">
                  Quotations selected for purchase order generation
                </p>
              </div>

              {/* Metric 3 */}
              <div className="p-4 rounded-xl bg-[#0B1220] border border-[#334155] space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Invoice Settlement Rate
                </span>
                <div className="text-2xl font-extrabold text-emerald-400">
                  {data.vendorPerformance.invoiceSettlementRate}%
                </div>
                <p className="text-[10px] text-[#94A3B8]">
                  Disbursed and paid tax invoices
                </p>
              </div>

              {/* Metric 4 */}
              <div className="p-4 rounded-xl bg-[#0B1220] border border-[#334155] space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Promised Lead Time
                </span>
                <div className="text-2xl font-extrabold text-amber-400">
                  {data.vendorPerformance.avgDeliveryLeadDays} Days
                </div>
                <p className="text-[10px] text-[#94A3B8]">
                  Average contractual lead-time commitment
                </p>
              </div>
            </div>

            {/* Honest Limitation Notice */}
            <div className="p-3.5 rounded-lg bg-[#0B1220]/40 border border-[#334155] flex items-start gap-2.5 text-xs text-[#94A3B8]">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-300">Schema Telemetry Notice:</strong> {data.vendorPerformance.limitationNotice}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
