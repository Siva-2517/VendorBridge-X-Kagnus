import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Vendor, VendorCounts } from '../types';
import { Badge } from '../components/common/Badge';
import { VendorModal } from './VendorModal';
import { VendorDetailModal } from './VendorDetailModal';
import {
  Search,
  Plus,
  RefreshCw,
  Building2,
  Trash2,
  Edit,
  Eye,
  AlertTriangle,
  FileX,
  Filter,
  AlertCircle,
} from 'lucide-react';

export const Vendors: React.FC = () => {
  const { user } = useAuth();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [counts, setCounts] = useState<VendorCounts>({ all: 0, active: 0, pending: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'pending' | 'blocked'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('status', activeTab);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`/api/vendors?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve vendor records');
      }

      const data = await res.json();
      setVendors(data.vendors || []);
      setCounts(data.counts || { all: 0, active: 0, pending: 0, blocked: 0 });
    } catch (err: any) {
      setError(err.message || 'Error connecting to vendor registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchVendors();
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, activeTab, selectedCategory, user]);

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsAddEditModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingVendor) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/vendors/${deletingVendor.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to delete vendor');
      } else {
        setDeletingVendor(null);
        fetchVendors();
      }
    } catch (err) {
      alert('Network error while deleting vendor');
    } finally {
      setDeleteLoading(false);
    }
  };

  const canCreate = user?.role === 'ADMIN' || user?.role === 'PROCUREMENT_OFFICER';
  const canDelete = user?.role === 'ADMIN';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header matching Screen 4 wireframe */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#19281f]">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Vendors</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage supplier profiles and registrations
          </p>
        </div>

        {/* [+ Add Vendor] Button */}
        {canCreate && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            + Add Vendor
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar matching Screen 4 wireframe */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search bar ..... search by name, gst number, category..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#101914] border border-[#213528] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Tabs with Counts matching Screen 4: [All (28)] [Active (21)] [Pending (4)] [Blocked (3)] */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#101914] border border-[#1e3025] rounded-xl text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#15231c]'
            }`}
          >
            All ({counts.all})
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'active'
                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#15231c]'
            }`}
          >
            Active ({counts.active})
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'pending'
                ? 'bg-amber-900/60 text-amber-300 border border-amber-700/60 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#15231c]'
            }`}
          >
            Pending ({counts.pending})
          </button>

          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'blocked'
                ? 'bg-rose-900/60 text-rose-300 border border-rose-700/60 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-[#15231c]'
            }`}
          >
            Blocked ({counts.blocked})
          </button>
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-[#101914] border border-[#213528] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Categories</option>
            <option value="Constructions">Constructions</option>
            <option value="IT">IT</option>
            <option value="Logistics">Logistics</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Services">Services</option>
            <option value="Stationery">Stationery</option>
          </select>
        </div>
      </div>

      {/* Vendors Table matching Screen 4 wireframe */}
      <div className="bg-[#121c17] border border-[#203327] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0e1612] border-b border-[#1f3025] text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Vendor Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">GST no.</th>
                <th className="py-3 px-4">Contact no.</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18271e]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
                      <span>Loading vendors registry...</span>
                    </div>
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileX className="w-8 h-8 text-slate-600" />
                      <span className="font-semibold text-slate-300">No vendor records found</span>
                      <p className="text-xs text-slate-500">
                        {searchTerm || activeTab !== 'all' || selectedCategory !== 'all'
                          ? 'Try adjusting your search query or status filter.'
                          : 'Click "+ Add Vendor" to onboard your first supplier.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="hover:bg-[#16251e]/80 transition-colors group cursor-pointer"
                    onClick={() => setViewingVendor(vendor)}
                  >
                    {/* Vendor Name */}
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-white hover:text-emerald-400 transition-colors">
                            {vendor.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {vendor.contactPerson}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-slate-300 font-medium">{vendor.category}</td>

                    {/* GST no. */}
                    <td className="py-3.5 px-4 font-mono font-medium text-emerald-400/90">
                      {vendor.gstin}
                    </td>

                    {/* Contact no. */}
                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      <div>{vendor.phone}</div>
                      <div className="text-[10px] text-slate-500 font-sans">{vendor.email}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <Badge status={vendor.status} />
                    </td>

                    {/* Action matching wireframe [View] with Edit & Delete */}
                    <td
                      className="py-3.5 px-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingVendor(vendor)}
                          title="View profile"
                          className="px-2.5 py-1 bg-[#182920] hover:bg-[#20362b] text-emerald-400 border border-[#264132] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>

                        {(user?.role === 'ADMIN' ||
                          user?.role === 'PROCUREMENT_OFFICER' ||
                          user?.id === (vendor as any).userId) && (
                          <button
                            onClick={() => handleOpenEdit(vendor)}
                            title="Edit vendor details"
                            className="p-1 bg-[#182920] hover:bg-[#20362b] text-slate-300 border border-[#264132] rounded-lg transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => setDeletingVendor(vendor)}
                            title="Delete vendor (Admin only)"
                            className="p-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary */}
        <div className="px-4 py-3 bg-[#0d1511] border-t border-[#1b2b21] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            Displaying <strong>{vendors.length}</strong> supplier{vendors.length === 1 ? '' : 's'} (
            {activeTab.toUpperCase()})
          </span>
          <span className="text-[11px] text-slate-500">
            Database persistence active • Click any row for comprehensive compliance view
          </span>
        </div>
      </div>

      {/* Add / Edit Vendor Modal */}
      <VendorModal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        onSaved={fetchVendors}
        vendorToEdit={editingVendor}
      />

      {/* View Details Drawer/Modal */}
      <VendorDetailModal
        isOpen={Boolean(viewingVendor)}
        onClose={() => setViewingVendor(null)}
        vendor={viewingVendor}
        onEdit={(v) => handleOpenEdit(v)}
        canEdit={Boolean(canCreate)}
      />

      {/* Delete Confirmation Safety Dialog */}
      {deletingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121c17] border border-rose-800/60 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Delete Vendor Record?</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Are you sure you want to permanently delete <strong>{deletingVendor.name}</strong> (GSTIN:{' '}
              <span className="font-mono text-emerald-400">{deletingVendor.gstin}</span>)? This action is
              restricted to Administrators and will be recorded in the audit log.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeletingVendor(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-[#1a2b20]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-rose-950/50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {deleteLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Deletion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
