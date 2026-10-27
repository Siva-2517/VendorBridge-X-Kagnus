import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { rfqApi } from '../services/rfqApi';
import { Rfq, Quotation } from '../types';
import { CreateRfqModal } from '../components/rfq/CreateRfqModal';
import { SubmitQuotationModal } from '../components/quotations/SubmitQuotationModal';

export const Rfqs: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedRfqForQuote, setSelectedRfqForQuote] = useState<Rfq | null>(null);
  const [existingQuoteForModal, setExistingQuoteForModal] = useState<Quotation | null>(null);

  const isOfficerOrAdmin = user?.role === 'ADMIN' || user?.role === 'PROCUREMENT_OFFICER';
  const isVendor = user?.role === 'VENDOR';

  const loadRfqs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await rfqApi.getRfqs({
        status: selectedStatus,
        category: selectedCategory,
        search: searchTerm,
      });
      setRfqs(res.rfqs || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load RFQs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRfqs();
  }, [selectedStatus, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadRfqs();
  };

  const handleOpenQuoteModal = async (rfq: Rfq) => {
    setSelectedRfqForQuote(rfq);
    setExistingQuoteForModal(null);

    // If vendor, check if they already submitted a quote for this RFQ
    if (isVendor) {
      try {
        const res = await rfqApi.getQuotations({ rfqId: rfq.id });
        if (res.quotations && res.quotations.length > 0) {
          setExistingQuoteForModal(res.quotations[0]);
        }
      } catch (err) {
        console.warn('Could not check existing quotation:', err);
      }
    }
    setQuoteModalOpen(true);
  };

  // Metrics
  const totalCount = rfqs.length;
  const openCount = rfqs.filter((r) => r.status === 'OPEN').length;
  const closingSoonCount = rfqs.filter((r) => {
    if (r.status !== 'OPEN') return false;
    const diffHours = (new Date(r.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 48;
  }).length;
  const awardedCount = rfqs.filter((r) => r.status === 'AWARDED').length;

  const getStatusBadge = (status: string, deadline: string) => {
    const isPassed = new Date(deadline).getTime() < Date.now();
    if (status === 'OPEN' && isPassed) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-500/40 flex items-center gap-1 w-fit">
          <Clock className="w-3 h-3" /> Deadline Expired
        </span>
      );
    }
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Open
          </span>
        );
      case 'DRAFT':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-600 w-fit">
            Draft
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-500/40 w-fit">
            Closed
          </span>
        );
      case 'AWARDED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#36C9A5]/15 text-[#36C9A5] border border-[#36C9A5]/40 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" /> Awarded
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-800 text-gray-400 border border-gray-700 w-fit">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-600 w-fit">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[#36C9A5]" />
            Request for Quotations (RFQ)
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            {isVendor
              ? 'View assigned RFQs dispatched to your organization, review scopes, and submit bids.'
              : 'Create procurement packages, invite verified suppliers, track deadlines, and compare quotes.'}
          </p>
        </div>

        {isOfficerOrAdmin && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#36C9A5] text-[#0B1220] font-bold text-xs hover:bg-[#2db893] transition-all shadow-lg hover:shadow-[#36C9A5]/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New RFQ</span>
          </button>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#94A3B8] uppercase">Total Requisitions</p>
            <p className="text-2xl font-bold text-white mt-1">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#273449] flex items-center justify-center text-slate-300">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-400 uppercase">Active / Open Bids</p>
            <p className="text-2xl font-bold text-emerald-300 mt-1">{openCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-amber-400 uppercase">Closing Soon (&lt; 48h)</p>
            <p className="text-2xl font-bold text-amber-300 mt-1">{closingSoonCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-950/40 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#36C9A5] uppercase">Awarded Packages</p>
            <p className="text-2xl font-bold text-[#36C9A5] mt-1">{awardedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#36C9A5]/10 border border-[#36C9A5]/20 flex items-center justify-center text-[#36C9A5]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#1E293B] border border-[#334155] space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {['ALL', 'OPEN', 'DRAFT', 'CLOSED', 'AWARDED'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedStatus === st
                    ? 'bg-[#36C9A5] text-[#0B1220] shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#273449]'
                }`}
              >
                {st === 'ALL' ? 'All RFQs' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search Input & Category */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by title or RFQ #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0B1220] border border-[#334155] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#36C9A5]"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-[#0B1220] border border-[#334155] rounded-xl text-xs text-white focus:outline-none focus:border-[#36C9A5]"
            >
              <option value="ALL">All Categories</option>
              <option value="Hardware">Hardware</option>
              <option value="Electrical">Electrical</option>
              <option value="Raw Materials">Raw Materials</option>
              <option value="Logistics">Logistics</option>
              <option value="Facilities">Facilities</option>
              <option value="IT Services">IT Services</option>
              <option value="Packaging">Packaging</option>
            </select>
          </form>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-[#36C9A5] animate-spin" />
          <p className="text-xs text-slate-400">Loading procurement requisitions...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-rose-950/30 border border-rose-500/40 text-center text-rose-300 text-xs">
          <AlertCircle className="w-6 h-6 text-rose-400 mx-auto mb-2" />
          <p className="font-semibold">{error}</p>
          <button
            onClick={loadRfqs}
            className="mt-3 px-3 py-1.5 rounded-lg bg-rose-900/50 hover:bg-rose-900 text-white font-medium"
          >
            Retry
          </button>
        </div>
      ) : rfqs.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-[#1E293B] border border-[#334155] p-8">
          <FileText className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No RFQ Requisitions Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            {isVendor
              ? 'You have not been invited to any open RFQs yet. Once procurement officers invite your company, they will appear here.'
              : 'There are no RFQs matching your current filter criteria. Create a new RFQ to start inviting suppliers.'}
          </p>
          {isOfficerOrAdmin && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#36C9A5] text-[#0B1220] font-bold text-xs hover:bg-[#2db893] transition-colors"
            >
              <Plus className="w-4 h-4" /> Create First RFQ
            </button>
          )}
        </div>
      ) : (
        <div className="border border-[#334155] rounded-2xl bg-[#1E293B] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B1220] text-slate-300 font-semibold border-b border-[#334155]">
                <tr>
                  <th className="px-5 py-3.5">RFQ Number</th>
                  <th className="px-5 py-3.5">Title & Category</th>
                  <th className="px-5 py-3.5">Delivery Site</th>
                  <th className="px-5 py-3.5">Deadline</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-center">Bids Received</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]/60">
                {rfqs.map((rfq) => {
                  const deadlineDate = new Date(rfq.deadline);
                  const isPassed = deadlineDate.getTime() < Date.now();
                  const quotesCount = rfq._count?.quotations ?? rfq.quotations?.length ?? 0;

                  return (
                    <tr key={rfq.id} className="hover:bg-[#273449]/30 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-[#36C9A5]">
                        {rfq.rfqNumber}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-white text-sm truncate max-w-xs">{rfq.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#0B1220] text-slate-400 border border-[#334155]">
                            {rfq.category}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {rfq.items?.length || 0} line items
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-300 truncate max-w-[180px]">
                        {rfq.deliveryLocation}
                      </td>

                      <td className="px-5 py-4">
                        <div
                          className={`flex items-center gap-1.5 font-medium ${
                            isPassed ? 'text-rose-400' : 'text-slate-200'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {deadlineDate.toLocaleDateString()} {deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">{getStatusBadge(rfq.status, rfq.deadline)}</td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0B1220] border border-[#334155] text-white">
                          {quotesCount} {quotesCount === 1 ? 'bid' : 'bids'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* If user is Vendor, show Quote Button */}
                          {isVendor ? (
                            <button
                              onClick={() => handleOpenQuoteModal(rfq)}
                              disabled={isPassed || rfq.status !== 'OPEN'}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#36C9A5] text-[#0B1220] hover:bg-[#2db893] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                            >
                              Submit Quote
                            </button>
                          ) : (
                            <>
                              {/* Compare Bids button */}
                              <button
                                onClick={() => navigate(`/quotations?rfqId=${rfq.id}`)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#273449] hover:bg-[#334155] text-[#36C9A5] border border-[#36C9A5]/30 hover:border-[#36C9A5] transition-colors flex items-center gap-1"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Compare Bids</span>
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => navigate(`/rfqs/${rfq.id}`)}
                            title="View Full RFQ"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#273449] transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateRfqModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          loadRfqs();
        }}
      />

      {quoteModalOpen && selectedRfqForQuote && (
        <SubmitQuotationModal
          isOpen={quoteModalOpen}
          rfq={selectedRfqForQuote}
          existingQuotation={existingQuoteForModal}
          onClose={() => {
            setQuoteModalOpen(false);
            setSelectedRfqForQuote(null);
            setExistingQuoteForModal(null);
          }}
          onSuccess={() => {
            loadRfqs();
          }}
        />
      )}
    </div>
  );
};
