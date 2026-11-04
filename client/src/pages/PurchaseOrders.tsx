import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Search,
  AlertCircle,
  Building,
  FileText,
  Clock,
  CheckCircle2,
  Calendar,
  DollarSign,
  Plus,
  Loader2,
  RefreshCw,
  Printer,
  ChevronRight,
  Info,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { poApi } from '../services/poApi';
import { approvalApi } from '../services/approvalApi';
import { PurchaseOrder, POStatus, ApprovalRequestItem } from '../types';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';

export const PurchaseOrders: React.FC = () => {
  const { user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<POStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail Modal state
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Generate PO Modal state
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [approvedApprovals, setApprovedApprovals] = useState<ApprovalRequestItem[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string>('');
  const [customNotes, setCustomNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const isStaff =
    user?.role === 'ADMIN' ||
    user?.role === 'PROCUREMENT_OFFICER' ||
    user?.role === 'MANAGER_APPROVER';

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await poApi.getPurchaseOrders({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setPurchaseOrders(res.purchaseOrders || []);
    } catch (err: any) {
      console.error('Fetch purchase orders error:', err);
      setError(err.message || 'Failed to load purchase orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, [statusFilter]);

  // Client-side search filtering fallback / refinement
  const filteredPOs = useMemo(() => {
    if (!searchQuery.trim()) return purchaseOrders;
    const q = searchQuery.toLowerCase().trim();
    return purchaseOrders.filter((po) => {
      const num = po.poNumber.toLowerCase();
      const vName = (po.vendorName || po.vendor?.name || '').toLowerCase();
      const rfqNum = (po.rfq?.rfqNumber || '').toLowerCase();
      const quoteNum = (po.quotation?.quotationNumber || '').toLowerCase();
      return (
        num.includes(q) ||
        vName.includes(q) ||
        rfqNum.includes(q) ||
        quoteNum.includes(q)
      );
    });
  }, [purchaseOrders, searchQuery]);

  // Metrics summary
  const metrics = useMemo(() => {
    const totalCount = purchaseOrders.length;
    const approvedCount = purchaseOrders.filter(
      (p) => p.status === 'APPROVED' || p.status === 'ISSUED'
    ).length;
    const pendingCount = purchaseOrders.filter((p) => p.status === 'PENDING').length;
    const totalCommittedSpend = purchaseOrders.reduce((sum, p) => {
      const amt = p.grandTotal !== null && p.grandTotal !== undefined ? p.grandTotal : p.amount;
      return sum + (amt || 0);
    }, 0);

    return { totalCount, approvedCount, pendingCount, totalCommittedSpend };
  }, [purchaseOrders]);

  const handleOpenDetail = async (po: PurchaseOrder) => {
    setSelectedPO(po);
    try {
      setDetailLoading(true);
      const fresh = await poApi.getPurchaseOrderById(po.id);
      setSelectedPO(fresh.purchaseOrder);
    } catch (err: any) {
      console.error('Error fetching PO details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenGenerateModal = async () => {
    setGenerateModalOpen(true);
    setGenerateError(null);
    setSelectedApprovalId('');
    setCustomNotes('');
    try {
      setApprovalsLoading(true);
      const res = await approvalApi.getApprovals('APPROVED');
      setApprovedApprovals(res.approvals || []);
      if (res.approvals && res.approvals.length > 0) {
        setSelectedApprovalId(res.approvals[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching approved quotations:', err);
      setGenerateError('Failed to load approved quotations.');
    } finally {
      setApprovalsLoading(false);
    }
  };

  const handleExecuteGenerate = async () => {
    if (!selectedApprovalId) {
      setGenerateError('Please select an approved quotation to generate a PO.');
      return;
    }

    const approval = approvedApprovals.find((a) => a.id === selectedApprovalId);
    if (!approval || !approval.quotationId) {
      setGenerateError('Selected approval record does not have an associated quotation.');
      return;
    }

    try {
      setGenerating(true);
      setGenerateError(null);
      const res = await poApi.generatePurchaseOrder(approval.quotationId, customNotes);
      setGenerateModalOpen(false);
      await fetchPurchaseOrders();
      if (res.purchaseOrder) {
        handleOpenDetail(res.purchaseOrder);
      }
    } catch (err: any) {
      console.error('Error generating purchase order:', err);
      setGenerateError(
        err.message || 'Failed to generate purchase order. Please verify that a PO has not already been created.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const selectedApprovalItem = approvedApprovals.find((a) => a.id === selectedApprovalId);

  const tabs: Array<{ key: POStatus | 'ALL'; label: string }> = [
    { key: 'ALL', label: 'All Orders' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'ISSUED', label: 'Issued' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC] flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-[#36C9A5]" />
            Purchase Orders
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative purchase orders generated from approved managerial quotations with itemized commitments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPurchaseOrders}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 bg-[#1E293B] hover:bg-[#273449] border border-[#334155] rounded-lg transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#36C9A5]' : ''}`} />
            Refresh
          </button>

          {isStaff && (
            <button
              onClick={handleOpenGenerateModal}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-[#36C9A5] hover:bg-[#2EB895] rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Generate PO
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Orders</p>
            <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{metrics.totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Approved / Issued</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{metrics.approvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Pending Orders</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{metrics.pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#36C9A5] uppercase tracking-wider">Total Committed Spend</p>
            <p className="text-2xl font-bold text-[#36C9A5] mt-1">
              ₹{metrics.totalCommittedSpend.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#36C9A5]/10 border border-[#36C9A5]/20 flex items-center justify-center text-[#36C9A5]">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-[#334155] pb-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'bg-[#36C9A5] text-slate-900 font-semibold shadow-sm'
                  : 'bg-[#1E293B] text-slate-300 hover:bg-[#273449] border border-[#334155]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PO #, vendor, RFQ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#1E293B] border border-[#334155] rounded-lg text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5]"
          />
        </div>
      </div>

      {/* Main Table / Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 text-[#36C9A5] animate-spin" />
          <p className="text-xs">Loading purchase orders...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredPOs.length === 0 ? (
        <div className="py-16 text-center bg-[#1E293B]/40 border border-[#334155] rounded-xl p-8">
          <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No Purchase Orders Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            {searchQuery
              ? `No purchase orders matched "${searchQuery}".`
              : 'There are currently no purchase orders matching the selected filter criteria.'}
          </p>
          {isStaff && (
            <button
              onClick={handleOpenGenerateModal}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-[#36C9A5] hover:bg-[#2EB895] rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Generate from Approved Quotation
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0B1220]/60 text-slate-400 uppercase text-[11px] tracking-wider border-b border-[#334155]">
                <tr>
                  <th className="px-4 py-3">PO Number</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Reference (RFQ / Quote)</th>
                  <th className="px-4 py-3">Order Date</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {filteredPOs.map((po) => {
                  const displayTotal =
                    po.grandTotal !== null && po.grandTotal !== undefined
                      ? po.grandTotal
                      : po.amount;
                  return (
                    <tr key={po.id} className="hover:bg-[#273449]/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#F8FAFC]">
                        <div className="flex items-center gap-2">
                          <span>{po.poNumber}</span>
                          {po.isLegacy && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                              Legacy
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">
                          {po.vendorName || po.vendor?.name || 'Unknown Vendor'}
                        </div>
                        {po.vendor?.gstin && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            GSTIN: {po.vendor.gstin}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {po.rfq ? (
                          <div>
                            <span className="text-[#36C9A5] font-mono">{po.rfq.rfqNumber}</span>
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              {po.rfq.title}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                        {new Date(po.orderDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                        ₹{displayTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <Badge status={po.status} />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenDetail(po)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-200 bg-[#273449] hover:bg-[#334155] border border-slate-600 rounded-lg transition-colors"
                        >
                          View Order
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PO Detail Modal (Screen 9 Specification) */}
      {selectedPO && (
        <Modal
          isOpen={!!selectedPO}
          onClose={() => setSelectedPO(null)}
          title={`Purchase Order — ${selectedPO.poNumber}`}
          maxWidth="max-w-4xl"
        >
          {detailLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 text-[#36C9A5] animate-spin" />
              <p className="text-xs">Loading complete order details...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Banner / Order Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1220]/70 p-4 rounded-xl border border-[#334155]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#F8FAFC] tracking-tight">
                      {selectedPO.poNumber}
                    </span>
                    <Badge status={selectedPO.status} />
                    {selectedPO.isLegacy && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                        Legacy Week 1 Record
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Order Date:{' '}
                      {new Date(selectedPO.orderDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {selectedPO.createdBy && (
                      <span>
                        Created By: {selectedPO.createdBy.firstName} {selectedPO.createdBy.lastName} (
                        {selectedPO.createdBy.role})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#1E293B] hover:bg-[#273449] border border-[#334155] rounded-lg transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Order
                  </button>
                </div>
              </div>

              {/* Vendor & Delivery Context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vendor Card */}
                <div className="bg-[#0B1220]/50 p-4 rounded-xl border border-[#334155] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    <Building className="w-4 h-4 text-[#36C9A5]" />
                    Vendor Supplier
                  </div>
                  <div className="text-sm font-semibold text-slate-100">
                    {selectedPO.vendor?.name || selectedPO.vendorName || 'Not Available'}
                  </div>
                  <div className="text-xs text-slate-400 space-y-1 font-mono">
                    {selectedPO.vendor?.gstin && <div>GSTIN: {selectedPO.vendor.gstin}</div>}
                    {selectedPO.vendor?.email && <div>Email: {selectedPO.vendor.email}</div>}
                    {selectedPO.vendor?.phone && <div>Phone: {selectedPO.vendor.phone}</div>}
                    {selectedPO.vendor?.address && (
                      <div className="font-sans text-slate-400">
                        {selectedPO.vendor.address}
                        {selectedPO.vendor.city && `, ${selectedPO.vendor.city}`}
                        {selectedPO.vendor.state && `, ${selectedPO.vendor.state}`}
                        {selectedPO.vendor.pincode && ` - ${selectedPO.vendor.pincode}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Procurement References Card */}
                <div className="bg-[#0B1220]/50 p-4 rounded-xl border border-[#334155] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-[#36C9A5]" />
                    Procurement References
                  </div>
                  <div className="text-xs space-y-1.5 text-slate-300">
                    {selectedPO.rfq ? (
                      <div>
                        <span className="text-slate-400">RFQ: </span>
                        <span className="font-mono text-[#36C9A5]">{selectedPO.rfq.rfqNumber}</span> —{' '}
                        <span>{selectedPO.rfq.title}</span>
                      </div>
                    ) : (
                      <div className="text-slate-500">RFQ: Direct Purchase Order</div>
                    )}

                    {selectedPO.quotation && (
                      <div>
                        <span className="text-slate-400">Quotation: </span>
                        <span className="font-mono text-slate-200">
                          {selectedPO.quotation.quotationNumber}
                        </span>
                      </div>
                    )}

                    {selectedPO.deliveryDays && (
                      <div>
                        <span className="text-slate-400">Lead Time: </span>
                        <span>{selectedPO.deliveryDays} business days</span>
                      </div>
                    )}

                    {selectedPO.paymentTerms && (
                      <div>
                        <span className="text-slate-400">Payment Terms: </span>
                        <span>{selectedPO.paymentTerms}</span>
                      </div>
                    )}

                    {selectedPO.rfq?.deliveryLocation && (
                      <div>
                        <span className="text-slate-400">Delivery Destination: </span>
                        <span>{selectedPO.rfq.deliveryLocation}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Itemized Order Lines
                </div>
                {selectedPO.items && selectedPO.items.length > 0 ? (
                  <div className="bg-[#0B1220]/40 border border-[#334155] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#0B1220] text-slate-400 uppercase text-[11px] tracking-wider border-b border-[#334155]">
                        <tr>
                          <th className="px-3 py-2.5">#</th>
                          <th className="px-3 py-2.5">Item Description</th>
                          <th className="px-3 py-2.5 text-right">Quantity</th>
                          <th className="px-3 py-2.5">UOM</th>
                          <th className="px-3 py-2.5 text-right">Unit Price</th>
                          <th className="px-3 py-2.5 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#334155]">
                        {selectedPO.items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-[#1E293B]/40">
                            <td className="px-3 py-2.5 text-slate-500">{idx + 1}</td>
                            <td className="px-3 py-2.5 font-medium text-slate-200">
                              {item.itemDescription}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">{item.quantity}</td>
                            <td className="px-3 py-2.5 text-slate-400">{item.uom}</td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              ₹{item.unitPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-200">
                              ₹{item.lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-[#0B1220]/40 border border-[#334155] rounded-xl text-xs text-slate-400 flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-500" />
                    <span>
                      Legacy purchase order record: Individual line items were recorded in external
                      procurement documentation.
                    </span>
                  </div>
                )}
              </div>

              {/* Financial Calculation Summary (Prisma.Decimal verified) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0B1220]/40 p-4 rounded-xl border border-[#334155] space-y-2">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Commercial Notes & Instructions
                  </div>
                  <p className="text-xs text-slate-400 whitespace-pre-wrap">
                    {selectedPO.notes || 'Standard terms and conditions apply. Goods must match specification.'}
                  </p>
                  {selectedPO.quotation?.approvalRequest?.decidedBy && (
                    <div className="pt-2 border-t border-[#334155]/60 text-xs text-slate-400 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>
                        Managerial Approval by{' '}
                        <strong className="text-slate-200">
                          {selectedPO.quotation.approvalRequest.decidedBy.firstName}{' '}
                          {selectedPO.quotation.approvalRequest.decidedBy.lastName}
                        </strong>{' '}
                        ({selectedPO.quotation.approvalRequest.decidedBy.role})
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-[#0B1220]/60 p-4 rounded-xl border border-[#334155] space-y-2 text-xs">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-[#334155] pb-2">
                    Financial Summary
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono text-slate-200">
                      ₹
                      {(selectedPO.subtotalAmount !== null && selectedPO.subtotalAmount !== undefined
                        ? selectedPO.subtotalAmount
                        : selectedPO.amount
                      ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>
                      GST Tax (
                      {selectedPO.quotation?.taxRate ? `${selectedPO.quotation.taxRate}%` : 'Standard'}
                      ):
                    </span>
                    <span className="font-mono text-slate-200">
                      ₹
                      {(selectedPO.taxAmount !== null && selectedPO.taxAmount !== undefined
                        ? selectedPO.taxAmount
                        : 0
                      ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[#334155] text-sm font-bold">
                    <span className="text-[#F8FAFC]">Committed Grand Total:</span>
                    <span className="text-[#36C9A5] text-base font-mono">
                      ₹
                      {(selectedPO.grandTotal !== null && selectedPO.grandTotal !== undefined
                        ? selectedPO.grandTotal
                        : selectedPO.amount
                      ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Generate PO Modal for Staff */}
      {generateModalOpen && (
        <Modal
          isOpen={generateModalOpen}
          onClose={() => !generating && setGenerateModalOpen(false)}
          title="Generate Purchase Order from Approved Quotation"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            {generateError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-lg text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{generateError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Select Approved Quotation *
              </label>
              {approvalsLoading ? (
                <div className="py-4 flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-[#36C9A5]" />
                  <span>Loading approved managerial decisions...</span>
                </div>
              ) : approvedApprovals.length === 0 ? (
                <div className="p-3 bg-[#0B1220] border border-[#334155] rounded-lg text-slate-400">
                  No approved quotations are currently waiting for PO generation. Make sure a quotation has been selected and approved by a Manager.
                </div>
              ) : (
                <select
                  value={selectedApprovalId}
                  onChange={(e) => setSelectedApprovalId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B1220] border border-[#334155] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#36C9A5]"
                >
                  {approvedApprovals.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.quotation?.quotationNumber || 'Quote'} — {app.quotation?.vendor?.name} (
                      {app.rfq?.title || 'RFQ'}) — ₹
                      {app.quotation?.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedApprovalItem && selectedApprovalItem.quotation && (
              <div className="bg-[#0B1220]/60 p-3.5 rounded-lg border border-[#334155] space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Order Preview
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Vendor:</span>
                  <span className="font-medium text-slate-100">
                    {selectedApprovalItem.quotation.vendor?.name}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">RFQ Reference:</span>
                  <span className="font-mono text-[#36C9A5]">
                    {selectedApprovalItem.rfq?.rfqNumber}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Payment Terms:</span>
                  <span>{selectedApprovalItem.quotation.paymentTerms}</span>
                </div>
                <div className="flex justify-between text-slate-300 pt-1.5 border-t border-[#334155] font-semibold">
                  <span className="text-slate-200">Grand Total:</span>
                  <span className="text-emerald-400 font-mono text-sm">
                    ₹
                    {selectedApprovalItem.quotation.grandTotal.toLocaleString('en-IN', {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Special Delivery Notes / PO Instructions (Optional)
              </label>
              <textarea
                rows={3}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Include shipping instructions, gate entry details, or billing directions..."
                className="w-full px-3 py-2 bg-[#0B1220] border border-[#334155] rounded-lg text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]">
              <button
                type="button"
                onClick={() => setGenerateModalOpen(false)}
                disabled={generating}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteGenerate}
                disabled={generating || approvedApprovals.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-[#36C9A5] hover:bg-[#2EB895] disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating PO...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Confirm & Generate PO
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
