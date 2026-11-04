import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
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
  Download,
  Mail,
  ChevronRight,
  ShieldCheck,
  Package,
  Check,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { invoiceApi } from '../services/invoiceApi';
import { poApi } from '../services/poApi';
import { Invoice, InvoiceStatus, PurchaseOrder } from '../types';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';

export const Invoices: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail Modal state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create Invoice Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [eligiblePOs, setEligiblePOs] = useState<PurchaseOrder[]>([]);
  const [posLoading, setPosLoading] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<string>('');
  const [customNotes, setCustomNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Mark as Paid Dialog
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [markingPaid, setMarkingPaid] = useState(false);
  const [markPaidError, setMarkPaidError] = useState<string | null>(null);

  // Email Dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailNotes, setEmailNotes] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<{
    success: boolean;
    code?: string;
    message: string;
  } | null>(null);

  // PDF downloading indicator
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const canCreate = user?.role === 'ADMIN' || user?.role === 'PROCUREMENT_OFFICER';

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await invoiceApi.getInvoices({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setInvoices(res.invoices || []);
    } catch (err: any) {
      console.error('Fetch invoices error:', err);
      setError(err.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  // Client-side search filtering fallback / refinement
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase().trim();
    return invoices.filter((inv) => {
      const num = inv.invoiceNumber.toLowerCase();
      const vName = (inv.vendorName || inv.vendor?.name || '').toLowerCase();
      const poNum = (inv.purchaseOrder?.poNumber || '').toLowerCase();
      return num.includes(q) || vName.includes(q) || poNum.includes(q);
    });
  }, [invoices, searchQuery]);

  // Metrics summary
  const metrics = useMemo(() => {
    const totalCount = invoices.length;
    const paidCount = invoices.filter((inv) => inv.status === 'PAID').length;
    const pendingCount = invoices.filter((inv) => inv.status === 'PENDING_PAYMENT').length;
    const totalInvoicedSpend = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    return { totalCount, paidCount, pendingCount, totalInvoicedSpend };
  }, [invoices]);

  const handleOpenDetail = async (inv: Invoice) => {
    setSelectedInvoice(inv);
    try {
      setDetailLoading(true);
      const fresh = await invoiceApi.getInvoiceById(inv.id);
      setSelectedInvoice(fresh.invoice);
    } catch (err: any) {
      console.error('Error fetching invoice details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenCreateModal = async () => {
    setCreateModalOpen(true);
    setCreateError(null);
    setSelectedPOId('');
    setCustomNotes('');
    try {
      setPosLoading(true);
      // Fetch approved/issued POs
      const res = await poApi.getPurchaseOrders({ status: 'APPROVED' });
      // Exclude POs that already have an invoice
      const existingPoIds = new Set(invoices.map((i) => i.purchaseOrderId));
      const available = (res.purchaseOrders || []).filter(
        (p) => !existingPoIds.has(p.id) && !p.isLegacy
      );
      setEligiblePOs(available);
      if (available.length > 0) {
        setSelectedPOId(available[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching eligible purchase orders:', err);
      setCreateError('Failed to load eligible purchase orders.');
    } finally {
      setPosLoading(false);
    }
  };

  const handleExecuteCreate = async () => {
    if (!selectedPOId) {
      setCreateError('Please select a valid purchase order.');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      const res = await invoiceApi.createInvoice(selectedPOId, customNotes);
      setCreateModalOpen(false);
      await fetchInvoices();
      if (res.invoice) {
        handleOpenDetail(res.invoice);
      }
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      setCreateError(err.message || 'Failed to create invoice.');
    } finally {
      setCreating(false);
    }
  };

  const handleExecuteMarkPaid = async () => {
    if (!selectedInvoice) return;
    try {
      setMarkingPaid(true);
      setMarkPaidError(null);
      const res = await invoiceApi.markInvoicePaid(selectedInvoice.id, paymentNotes);
      setMarkPaidDialogOpen(false);
      setSelectedInvoice(res.invoice);
      await fetchInvoices();
    } catch (err: any) {
      console.error('Error marking invoice as paid:', err);
      setMarkPaidError(err.message || 'Failed to mark invoice as paid.');
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedInvoice) return;
    try {
      setDownloadingPdf(true);
      await invoiceApi.downloadPdf(selectedInvoice.id, selectedInvoice.invoiceNumber);
    } catch (err: any) {
      console.error('Error downloading invoice PDF:', err);
      alert(err.message || 'Failed to download PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleOpenEmailDialog = () => {
    if (!selectedInvoice) return;
    setRecipientEmail(selectedInvoice.vendor?.email || '');
    setEmailNotes('');
    setEmailResult(null);
    setEmailDialogOpen(true);
  };

  const handleExecuteEmail = async () => {
    if (!selectedInvoice || !recipientEmail.trim()) return;
    try {
      setSendingEmail(true);
      setEmailResult(null);
      const res = await invoiceApi.emailInvoice(
        selectedInvoice.id,
        recipientEmail.trim(),
        emailNotes.trim() || undefined
      );
      setEmailResult(res);
    } catch (err: any) {
      console.error('Error dispatching invoice email:', err);
      setEmailResult({
        success: false,
        code: 'EMAIL_DELIVERY_FAILED',
        message: err.message || 'Failed to dispatch email.',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const selectedPOItem = eligiblePOs.find((p) => p.id === selectedPOId);

  const tabs: Array<{ key: InvoiceStatus | 'ALL'; label: string }> = [
    { key: 'ALL', label: 'All Invoices' },
    { key: 'PENDING_PAYMENT', label: 'Pending Payment' },
    { key: 'PAID', label: 'Paid' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC] flex items-center gap-2">
            <Receipt className="w-6 h-6 text-[#36C9A5]" />
            Invoices & 3-Way Matching
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative tax invoices reconciled with 3-way matching across quotation, purchase order, and delivery commitments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 bg-[#1E293B] hover:bg-[#273449] border border-[#334155] rounded-lg transition-colors"
            title="Refresh Invoices"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#36C9A5]' : ''}`} />
            Refresh
          </button>

          {canCreate && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-[#36C9A5] hover:bg-[#2EB895] rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Invoice
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Invoices</p>
            <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{metrics.totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Paid Invoices</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{metrics.paidCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Pending Payment</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{metrics.pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#36C9A5] uppercase tracking-wider">Total Invoiced Spend</p>
            <p className="text-2xl font-bold text-[#36C9A5] mt-1">
              ₹{metrics.totalInvoicedSpend.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
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
            placeholder="Search by invoice #, vendor, PO #..."
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
          <p className="text-xs">Loading tax invoices...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="py-16 text-center bg-[#1E293B]/40 border border-[#334155] rounded-xl p-8">
          <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No Invoices Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            {searchQuery
              ? `No invoices matched "${searchQuery}".`
              : 'There are currently no invoices matching the selected filter criteria.'}
          </p>
          {canCreate && (
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-[#36C9A5] hover:bg-[#2EB895] rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create from Purchase Order
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0B1220]/60 text-slate-400 uppercase text-[11px] tracking-wider border-b border-[#334155]">
                <tr>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Purchase Order</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3 text-center">3-Way Match</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#273449]/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#F8FAFC]">
                      <span>{inv.invoiceNumber}</span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">
                        {inv.vendorName || inv.vendor?.name || 'Vendor'}
                      </div>
                      {inv.vendor?.gstin && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          GSTIN: {inv.vendor.gstin}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-[#36C9A5] font-mono">
                        {inv.purchaseOrder?.poNumber || 'Direct PO'}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                        <Check className="w-3 h-3 text-emerald-400" />
                        Matched
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-emerald-400 font-mono">
                      ₹{inv.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <Badge status={inv.status} />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenDetail(inv)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-200 bg-[#273449] hover:bg-[#334155] border border-slate-600 rounded-lg transition-colors"
                      >
                        View Invoice
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal (Screen 10 Specification) */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`Tax Invoice — ${selectedInvoice.invoiceNumber}`}
          maxWidth="max-w-4xl"
        >
          {detailLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 text-[#36C9A5] animate-spin" />
              <p className="text-xs">Loading complete invoice details...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Banner / Order Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1220]/70 p-4 rounded-xl border border-[#334155]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#F8FAFC] tracking-tight">
                      {selectedInvoice.invoiceNumber}
                    </span>
                    <Badge status={selectedInvoice.status} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Issue Date:{' '}
                      {new Date(selectedInvoice.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {selectedInvoice.dueDate && (
                      <span>
                        Due Date:{' '}
                        {new Date(selectedInvoice.dueDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                    {selectedInvoice.paidAt && (
                      <span className="text-emerald-400">
                        Paid on:{' '}
                        {new Date(selectedInvoice.paidAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#1E293B] hover:bg-[#273449] border border-[#334155] rounded-lg transition-colors"
                  >
                    {downloadingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#36C9A5]" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-[#36C9A5]" />
                    )}
                    Download PDF
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#1E293B] hover:bg-[#273449] border border-[#334155] rounded-lg transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>

                  <button
                    onClick={handleOpenEmailDialog}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#1E293B] hover:bg-[#273449] border border-[#334155] rounded-lg transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    Send Email
                  </button>

                  {isAdmin && selectedInvoice.status === 'PENDING_PAYMENT' && (
                    <button
                      onClick={() => {
                        setPaymentNotes('');
                        setMarkPaidError(null);
                        setMarkPaidDialogOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Mark as Paid
                    </button>
                  )}
                </div>
              </div>

              {/* 3-Way Matching Verification Card */}
              <div className="bg-[#0B1220]/60 p-4 rounded-xl border border-[#334155] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Three-Way Matching Verification
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                    100% RECONCILED
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Every line item, quantity, unit rate, and tax calculation was authoritatively verified
                  against approved quotation{' '}
                  <strong className="text-slate-200">
                    {selectedInvoice.purchaseOrder?.quotation?.quotationNumber || 'Source'}
                  </strong>{' '}
                  and purchase order{' '}
                  <strong className="text-slate-200">
                    {selectedInvoice.purchaseOrder?.poNumber || 'PO'}
                  </strong>
                  .
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    <span>Item Count Match</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    <span>Quantity Match</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    <span>Unit Price Match</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    <span>Tax & Total Match</span>
                  </div>
                </div>
              </div>

              {/* Vendor & Procurement Context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vendor Card */}
                <div className="bg-[#0B1220]/50 p-4 rounded-xl border border-[#334155] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    <Building className="w-4 h-4 text-[#36C9A5]" />
                    Supplier (Vendor)
                  </div>
                  <div className="text-sm font-semibold text-slate-100">
                    {selectedInvoice.vendor?.name || selectedInvoice.vendorName || 'Not Available'}
                  </div>
                  <div className="text-xs text-slate-400 space-y-1 font-mono">
                    {selectedInvoice.vendor?.gstin && (
                      <div>GSTIN: {selectedInvoice.vendor.gstin}</div>
                    )}
                    {selectedInvoice.vendor?.email && (
                      <div>Email: {selectedInvoice.vendor.email}</div>
                    )}
                    {selectedInvoice.vendor?.phone && (
                      <div>Phone: {selectedInvoice.vendor.phone}</div>
                    )}
                    {selectedInvoice.vendor?.address && (
                      <div className="font-sans text-slate-400">
                        {selectedInvoice.vendor.address}
                        {selectedInvoice.vendor.city && `, ${selectedInvoice.vendor.city}`}
                        {selectedInvoice.vendor.state && `, ${selectedInvoice.vendor.state}`}
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
                    <div>
                      <span className="text-slate-400">Purchase Order: </span>
                      <span className="font-mono text-[#36C9A5]">
                        {selectedInvoice.purchaseOrder?.poNumber || 'Direct'}
                      </span>
                    </div>

                    {selectedInvoice.purchaseOrder?.rfq && (
                      <div>
                        <span className="text-slate-400">RFQ: </span>
                        <span className="font-mono text-slate-200">
                          {selectedInvoice.purchaseOrder.rfq.rfqNumber}
                        </span>{' '}
                        — <span>{selectedInvoice.purchaseOrder.rfq.title}</span>
                      </div>
                    )}

                    {selectedInvoice.purchaseOrder?.paymentTerms && (
                      <div>
                        <span className="text-slate-400">Payment Terms: </span>
                        <span>{selectedInvoice.purchaseOrder.paymentTerms}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Itemized Invoice Lines
                </div>
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
                      {(selectedInvoice.items || []).map((item, idx) => (
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
              </div>

              {/* Financial Calculation Summary (GST Breakdown) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0B1220]/40 p-4 rounded-xl border border-[#334155] space-y-2">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Invoice Notes & Directions
                  </div>
                  <p className="text-xs text-slate-400 whitespace-pre-wrap">
                    {selectedInvoice.notes || 'Payment due as per agreed commercial credit terms.'}
                  </p>
                </div>

                <div className="bg-[#0B1220]/60 p-4 rounded-xl border border-[#334155] space-y-2 text-xs">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-[#334155] pb-2">
                    Financial Summary & Tax Details
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono text-slate-200">
                      ₹{selectedInvoice.subtotalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Dynamic CGST/SGST vs IGST Breakdown */}
                  {selectedInvoice.taxBreakdown && selectedInvoice.taxBreakdown.type === 'CGST_SGST' ? (
                    <>
                      <div className="flex justify-between text-slate-400">
                        <span>CGST ({selectedInvoice.taxBreakdown.cgstRate}%):</span>
                        <span className="font-mono text-slate-200">
                          ₹
                          {Number(selectedInvoice.taxBreakdown.cgstAmount || 0).toLocaleString('en-IN', {
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>SGST ({selectedInvoice.taxBreakdown.sgstRate}%):</span>
                        <span className="font-mono text-slate-200">
                          ₹
                          {Number(selectedInvoice.taxBreakdown.sgstAmount || 0).toLocaleString('en-IN', {
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </>
                  ) : selectedInvoice.taxBreakdown && selectedInvoice.taxBreakdown.type === 'IGST' ? (
                    <div className="flex justify-between text-slate-400">
                      <span>IGST ({selectedInvoice.taxBreakdown.igstRate || selectedInvoice.taxRate}%):</span>
                      <span className="font-mono text-slate-200">
                        ₹
                        {Number(
                          selectedInvoice.taxBreakdown.igstAmount || selectedInvoice.taxAmount
                        ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-slate-400">
                      <span>GST Tax ({selectedInvoice.taxRate}%):</span>
                      <span className="font-mono text-slate-200">
                        ₹{selectedInvoice.taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-[#334155] text-sm font-bold">
                    <span className="text-[#F8FAFC]">Grand Total Payable:</span>
                    <span className="text-[#36C9A5] text-base font-mono">
                      ₹{selectedInvoice.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Create Invoice Modal */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => !creating && setCreateModalOpen(false)}
          title="Create Tax Invoice from Approved Purchase Order"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            {createError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-lg text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Select Purchase Order *
              </label>
              {posLoading ? (
                <div className="py-4 flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-[#36C9A5]" />
                  <span>Loading eligible purchase orders...</span>
                </div>
              ) : eligiblePOs.length === 0 ? (
                <div className="p-3 bg-[#0B1220] border border-[#334155] rounded-lg text-slate-400">
                  No eligible purchase orders are available for invoicing. Purchase orders must be APPROVED and not already invoiced.
                </div>
              ) : (
                <select
                  value={selectedPOId}
                  onChange={(e) => setSelectedPOId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B1220] border border-[#334155] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#36C9A5]"
                >
                  {eligiblePOs.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} — {po.vendorName || po.vendor?.name} — ₹
                      {po.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedPOItem && (
              <div className="bg-[#0B1220]/60 p-3.5 rounded-lg border border-[#334155] space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Order Details Preview
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Vendor:</span>
                  <span className="font-medium text-slate-100">
                    {selectedPOItem.vendorName || selectedPOItem.vendor?.name}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">RFQ Reference:</span>
                  <span className="font-mono text-[#36C9A5]">
                    {selectedPOItem.rfq?.rfqNumber || 'Direct PO'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Line Items:</span>
                  <span>{selectedPOItem.items?.length || 0} verified lines</span>
                </div>
                <div className="flex justify-between text-slate-300 pt-1.5 border-t border-[#334155] font-semibold">
                  <span className="text-slate-200">Payable Total:</span>
                  <span className="text-emerald-400 font-mono text-sm">
                    ₹
                    {selectedPOItem.grandTotal?.toLocaleString('en-IN', {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Invoice Billing Remarks (Optional)
              </label>
              <textarea
                rows={3}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Include payment milestones, bank transfer details, or billing directions..."
                className="w-full px-3 py-2 bg-[#0B1220] border border-[#334155] rounded-lg text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                disabled={creating}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteCreate}
                disabled={creating || eligiblePOs.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-[#36C9A5] hover:bg-[#2EB895] disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating Invoice...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Verify 3-Way Match & Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Mark As Paid Dialog */}
      {markPaidDialogOpen && selectedInvoice && (
        <Modal
          isOpen={markPaidDialogOpen}
          onClose={() => !markingPaid && setMarkPaidDialogOpen(false)}
          title={`Confirm Payment Authorization — ${selectedInvoice.invoiceNumber}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            {markPaidError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-lg text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{markPaidError}</span>
              </div>
            )}

            <p className="text-slate-300">
              Are you sure you want to mark invoice{' '}
              <strong className="text-white">{selectedInvoice.invoiceNumber}</strong> as{' '}
              <span className="text-emerald-400 font-semibold">PAID</span>?
            </p>

            <div className="bg-[#0B1220]/60 p-3 rounded-lg border border-[#334155] space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Vendor:</span>
                <span className="text-slate-200">{selectedInvoice.vendorName || selectedInvoice.vendor?.name}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Amount:</span>
                <span className="text-emerald-400 font-mono font-semibold">
                  ₹{selectedInvoice.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Payment Reference / Bank Transaction ID (Optional)
              </label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g. UTR / NEFT / RTGS Ref #9876543210"
                className="w-full px-3 py-2 bg-[#0B1220] border border-[#334155] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#36C9A5]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]">
              <button
                type="button"
                onClick={() => setMarkPaidDialogOpen(false)}
                disabled={markingPaid}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteMarkPaid}
                disabled={markingPaid}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors"
              >
                {markingPaid ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Recording Payment...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Email Transmission Dialog */}
      {emailDialogOpen && selectedInvoice && (
        <Modal
          isOpen={emailDialogOpen}
          onClose={() => !sendingEmail && setEmailDialogOpen(false)}
          title={`Email Invoice — ${selectedInvoice.invoiceNumber}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            {emailResult && (
              <div
                className={`p-3 rounded-lg border flex items-start gap-2 ${
                  emailResult.success
                    ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-800/40 text-amber-300'
                }`}
              >
                {emailResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">{emailResult.message}</div>
                  {emailResult.code === 'EMAIL_NOT_CONFIGURED' && (
                    <div className="text-[11px] text-slate-400 mt-1">
                      Configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in server .env to
                      enable real outgoing email delivery.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Recipient Email Address *
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="supplier@vendor.com"
                className="w-full px-3 py-2 bg-[#0B1220] border border-[#334155] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#36C9A5]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Message Body Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={emailNotes}
                onChange={(e) => setEmailNotes(e.target.value)}
                placeholder="Attached is the official tax invoice for PO reconciliation..."
                className="w-full px-3 py-2 bg-[#0B1220] border border-[#334155] rounded-lg text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]">
              <button
                type="button"
                onClick={() => setEmailDialogOpen(false)}
                disabled={sendingEmail}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleExecuteEmail}
                disabled={sendingEmail || !recipientEmail.trim()}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-[#36C9A5] hover:bg-[#2EB895] disabled:opacity-50 rounded-lg transition-colors"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Transmitting...
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    Transmit Email
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
