import React, { useState, useEffect } from 'react';
import { Modal } from '../components/common/Modal';
import { Vendor, VendorStatus } from '../types';
import { AlertCircle, Loader2, Save } from 'lucide-react';

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  vendorToEdit?: Vendor | null;
}

const CATEGORIES = [
  'Constructions',
  'IT',
  'Logistics',
  'Manufacturing',
  'Services',
  'Stationery',
  'Chemicals',
  'Packaging',
];

export const VendorModal: React.FC<VendorModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  vendorToEdit,
}) => {
  const isEditing = Boolean(vendorToEdit);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Constructions',
    gstin: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    status: 'PENDING' as VendorStatus,
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (vendorToEdit) {
      setFormData({
        name: vendorToEdit.name,
        category: vendorToEdit.category,
        gstin: vendorToEdit.gstin,
        contactPerson: vendorToEdit.contactPerson,
        email: vendorToEdit.email,
        phone: vendorToEdit.phone,
        address: vendorToEdit.address,
        city: vendorToEdit.city || '',
        state: vendorToEdit.state || '',
        pincode: vendorToEdit.pincode || '',
        country: vendorToEdit.country || 'India',
        status: vendorToEdit.status,
        notes: vendorToEdit.notes || '',
      });
    } else {
      setFormData({
        name: '',
        category: 'Constructions',
        gstin: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        status: 'PENDING',
        notes: '',
      });
    }
    setError(null);
    setFieldErrors({});
  }, [vendorToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'gstin' ? value.toUpperCase() : value,
    }));
    if (fieldErrors[name]) {
      const updated = { ...fieldErrors };
      delete updated[name];
      setFieldErrors(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const url = isEditing ? `/api/vendors/${vendorToEdit?.id}` : '/api/vendors';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Operation failed');
        if (data.details) {
          setFieldErrors(data.details);
        }
      } else {
        onSaved();
        onClose();
      }
    } catch (err: any) {
      setError('Network connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Vendor: ${vendorToEdit?.name}` : 'Register New Vendor'}
      maxWidth="max-w-2xl"
    >
      {error && (
        <div className="mb-4 p-3 bg-rose-950/70 border border-rose-800/80 rounded-lg text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Vendor Name *</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Infra Supplies Pvt Ltd"
              className="w-full px-3 py-2 bg-[#090f0c] border border-[#213528] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            {fieldErrors.name && <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.name[0]}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-[#090f0c] border border-[#213528] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* GSTIN & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              GST Number (GSTIN) *
            </label>
            <input
              type="text"
              name="gstin"
              required
              maxLength={15}
              value={formData.gstin}
              onChange={handleChange}
              placeholder="e.g. 27AABC1576214B0"
              className="w-full px-3 py-2 bg-[#090f0c] border border-[#213528] rounded-lg text-sm font-mono text-emerald-400 uppercase focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">15-char Indian GSTIN format</p>
            {fieldErrors.gstin && (
              <p className="text-[11px] text-rose-400 mt-0.5">{fieldErrors.gstin[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-[#090f0c] border border-[#213528] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
        </div>

        {/* Contact Person & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Person *</label>
            <input
              type="text"
              name="contactPerson"
              required
              value={formData.contactPerson}
              onChange={handleChange}
              placeholder="e.g. Vikram Patel"
              className="w-full px-3 py-2 bg-[#090f0c] border border-[#213528] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            {fieldErrors.contactPerson && (
              <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.contactPerson[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="contact@infrasupplies.com"
              className="w-full px-3 py-2 bg-[#090f0c] border border-[#213528] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            {fieldErrors.email && <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.email[0]}</p>}
          </div>
        </div>

        {/* Phone & Country */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone *</label>
            <input
              type="text"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2 bg-[#090f0c] border border-[#213528] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            {fieldErrors.phone && <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.phone[0]}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Country</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="India"
              className="w-full px-3 py-2 bg-[#090f0c] border border-[#213528] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Business Address *</label>
          <input
            type="text"
            name="address"
            required
            value={formData.address}
            onChange={handleChange}
            placeholder="Plot, Street, Industrial Area"
            className="w-full px-3 py-2 bg-[#090f0c] border border-[#213528] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
          />
          {fieldErrors.address && <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.address[0]}</p>}
        </div>

        {/* City, State, Pincode */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. Ahmedabad"
              className="w-full px-3 py-1.5 bg-[#090f0c] border border-[#213528] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">State</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="e.g. Gujarat"
              className="w-full px-3 py-1.5 bg-[#090f0c] border border-[#213528] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Pincode</label>
            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              placeholder="e.g. 382330"
              className="w-full px-3 py-1.5 bg-[#090f0c] border border-[#213528] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Additional Notes</label>
          <textarea
            name="notes"
            rows={2}
            value={formData.notes}
            onChange={handleChange}
            placeholder="Special certifications, supplier ratings, or terms..."
            className="w-full px-3 py-2 bg-[#090f0c] border border-[#213528] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-[#1a2b21]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-[#1a2b20]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isEditing ? 'Save Changes' : 'Register Vendor'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
