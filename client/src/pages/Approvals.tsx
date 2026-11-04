import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  Search,
  AlertCircle,
  ArrowRight,
  Building,
  FileText,
  MessageSquare,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Check,
  X,
  History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { approvalApi } from '../services/approvalApi';
import { ApprovalRequestItem, ApprovalStatus } from '../types';
import { Modal } from '../components/common/Modal';

export const Approvals: React.FC = () => {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected approval for Review/Detail modal
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequestItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Decision state inside modal
  const [remarks, setRemarks] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [decisionAction, setDecisionAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Can current user approve/reject?
  const canDecide = user?.role === 'ADMIN' || user?.role === 'MANAGER_APPROVER';

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await approvalApi.getApprovals(statusFilter === 'ALL' ? undefined : statusFilter);
      setApprovals(res.approvals || []);
    } catch (err: any) {
      console.error('Fetch approvals error:', err);
      setError(err.message || 'Failed to load approvals queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [statusFilter]);

  // Filtered by search query
  const filteredApprovals = useMemo(() => {
    if (!searchQuery.trim()) return approvals;
    const q = searchQuery.toLowerCase().trim();
    return approvals.filter((app) => {
      const rfqNum = app.rfq?.rfqNumber?.toLowerCase() || '';
      const rfqTitle = app.rfq?.title?.toLowerCase() || '';
      const qNum = app.quotation?.quotationNumber?.toLowerCase() || '';
      const vName = app.quotation?.vendor?.name?.toLowerCase() || '';
      return rfqNum.includes(q) || rfqTitle.includes(q) || qNum.includes(q) || vName.includes(q);
    });
  }, [approvals, searchQuery]);

  // Metrics counts
  const metrics = useMemo(() => {
    const total = approvals.length;
    const pending = approvals.filter((a) => a.status === 'PENDING').length;
    const approved = approvals.filter((a) => a.status === 'APPROVED').length;
    const rejected = approvals.filter((a) => a.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [approvals]);

  const handleOpenDetail = async (item: ApprovalRequestItem) => {
    setActionError(null);
    setActionSuccess(null);
    setRemarks('');
    setConfirmDialogOpen(false);
    setDecisionAction(null);
    setSelectedApproval(item);

    // Fetch fresh detailed record with full history
    try {
      setModalLoading(true);
      const fresh = await approvalApi.getApprovalById(item.id);
      setSelectedApproval(fresh.approval);
    } catch (err: any) {
      console.error('Error refreshing approval item:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handlePromptDecision = (action: 'APPROVE' | 'REJECT') => {
    setActionError(null);
    if (action === 'REJECT' && !remarks.trim()) {
      setActionError('Please provide rejection remarks explaining the reason for declining this quotation.');
      return;
    }
    setDecisionAction(action);
    setConfirmDialogOpen(true);
  };

  const handleExecuteDecision = async () => {
    if (!selectedApproval || !decisionAction) return;

    try {
      setDeciding(true);
      setActionError(null);

      const res = await approvalApi.decideApproval(
        selectedApproval.id,
        decisionAction,
        remarks.trim() || undefined
      );

      setActionSuccess(`Quotation ${decisionAction === 'APPROVE' ? 'approved' : 'rejected'} successfully.`);
      setConfirmDialogOpen(false);
      setSelectedApproval(res.approval);

      // Refresh background queue
      fetchApprovals();
    } catch (err: any) {
      console.error('Decision error:', err);
      setActionError(err.message || 'Failed to submit decision. Please try again.');
    } finally {
      setDeciding(false);
    }
  };

  const renderStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Pending Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">
            Quotation Approvals Workflow
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative managerial review of selected supplier quotations and purchase authorization.
          </p>
        </div>
        <button
          onClick={fetchApprovals}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 bg-[#1E293B] border border-[#334155] rounded-lg hover:bg-[#273449] hover:text-white transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#36C9A5]' : ''}`} />
          Refresh Queue
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Submissions
            </span>
            <FileCheck className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{metrics.total}</p>
        </div>

        <div className="bg-[#1E293B] border border-amber-500/30 rounded-xl p-4 shadow-sm bg-amber-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-300 uppercase tracking-wider">
              Pending Decisions
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">{metrics.pending}</p>
        </div>

        <div className="bg-[#1E293B] border border-emerald-500/30 rounded-xl p-4 shadow-sm bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-300 uppercase tracking-wider">
              Approved
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{metrics.approved}</p>
        </div>

        <div className="bg-[#1E293B] border border-rose-500/30 rounded-xl p-4 shadow-sm bg-rose-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-300 uppercase tracking-wider">
              Rejected
            </span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400 mt-2">{metrics.rejected}</p>
        </div>
      </div>

      {/* Controls & Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1E293B] p-3 rounded-xl border border-[#334155]">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { key: 'ALL' as const, label: 'All Requests' },
              { key: 'PENDING' as const, label: 'Pending Review', count: metrics.pending },
              { key: 'APPROVED' as const, label: 'Approved' },
              { key: 'REJECTED' as const, label: 'Rejected' },
            ] as Array<{ key: ApprovalStatus | 'ALL'; label: string; count?: number }>
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                statusFilter === tab.key
                  ? 'bg-[#36C9A5] text-[#0B1220] font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#273449]'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    statusFilter === tab.key
                      ? 'bg-[#0B1220] text-[#36C9A5]'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search RFQ, quotation, vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111827] border border-[#334155] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#36C9A5] transition-colors"
          />
        </div>
      </div>

      {/* Main Approvals Queue Table */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#36C9A5]" />
            <p className="text-sm">Loading quotation approval queue...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <p className="text-sm text-rose-300">{error}</p>
            <button
              onClick={fetchApprovals}
              className="mt-3 text-xs font-semibold text-[#36C9A5] hover:underline"
            >
              Try reloading queue
            </button>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">No approval requests found</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery
                ? 'Try broadening your search query.'
                : statusFilter === 'PENDING'
                ? 'All quotation submissions have been decided.'
                : 'Select a quotation from the Quotation Comparison matrix to trigger review.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#334155] bg-[#172033] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">RFQ / Requirement</th>
                  <th className="py-3 px-4">Selected Quotation & Vendor</th>
                  <th className="py-3 px-4">Financial Amount</th>
                  <th className="py-3 px-4">Submitted By</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155] text-xs text-slate-300">
                {filteredApprovals.map((item) => (
                  <tr key={item.id} className="hover:bg-[#273449]/40 transition-colors">
                    {/* RFQ */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {item.rfq?.rfqNumber || 'RFQ-N/A'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                        {item.rfq?.title || 'Procurement RFQ'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.rfq?.category}
                      </div>
                    </td>

                    {/* Quotation & Vendor */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#36C9A5]">
                        {item.quotation?.quotationNumber || 'QT-N/A'}
                      </div>
                      <div className="text-slate-200 font-semibold mt-0.5">
                        {item.quotation?.vendor?.name || 'Supplier'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        GSTIN: {item.quotation?.vendor?.gstin || 'N/A'}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white text-sm">
                        ₹{Number(item.quotation?.grandTotal || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.quotation?.paymentTerms || 'Standard Terms'}
                      </div>
                    </td>

                    {/* Submitter & Date */}
                    <td className="py-3.5 px-4 text-slate-400">
                      <div className="text-slate-300">
                        {item.submittedBy
                          ? `${item.submittedBy.firstName} ${item.submittedBy.lastName}`
                          : 'Procurement Officer'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{renderStatusBadge(item.status)}</td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          item.status === 'PENDING' && canDecide
                            ? 'bg-[#36C9A5] text-[#0B1220] hover:bg-[#2eb594] shadow-sm'
                            : 'bg-[#273449] text-slate-200 hover:bg-[#334155] border border-[#334155]'
                        }`}
                      >
                        {item.status === 'PENDING' && canDecide ? 'Review & Decide' : 'View Details'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail & Review Modal */}
      {selectedApproval && (
        <Modal
          isOpen={!!selectedApproval}
          onClose={() => {
            if (!deciding) {
              setSelectedApproval(null);
            }
          }}
          title={`Quotation Approval Review: ${selectedApproval.quotation?.quotationNumber || ''}`}
          maxWidth="max-w-4xl"
        >
          {modalLoading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#36C9A5]" />
              <p className="text-sm">Fetching quotation details and audit history...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Status Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#111827] border border-[#334155] rounded-xl">
                <div>
                  <div className="text-xs text-slate-400">Approval Request ID</div>
                  <div className="text-xs font-mono text-slate-300 font-semibold mt-0.5">
                    {selectedApproval.id}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">Current Status:</span>
                  {renderStatusBadge(selectedApproval.status)}
                </div>
              </div>

              {/* Alert Feedback */}
              {actionError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{actionError}</span>
                </div>
              )}
              {actionSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* 2-Column Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* RFQ Info */}
                <div className="bg-[#111827] border border-[#334155] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#36C9A5] uppercase tracking-wider">
                    <FileText className="w-4 h-4" />
                    RFQ Details
                  </div>
                  <div className="text-sm font-bold text-white">
                    {selectedApproval.rfq?.title}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span className="font-mono text-slate-300">{selectedApproval.rfq?.rfqNumber}</span>
                    <span>•</span>
                    <span>{selectedApproval.rfq?.category}</span>
                  </div>
                  <div className="text-xs text-slate-400 pt-1">
                    <span className="text-slate-500">Delivery Location:</span>{' '}
                    <span className="text-slate-300">{selectedApproval.rfq?.deliveryLocation}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="text-slate-500">Deadline:</span>{' '}
                    <span className="text-slate-300">
                      {selectedApproval.rfq?.deadline
                        ? new Date(selectedApproval.rfq.deadline).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Vendor Info */}
                <div className="bg-[#111827] border border-[#334155] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#36C9A5] uppercase tracking-wider">
                    <Building className="w-4 h-4" />
                    Supplier Profile
                  </div>
                  <div className="text-sm font-bold text-white">
                    {selectedApproval.quotation?.vendor?.name}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    GSTIN: {selectedApproval.quotation?.vendor?.gstin}
                  </div>
                  <div className="text-xs text-slate-400 pt-1">
                    <span className="text-slate-500">Contact:</span>{' '}
                    <span className="text-slate-300">
                      {selectedApproval.quotation?.vendor?.email} • {selectedApproval.quotation?.vendor?.phone}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="text-slate-500">Payment Terms:</span>{' '}
                    <span className="text-slate-300 font-medium">
                      {selectedApproval.quotation?.paymentTerms} ({selectedApproval.quotation?.deliveryDays} days delivery)
                    </span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="bg-[#111827] border border-[#334155] rounded-xl overflow-hidden">
                <div className="p-3 bg-[#172033] border-b border-[#334155] text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Quotation Line Items Breakdown</span>
                  <span className="text-[11px] text-slate-500">
                    {selectedApproval.quotation?.items?.length || 0} line item(s)
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-[#334155] text-[10px] uppercase text-slate-500 bg-[#111827]">
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3">UOM</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155]/60">
                      {(selectedApproval.quotation?.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#1E293B]/40">
                          <td className="py-2.5 px-3 font-medium text-white">
                            {item.itemDescription || 'Line Item'}
                            {item.remarks && (
                              <div className="text-[10px] text-slate-400 font-normal">
                                Note: {item.remarks}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                            {item.quantity ?? '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{item.uom || 'Units'}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                            ₹{Number(item.unitPrice).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-white">
                            ₹{Number(item.lineTotal).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary */}
                <div className="p-4 bg-[#172033] border-t border-[#334155] flex flex-col items-end gap-1 text-xs">
                  <div className="flex justify-between w-64 text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-slate-200">
                      ₹{Number(selectedApproval.quotation?.subtotalAmount || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between w-64 text-slate-400">
                    <span>GST ({Number(selectedApproval.quotation?.taxRate || 18)}%):</span>
                    <span className="font-mono text-slate-200">
                      ₹{Number(selectedApproval.quotation?.taxAmount || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between w-64 pt-2 border-t border-[#334155] font-bold text-white text-sm">
                    <span className="text-[#36C9A5]">Grand Total:</span>
                    <span className="font-mono text-[#36C9A5]">
                      ₹{Number(selectedApproval.quotation?.grandTotal || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Manager Decision Section */}
              <div className="bg-[#111827] border border-[#334155] rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#36C9A5]" />
                    Manager Review & Decision
                  </div>
                  {selectedApproval.decidedAt && (
                    <span className="text-[11px] text-slate-400">
                      Decided on {new Date(selectedApproval.decidedAt).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {selectedApproval.status === 'PENDING' ? (
                  canDecide ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Remarks / Justification
                          <span className="text-slate-500 font-normal ml-1">
                            (Optional for approval; required for rejection)
                          </span>
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Add approval comments or rejection rationale..."
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          className="w-full bg-[#1E293B] border border-[#334155] rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#36C9A5]"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => handlePromptDecision('REJECT')}
                          disabled={deciding}
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject Quotation
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePromptDecision('APPROVE')}
                          disabled={deciding}
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-[#0B1220] bg-[#36C9A5] hover:bg-[#2eb594] transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve Quotation
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-300 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-blue-400" />
                      <span>
                        Viewing in read-only mode. As a {user?.role ? user.role.replace('_', ' ') : 'user'},
                        you can track this submission. Only Managers and Admins can record authorization decisions.
                      </span>
                    </div>
                  )
                ) : (
                  <div className="p-3 bg-[#1E293B] border border-[#334155] rounded-lg text-xs space-y-1">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="text-slate-400">Decision Recorded:</span>
                      <span
                        className={
                          selectedApproval.status === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {selectedApproval.status}
                      </span>
                      {selectedApproval.decidedBy && (
                        <span className="text-slate-400 font-normal">
                          by {selectedApproval.decidedBy.firstName} {selectedApproval.decidedBy.lastName} ({selectedApproval.decidedBy.role})
                        </span>
                      )}
                    </div>
                    {selectedApproval.remarks && (
                      <div className="text-slate-300 pt-1">
                        <span className="text-slate-500">Remarks:</span> &ldquo;{selectedApproval.remarks}&rdquo;
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Confirmation Dialog */}
              {confirmDialogOpen && decisionAction && (
                <div className="p-4 bg-[#1E293B] border border-amber-500/40 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    Confirm {decisionAction === 'APPROVE' ? 'Quotation Approval' : 'Quotation Rejection'}
                  </div>
                  <p className="text-xs text-slate-300">
                    Are you sure you want to{' '}
                    <span className="font-bold text-white">
                      {decisionAction === 'APPROVE' ? 'APPROVE' : 'REJECT'}
                    </span>{' '}
                    quotation <span className="font-mono text-[#36C9A5]">{selectedApproval.quotation?.quotationNumber}</span> for RFQ{' '}
                    <span className="font-mono text-white">{selectedApproval.rfq?.rfqNumber}</span>?
                    This action will be recorded immutably in the procurement audit log.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmDialogOpen(false)}
                      disabled={deciding}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-[#111827] border border-[#334155] hover:bg-[#273449]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteDecision}
                      disabled={deciding}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all flex items-center gap-1.5 ${
                        decisionAction === 'APPROVE'
                          ? 'bg-emerald-600 hover:bg-emerald-500'
                          : 'bg-rose-600 hover:bg-rose-500'
                      }`}
                    >
                      {deciding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Confirm {decisionAction === 'APPROVE' ? 'Approval' : 'Rejection'}
                    </button>
                  </div>
                </div>
              )}

              {/* Audit History Timeline */}
              <div className="bg-[#111827] border border-[#334155] rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <History className="w-4 h-4 text-[#36C9A5]" />
                  Approval Audit Trail & Action History
                </div>
                <div className="space-y-3 pt-1">
                  {(selectedApproval.history || []).length === 0 ? (
                    <div className="text-xs text-slate-500">No action history recorded yet.</div>
                  ) : (
                    (selectedApproval.history || []).map((step, idx) => (
                      <div key={step.id || idx} className="flex items-start gap-3 text-xs">
                        <div className="mt-1">
                          {step.action === 'APPROVED' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : step.action === 'REJECTED' ? (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1 bg-[#1E293B] p-2.5 rounded-lg border border-[#334155]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-white">
                              {step.action === 'SUBMITTED'
                                ? 'Quotation Selected & Submitted'
                                : step.action === 'APPROVED'
                                ? 'Quotation Approved'
                                : 'Quotation Rejected'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(step.createdAt).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Actor: {step.actor ? `${step.actor.firstName} ${step.actor.lastName} (${step.actor.role})` : step.actorId}
                          </div>
                          {step.remarks && (
                            <div className="text-xs text-slate-300 mt-1 italic">
                              &ldquo;{step.remarks}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
