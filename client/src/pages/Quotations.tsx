import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  CheckCircle2,
  TrendingDown,
  Star,
  AlertCircle,
  ChevronDown,
  Loader2,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { rfqApi } from '../services/rfqApi';
import { Rfq, RfqComparisonMatrix } from '../types';

export const Quotations: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rfqList, setRfqList] = useState<Rfq[]>([]);
  const [selectedRfqId, setSelectedRfqId] = useState<string>(searchParams.get('rfqId') || '');
  const [matrix, setMatrix] = useState<RfqComparisonMatrix | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [selectingQuoteId, setSelectingQuoteId] = useState<string | null>(null);

  const isOfficerOrAdmin = user?.role === 'ADMIN' || user?.role === 'PROCUREMENT_OFFICER';

  // 1. Fetch available RFQs to populate selector
  useEffect(() => {
    const fetchRfqs = async () => {
      try {
        const res = await rfqApi.getRfqs();
        setRfqList(res.rfqs || []);

        // If no rfqId selected yet, pick the first RFQ or the one in query params
        const paramId = searchParams.get('rfqId');
        if (paramId && res.rfqs.some((r) => r.id === paramId)) {
          setSelectedRfqId(paramId);
        } else if (res.rfqs.length > 0) {
          // Prefer one with quotations or the first
          const withQuotes = res.rfqs.find((r) => (r._count?.quotations ?? 0) > 0);
          const initialId = withQuotes ? withQuotes.id : res.rfqs[0].id;
          setSelectedRfqId(initialId);
          setSearchParams({ rfqId: initialId }, { replace: true });
        }
      } catch (err: any) {
        console.error('Failed to load RFQ list:', err);
      }
    };

    fetchRfqs();
  }, []);

  // 2. Fetch Comparison Matrix when selectedRfqId changes
  useEffect(() => {
    if (!selectedRfqId) return;

    const fetchMatrix = async () => {
      try {
        setLoadingMatrix(true);
        setActionError(null);
        setActionSuccess(null);
        const data = await rfqApi.getComparison(selectedRfqId);
        setMatrix(data);
      } catch (err: any) {
        setActionError(err.message || 'Failed to load quotation comparison matrix');
        setMatrix(null);
      } finally {
        setLoadingMatrix(false);
      }
    };

    fetchMatrix();
  }, [selectedRfqId]);

  const handleRfqChange = (newRfqId: string) => {
    setSelectedRfqId(newRfqId);
    setSearchParams({ rfqId: newRfqId });
  };

  const handleSelectForApproval = async (quotationId: string) => {
    if (!selectedRfqId) return;
    try {
      setSelectingQuoteId(quotationId);
      setActionError(null);
      setActionSuccess(null);

      const result = await rfqApi.selectQuotationForApproval(selectedRfqId, quotationId);
      setActionSuccess(
        `Quotation ${result.quotation.quotationNumber} has been selected for approval. It will advance to the Multi-Tier Approvals workflow in Week 3.`
      );

      // Refresh matrix
      const updated = await rfqApi.getComparison(selectedRfqId);
      setMatrix(updated);
    } catch (err: any) {
      setActionError(err.message || 'Failed to select quotation for approval');
    } finally {
      setSelectingQuoteId(null);
    }
  };

  const currentRfqMeta = rfqList.find((r) => r.id === selectedRfqId);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full text-[#F8FAFC]">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-[#36C9A5]" />
            Quotation Comparison Matrix
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Screen 7: Side-by-side commercial evaluation, L1 lowest-price detection, delivery rankings, and Selection for Approval
          </p>
        </div>

        {/* RFQ Selector Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-300 whitespace-nowrap">
            Select RFQ:
          </label>
          <div className="relative flex-1 sm:w-80">
            <select
              value={selectedRfqId}
              onChange={(e) => handleRfqChange(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-[#1E293B] border border-[#334155] rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#36C9A5] appearance-none cursor-pointer truncate"
            >
              {rfqList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.rfqNumber} — {r.title} ({r._count?.quotations ?? r.quotations?.length ?? 0} quotes)
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* RFQ Overview Header Card */}
      {matrix && (
        <div className="p-5 rounded-2xl bg-[#1E293B] border border-[#334155] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-[10px] uppercase font-bold text-[#94A3B8]">Requisition Title</p>
            <p className="font-semibold text-white mt-1 truncate">{matrix.rfq.title}</p>
            <p className="text-[11px] text-[#36C9A5] font-mono mt-0.5">{matrix.rfq.rfqNumber}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-[#94A3B8]">Category & Site</p>
            <p className="font-semibold text-white mt-1">{matrix.rfq.category}</p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{matrix.rfq.deliveryLocation}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-[#94A3B8]">Deadline & Status</p>
            <p className="font-semibold text-white mt-1">
              {new Date(matrix.rfq.deadline).toLocaleDateString()}
            </p>
            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#0B1220] text-emerald-400 border border-[#334155]">
              {matrix.rfq.status}
            </span>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-[#94A3B8]">Evaluation Summary</p>
            <p className="font-semibold text-white mt-1">
              {matrix.totalQuotations} {matrix.totalQuotations === 1 ? 'Quotation' : 'Quotations'} Received
            </p>
            {matrix.lowestTotalAmount && (
              <p className="text-[11px] text-[#36C9A5] font-semibold mt-0.5">
                Lowest Bid: ₹{matrix.lowestTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Comparison Matrix Area */}
      {loadingMatrix ? (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-[#36C9A5] animate-spin" />
          <p className="text-xs text-slate-400">Assembling side-by-side comparison matrix...</p>
        </div>
      ) : !matrix || matrix.quotations.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-[#1E293B] border border-[#334155] p-8">
          <FileSpreadsheet className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No Submitted Quotations Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            There are currently no submitted quotations for RFQ {currentRfqMeta?.rfqNumber || selectedRfqId}. Invited suppliers must submit their itemized bids before the side-by-side matrix can be generated.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/rfqs')}
              className="px-4 py-2 rounded-xl bg-[#273449] hover:bg-[#334155] text-slate-200 text-xs font-semibold transition-colors"
            >
              Back to RFQs
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-[#334155] rounded-2xl bg-[#1E293B] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Header Row: Vendor Names */}
              <thead>
                <tr className="bg-[#0B1220] border-b border-[#334155]">
                  <th className="p-4 w-72 text-slate-300 font-bold uppercase tracking-wider text-[11px] border-r border-[#334155]">
                    Evaluation Criteria
                  </th>
                  {matrix.quotations.map((col) => (
                    <th
                      key={col.quotationId}
                      className={`p-4 min-w-[240px] text-left border-r border-[#334155] last:border-r-0 ${
                        col.isLowestPrice ? 'bg-[#36C9A5]/5' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-sm truncate">{col.vendorName}</span>
                        {col.isLowestPrice && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#36C9A5] text-[#0B1220] uppercase shrink-0">
                            L1 Lowest
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-[#36C9A5] mt-0.5">
                        {col.quotationNumber}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#334155]/60">
                {/* Row: Vendor Rating & Reputation */}
                <tr className="hover:bg-[#273449]/20">
                  <td className="p-3.5 font-semibold text-slate-300 bg-[#0B1220]/40 border-r border-[#334155]">
                    Supplier Rating & Standing
                  </td>
                  {matrix.quotations.map((col) => (
                    <td
                      key={col.quotationId}
                      className={`p-3.5 border-r border-[#334155] last:border-r-0 ${
                        col.isLowestPrice ? 'bg-[#36C9A5]/5' : ''
                      }`}
                    >
                      {col.vendorRating !== null ? (
                        <div className="flex items-center gap-1 text-amber-400 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{col.vendorRating.toFixed(1)} / 5.0</span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#0B1220] text-slate-400 border border-[#334155]">
                          Not yet rated
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Section Header: Line Item Pricing */}
                <tr className="bg-[#0B1220]/80">
                  <td
                    colSpan={matrix.quotations.length + 1}
                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#36C9A5]"
                  >
                    Itemized Pricing Breakdown
                  </td>
                </tr>

                {/* Line Items Rows */}
                {matrix.rfqItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#273449]/20">
                    <td className="p-3.5 border-r border-[#334155] bg-[#0B1220]/30">
                      <div className="font-mono text-[11px] font-semibold text-[#36C9A5]">
                        {item.itemCode}
                      </div>
                      <div className="text-white text-xs truncate max-w-[260px]">
                        {item.description}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Qty: {item.quantity} {item.uom}
                      </div>
                    </td>

                    {matrix.quotations.map((col) => {
                      const itemData = col.itemPrices[item.id];
                      return (
                        <td
                          key={col.quotationId}
                          className={`p-3.5 border-r border-[#334155] last:border-r-0 ${
                            col.isLowestPrice ? 'bg-[#36C9A5]/5' : ''
                          }`}
                        >
                          {itemData ? (
                            <div>
                              <div className="font-mono font-semibold text-white">
                                ₹{itemData.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                <span className="text-[10px] text-slate-400 font-normal"> / {item.uom}</span>
                              </div>
                              <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                                Total: ₹{itemData.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Lead: {itemData.leadDays} days
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Section Header: Commercial Totals */}
                <tr className="bg-[#0B1220]/80">
                  <td
                    colSpan={matrix.quotations.length + 1}
                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#36C9A5]"
                  >
                    Financial Comparison & Commercials
                  </td>
                </tr>

                {/* Subtotal */}
                <tr className="hover:bg-[#273449]/20">
                  <td className="p-3.5 font-semibold text-slate-300 bg-[#0B1220]/30 border-r border-[#334155]">
                    Items Subtotal (Excl. Tax)
                  </td>
                  {matrix.quotations.map((col) => (
                    <td
                      key={col.quotationId}
                      className={`p-3.5 font-mono text-white border-r border-[#334155] last:border-r-0 ${
                        col.isLowestPrice ? 'bg-[#36C9A5]/5' : ''
                      }`}
                    >
                      ₹{col.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                </tr>

                {/* Tax Rate & Amount */}
                <tr className="hover:bg-[#273449]/20">
                  <td className="p-3.5 font-semibold text-slate-300 bg-[#0B1220]/30 border-r border-[#334155]">
                    GST / Applicable Tax
                  </td>
                  {matrix.quotations.map((col) => (
                    <td
                      key={col.quotationId}
                      className={`p-3.5 font-mono text-slate-300 border-r border-[#334155] last:border-r-0 ${
                        col.isLowestPrice ? 'bg-[#36C9A5]/5' : ''
                      }`}
                    >
                      ₹{col.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span className="text-[10px] text-slate-400 ml-1">({col.taxRate}% GST)</span>
                    </td>
                  ))}
                </tr>

                {/* Grand Total Row (Highlighted) */}
                <tr className="bg-[#111827] border-y-2 border-[#334155]">
                  <td className="p-4 font-bold text-white text-sm bg-[#0B1220] border-r border-[#334155]">
                    Grand Total Amount (INR)
                  </td>
                  {matrix.quotations.map((col) => (
                    <td
                      key={col.quotationId}
                      className={`p-4 border-r border-[#334155] last:border-r-0 ${
                        col.isLowestPrice
                          ? 'bg-[#36C9A5]/15 text-[#36C9A5]'
                          : 'text-white'
                      }`}
                    >
                      <div className="font-mono font-bold text-base">
                        ₹{col.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      {col.isLowestPrice && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-[#36C9A5] mt-1">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>L1 Lowest Price</span>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Delivery Lead Time */}
                <tr className="hover:bg-[#273449]/20">
                  <td className="p-3.5 font-semibold text-slate-300 bg-[#0B1220]/30 border-r border-[#334155]">
                    Overall Delivery Lead Time
                  </td>
                  {matrix.quotations.map((col) => (
                    <td
                      key={col.quotationId}
                      className={`p-3.5 border-r border-[#334155] last:border-r-0 ${
                        col.isLowestPrice ? 'bg-[#36C9A5]/5' : ''
                      }`}
                    >
                      <span className="font-semibold text-white">{col.leadTimeDays} calendar days</span>
                    </td>
                  ))}
                </tr>

                {/* Payment Terms */}
                <tr className="hover:bg-[#273449]/20">
                  <td className="p-3.5 font-semibold text-slate-300 bg-[#0B1220]/30 border-r border-[#334155]">
                    Payment Terms
                  </td>
                  {matrix.quotations.map((col) => (
                    <td
                      key={col.quotationId}
                      className={`p-3.5 text-slate-300 border-r border-[#334155] last:border-r-0 ${
                        col.isLowestPrice ? 'bg-[#36C9A5]/5' : ''
                      }`}
                    >
                      {col.paymentTerms}
                    </td>
                  ))}
                </tr>

                {/* Quotation Status */}
                <tr className="hover:bg-[#273449]/20">
                  <td className="p-3.5 font-semibold text-slate-300 bg-[#0B1220]/30 border-r border-[#334155]">
                    Current Evaluation Status
                  </td>
                  {matrix.quotations.map((col) => (
                    <td
                      key={col.quotationId}
                      className={`p-3.5 border-r border-[#334155] last:border-r-0 ${
                        col.isLowestPrice ? 'bg-[#36C9A5]/5' : ''
                      }`}
                    >
                      {col.isSelected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#36C9A5]/20 text-[#36C9A5] border border-[#36C9A5]/50">
                          <Check className="w-3.5 h-3.5" /> Selected for Approval
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#0B1220] text-slate-400 border border-[#334155]">
                          {col.status}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Action Row: "Select for Approval" */}
                {isOfficerOrAdmin && (
                  <tr className="bg-[#0B1220]">
                    <td className="p-4 font-bold text-white text-xs border-r border-[#334155]">
                      Procurement Action
                    </td>
                    {matrix.quotations.map((col) => (
                      <td
                        key={col.quotationId}
                        className={`p-4 border-r border-[#334155] last:border-r-0 ${
                          col.isLowestPrice ? 'bg-[#36C9A5]/5' : ''
                        }`}
                      >
                        {col.isSelected ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#36C9A5]">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Winning Bid Selected</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={selectingQuoteId !== null}
                            onClick={() => handleSelectForApproval(col.quotationId)}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
                              col.isLowestPrice
                                ? 'bg-[#36C9A5] text-[#0B1220] hover:bg-[#2db893]'
                                : 'bg-[#273449] text-white hover:bg-[#334155] border border-[#334155]'
                            } disabled:opacity-50`}
                          >
                            {selectingQuoteId === col.quotationId ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Selecting...
                              </>
                            ) : (
                              'Select for Approval'
                            )}
                          </button>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
