import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Tag,
  Building2,
  Calendar,
  Download,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Plus,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { rfqApi } from '../services/rfqApi';
import { Rfq, Quotation } from '../types';
import { SubmitQuotationModal } from '../components/quotations/SubmitQuotationModal';

export const RfqDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal for quote submission
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [existingQuote, setExistingQuote] = useState<Quotation | null>(null);

  const isVendor = user?.role === 'VENDOR';

  const loadRfq = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await rfqApi.getRfqById(id);
      setRfq(data);

      if (isVendor) {
        try {
          const quotes = await rfqApi.getQuotations({ rfqId: id });
          if (quotes.quotations && quotes.quotations.length > 0) {
            setExistingQuote(quotes.quotations[0]);
          }
        } catch (err) {
          console.warn('Could not fetch existing quotation for vendor:', err);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load RFQ details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRfq();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#36C9A5] animate-spin" />
        <p className="text-xs text-slate-400">Loading RFQ details...</p>
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/rfqs')}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to RFQs
        </button>
        <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-center text-rose-300 text-xs">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white mb-1">Failed to load RFQ</h3>
          <p>{error || 'RFQ not found'}</p>
        </div>
      </div>
    );
  }

  const deadlineDate = new Date(rfq.deadline);
  const isDeadlinePassed = deadlineDate.getTime() < Date.now();

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full text-[#F8FAFC]">
      {/* Back button and breadcrumbs */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/rfqs')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Requisitions
        </button>

        <div className="flex items-center gap-2">
          {/* Compare Bids button */}
          <button
            onClick={() => navigate(`/quotations?rfqId=${rfq.id}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#273449] hover:bg-[#334155] text-[#36C9A5] font-semibold text-xs border border-[#36C9A5]/40 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Comparison Matrix ({rfq.quotations?.length || 0} quotes)</span>
          </button>

          {/* If vendor, allow quote submission */}
          {isVendor && (
            <button
              onClick={() => setQuoteModalOpen(true)}
              disabled={isDeadlinePassed || rfq.status !== 'OPEN'}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#36C9A5] text-[#0B1220] font-bold text-xs hover:bg-[#2db893] disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{existingQuote ? 'Edit Quotation' : 'Submit Quotation'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main RFQ Header Card */}
      <div className="p-6 rounded-2xl bg-[#1E293B] border border-[#334155] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#334155] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-[#36C9A5] bg-[#36C9A5]/10 px-2.5 py-1 rounded-lg border border-[#36C9A5]/30">
                {rfq.rfqNumber}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase ${
                  rfq.status === 'OPEN'
                    ? isDeadlinePassed
                      ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-600'
                }`}
              >
                {rfq.status === 'OPEN' && isDeadlinePassed ? 'Deadline Passed' : rfq.status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white mt-2">{rfq.title}</h1>
            {rfq.description && (
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
                {rfq.description}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:items-end text-xs text-slate-400 gap-1.5">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Created {new Date(rfq.createdAt).toLocaleDateString()}
            </span>
            <span
              className={`flex items-center gap-1.5 font-semibold ${
                isDeadlinePassed ? 'text-rose-400' : 'text-[#36C9A5]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Deadline: {deadlineDate.toLocaleDateString()} {deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Meta Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs">
          <div>
            <p className="text-[10px] uppercase font-bold text-[#94A3B8]">Procurement Category</p>
            <p className="font-semibold text-white mt-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-[#36C9A5]" /> {rfq.category}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-[#94A3B8]">Delivery Site</p>
            <p className="font-semibold text-white mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#36C9A5]" /> {rfq.deliveryLocation}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-[#94A3B8]">Invited Suppliers</p>
            <p className="font-semibold text-white mt-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#36C9A5]" /> {rfq.invitations?.length || 0} registered vendors
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-[#94A3B8]">Selected Quotation</p>
            <p className="font-semibold text-white mt-1">
              {rfq.selectedQuotation ? (
                <span className="text-[#36C9A5] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {rfq.selectedQuotation.quotationNumber}
                </span>
              ) : (
                <span className="text-slate-400">Under Evaluation</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Bill of Materials / Line Items */}
      <div className="p-6 rounded-2xl bg-[#1E293B] border border-[#334155] space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#36C9A5] flex items-center gap-2">
          <span>Itemized Bill of Materials ({rfq.items?.length || 0} Items)</span>
        </h2>

        <div className="border border-[#334155] rounded-xl overflow-hidden bg-[#0B1220]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1E293B] text-slate-300 font-semibold border-b border-[#334155]">
                <tr>
                  <th className="px-4 py-3 w-36">Item Code</th>
                  <th className="px-4 py-3">Specification / Description</th>
                  <th className="px-4 py-3 w-28 text-right">Quantity</th>
                  <th className="px-4 py-3 w-24">UOM</th>
                  <th className="px-4 py-3 w-36 text-right">Target Price (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]/60">
                {rfq.items?.map((item) => (
                  <tr key={item.id} className="hover:bg-[#273449]/20">
                    <td className="px-4 py-3 font-mono font-bold text-[#36C9A5]">{item.itemCode}</td>
                    <td className="px-4 py-3 text-white">{item.description}</td>
                    <td className="px-4 py-3 text-right font-medium text-white">{item.quantity}</td>
                    <td className="px-4 py-3 text-slate-400">{item.uom}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                      {item.targetPrice
                        ? `₹${Number(item.targetPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Attachments Section */}
      {rfq.attachments && rfq.attachments.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#1E293B] border border-[#334155] space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#36C9A5] flex items-center gap-2">
            <span>Procurement Attachments ({rfq.attachments.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {rfq.attachments.map((att) => (
              <a
                key={att.id}
                href={rfqApi.getAttachmentDownloadUrl(rfq.id, att.id)}
                download={att.fileName}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-[#0B1220] border border-[#334155] hover:border-[#36C9A5] transition-colors group text-xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-white truncate group-hover:text-[#36C9A5]">{att.fileName}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {(att.fileSize / 1024).toFixed(1)} KB • {att.mimeType}
                  </p>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-[#36C9A5] shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Invited Vendors & Dispatch List */}
      <div className="p-6 rounded-2xl bg-[#1E293B] border border-[#334155] space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#36C9A5] flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <span>Vendor Dispatch & Submission Status</span>
        </h2>

        <div className="border border-[#334155] rounded-xl overflow-hidden bg-[#0B1220]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1E293B] text-slate-300 font-semibold border-b border-[#334155]">
                <tr>
                  <th className="px-4 py-3">Vendor / Company</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Invited On</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]/60">
                {rfq.invitations && rfq.invitations.length > 0 ? (
                  rfq.invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#273449]/20">
                      <td className="px-4 py-3 font-semibold text-white">
                        {inv.vendor?.name || 'Verified Supplier'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{inv.vendor?.category || '—'}</td>
                      <td className="px-4 py-3 text-slate-400">{inv.vendor?.email || '—'}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(inv.invitedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.status === 'SUBMITTED'
                              ? 'bg-[#36C9A5]/15 text-[#36C9A5] border border-[#36C9A5]/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500">
                      No vendors invited to this RFQ yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quote Modal */}
      {quoteModalOpen && (
        <SubmitQuotationModal
          isOpen={quoteModalOpen}
          rfq={rfq}
          existingQuotation={existingQuote}
          onClose={() => setQuoteModalOpen(false)}
          onSuccess={() => {
            loadRfq();
          }}
        />
      )}
    </div>
  );
};
