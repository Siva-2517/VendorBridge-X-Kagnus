import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle,
  Building2,
  MapPin,
  Tag,
  Loader2,
} from 'lucide-react';
import { rfqApi } from '../../services/rfqApi';
import { Vendor } from '../../types';

interface CreateRfqModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface LineItemInput {
  itemCode: string;
  description: string;
  quantity: number | '';
  uom: string;
  targetPrice: number | '';
}

const CATEGORIES = [
  'Hardware',
  'Electrical',
  'Raw Materials',
  'Logistics',
  'Facilities',
  'IT Services',
  'Packaging',
  'Office Supplies',
];

const UOMS = ['Units', 'Nos', 'Kg', 'Meters', 'Boxes', 'Sets', 'Liters', 'Hours'];

export const CreateRfqModal: React.FC<CreateRfqModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<LineItemInput[]>([
    { itemCode: '', description: '', quantity: 1, uom: 'Units', targetPrice: '' },
  ]);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<File | null>(null);

  const [availableVendors, setAvailableVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available active vendors for multi-invite
  useEffect(() => {
    if (isOpen) {
      setLoadingVendors(true);
      fetch('/api/vendors?status=ACTIVE', { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          setAvailableVendors(data.vendors || []);
        })
        .catch((err) => {
          console.error('Failed to load vendors', err);
        })
        .finally(() => setLoadingVendors(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      { itemCode: '', description: '', quantity: 1, uom: 'Units', targetPrice: '' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItemInput, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const toggleVendorSelection = (vendorId: string) => {
    if (selectedVendorIds.includes(vendorId)) {
      setSelectedVendorIds(selectedVendorIds.filter((id) => id !== vendorId));
    } else {
      setSelectedVendorIds([...selectedVendorIds, vendorId]);
    }
  };

  const handleSubmit = async (status: 'DRAFT' | 'OPEN') => {
    setError(null);

    // Validation
    if (!title.trim()) {
      setError('RFQ title is required');
      return;
    }
    if (!deliveryLocation.trim()) {
      setError('Delivery location / site is required');
      return;
    }
    if (!deadline) {
      setError('Submission deadline is required');
      return;
    }
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      setError('Deadline must be a valid future date and time');
      return;
    }
    if (items.length === 0) {
      setError('At least one line item is required');
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.itemCode.trim() || !it.description.trim()) {
        setError(`Item #${i + 1}: Item Code and Description are required`);
        return;
      }
      if (typeof it.quantity !== 'number' || it.quantity <= 0) {
        setError(`Item #${i + 1}: Quantity must be greater than 0`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const formattedItems = items.map((it) => ({
        itemCode: it.itemCode.trim().toUpperCase(),
        description: it.description.trim(),
        quantity: Number(it.quantity),
        uom: it.uom,
        targetPrice: it.targetPrice !== '' ? Number(it.targetPrice) : null,
      }));

      const createdRfq = await rfqApi.createRfq({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        deliveryLocation: deliveryLocation.trim(),
        deadline: new Date(deadline).toISOString(),
        status,
        items: formattedItems,
        vendorIds: selectedVendorIds,
      });

      // Upload attachment if selected
      if (attachment && createdRfq.id) {
        try {
          await rfqApi.uploadAttachment(createdRfq.id, attachment);
        } catch (uploadErr: any) {
          console.warn('Attachment upload failed, but RFQ was created:', uploadErr);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create RFQ');
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
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#36C9A5]" />
              Create Request for Quotation (RFQ)
            </h2>
            <p className="text-xs text-[#94A3B8]">
              Screen 5: Requisition details, itemized bill of materials, and vendor invitations
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#273449] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#36C9A5] flex items-center gap-1.5">
              <span>1. Basic Information & Scope</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  RFQ Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Annual Data Center Networking Equipment & Cabling"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B1220] border border-[#334155] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#36C9A5]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Procurement Category <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0B1220] border border-[#334155] rounded-xl text-sm text-white focus:outline-none focus:border-[#36C9A5] appearance-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <Tag className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Delivery Site / Location <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g., Bengaluru Campus - Warehouse 3"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0B1220] border border-[#334155] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#36C9A5]"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Submission Deadline <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0B1220] border border-[#334155] rounded-xl text-sm text-white focus:outline-none focus:border-[#36C9A5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Attachment Specification (Optional)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="rfq-attachment"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx"
                  />
                  <label
                    htmlFor="rfq-attachment"
                    className="flex items-center justify-between px-3.5 py-2 bg-[#0B1220] border border-dashed border-[#334155] hover:border-[#36C9A5] rounded-xl text-xs text-slate-300 cursor-pointer transition-colors"
                  >
                    <span className="truncate max-w-[200px]">
                      {attachment ? attachment.name : 'Choose file (.pdf, .xlsx, max 5MB)'}
                    </span>
                    <UploadCloud className="w-4 h-4 text-[#36C9A5] shrink-0 ml-2" />
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Detailed Scope of Work / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide technical requirements, compliance certifications, or delivery constraints..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0B1220] border border-[#334155] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#36C9A5]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Multi-line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#36C9A5] flex items-center gap-1.5">
                <span>2. Line Items & Target Prices</span>
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#36C9A5]/15 text-[#36C9A5] hover:bg-[#36C9A5]/25 border border-[#36C9A5]/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="border border-[#334155] rounded-xl overflow-hidden bg-[#0B1220]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1E293B] text-slate-300 font-semibold border-b border-[#334155]">
                    <tr>
                      <th className="px-3 py-2.5 w-32">Item Code *</th>
                      <th className="px-3 py-2.5">Description *</th>
                      <th className="px-3 py-2.5 w-24">Qty *</th>
                      <th className="px-3 py-2.5 w-24">UOM</th>
                      <th className="px-3 py-2.5 w-32">Target Price (₹)</th>
                      <th className="px-3 py-2.5 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]/60">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#273449]/30">
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="e.g. IT-SW-01"
                            value={item.itemCode}
                            onChange={(e) => handleItemChange(idx, 'itemCode', e.target.value)}
                            className="w-full px-2 py-1.5 bg-[#1E293B] border border-[#334155] rounded text-xs text-white uppercase focus:outline-none focus:border-[#36C9A5]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Detailed item specification"
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            className="w-full px-2 py-1.5 bg-[#1E293B] border border-[#334155] rounded text-xs text-white focus:outline-none focus:border-[#36C9A5]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                'quantity',
                                e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                            className="w-full px-2 py-1.5 bg-[#1E293B] border border-[#334155] rounded text-xs text-white focus:outline-none focus:border-[#36C9A5]"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={item.uom}
                            onChange={(e) => handleItemChange(idx, 'uom', e.target.value)}
                            className="w-full px-2 py-1.5 bg-[#1E293B] border border-[#334155] rounded text-xs text-white focus:outline-none focus:border-[#36C9A5]"
                          >
                            {UOMS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Optional"
                            value={item.targetPrice}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                'targetPrice',
                                e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1.5 bg-[#1E293B] border border-[#334155] rounded text-xs text-white focus:outline-none focus:border-[#36C9A5]"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length <= 1}
                            className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 3: Vendor Invitations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#36C9A5] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>3. Invite Verified Vendors ({selectedVendorIds.length} selected)</span>
              </h3>
              <span className="text-[11px] text-[#94A3B8]">
                Click vendor pills to add or remove from dispatch
              </span>
            </div>

            {loadingVendors ? (
              <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#36C9A5]" />
                <span>Loading active vendors directory...</span>
              </div>
            ) : availableVendors.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-[#0B1220] rounded-xl border border-[#334155]">
                No active vendors found in system. Register or verify vendors first.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                {availableVendors.map((vendor) => {
                  const isSelected = selectedVendorIds.includes(vendor.id);
                  return (
                    <button
                      key={vendor.id}
                      type="button"
                      onClick={() => toggleVendorSelection(vendor.id)}
                      className={`flex items-start justify-between p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#36C9A5]/15 border-[#36C9A5] text-white shadow-sm'
                          : 'bg-[#0B1220] border-[#334155] text-slate-300 hover:border-slate-500 hover:bg-[#273449]/40'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold truncate">{vendor.name}</p>
                        <p className="text-[10px] text-[#94A3B8] truncate">
                          {vendor.category} • {vendor.city || 'Pan-India'}
                        </p>
                      </div>
                      {isSelected ? (
                        <CheckCircle className="w-4 h-4 text-[#36C9A5] shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-600 shrink-0"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
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
              disabled={submitting}
              onClick={() => handleSubmit('DRAFT')}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#334155] text-slate-300 hover:bg-[#273449] hover:text-white transition-all disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('OPEN')}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-[#36C9A5] text-[#0B1220] hover:bg-[#2db893] transition-all shadow-md disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Publish & Open RFQ'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
