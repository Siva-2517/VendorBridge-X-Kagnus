import React from 'react';
import { Modal } from '../components/common/Modal';
import { Vendor } from '../types';
import { Badge } from '../components/common/Badge';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileCheck,
  Edit,
  User,
} from 'lucide-react';

interface VendorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  onEdit: (vendor: Vendor) => void;
  canEdit: boolean;
}

export const VendorDetailModal: React.FC<VendorDetailModalProps> = ({
  isOpen,
  onClose,
  vendor,
  onEdit,
  canEdit,
}) => {
  if (!vendor) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Vendor Profile & Compliance Details" maxWidth="max-w-xl">
      <div className="space-y-6">
        {/* Header Header Info */}
        <div className="flex items-start justify-between bg-[#0B1220] border border-[#334155] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#36C9A5] font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#F8FAFC] tracking-wide">{vendor.name}</h4>
              <p className="text-xs text-[#94A3B8]">Category: <span className="text-[#36C9A5] font-medium">{vendor.category}</span></p>
            </div>
          </div>
          <Badge status={vendor.status} />
        </div>

        {/* GSTIN & Registration Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-[#0B1220] border border-[#334155] rounded-lg">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5 mb-1">
              <FileCheck className="w-3.5 h-3.5 text-[#36C9A5]" />
              GST Number (GSTIN)
            </span>
            <span className="text-sm font-mono font-bold text-[#36C9A5]">{vendor.gstin}</span>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">Verified Indian GST registration</p>
          </div>

          <div className="p-3 bg-[#0B1220] border border-[#334155] rounded-lg">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-[#36C9A5]" />
              Registered On
            </span>
            <span className="text-xs text-slate-200">
              {new Date(vendor.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Primary Contact Person */}
        <div className="p-4 bg-[#0B1220] border border-[#334155] rounded-xl space-y-2.5">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#36C9A5]" />
            Authorized Contact Representative
          </h5>
          <div className="text-sm font-semibold text-[#F8FAFC]">{vendor.contactPerson}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="w-3.5 h-3.5 text-[#94A3B8]" />
              <a href={`mailto:${vendor.email}`} className="hover:text-[#36C9A5] transition-colors">
                {vendor.email}
              </a>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-[#94A3B8]" />
              <a href={`tel:${vendor.phone}`} className="hover:text-[#36C9A5] transition-colors">
                {vendor.phone}
              </a>
            </div>
          </div>
        </div>

        {/* Business Operating Address */}
        <div className="p-4 bg-[#0B1220] border border-[#334155] rounded-xl space-y-1.5">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#36C9A5]" />
            Operating Address
          </h5>
          <p className="text-xs text-slate-300 leading-relaxed">
            {vendor.address}
            {vendor.city && `, ${vendor.city}`}
            {vendor.state && `, ${vendor.state}`}
            {vendor.pincode && ` - ${vendor.pincode}`}
            {vendor.country && `, ${vendor.country}`}
          </p>
        </div>

        {/* Notes / Remarks */}
        {vendor.notes && (
          <div className="p-3 bg-[#0B1220] border border-[#334155] rounded-lg">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] block mb-1">
              Supplier Notes & Observations
            </span>
            <p className="text-xs text-slate-300 italic">{vendor.notes}</p>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex justify-between items-center pt-3 border-t border-[#334155]">
          <span className="text-[10px] text-[#94A3B8]">ID: {vendor.id}</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-[#273449] transition-colors"
            >
              Close
            </button>
            {canEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(vendor);
                }}
                className="px-4 py-1.5 bg-[#36C9A5] hover:bg-[#2db893] text-[#0B1220] text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
