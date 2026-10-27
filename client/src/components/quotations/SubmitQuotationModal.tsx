import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  Loader2,
  Lock,
} from 'lucide-react';
import { rfqApi } from '../../services/rfqApi';
import { Rfq, Quotation } from '../../types';

interface SubmitQuotationModalProps {
  isOpen: boolean;
  rfq: Rfq | null;
  existingQuotation?: Quotation | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemBid {
  rfqItemId: string;
  itemCode: string;
  description: string;
  quantity: number;
  uom: string;
  targetPrice?: number | null;
  unitPrice: number | '';
  deliveryLeadDays: number | '';
  notes: string;
}

const TAX_RATES = [0, 5, 12, 18, 28];
const PAYMENT_TERMS_OPTIONS = [
  'Net 30 Days',
  'Net 45 Days',
  'Net 60 Days',
  '100% Against Delivery',
  '50% Advance, 50% on Delivery',
  '100% Advance Against Proforma',
];

export const SubmitQuotationModal: React.FC<SubmitQuotationModalProps> = ({
  isOpen,
  rfq,
  existingQuotation,
  onClose,
  onSuccess,
}) => {
  const [itemBids, setItemBids] = useState<ItemBid[]>([]);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [paymentTerms, setPaymentTerms] = useState<string>(PAYMENT_TERMS_OPTIONS[0]);
  const [leadTimeDays, setLeadTimeDays] = useState<number | ''>(14);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form state from RFQ items and existing quotation
  useEffect(() => {
    if (rfq && rfq.items) {
      const bids: ItemBid[] = rfq.items.map((item) => {
        const existingItem = existingQuotation?.items?.find((qi) => qi.rfqItemId === item.id);
        return {
          rfqItemId: item.id,
          itemCode: item.itemCode,
          description: item.description,
          quantity: item.quantity,
          uom: item.uom,
          targetPrice: item.targetPrice,
          unitPrice: existingItem ? existingItem.unitPrice : '',
          deliveryLeadDays: existingItem ? existingItem.deliveryLeadDays : 7,
          notes: existingItem?.notes || '',
        };
      });
      setItemBids(bids);

      if (existingQuotation) {
        setTaxRate(existingQuotation.taxRate ?? 18);
        setPaymentTerms(existingQuotation.paymentTerms || PAYMENT_TERMS_OPTIONS[0]);
        setLeadTimeDays(existingQuotation.leadTimeDays ?? 14);
        setNotes(existingQuotation.notes || '');
      } else {
        setTaxRate(18);
        setPaymentTerms(PAYMENT_TERMS_OPTIONS[0]);
        setLeadTimeDays(14);
        setNotes('');
      }
    }
  }, [rfq, existingQuotation, isOpen]);

  if (!isOpen || !rfq) return null;

  // Real-time Deadline & Status Check
  const isDeadlinePassed = new Date(rfq.deadline).getTime() < Date.now();
  const isRfqLocked = rfq.status !== 'OPEN' || isDeadlinePassed;

  const handlePriceChange = (index: number, val: string) => {
    const updated = [...itemBids];
    updated[index].unitPrice = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
    setItemBids(updated);
  };

  const handleLeadDaysChange = (index: number, val: string) => {
    const updated = [...itemBids];
    updated[index].deliveryLeadDays = val === '' ? '' : Math.max(1, parseInt(val) || 1);
    setItemBids(updated);
  };

  // Calculations for preview
  const subtotal = itemBids.reduce((acc, it) => {
    const price = typeof it.unitPrice === 'number' ? it.unitPrice : 0;
    return acc + price * it.quantity;
  }, 0);

  const taxAmount = (subtotal * taxRate) / 100;
  const grandTotal = subtotal + taxAmount;

  const handleSubmit = async (status: 'DRAFT' | 'SUBMITTED') => {
    setError(null);

    if (isRfqLocked) {
      setError('RFQ is closed or the deadline has expired. Submissions are locked.');
      return;
    }

    if (typeof leadTimeDays !== 'number' || leadTimeDays <= 0) {
      setError('Please provide a valid overall delivery lead time in days.');
      return;
    }

    // Validate item pricing
    for (let i = 0; i < itemBids.length; i++) {
      const b = itemBids[i];
      if (typeof b.unitPrice !== 'number' || b.unitPrice <= 0) {
        if (status === 'SUBMITTED') {
          setError(`Please enter a valid unit price for item ${b.itemCode}`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      const itemsPayload = itemBids.map((b) => ({
        rfqItemId: b.rfqItemId,
        unitPrice: typeof b.unitPrice === 'number' ? b.unitPrice : 0,
        deliveryLeadDays: typeof b.deliveryLeadDays === 'number' ? b.deliveryLeadDays : 7,
        notes: b.notes || undefined,
      }));

      if (existingQuotation?.id) {
        // Update existing quotation
        await rfqApi.updateQuotation(existingQuotation.id, {
          taxRate,
          paymentTerms,
          leadTimeDays: Number(leadTimeDays),
          notes: notes.trim() || undefined,
          status,
          items: itemsPayload,
        });
      } else {
        // Create new quotation
        await rfqApi.submitQuotation({
          rfqId: rfq.id,
          taxRate,
          paymentTerms,
          leadTimeDays: Number(leadTimeDays),
          notes: notes.trim() || undefined,
          status,
          items: itemsPayload,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit quotation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-[#F8FAFC]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#0B1220]">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#36C9A5]" />
              <h2 className="text-lg font-bold text-white">
                {existingQuotation ? 'Edit Quotation' : 'Submit Quotation / Supplier Bid'}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-[#334155] text-slate-300 font-mono">
                {rfq.rfqNumber}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Screen 6: Itemized pricing, delivery timelines, and commercial terms
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#273449] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Deadline / Locked Banner */}
          {isRfqLocked && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs">
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-amber-300">
                  Submissions Locked: {isDeadlinePassed ? 'Deadline Passed' : `Status: ${rfq.status}`}
                </p>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  The submission window for this RFQ closed on {new Date(rfq.deadline).toLocaleString()}. You cannot submit new bids or modify existing quotations.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* RFQ Meta Card */}
          <div className="p-4 rounded-xl bg-[#0B1220] border border-[#334155] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-[#94A3B8]">RFQ Scope</p>
              <p className="font-semibold text-white mt-1 truncate">{rfq.title}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-[#94A3B8]">Category</p>
              <p className="font-semibold text-white mt-1">{rfq.category}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-[#94A3B8]">Delivery Site</p>
              <p className="font-semibold text-white mt-1 truncate">{rfq.deliveryLocation}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-[#94A3B8]">Submission Deadline</p>
              <p
                className={`font-semibold mt-1 flex items-center gap-1 ${
                  isDeadlinePassed ? 'text-rose-400' : 'text-[#36C9A5]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {new Date(rfq.deadline).toLocaleDateString()} {new Date(rfq.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Itemized Pricing Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#36C9A5]">
              Line Item Bids ({itemBids.length} items)
            </h3>

            <div className="border border-[#334155] rounded-xl overflow-hidden bg-[#0B1220]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1E293B] text-slate-300 font-semibold border-b border-[#334155]">
                    <tr>
                      <th className="px-3 py-2.5 w-32">Item Code</th>
                      <th className="px-3 py-2.5">Description</th>
                      <th className="px-3 py-2.5 w-20 text-right">Qty</th>
                      <th className="px-3 py-2.5 w-20">UOM</th>
                      <th className="px-3 py-2.5 w-32">Unit Price (₹) *</th>
                      <th className="px-3 py-2.5 w-24">Lead Days</th>
                      <th className="px-3 py-2.5 w-32 text-right">Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]/60">
                    {itemBids.map((b, idx) => {
                      const price = typeof b.unitPrice === 'number' ? b.unitPrice : 0;
                      const lineTotal = price * b.quantity;
                      return (
                        <tr key={b.rfqItemId} className="hover:bg-[#273449]/20">
                          <td className="px-3 py-2.5 font-mono text-[#36C9A5]">{b.itemCode}</td>
                          <td className="px-3 py-2.5 text-white max-w-xs truncate">{b.description}</td>
                          <td className="px-3 py-2.5 text-right font-medium">{b.quantity}</td>
                          <td className="px-3 py-2.5 text-slate-400">{b.uom}</td>
                          <td className="p-2">
                            <input
                              type="number"
                              disabled={isRfqLocked}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={b.unitPrice}
                              onChange={(e) => handlePriceChange(idx, e.target.value)}
                              className="w-full px-2 py-1.5 bg-[#1E293B] border border-[#334155] rounded text-xs text-white font-mono text-right focus:outline-none focus:border-[#36C9A5] disabled:opacity-50"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              disabled={isRfqLocked}
                              min="1"
                              value={b.deliveryLeadDays}
                              onChange={(e) => handleLeadDaysChange(idx, e.target.value)}
                              className="w-full px-2 py-1.5 bg-[#1E293B] border border-[#334155] rounded text-xs text-white text-center focus:outline-none focus:border-[#36C9A5] disabled:opacity-50"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-white">
                            ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Commercial Terms & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#36C9A5]">
                Commercial Terms
              </h3>

              <div className="space-y-3 bg-[#0B1220] p-4 rounded-xl border border-[#334155]">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    GST / Applicable Tax Rate (%)
                  </label>
                  <select
                    disabled={isRfqLocked}
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-[#1E293B] border border-[#334155] rounded-xl text-xs text-white focus:outline-none focus:border-[#36C9A5] disabled:opacity-50"
                  >
                    {TAX_RATES.map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}% GST
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Payment Terms
                  </label>
                  <select
                    disabled={isRfqLocked}
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1E293B] border border-[#334155] rounded-xl text-xs text-white focus:outline-none focus:border-[#36C9A5] disabled:opacity-50"
                  >
                    {PAYMENT_TERMS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Overall Delivery Lead Time (Days)
                  </label>
                  <input
                    type="number"
                    disabled={isRfqLocked}
                    min="1"
                    value={leadTimeDays}
                    onChange={(e) =>
                      setLeadTimeDays(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-full px-3 py-2 bg-[#1E293B] border border-[#334155] rounded-xl text-xs text-white focus:outline-none focus:border-[#36C9A5] disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#36C9A5]">
                Quotation Financial Summary
              </h3>

              <div className="p-4 rounded-xl bg-[#0B1220] border border-[#334155] space-y-3">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Items Subtotal:</span>
                  <span className="font-mono font-semibold text-white">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Applicable Tax ({taxRate}% GST):</span>
                  <span className="font-mono font-semibold text-white">
                    ₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#334155] flex justify-between items-center text-sm">
                  <span className="font-bold text-white">Quotation Grand Total:</span>
                  <span className="font-mono font-bold text-base text-[#36C9A5]">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-2 text-[11px] text-slate-400">
                  <p>
                    * Subtotal and tax calculations are strictly validated by PostgreSQL Decimal precision upon server submission.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Vendor Notes & Validity
                </label>
                <textarea
                  rows={2}
                  disabled={isRfqLocked}
                  placeholder="e.g. Quotation valid for 30 calendar days. Freight inclusive to delivery site."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B1220] border border-[#334155] rounded-xl text-xs text-white focus:outline-none focus:border-[#36C9A5] disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#334155] bg-[#0B1220] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting || isRfqLocked}
              onClick={() => handleSubmit('DRAFT')}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#334155] text-slate-300 hover:bg-[#273449] hover:text-white transition-all disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={submitting || isRfqLocked}
              onClick={() => handleSubmit('SUBMITTED')}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-[#36C9A5] text-[#0B1220] hover:bg-[#2db893] transition-all shadow-md disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Quotation'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
